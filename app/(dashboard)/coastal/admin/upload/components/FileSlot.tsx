'use client';

import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { formatBytes } from "./upload-helpers";

export type FileSlotStatus = "idle" | "selected" | "uploading" | "done" | "error";

interface FileSlotProps {
  label: string;
  required: boolean;
  inputId: string;
  status: FileSlotStatus;
  fileName?: string;
  sizeBytes?: number;
  uploadedBytes?: number;
  error?: string;
  disabled?: boolean;
  onSelect: (file: File) => void;
}

export function FileSlot({
  label,
  required,
  inputId,
  status,
  fileName,
  sizeBytes,
  uploadedBytes,
  error,
  disabled,
  onSelect,
}: FileSlotProps) {
  const progress =
    sizeBytes && uploadedBytes !== undefined
      ? Math.min(100, (uploadedBytes / Math.max(1, sizeBytes)) * 100)
      : 0;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1">{label}</Typography>
            {!required && <Chip label="Optional" size="small" variant="outlined" />}
            {status === "done" && (
              <Chip
                icon={<CheckCircleIcon />}
                label="Uploaded"
                size="small"
                color="success"
              />
            )}
          </Stack>
          {fileName && (
            <Typography variant="body2" color="text.secondary">
              {fileName} · {formatBytes(sizeBytes)}
            </Typography>
          )}
          {(status === "uploading" || status === "done") && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={status === "done" ? 100 : progress}
              />
              {status === "uploading" && (
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(uploadedBytes)} of {formatBytes(sizeBytes)}
                </Typography>
              )}
            </Box>
          )}
          {status === "error" && error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          <Box>
            <input
              id={inputId}
              type="file"
              hidden
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onSelect(file);
                }
              }}
            />
            <label htmlFor={inputId}>
              <Button variant="outlined" component="span" disabled={disabled}>
                Choose file
              </Button>
            </label>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
