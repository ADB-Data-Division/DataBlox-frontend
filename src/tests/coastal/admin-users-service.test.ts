/**
 * Users service tests (approval gate step F1).
 * global fetch is mocked, so no network happens. Every call passes an
 * explicit token, which bypasses the next-auth session lookup.
 */
import {
  approveVerified,
  checkAllowed,
  decideUsers,
  fetchUsers,
  preapproveEmails,
} from "@/services/coastalAdminService";

jest.mock("@/app/lib/auth-utils", () => ({
  getClientAccessToken: jest.fn(async () => null),
}));

const TOKEN = "test-token";

function mockFetchOnce(body: unknown, init: { status?: number; statusText?: string } = {}) {
  const status = init.status ?? 200;
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? (status === 200 ? "OK" : "Error"),
    json: async () => body,
  })) as unknown as typeof fetch;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchUsers", () => {
  it("fetchUsers_sends_bearer_to_admin_users", async () => {
    mockFetchOnce({ enforced: false, users: [] });
    await fetchUsers(TOKEN);
    const [url, req] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/admin\/coastal\/users$/);
    expect((req.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${TOKEN}`);
  });
});

describe("decideUsers", () => {
  it("decideUsers_posts_keys_and_action_as_json", async () => {
    mockFetchOnce({ updated: ["a"], skipped: [] });
    const result = await decideUsers(["a"], "approve", TOKEN);
    expect(result).toEqual({ updated: ["a"], skipped: [] });
    const [, req] = (global.fetch as jest.Mock).mock.calls[0];
    expect(req.method).toBe("POST");
    expect(JSON.parse(req.body)).toEqual({ keys: ["a"], action: "approve" });
  });
});

describe("preapproveEmails", () => {
  it("preapprove_posts_email_list", async () => {
    mockFetchOnce({ added: ["email:a@x.com"], skipped: [] });
    const result = await preapproveEmails(["a@x.com"], TOKEN);
    expect(result.added).toEqual(["email:a@x.com"]);
    const [url, req] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/users\/preapprove$/);
    expect(JSON.parse(req.body)).toEqual({ emails: ["a@x.com"] });
  });
});

describe("approveVerified", () => {
  it("posts_to_approve_verified", async () => {
    mockFetchOnce({ updated: ["a"], skipped: [] });
    const result = await approveVerified(TOKEN);
    expect(result.updated).toEqual(["a"]);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/users\/approve-verified$/);
  });
});

describe("errors", () => {
  it("errors_carry_status_and_detail", async () => {
    mockFetchOnce({ detail: "approval_required" }, { status: 403, statusText: "Forbidden" });
    await expect(fetchUsers(TOKEN)).rejects.toThrow(
      "Coastal Admin Error (403): approval_required"
    );
  });
});

describe("checkAllowed", () => {
  it("checkAllowed_exposes_approval_fields", async () => {
    mockFetchOnce({
      allowed: true,
      email: "a@x.com",
      approved: false,
      status: "pending",
      enforced: true,
    });
    const result = await checkAllowed(TOKEN);
    expect(result.approved).toBe(false);
    expect(result.status).toBe("pending");
    expect(result.enforced).toBe(true);
  });

  it("old_backend_without_approval_fields_still_types", async () => {
    mockFetchOnce({ allowed: true, email: "a@x.com" });
    const result = await checkAllowed(TOKEN);
    expect(result.approved).toBeUndefined();
    expect(result.allowed).toBe(true);
  });
});
