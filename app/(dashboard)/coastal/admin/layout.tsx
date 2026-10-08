import React from "react";
import { Box } from "@mui/material";
import { AdminShell } from "./AdminShell";

export default function CoastalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ width: "100%" }}>
      <AdminShell>{children}</AdminShell>
    </Box>
  );
}
