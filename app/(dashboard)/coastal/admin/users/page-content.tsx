'use client';

import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  approveVerified,
  checkAllowed,
  decideUsers,
  fetchUsers,
  preapproveEmails,
  type ApprovalUser,
  type UserDecision,
} from "@/services/coastalAdminService";
import { AccessDenied } from "../upload/components/AccessDenied";
import {
  avatarInitials,
  canApprove,
  displayName,
  filterUsersByTab,
  providerLabel,
  rowActions,
  splitEmails,
  tabCounts,
  type RowAction,
  type UsersTab,
} from "./users-helpers";

const AVATAR_COLORS = ["#0077BE", "#7C3AED", "#DB2777", "#059669", "#D97706", "#475569"];

function avatarColor(user: ApprovalUser): string {
  const seed = user.email ?? user.key;
  let hash = 0;
  for (const ch of seed) hash += ch.codePointAt(0) ?? 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatSeen(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

export function UsersTable({
  rows,
  tab,
  query,
  busy,
  onAction,
}: {
  rows: ApprovalUser[];
  tab: UsersTab;
  query: string;
  busy: string | null;
  onAction: (user: ApprovalUser, action: RowAction) => void;
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>User</TableCell>
          <TableCell>Sign-in</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Last seen</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((user) => (
          <TableRow key={user.key}>
            <TableCell>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: avatarColor(user), width: 36, height: 36 }}>
                  {avatarInitials(user)}
                </Avatar>
                <Box>
                  <Typography variant="body2">{displayName(user)}</Typography>
                  {user.name && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {user.email}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </TableCell>
            <TableCell>
              {user.invited || !providerLabel(user.provider) ? (
                <Typography variant="body2" color="text.secondary">
                  Not signed in
                </Typography>
              ) : (
                <Chip label={providerLabel(user.provider)} size="small" />
              )}
            </TableCell>
            <TableCell>
              {user.email_verified === null || user.email === null ? (
                "—"
              ) : (
                <Chip
                  label={user.email_verified ? "Verified" : "Unverified"}
                  size="small"
                  color={user.email_verified ? "success" : "warning"}
                />
              )}
            </TableCell>
            <TableCell>{formatSeen(user.last_seen)}</TableCell>
            <TableCell>
              <StatusCell user={user} />
            </TableCell>
            <TableCell align="right">
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {rowActions(user).map((action) => {
                  if (action === "approve") {
                    const ok = canApprove(user);
                    return (
                      <Button
                        key={action}
                        size="small"
                        variant="contained"
                        disabled={!ok || busy === user.key}
                        title={ok ? undefined : "Email not verified"}
                        onClick={() => onAction(user, action)}
                      >
                        Approve
                      </Button>
                    );
                  }
                  if (action === "decline") {
                    return (
                      <Button
                        key={action}
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={busy === user.key}
                        onClick={() => onAction(user, action)}
                      >
                        Decline
                      </Button>
                    );
                  }
                  if (action === "remove") {
                    return (
                      <Button
                        key={action}
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={busy === user.key}
                        onClick={() => onAction(user, action)}
                      >
                        Remove access
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={action}
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={busy === user.key}
                      onClick={() => onAction(user, action)}
                    >
                      Cancel
                    </Button>
                  );
                })}
              </Stack>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} align="center">
              {query ? `No ${tab} users match "${query}"` : `No ${tab} users`}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function StatusCell({ user }: { user: ApprovalUser }) {
  if (user.admin) {
    return <Chip label="Admin" size="small" color="info" />;
  }
  if (user.invited) {
    return (
      <>
        <Chip label="Invited" size="small" />
        {user.decided_by && (
          <Typography variant="caption" display="block" color="text.secondary">
            {user.decided_by}
            {user.decided_at ? `, ${user.decided_at.slice(0, 10)}` : ""}
          </Typography>
        )}
      </>
    );
  }
  const label = user.status === "pending" ? "Pending" : user.status === "approved" ? "Approved" : "Declined";
  const color = user.status === "pending" ? "warning" : user.status === "approved" ? "success" : "error";
  return (
    <>
      <Chip label={label} size="small" color={color} />
      {user.status !== "pending" && user.decided_by && (
        <Typography variant="caption" display="block" color="text.secondary">
          {user.decided_by}
          {user.decided_at ? `, ${user.decided_at.slice(0, 10)}` : ""}
        </Typography>
      )}
    </>
  );
}

export default function PageContent() {
  const [gate, setGate] = useState<"loading" | "denied" | "allowed">("loading");
  const [gateEmail, setGateEmail] = useState<string | null>(null);
  const [users, setUsers] = useState<ApprovalUser[]>([]);
  const [tab, setTab] = useState<UsersTab>("pending");
  const [query, setQuery] = useState("");
  const [preapprove, setPreapprove] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [undoKeys, setUndoKeys] = useState<string[] | null>(null);
  const [undoEmail, setUndoEmail] = useState<string | null>(null);

  const load = async () => {
    const result = await fetchUsers();
    setUsers(result.users);
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
        load().catch((err: Error) => setError(err.message));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const fail = (err: unknown) => setError(err instanceof Error ? err.message : String(err));

  const runDecision = async (keys: string[], action: UserDecision, label: string) => {
    setBusy(keys.join(","));
    try {
      const result = await decideUsers(keys, action);
      await load();
      setUndoKeys(action === "reset" ? null : keys);
      setUndoEmail(null);
      const skipped = result.skipped.length ? ` (${result.skipped.length} skipped)` : "";
      setToast(`${label}: ${result.updated.length} user${result.updated.length === 1 ? "" : "s"}${skipped}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const act = async (user: ApprovalUser, action: RowAction) => {
    if (action === "approve") await runDecision([user.key], "approve", "Approved");
    else if (action === "decline") await runDecision([user.key], "decline", "Declined");
    else if (action === "remove") await runDecision([user.key], "decline", "Removed");
    else if (action === "cancel") {
      setBusy(user.key);
      try {
        await decideUsers([user.key], "cancel_invite");
        await load();
        setUndoKeys(null);
        setUndoEmail(user.email);
        setToast(`Cancelled: ${displayName(user)}`);
      } catch (err) {
        fail(err);
      } finally {
        setBusy(null);
      }
    }
  };

  const undo = async () => {
    const keys = undoKeys;
    const email = undoEmail;
    setUndoKeys(null);
    setUndoEmail(null);
    setToast(null);
    try {
      if (keys && keys.length > 0) {
        await decideUsers(keys, "reset");
      } else if (email) {
        await preapproveEmails([email]);
      }
      await load();
    } catch (err) {
      fail(err);
    }
  };

  const submitPreapprove = async () => {
    const emails = splitEmails(preapprove);
    if (emails.length === 0) return;
    setBusy("preapprove");
    try {
      const result = await preapproveEmails(emails);
      setPreapprove("");
      setTab("approved");
      await load();
      setUndoKeys(null);
      setUndoEmail(null);
      setToast(`Pre-approved: ${result.added.length} email${result.added.length === 1 ? "" : "s"}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const approveAll = async () => {
    setBusy("approve-all");
    try {
      const result = await approveVerified();
      await load();
      setUndoKeys(result.updated);
      setUndoEmail(null);
      setToast(`Approved: ${result.updated.length} verified user${result.updated.length === 1 ? "" : "s"}`);
    } catch (err) {
      fail(err);
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

  const counts = tabCounts(users, query);
  const rows = filterUsersByTab(users, tab, query);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Users</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              fullWidth
              multiline
              minRows={1}
              size="small"
              placeholder="name@company.com"
              value={preapprove}
              onChange={(event) => setPreapprove(event.target.value)}
              aria-label="Emails to pre-approve"
            />
            <Button
              variant="contained"
              onClick={submitPreapprove}
              disabled={busy === "preapprove" || splitEmails(preapprove).length === 0}
              sx={{ whiteSpace: "nowrap" }}
            >
              Pre-approve
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ overflowX: "auto" }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0 }}>
          <Tabs value={tab} onChange={(_, next: UsersTab) => setTab(next)} sx={{ flex: 1 }}>
            {(["pending", "approved", "declined"] as UsersTab[]).map((name) => (
              <Tab
                key={name}
                value={name}
                label={`${name[0].toUpperCase()}${name.slice(1)} (${counts[name]})`}
              />
            ))}
          </Tabs>
          <TextField
            size="small"
            type="search"
            placeholder="Search name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ width: 240 }}
            aria-label="Search name or email"
          />
        </Stack>
        {tab === "pending" && (
          <Box sx={{ py: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={approveAll}
              disabled={busy === "approve-all" || counts.pending === 0}
            >
              Approve all verified
            </Button>
          </Box>
        )}
        <UsersTable rows={rows} tab={tab} query={query} busy={busy} onAction={act} />
      </Box>

      <Snackbar
        open={toast !== null}
        message={toast}
        action={
          undoKeys || undoEmail ? (
            <Button color="info" size="small" onClick={undo}>
              Undo
            </Button>
          ) : undefined
        }
      />
    </Stack>
  );
}
