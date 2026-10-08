'use client';

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import {
  checkAllowed,
  fetchAdminCountries,
  fetchUpload,
  initUpload,
  publishUpload,
  uploadChunks,
  type AdminCountry,
  type PublishParams,
  type PublishReceipt,
  type SessionReview,
} from "@/services/coastalAdminService";
import { UploadModeCard } from "./components/UploadModeCard";
import { FileSlot, type FileSlotStatus } from "./components/FileSlot";
import { ValidationReport } from "./components/ValidationReport";
import { PublishBar } from "./components/PublishBar";
import { AccessDenied } from "./components/AccessDenied";
import {
  showsCountryPicker,
  slotsForMode,
  type SlotKey,
  type UploadMode,
} from "./components/upload-helpers";

type GateState = "loading" | "denied" | "allowed";

const STEPS = ["Choose", "Files", "Review"];

export default function PageContent() {
  const [gate, setGate] = useState<GateState>("loading");
  const [gateEmail, setGateEmail] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<UploadMode>("replace");
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [countryIso, setCountryIso] = useState("");

  const [picked, setPicked] = useState<Partial<Record<SlotKey, File>>>({});
  const [progress, setProgress] = useState<Record<string, { uploaded: number; total: number }>>({});
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);

  const [review, setReview] = useState<SessionReview | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [receipt, setReceipt] = useState<PublishReceipt | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    checkAllowed()
      .then((result) => {
        setGateEmail(result.email);
        setGate(result.allowed ? "allowed" : "denied");
        if (result.allowed) {
          fetchAdminCountries(true)
            .then(setCountries)
            .catch((err: Error) => setPageError(err.message));
        }
      })
      .catch((err: Error) => setGateError(err.message));
  }, []);

  const slots = slotsForMode(mode);

  const pickFile = useCallback((key: SlotKey, file: File) => {
    setPicked((prev) => ({ ...prev, [key]: file }));
    setSlotErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const startUpload = useCallback(async () => {
    setPageError(null);
    const entries = Object.entries(picked) as [SlotKey, File][];
    if (entries.length === 0) {
      setPageError("Choose at least one file.");
      return;
    }
    const iso = mode === "replace" ? countryIso : "NEW";
    if (mode === "replace" && !iso) {
      setPageError("Choose a country.");
      return;
    }
    setUploading(true);
    try {
      const session = await initUpload(
        iso,
        entries.map(([, file]) => ({ name: file.name, size_bytes: file.size }))
      );
      setUploadId(session.upload_id);
      for (const [, file] of entries) {
        try {
          await uploadChunks(session.upload_id, file.name, file, (uploaded, total) =>
            setProgress((prev) => ({ ...prev, [file.name]: { uploaded, total } }))
          );
        } catch (err) {
          setSlotErrors((prev) => ({
            ...prev,
            [file.name]: err instanceof Error ? err.message : String(err),
          }));
          throw err;
        }
      }
      setLoadingReview(true);
      const full = await fetchUpload(session.upload_id, true);
      setReview(full.review);
      setStep(2);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      setLoadingReview(false);
    }
  }, [picked, mode, countryIso]);

  const doPublish = useCallback(
    async (params: PublishParams) => {
      if (!uploadId) return;
      setPublishing(true);
      setPageError(null);
      try {
        const result = await publishUpload(uploadId, params);
        setReceipt(result);
      } catch (err) {
        setPageError(err instanceof Error ? err.message : String(err));
      } finally {
        setPublishing(false);
      }
    },
    [uploadId]
  );

  const resetAll = useCallback(() => {
    setPicked({});
    setProgress({});
    setSlotErrors({});
    setUploadId(null);
    setReview(null);
    setReceipt(null);
    setPageError(null);
    setStep(0);
  }, []);

  if (gate === "loading") {
    return <Typography color="text.secondary">Checking access…</Typography>;
  }
  if (gateError) {
    return <Alert severity="error">{gateError}</Alert>;
  }
  if (gate === "denied") {
    return <AccessDenied email={gateEmail} />;
  }

  const slotStatus = (key: SlotKey, file?: File): FileSlotStatus => {
    if (!file) return "idle";
    if (slotErrors[file.name]) return "error";
    const done = review?.files.find((f) => f.name === file.name)?.complete;
    if (done) return "done";
    if (uploading || progress[file.name]) return "uploading";
    return "selected";
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Coastal upload portal</Typography>
      {pageError && <Alert severity="error">{pageError}</Alert>}
      <Stepper activeStep={step}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {step === 0 && (
        <Stack spacing={2}>
          <UploadModeCard
            mode={mode}
            onChange={(next) => {
              setMode(next);
              setPicked({});
            }}
          />
          {showsCountryPicker(mode) && (
            <Card variant="outlined">
              <CardContent>
                <FormControl fullWidth>
                  <InputLabel id="country-label">Country</InputLabel>
                  <Select
                    labelId="country-label"
                    label="Country"
                    value={countryIso}
                    onChange={(event) => setCountryIso(event.target.value)}
                  >
                    {countries.map((country) => (
                      <MenuItem key={country.iso} value={country.iso}>
                        {country.name} ({country.iso})
                        {country.enabled === false ? " · disabled" : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          )}
          <Box>
            <Button
              variant="contained"
              onClick={() => setStep(1)}
              disabled={mode === "replace" && !countryIso}
            >
              Continue
            </Button>
          </Box>
        </Stack>
      )}

      {step === 1 && (
        <Stack spacing={2}>
          {slots.map((slot) => {
            const file = picked[slot.key];
            const prog = file ? progress[file.name] : undefined;
            return (
              <FileSlot
                key={slot.key}
                label={slot.label}
                required={slot.required}
                inputId={`file-${slot.key}`}
                status={slotStatus(slot.key, file)}
                fileName={file?.name}
                sizeBytes={file?.size}
                uploadedBytes={prog?.uploaded}
                error={file ? slotErrors[file.name] : undefined}
                disabled={uploading}
                onSelect={(next) => pickFile(slot.key, next)}
              />
            );
          })}
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setStep(0)} disabled={uploading}>
              Back
            </Button>
            <Button variant="contained" onClick={startUpload} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload files"}
            </Button>
          </Stack>
          {loadingReview && (
            <Typography color="text.secondary">Validating uploaded files…</Typography>
          )}
        </Stack>
      )}

      {step === 2 && review && (
        <Stack spacing={2}>
          <ValidationReport review={review} />
          <PublishBar
            readiness={review.readiness}
            mode={mode}
            publishing={publishing}
            receipt={receipt}
            error={pageError}
            onPublish={doPublish}
            onReset={resetAll}
          />
        </Stack>
      )}
    </Stack>
  );
}
