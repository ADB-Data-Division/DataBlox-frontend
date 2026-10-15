/**
 * Approval gate tests (approval gate step F3).
 * Decision logic lives in gate-helpers and is tested directly. Views
 * render with react-dom/server so no jsdom is needed.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { gateStateFromWhoami } from "@/components/approval/gate-helpers";
import { GateView, PendingApproval } from "@/components/approval/PendingApproval";

jest.mock("next-auth/react", () => ({
  signOut: jest.fn(),
}));

jest.mock("@/app/lib/auth-utils", () => ({
  getClientAccessToken: jest.fn(async () => null),
}));

const noop = () => {};

it("missing_approved_field_counts_as_ready", () => {
  expect(gateStateFromWhoami({ allowed: true, email: "a@x.com" })).toBe("ready");
  expect(gateStateFromWhoami({ approved: true, status: "approved" })).toBe("ready");
});

it("approved_false_with_pending_status_is_pending", () => {
  expect(gateStateFromWhoami({ approved: false, status: "pending" })).toBe("pending");
  expect(gateStateFromWhoami({ approved: false, status: null })).toBe("pending");
});

it("declined_status_is_declined", () => {
  expect(gateStateFromWhoami({ approved: false, status: "declined" })).toBe("declined");
});

it("null_result_is_loading", () => {
  expect(gateStateFromWhoami(null)).toBe("loading");
});

describe("GateView", () => {
  it("loading_shows_progress", () => {
    const html = renderToStaticMarkup(
      <GateView state="loading" email={null} onRecheck={noop}>
        <div>child</div>
      </GateView>
    );
    expect(html).not.toMatch(/child/);
  });

  it("network_error_renders_children", () => {
    // ApprovalGate fails open: a failed whoami call maps to ready,
    // which renders the children. The backend stays the enforcer.
    const html = renderToStaticMarkup(
      <GateView state="ready" email={null} onRecheck={noop}>
        <div>child</div>
      </GateView>
    );
    expect(html).toMatch(/child/);
  });

  it("pending_renders_the_pending_screen", () => {
    const html = renderToStaticMarkup(
      <GateView state="pending" email="kenji@example.jp" onRecheck={noop}>
        <div>zzz-gate-child</div>
      </GateView>
    );
    expect(html).toMatch(/Access pending approval/);
    expect(html).toMatch(/kenji@example.jp/);
    expect(html).toMatch(/Check again/);
    expect(html).not.toMatch(/zzz-gate-child/);
  });
});

describe("PendingApproval", () => {
  it("renders_the_pending_screen", () => {
    const html = renderToStaticMarkup(
      <PendingApproval email="kenji@example.jp" status="pending" onRecheck={noop} />
    );
    expect(html).toMatch(/Access pending approval/);
    expect(html).toMatch(/kenji@example.jp/);
    expect(html).toMatch(/Sign out/);
    expect(html).toMatch(/Check again/);
  });

  it("renders_the_declined_screen_without_recheck", () => {
    const html = renderToStaticMarkup(
      <PendingApproval email="spam@example.com" status="declined" onRecheck={noop} />
    );
    expect(html).toMatch(/Access not granted/);
    expect(html).not.toMatch(/Check again/);
  });

  it("renders_the_approved_screen_with_open_button", () => {
    const html = renderToStaticMarkup(
      <PendingApproval email="ada@example.com" status="approved" onRecheck={noop} />
    );
    expect(html).toMatch(/You are approved/);
    expect(html).toMatch(/Open DataBlox/);
  });
});
