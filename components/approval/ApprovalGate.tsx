'use client';

import React, { useCallback, useEffect, useState } from "react";
import { checkAllowed } from "@/services/coastalAdminService";
import { gateStateFromWhoami, type GateState } from "./gate-helpers";
import { GateView } from "./PendingApproval";

export function ApprovalGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("loading");
  const [email, setEmail] = useState<string | null>(null);

  const check = useCallback(() => {
    checkAllowed()
      .then((result) => {
        setEmail(result.email);
        setState(gateStateFromWhoami(result));
      })
      .catch(() => {
        // Fail open: the backend is the only enforcer. The gate only
        // avoids a broken-looking page.
        setState("ready");
      });
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <GateView state={state} email={email} onRecheck={check}>
      {children}
    </GateView>
  );
}
