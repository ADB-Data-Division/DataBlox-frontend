'use client';

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import {
  checkAllowed,
  fetchAdminCountries,
  type AdminCountry,
} from "@/services/coastalAdminService";
import {
  fetchCoastalLocations,
  fetchIndicatorTimeline,
  fetchSpatialSlice,
  fetchVesselDistribution,
} from "@/services/coastalService";
import { IndicatorTimelineChart } from "../../components/IndicatorTimelineChart";
import CoastalChoroplethMap from "../../components/CoastalChoroplethMap";
import { AccessDenied } from "../upload/components/AccessDenied";
import type { IndicatorTimelinePoint } from "@/types/coastal";

function monthBounds(endDay: string): { start: string; end: string } {
  const year = Number(endDay.slice(0, 4));
  const month = Number(endDay.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();
  const prefix = endDay.slice(0, 8);
  return { start: `${prefix}01`, end: `${prefix}${String(lastDay).padStart(2, "0")}` };
}

export default function PageContent() {
  const [gate, setGate] = useState<"loading" | "denied" | "allowed">("loading");
  const [gateEmail, setGateEmail] = useState<string | null>(null);
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [iso, setIso] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [areas, setAreas] = useState<number | null>(null);
  const [vessels, setVessels] = useState<number | null>(null);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [timeline, setTimeline] = useState<IndicatorTimelinePoint[]>([]);
  const [slice, setSlice] = useState<Record<string, any> | undefined>(undefined);

  async function loadCountryInto(nextIso: string, list: AdminCountry[]) {
    const country = list.find((c) => c.iso === nextIso);
    if (!country) return;
    setLoading(true);
    setError(null);
    try {
      const end = country.date_range?.end ?? "";
      const start = country.date_range?.start ?? "";
      const { start: sliceStart, end: sliceEnd } = end
        ? monthBounds(end.slice(0, 10))
        : { start, end };
      const [locations, timelineResp, sliceResp, vesselResp] = await Promise.all([
        fetchCoastalLocations(nextIso),
        fetchIndicatorTimeline({
          country: nextIso,
          start_date: start,
          end_date: end,
          grain: "monthly",
          indicators: ["chlor_a"],
          agg_func: "average",
        }),
        end
          ? fetchSpatialSlice({
              country: nextIso,
              period_start: sliceStart,
              period_end: sliceEnd,
              grain: "monthly",
              indicator: "chlor_a",
            })
          : Promise.resolve(null),
        fetchVesselDistribution({ country: nextIso, start_date: start, end_date: end }),
      ]);
      setAreas(locations.length);
      setVessels(vesselResp.total_vessels);
      setRange({ start, end });
      setTimeline(timelineResp.timeline ?? timelineResp.series ?? []);
      setSlice(sliceResp ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = (nextIso: string) => {
    setIso(nextIso);
    void loadCountryInto(nextIso, countries);
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
        return fetchAdminCountries(true);
      })
      .then((list) => {
        if (!list) return;
        setCountries(list);
        const first = list[0];
        if (first) {
          setIso(first.iso);
          void loadCountryInto(first.iso, list);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (gate === "loading") {
    return <Typography color="text.secondary">Checking access…</Typography>;
  }
  if (gate === "denied") {
    return <AccessDenied email={gateEmail} />;
  }

  const country = countries.find((c) => c.iso === iso);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Preview</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Card variant="outlined">
        <CardContent>
          <FormControl fullWidth>
            <InputLabel id="preview-country-label">Country</InputLabel>
            <Select
              labelId="preview-country-label"
              label="Country"
              value={iso}
              onChange={(event) => handleSelect(event.target.value)}
            >
              {countries.map((entry) => (
                <MenuItem key={entry.iso} value={entry.iso}>
                  {entry.name} ({entry.iso})
                  {entry.enabled === false ? " · disabled" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {loading && <Typography color="text.secondary">Loading country data…</Typography>}

      {!loading && country && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Areas</Typography>
              <Typography variant="h5">{areas ?? "—"}</Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Vessels</Typography>
              <Typography variant="h5">{vessels ?? "—"}</Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Date range</Typography>
              <Typography variant="h6">
                {range ? `${range.start} to ${range.end}` : "—"}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {!loading && timeline.length > 0 && range && (
        <IndicatorTimelineChart
          data={timeline}
          indicators={["chlor_a"]}
          grain="monthly"
          locationName={country?.name ?? iso}
          dateRange={range}
          onSelectPoint={() => {}}
        />
      )}

      {!loading && slice && (
        <Box sx={{ height: 420 }}>
          <CoastalChoroplethMap
            country={iso}
            activeIndicator="chlor_a"
            spatialSlice={slice}
            onSelectCell={() => {}}
          />
        </Box>
      )}
    </Stack>
  );
}
