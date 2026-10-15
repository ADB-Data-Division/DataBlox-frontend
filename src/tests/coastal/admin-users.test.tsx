/**
 * Users page tests (approval gate step F2).
 * Pure rules live in users-helpers and are tested directly. The table
 * renders with react-dom/server so no jsdom is needed.
 */
import { renderToStaticMarkup } from "react-dom/server";
import type { ApprovalUser } from "@/services/coastalAdminService";

jest.mock("@/app/lib/auth-utils", () => ({
  getClientAccessToken: jest.fn(async () => null),
}));
import { UsersTable } from "@/app/(dashboard)/coastal/admin/users/page-content";
import {
  canApprove,
  filterUsersByTab,
  matchesQuery,
  pendingTotal,
  providerLabel,
  rowActions,
  splitEmails,
  tabCounts,
  undoFor,
} from "@/app/(dashboard)/coastal/admin/users/users-helpers";

function user(over: Partial<ApprovalUser> = {}): ApprovalUser {
  return {
    key: "google-oauth2|1",
    sub: "google-oauth2|1",
    email: "ada@example.com",
    email_verified: true,
    name: "Ada",
    picture: null,
    provider: "google",
    status: "pending",
    invited: false,
    first_seen: "2026-10-13T08:00:00+00:00",
    last_seen: "2026-10-13T09:00:00+00:00",
    decided_by: null,
    decided_at: null,
    admin: false,
    ...over,
  };
}

const list: ApprovalUser[] = [
  user(),
  user({ key: "auth0|2", sub: "auth0|2", email: "bob@example.com", name: "Bob", status: "approved" }),
  user({ key: "auth0|3", sub: "auth0|3", email: "cat@example.com", name: "Cat", status: "declined" }),
];

it("filters_users_by_tab_and_counts", () => {
  expect(filterUsersByTab(list, "pending", "")).toHaveLength(1);
  expect(filterUsersByTab(list, "approved", "")).toHaveLength(1);
  expect(tabCounts(list, "")).toEqual({ pending: 1, approved: 1, declined: 1 });
});

it("search_matches_name_and_email_case_insensitively", () => {
  expect(matchesQuery(list[0], "ADA")).toBe(true);
  expect(matchesQuery(list[1], "bob@EXAMPLE.com")).toBe(true);
  expect(matchesQuery(list[2], "nobody")).toBe(false);
});

it("empty_search_matches_everyone", () => {
  expect(filterUsersByTab(list, "pending", "  ")).toHaveLength(1);
  expect(list.every((entry) => matchesQuery(entry, ""))).toBe(true);
});

it("search_changes_tab_counts_but_not_the_nav_total", () => {
  expect(tabCounts(list, "ada")).toEqual({ pending: 1, approved: 0, declined: 0 });
  expect(pendingTotal(list)).toBe(1);
});

it("provider_label_for_google_and_password", () => {
  expect(providerLabel("google")).toBe("Google");
  expect(providerLabel("password")).toBe("Email");
  expect(providerLabel(null)).toBeNull();
});

it("unverified_email_cannot_be_approved", () => {
  expect(canApprove(user())).toBe(true);
  expect(canApprove(user({ email_verified: false }))).toBe(false);
  expect(canApprove(user({ status: "approved" }))).toBe(false);
});

it("admin_rows_have_no_actions", () => {
  expect(rowActions(user({ admin: true }))).toEqual([]);
  expect(canApprove(user({ admin: true }))).toBe(false);
});

it("invite_rows_offer_cancel_not_remove", () => {
  expect(rowActions(user({ invited: true, sub: null, provider: null }))).toEqual(["cancel"]);
});

it("undo_maps_each_action_to_its_inverse", () => {
  expect(undoFor("approve", user())).toEqual({ kind: "decision", action: "reset" });
  expect(undoFor("decline", user())).toEqual({ kind: "decision", action: "reset" });
  expect(undoFor("remove", user())).toEqual({ kind: "decision", action: "reset" });
  expect(undoFor("cancel", user({ email: "gone@example.com" }))).toEqual({
    kind: "preapprove",
    email: "gone@example.com",
  });
});

it("splitEmails_handles_commas_spaces_and_newlines", () => {
  expect(splitEmails("a@x.com, b@x.com\nc@x.com  a@x.com")).toEqual([
    "a@x.com",
    "b@x.com",
    "c@x.com",
  ]);
});

describe("UsersTable", () => {
  const noop = () => {};

  it("disables_approve_with_title_when_unverified", () => {
    const html = renderToStaticMarkup(
      <UsersTable rows={[user({ email_verified: false })]} tab="pending" query="" busy={null} onAction={noop} />
    );
    expect(html).toMatch(/disabled/);
    expect(html).toMatch(/Email not verified/);
  });

  it("admin_row_shows_chip_and_no_buttons", () => {
    const html = renderToStaticMarkup(
      <UsersTable rows={[user({ admin: true, status: "approved" })]} tab="approved" query="" busy={null} onAction={noop} />
    );
    expect(html).toMatch(/Admin/);
    expect(html).not.toMatch(/<button/);
  });

  it("invite_row_offers_cancel", () => {
    const html = renderToStaticMarkup(
      <UsersTable
        rows={[user({ key: "email:g@x.com", sub: null, email: "g@x.com", provider: null, invited: true })]}
        tab="approved"
        query=""
        busy={null}
        onAction={noop}
      />
    );
    expect(html).toMatch(/Cancel/);
    expect(html).toMatch(/Not signed in/);
  });

  it("empty_search_escapes_the_query", () => {
    const html = renderToStaticMarkup(
      <UsersTable rows={[]} tab="pending" query='<b>x</b>' busy={null} onAction={noop} />
    );
    expect(html).toMatch(/No pending users match/);
    expect(html).toMatch(/&lt;b&gt;x&lt;\/b&gt;/);
    expect(html).not.toMatch(/<b>x<\/b>/);
  });
});
