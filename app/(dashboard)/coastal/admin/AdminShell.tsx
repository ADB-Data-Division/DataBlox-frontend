'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadIcon from "@mui/icons-material/Upload";
import PreviewIcon from "@mui/icons-material/Preview";
import { fetchVmStatus } from "@/services/coastalAdminService";
import { formatBytes } from "./upload/components/upload-helpers";

const NAV = [
  { label: "Dashboard", href: "/coastal/admin", icon: <DashboardIcon fontSize="small" /> },
  { label: "Upload portal", href: "/coastal/admin/upload", icon: <UploadIcon fontSize="small" /> },
  { label: "Preview", href: "/coastal/admin/preview", icon: <PreviewIcon fontSize="small" /> },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [vmPanel, setVmPanel] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    fetchVmStatus()
      .then((status) =>
        setVmPanel({ used: status.disk_used_bytes, total: status.disk_total_bytes })
      )
      .catch(() => setVmPanel(null));
  }, []);

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
      <Box sx={{ width: { xs: "100%", md: 220 }, flexShrink: 0 }}>
        <Stack spacing={0.5}>
          {NAV.map((item) => {
            const active =
              item.href === "/coastal/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: "none" }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 1,
                    backgroundColor: active ? "#0077BE14" : "transparent",
                    color: active ? "#0077BE" : "#333333",
                    fontWeight: active ? 600 : 400,
                    "&:hover": { backgroundColor: "#0077BE14" },
                  }}
                >
                  {item.icon}
                  <Typography variant="body2">{item.label}</Typography>
                </Stack>
              </Link>
            );
          })}
        </Stack>
        {vmPanel && (
          <Box sx={{ mt: 2, px: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              DS VM disk
            </Typography>
            <Typography variant="body2">
              {formatBytes(vmPanel.used)} of {formatBytes(vmPanel.total)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (vmPanel.used / Math.max(1, vmPanel.total)) * 100)}
              sx={{ mt: 0.5 }}
            />
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}
