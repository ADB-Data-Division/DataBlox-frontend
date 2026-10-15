export type GateState = "loading" | "ready" | "pending" | "declined";

export interface WhoamiShape {
  allowed?: boolean;
  email?: string | null;
  approved?: boolean;
  status?: string | null;
  enforced?: boolean;
}

export function gateStateFromWhoami(result: WhoamiShape | null): GateState {
  if (!result) return "loading";
  if (result.approved === false) {
    return result.status === "declined" ? "declined" : "pending";
  }
  return "ready";
}
