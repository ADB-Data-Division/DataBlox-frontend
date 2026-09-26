/**
 * Utility functions for exporting coastal indicator and vessel datasets.
 * Supports CSV text, Excel workbook (Spreadsheet XML), and Graph PNG image exports.
 *
 * Null policy: a null value means "no data" and is written as an empty cell
 * in CSV and Excel, never as 0. A real 0 is written as 0.
 */

import type { IndicatorTimelinePoint } from '@/types/coastal';

export interface ExportColumnHeader {
  key: string;
  label: string;
}

/**
 * Build export headers for any set of registry indicator ids. The export
 * supports every indicator column the timeline carries (all 57 ABT columns
 * flow through the generic `values` flattening in buildIndicatorExportRows).
 */
export async function buildIndicatorExportHeaders(
  indicatorIds: string[],
): Promise<ExportColumnHeader[]> {
  const { getIndicatorMeta } = await import(
    '@/app/(dashboard)/coastal/indicators'
  );
  const headers: ExportColumnHeader[] = [
    { key: 'period_start', label: 'Period Start' },
    { key: 'period_end', label: 'Period End' },
  ];
  for (const id of indicatorIds) {
    const meta = getIndicatorMeta(id);
    headers.push({
      key: id,
      label: meta ? `${meta.label} (${meta.unit})` : id,
    });
  }
  return headers;
}

/**
 * Flatten timeline points (canonical `values` dict plus legacy fixed fields
 * during migration) into one row per period. Null stays null so the CSV and
 * Excel writers emit an empty cell, never 0.
 */
export function buildIndicatorExportRows(
  timeline: IndicatorTimelinePoint[],
  indicatorIds: string[],
): Record<string, unknown>[] {
  const legacyKeys: Record<string, string[]> = {
    chlor_a: ['chlor_a', 'mean_chlor_a'],
    sst: ['sst_c', 'sst_k', 'mean_sea_surface_temperature'],
    vessels: ['total_vessels', 'unique_vessels', 'n_unique_vessels'],
    presence_hours: ['total_presence_hours'],
    duration: ['port_call_duration_hours', 'total_stationary_hours', 'total_presence_hours'],
  };
  return timeline.map((pt) => {
    const row: Record<string, unknown> = {
      period_start: pt.period_start,
      period_end: pt.period_end,
    };
    for (const id of indicatorIds) {
      let value: number | null | undefined;
      if (pt.values && pt.values[id] !== undefined) {
        value = pt.values[id];
      } else {
        const record = pt as unknown as Record<string, number | null | undefined>;
        for (const key of legacyKeys[id] || [id]) {
          if (record[key] !== undefined) {
            value = record[key];
            break;
          }
        }
      }
      row[id] = value ?? null;
    }
    return row;
  });
}

/**
 * Trigger browser file download from a Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Escape XML special characters.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format tabular rows into RFC 4180 compliant CSV string.
 */
export function generateCsvContent(
  rows: Record<string, any>[],
  headers?: ExportColumnHeader[]
): string {
  if (!rows || rows.length === 0) return '';

  const cols: ExportColumnHeader[] =
    headers && headers.length > 0
      ? headers
      : Object.keys(rows[0]).map((k) => ({ key: k, label: k }));

  const headerLine = cols
    .map((c) => `"${c.label.replace(/"/g, '""')}"`)
    .join(',');

  const dataLines = rows.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key];
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Export tabular data as an RFC 4180 CSV file download.
 */
export function exportToCsv(
  filename: string,
  rows: Record<string, any>[],
  headers?: ExportColumnHeader[]
): void {
  const csvContent = generateCsvContent(rows, headers);
  if (!csvContent) return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Format tabular rows into XML Spreadsheet 2003 workbook string.
 */
export function generateExcelXml(
  sheetName: string,
  rows: Record<string, any>[],
  headers?: ExportColumnHeader[]
): string {
  if (!rows || rows.length === 0) return '';

  const cols: ExportColumnHeader[] =
    headers && headers.length > 0
      ? headers
      : Object.keys(rows[0]).map((k) => ({ key: k, label: k }));

  const cleanSheetName = (sheetName || 'Data').replace(/[\\/?*[\]]/g, '_').slice(0, 31);

  const headerCells = cols
    .map(
      (c) =>
        `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(c.label)}</Data></Cell>`
    )
    .join('\n');

  const rowBlocks = rows
    .map((row) => {
      const cells = cols
        .map((c) => {
          const val = row[c.key];
          if (val === undefined || val === null) {
            return '    <Cell><Data ss:Type="String"></Data></Cell>';
          }
          if (typeof val === 'number') {
            return `    <Cell><Data ss:Type="Number">${val}</Data></Cell>`;
          }
          return `    <Cell><Data ss:Type="String">${escapeXml(String(val))}</Data></Cell>`;
        })
        .join('\n');
      return `   <Row>\n${cells}\n   </Row>`;
    })
    .join('\n');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${cleanSheetName}">
  <Table>
   <Row>
${headerCells}
   </Row>
${rowBlocks}
  </Table>
 </Worksheet>
</Workbook>`;
}

/**
 * Export tabular data as an XML Spreadsheet 2003 workbook (.xls) file download.
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, any>[],
  headers?: ExportColumnHeader[]
): void {
  const xml = generateExcelXml(sheetName, rows, headers);
  if (!xml) return;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`);
}

/**
 * Load an image with CORS so drawing it to canvas does not taint the export.
 * Esri World Imagery serves `Access-Control-Allow-Origin: *`, so tiles reload
 * cleanly with `crossOrigin = 'anonymous'`.
 */
function loadCORSImage(src: string, timeoutMs = 8000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => reject(new Error(`Timed out loading ${src}`)), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Failed to load ${src}`));
    };
    img.src = src;
  });
}

/**
 * Capture a Leaflet map (satellite tile <img> layers + Deck.gl / Leaflet
 * overlay <canvas> layers) by compositing them onto one export canvas.
 *
 * Why this exists: the generic `exportGraphAsPng` below only grabs the first
 * `<canvas>` in the container. For the coastal choropleth that is the Deck.gl
 * WebGL hex layer, so the Esri satellite basemap (rendered as `<img>` tiles)
 * is missing and the PNG comes out as hexes on a black background.
 */
export async function exportLeafletMapAsPng(
  containerElementOrId: HTMLElement | string,
  filename: string,
  options?: { scale?: number; background?: string; attribution?: string }
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const container: HTMLElement | null =
    typeof containerElementOrId === 'string'
      ? document.getElementById(containerElementOrId) ||
        document.querySelector(containerElementOrId)
      : containerElementOrId;

  if (!container) {
    console.warn(`Export container not found: ${containerElementOrId}`);
    return;
  }

  // The Leaflet map root holds the tile pane, overlay panes, and Deck overlay.
  const mapEl =
    (container.querySelector('.leaflet-container') as HTMLElement | null) ?? container;
  const mapRect = mapEl.getBoundingClientRect();
  const width = Math.max(100, Math.round(mapRect.width));
  const height = Math.max(100, Math.round(mapRect.height));
  const scale = options?.scale ?? 2;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = Math.round(width * scale);
  exportCanvas.height = Math.round(height * scale);
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = options?.background ?? '#000000';
  ctx.fillRect(0, 0, width, height);

  const offsetOf = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { dx: r.left - mapRect.left, dy: r.top - mapRect.top, dw: r.width, dh: r.height };
  };

  // 1. Basemap tiles (<img class="leaflet-tile">). Reload with CORS so the
  // export canvas is not tainted; draw at each tile's on-screen position.
  const tileImgs = Array.from(mapEl.querySelectorAll('img.leaflet-tile')) as HTMLImageElement[];
  await Promise.all(
    tileImgs.map(async (tile) => {
      const src = tile.currentSrc || tile.src;
      if (!src) return;
      const { dx, dy, dw, dh } = offsetOf(tile);
      if (dw <= 0 || dh <= 0) return;
      // Skip tiles fully outside the viewport.
      if (dx + dw < 0 || dy + dh < 0 || dx > width || dy > height) return;
      try {
        const img = await loadCORSImage(src);
        ctx.drawImage(img, dx, dy, dw, dh);
      } catch (err) {
        console.warn('Skipping basemap tile for export:', err);
      }
    })
  );

  // 2. Overlay canvases: Deck.gl WebGL hex layer + Leaflet Canvas renderer.
  // Requires the Deck canvas to use preserveDrawingBuffer, otherwise
  // drawImage may read back a blank buffer.
  const overlayCanvases = Array.from(mapEl.querySelectorAll('canvas')) as HTMLCanvasElement[];
  for (const c of overlayCanvases) {
    try {
      const { dx, dy, dw, dh } = offsetOf(c);
      if (dw <= 0 || dh <= 0 || c.width === 0 || c.height === 0) continue;
      ctx.drawImage(c, dx, dy, dw, dh);
    } catch (err) {
      console.warn('Skipping overlay canvas for export (likely tainted WebGL):', err);
    }
  }

  // 3. Inline SVG overlays (Leaflet SVG renderer fallback path).
  const svgEls = Array.from(
    mapEl.querySelectorAll('.leaflet-overlay-pane svg')
  ) as SVGSVGElement[];
  for (const svg of svgEls) {
    try {
      const { dx, dy, dw, dh } = offsetOf(svg);
      if (dw <= 0 || dh <= 0) continue;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = url;
        });
        ctx.drawImage(img, dx, dy, dw, dh);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.warn('Skipping SVG overlay for export:', err);
    }
  }

  // 4. Attribution footer so the Esri credit survives the export.
  const attribution =
    options?.attribution ??
    'Tiles (c) Esri, Maxar, Earthstar Geographics and the GIS User Community';
  try {
    ctx.font = '11px Inter, Roboto, Helvetica, Arial, sans-serif';
    const textWidth = ctx.measureText(attribution).width;
    const pad = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(width - textWidth - pad * 2, height - 22, textWidth + pad * 2, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(attribution, width - textWidth - pad, height - 7);
  } catch {
    // Attribution is best-effort only.
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    exportCanvas.toBlob(resolve, 'image/png')
  );
  if (blob) {
    downloadBlob(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
  }
}

/**
 * Capture an SVG or Canvas chart element and export as a PNG image download.
 */
export async function exportGraphAsPng(
  containerElementOrId: HTMLElement | string,
  filename: string
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const container: HTMLElement | null =
    typeof containerElementOrId === 'string'
      ? document.getElementById(containerElementOrId) || document.querySelector(containerElementOrId)
      : containerElementOrId;

  if (!container) {
    console.warn(`Export container not found: ${containerElementOrId}`);
    return;
  }

  // 1. Check for Canvas element
  const canvasElement = container.querySelector('canvas') as HTMLCanvasElement | null;
  if (canvasElement) {
    try {
      const dataUrl = canvasElement.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
      return;
    } catch {
      // Fall through to SVG check
    }
  }

  // 2. Check for SVG element
  const svgElement = container.querySelector('svg') as SVGSVGElement | null;
  if (!svgElement) {
    console.warn('No SVG or Canvas element found inside export container');
    return;
  }

  const svgRect = svgElement.getBoundingClientRect();
  const width = Math.max(svgElement.clientWidth || 0, svgRect.width, 600);
  const height = Math.max(svgElement.clientHeight || 0, svgRect.height, 350);

  const cloneSvg = svgElement.cloneNode(true) as SVGSVGElement;
  cloneSvg.setAttribute('width', String(width));
  cloneSvg.setAttribute('height', String(height));
  cloneSvg.style.backgroundColor = '#ffffff';

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(cloneSvg);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
      }
    }, 'image/png');
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
  };
  image.src = url;
}
