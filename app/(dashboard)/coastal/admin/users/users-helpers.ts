import type { ApprovalUser, UserDecision } from "@/services/coastalAdminService";

export type UsersTab = "pending" | "approved" | "declined";

export type RowAction = "approve" | "decline" | "remove" | "cancel";

export type UndoStep =
  | { kind: "decision"; action: UserDecision }
  | { kind: "preapprove"; email: string };

export function matchesQuery(user: ApprovalUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${user.name ?? ""} ${user.email ?? ""}`.toLowerCase().includes(q);
}

export function filterUsersByTab(
  users: ApprovalUser[],
  tab: UsersTab,
  query: string
): ApprovalUser[] {
  return users.filter((user) => user.status === tab && matchesQuery(user, query));
}

export function tabCounts(
  users: ApprovalUser[],
  query: string
): Record<UsersTab, number> {
  const counts: Record<UsersTab, number> = { pending: 0, approved: 0, declined: 0 };
  for (const user of users) {
    if (matchesQuery(user, query)) {
      counts[user.status] += 1;
    }
  }
  return counts;
}

export function pendingTotal(users: ApprovalUser[]): number {
  return users.filter((user) => user.status === "pending").length;
}

export function providerLabel(provider: string | null): string | null {
  if (provider === null) return null;
  if (provider === "google") return "Google";
  if (provider === "password") return "Email";
  return provider;
}

export function canApprove(user: ApprovalUser): boolean {
  if (user.admin) return false;
  if (user.status !== "pending" && user.status !== "declined") return false;
  return user.email_verified === true;
}

export function rowActions(user: ApprovalUser): RowAction[] {
  if (user.admin) return [];
  if (user.invited) return ["cancel"];
  if (user.status === "pending") return ["decline", "approve"];
  if (user.status === "approved") return ["remove"];
  return ["approve"];
}

export function undoFor(action: RowAction, user: ApprovalUser): UndoStep | null {
  if (action === "approve" || action === "decline" || action === "remove") {
    return { kind: "decision", action: "reset" };
  }
  if (action === "cancel" && user.email) {
    return { kind: "preapprove", email: user.email };
  }
  return null;
}

export function splitEmails(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const email = part.trim().toLowerCase();
    if (email && !seen.has(email)) {
      seen.add(email);
      out.push(email);
    }
  }
  return out;
}

export function displayName(user: ApprovalUser): string {
  return user.name || user.email || user.key;
}

export function avatarInitials(user: ApprovalUser): string {
  return displayName(user)
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
