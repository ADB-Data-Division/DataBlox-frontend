'use client';

import React from "react";
import {
  Alert,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { SessionReview } from "@/services/coastalAdminService";

interface ValidationReportProps {
  review: SessionReview;
}

function StatTiles({ grain, stats }: { grain: string; stats: any }) {
  if (!stats || stats.rows === undefined) return null;
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ textTransform: "capitalize" }}>
        {grain}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {stats.rows} rows · {stats.cells} cells · {stats.aois} areas ·{" "}
        {stats.min_start} to {stats.max_end ?? stats.max_start}
      </Typography>
    </Box>
  );
}

export function ValidationReport({ review }: ValidationReportProps) {
  const monthlyInfo = review.info?.abt?.monthly?.info;
  const found: string[] = monthlyInfo?.indicator_columns_found ?? [];
  const missing: string[] = monthlyInfo?.indicator_columns_missing ?? [];
  const total = found.length + missing.length;
  const diff = review.info?.diff?.grains ?? {};

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6">Review</Typography>
        {review.readiness ? (
          <Chip label="Ready to publish" color="success" />
        ) : (
          <Chip label="Not ready" color="warning" />
        )}
      </Stack>

      {review.info?.abt && (
        <Box>
          <StatTiles grain="Monthly" stats={review.info.abt.monthly?.info} />
          <StatTiles grain="Weekly" stats={review.info.abt.weekly?.info} />
        </Box>
      )}

      {review.errors.map((issue) => (
        <Alert key={issue.code} severity="error">
          <Typography variant="body2">{issue.message}</Typography>
          {issue.hint && (
            <Typography variant="caption" display="block">
              {issue.hint}
            </Typography>
          )}
        </Alert>
      ))}

      {review.warnings.map((issue, index) => (
        <Alert key={`${issue.code}-${index}`} severity="warning">
          <Typography variant="body2">{issue.message}</Typography>
          {issue.hint && (
            <Typography variant="caption" display="block">
              {issue.hint}
            </Typography>
          )}
        </Alert>
      ))}

      {total > 0 && (
        <details>
          <summary>
            {found.length} of {total} found{" "}
            {missing.length > 0 && (
              <Chip label={`${missing.length} missing`} size="small" color="warning" />
            )}
          </summary>
          <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {found.map((col) => (
              <Chip key={col} label={col} size="small" variant="outlined" />
            ))}
            {missing.map((col) => (
              <Chip key={col} label={col} size="small" color="warning" />
            ))}
          </Box>
        </details>
      )}

      {Object.keys(diff).length > 0 && (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Grain</TableCell>
                <TableCell>Prod rows</TableCell>
                <TableCell>Staged rows</TableCell>
                <TableCell>New areas</TableCell>
                <TableCell>Dropped areas</TableCell>
                <TableCell>Lost bins</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(diff).map(([grain, entry]: [string, any]) => (
                <TableRow key={grain}>
                  <TableCell sx={{ textTransform: "capitalize" }}>{grain}</TableCell>
                  <TableCell>{entry.prod?.rows ?? "new"}</TableCell>
                  <TableCell>{entry.staged?.rows ?? "—"}</TableCell>
                  <TableCell>
                    {entry.new_aois_total ?? 0}
                    {(entry.new_aois ?? []).length > 0 &&
                      ` (${(entry.new_aois as string[]).slice(0, 3).join(", ")}…)`}
                  </TableCell>
                  <TableCell>
                    {entry.dropped_aois_total ?? 0}
                    {(entry.dropped_aois ?? []).length > 0 &&
                      ` (${(entry.dropped_aois as string[]).slice(0, 3).join(", ")}…)`}
                  </TableCell>
                  <TableCell>{entry.lost_bins ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}
