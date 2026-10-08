/** Shared pan/zoom state for the side-by-side choropleth panels. */
export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}

// Panels differ by a pixel or two after setView, so equality is tolerant.
// Without it the two maps would keep re-sending near-identical views.
const COORD_EPSILON = 2e-4;

export function viewsEqual(a: MapView | null | undefined, b: MapView | null | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    a.zoom === b.zoom &&
    Math.abs(a.lat - b.lat) < COORD_EPSILON &&
    Math.abs(a.lng - b.lng) < COORD_EPSILON
  );
}
