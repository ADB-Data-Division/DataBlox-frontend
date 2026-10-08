'use client';

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { PublishParams, PublishReceipt } from "@/services/coastalAdminService";
import type { UploadMode } from "./upload-helpers";
import { canPublish } from "./upload-helpers";

interface PublishBarProps {
  readiness: boolean;
  mode: UploadMode;
  publishing: boolean;
  receipt: PublishReceipt | null;
  error: string | null;
  onPublish: (params: PublishParams) => void;
  onReset: () => void;
}

export function PublishBar({
  readiness,
  mode,
  publishing,
  receipt,
  error,
  onPublish,
  onReset,
}: PublishBarProps) {
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  const [countryName, setCountryName] = useState("");

  if (receipt) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h6">Published</Typography>
            <Typography variant="body2" color="text.secondary">
              {receipt.iso} · {receipt.mode} · {receipt.published_at}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Backup: {receipt.backup_path}
            </Typography>
            <Box>
              <Button variant="outlined" onClick={onReset}>
                Upload another batch
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          {mode === "new" && (
            <TextField
              label="Country name"
              value={countryName}
              onChange={(event) => setCountryName(event.target.value)}
              placeholder="e.g. Vietnam"
              fullWidth
            />
          )}
          <TextField
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for the audit log"
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={confirm}
                onChange={(event) => setConfirm(event.target.checked)}
              />
            }
            label="I checked the review above"
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Box>
            <Button
              variant="contained"
              disabled={!canPublish(readiness, confirm, mode, countryName) || publishing}
              onClick={() => onPublish({ mode: mode === "new" ? "new" : "overwrite", country_name: countryName.trim(), note: note.trim() })}
            >
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
