'use client';

import React from "react";
import { Card, CardActionArea, CardContent, Stack, Typography } from "@mui/material";
import type { UploadMode } from "./upload-helpers";

interface UploadModeCardProps {
  mode: UploadMode;
  onChange: (mode: UploadMode) => void;
}

export function UploadModeCard({ mode, onChange }: UploadModeCardProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <Card
        variant={mode === "replace" ? "elevation" : "outlined"}
        sx={{ flex: 1, borderWidth: mode === "replace" ? 2 : 1 }}
      >
        <CardActionArea onClick={() => onChange("replace")}>
          <CardContent>
            <Typography variant="h6">Replace a country&apos;s data</Typography>
          </CardContent>
        </CardActionArea>
      </Card>
      <Card
        variant={mode === "new" ? "elevation" : "outlined"}
        sx={{ flex: 1, borderWidth: mode === "new" ? 2 : 1 }}
      >
        <CardActionArea onClick={() => onChange("new")}>
          <CardContent>
            <Typography variant="h6">Add a new country</Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Stack>
  );
}
