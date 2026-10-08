'use client';

import React from "react";
import { Alert, Typography } from "@mui/material";

export function AccessDenied({ email }: { email: string | null }) {
  return (
    <Alert severity="error">
      <Typography variant="body2">
        Access denied{email ? ` for ${email}` : ""}. Your account is not on the
        coastal admin list.
      </Typography>
    </Alert>
  );
}
