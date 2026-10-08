/**
 * Pure wizard helpers for the coastal upload portal.
 * Kept free of JSX and hooks so the rules stay unit-testable in node.
 */

export type UploadMode = "replace" | "new";

export type SlotKey = "monthly" | "weekly" | "vessel" | "grid" | "adm";

export interface SlotSpec {
  key: SlotKey;
  label: string;
  required: boolean;
}

const ALL_SLOTS: SlotSpec[] = [
  { key: "monthly", label: "Monthly report", required: true },
  { key: "weekly", label: "Weekly report", required: true },
  { key: "vessel", label: "Vessel activity", required: false },
  { key: "grid", label: "Map areas", required: false },
  { key: "adm", label: "Region boundaries", required: false },
];

/**
 * File slots for a mode. Replace needs both ABT grains, everything else
 * optional. New country needs all five kinds.
 */
export function slotsForMode(mode: UploadMode): SlotSpec[] {
  if (mode === "new") {
    return ALL_SLOTS.map((slot) => ({ ...slot, required: true }));
  }
  return ALL_SLOTS;
}

/** The country picker only exists for Replace mode. */
export function showsCountryPicker(mode: UploadMode): boolean {
  return mode === "replace";
}

/** Human file sizes for slots, sidebar, and dashboard cards. */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Publish button gating: readiness from the server plus the checkbox. */
export function canPublish(
  readiness: boolean,
  confirm: boolean,
  mode: UploadMode,
  countryName: string
): boolean {
  if (!readiness || !confirm) {
    return false;
  }
  if (mode === "new" && !countryName.trim()) {
    return false;
  }
  return true;
}
