export const VESSEL_LABEL_MIN_ZOOM = 10;

export function shouldShowVesselCountLabels(zoom: number): boolean {
  return Number.isFinite(zoom) && zoom >= VESSEL_LABEL_MIN_ZOOM;
}
