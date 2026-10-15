'use client';

import React from "react";
import { Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { signOut } from "next-auth/react";
import type { GateState } from "./gate-helpers";

export function PendingApproval({
  email,
  status,
  onRecheck,
}: {
  email: string | null;
  status: "pending" | "declined" | "approved";
  onRecheck: () => void;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <Card variant="outlined" sx={{ width: 420, textAlign: "center" }}>
        <CardContent sx={{ p: 4 }}>
          {status === "pending" && <Typography variant="h5">Access pending approval</Typography>}
          {status === "declined" && <Typography variant="h5">Access not granted</Typography>}
          {status === "approved" && <Typography variant="h5">You are approved</Typography>}
          {email && (
            <Box sx={{ my: 2 }}>
              <Chip label={email} />
            </Box>
          )}
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            {status === "approved" ? (
              <Button variant="contained" href="/coastal">
                Open DataBlox
              </Button>
            ) : (
              <>
                <Button variant="outlined" onClick={() => signOut()}>
                  Sign out
                </Button>
                {status === "pending" && (
                  <Button variant="contained" onClick={onRecheck}>
                    Check again
                  </Button>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export function GateView({
  state,
  email,
  onRecheck,
  children,
}: {
  state: GateState;
  email: string | null;
  onRecheck: () => void;
  children: React.ReactNode;
}) {
  if (state === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (state === "pending" || state === "declined") {
    return <PendingApproval email={email} status={state} onRecheck={onRecheck} />;
  }
  return <>{children}</>;
}
