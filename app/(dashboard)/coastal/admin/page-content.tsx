'use client';

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  checkAllowed,
  fetchAdminCountries,
  fetchHistory,
  fetchVmStatus,
  rollbackUpload,
  setCountryEnabled,
  type AdminCountry,
  type AdminUploadSession,
  type VmStatus,
} from "@/services/coastalAdminService";
import { AccessDenied } from "./upload/components/AccessDenied";
import { formatBytes } from "./upload/components/upload-helpers";

interface CountryRow {
  country: AdminCountry;
  monthlyBytes: number;
  weeklyBytes: number;
  complete: boolean;
  uploadedAt: string | null;
  uploadedBy: string | null;
}

export default function PageContent() {
  const [gate, setGate] = useState<"loading" | "denied" | "allowed">("loading");
  const [gateEmail, setGateEmail] = useState<string | null>(null);
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [vm, setVm] = useState<VmStatus | null>(null);
  const [history, setHistory] = useState<AdminUploadSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async (refreshVm = false) => {
    const [countryList, status, sessions] = await Promise.all([
      fetchAdminCountries(true),
      fetchVmStatus(refreshVm),
      fetchHistory(),
    ]);
    setCountries(countryList);
    setVm(status);
    setHistory(sessions);
  };

  useEffect(() => {
    checkAllowed()
      .then((result) => {
        setGateEmail(result.email);
        if (!result.allowed) {
          setGate("denied");
          return;
        }
        setGate("allowed");
        loadAll().catch((err: Error) => setError(err.message));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadAll(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  };

  const toggleEnabled = async (iso: string, next: boolean) => {
    setBusy(iso);
    try {
      await setCountryEnabled(iso, next);
      setCountries((prev) => prev.map((c) => (c.iso === iso ? { ...c, enabled: next } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const rollback = async (uploadId: string) => {
    setBusy(uploadId);
    try {
      await rollbackUpload(uploadId);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  if (gate === "loading") {
    return <Typography color="text.secondary">Checking access…</Typography>;
  }
  if (error && gate !== "allowed") {
    return <Alert severity="error">{error}</Alert>;
  }
  if (gate === "denied") {
    return <AccessDenied email={gateEmail} />;
  }

  const byIso = new Map(vm?.per_iso.map((entry) => [entry.iso, entry]) ?? []);
  const latestByIso = new Map<string, AdminUploadSession>();
  for (const session of history) {
    if (!latestByIso.has(session.iso)) {
      latestByIso.set(session.iso, session);
    }
  }
  const rows: CountryRow[] = countries.map((country) => {
    const sizes = byIso.get(country.iso);
    const monthly = sizes?.monthly_bytes ?? 0;
    const weekly = sizes?.weekly_bytes ?? 0;
    const latest = latestByIso.get(country.iso);
    return {
      country,
      monthlyBytes: monthly,
      weeklyBytes: weekly,
      complete: monthly > 0 && weekly > 0,
      uploadedAt: latest?.created_at ?? null,
      uploadedBy: latest?.created_by ?? null,
    };
  });

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h4">Dashboard</Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={refresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6">DS VM /data</Typography>
            {vm && (
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatBytes(vm.disk_used_bytes)} of {formatBytes(vm.disk_total_bytes)} used
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (vm.disk_used_bytes / Math.max(1, vm.disk_total_bytes)) * 100)}
                />
                <Typography variant="body2" color="text.secondary">
                  Coastal prod {formatBytes(vm.coastal_prod_bytes)} · Adm{" "}
                  {formatBytes(vm.adm_bytes)}
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6">Published coastal prod</Typography>
            {vm && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {formatBytes(vm.coastal_prod_bytes)} total · ABT {formatBytes(vm.abt_bytes)} ·
                Grids {formatBytes(vm.grids_bytes)} · Vessel {formatBytes(vm.vessel_bytes)} ·
                Adm {formatBytes(vm.adm_bytes)}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Country</TableCell>
              <TableCell>Files</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Data up to</TableCell>
              <TableCell>Enabled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.country.iso}>
                <TableCell>
                  {row.country.name} ({row.country.iso})
                </TableCell>
                <TableCell>
                  {row.complete ? (
                    <Chip label="Complete" size="small" color="success" />
                  ) : (
                    <Chip
                      label={`Missing ${[
                        row.monthlyBytes === 0 ? "monthly" : null,
                        row.weeklyBytes === 0 ? "weekly" : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}`}
                      size="small"
                      color="warning"
                    />
                  )}
                  <Typography variant="caption" display="block" color="text.secondary">
                    Monthly {formatBytes(row.monthlyBytes)} · Weekly{" "}
                    {formatBytes(row.weeklyBytes)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {row.uploadedAt ? (
                    <>
                      {row.uploadedAt.slice(0, 10)}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {row.uploadedBy}
                      </Typography>
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{row.country.date_range?.end ?? "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={row.country.enabled !== false}
                    disabled={!row.complete || busy === row.country.iso}
                    onChange={(event) => toggleEnabled(row.country.iso, event.target.checked)}
                    inputProps={{ "aria-label": `Enable ${row.country.iso}` }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Typography variant="h6">Recent uploads</Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Country</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>By</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((session) => (
              <TableRow key={session.upload_id}>
                <TableCell>{session.iso}</TableCell>
                <TableCell>{session.created_at.slice(0, 10)}</TableCell>
                <TableCell>{session.created_by}</TableCell>
                <TableCell>{session.status}</TableCell>
                <TableCell>
                  {session.status === "published" && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy === session.upload_id}
                      onClick={() => rollback(session.upload_id)}
                    >
                      Roll back
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
