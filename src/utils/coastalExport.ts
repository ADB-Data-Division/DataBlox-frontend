/**
 * Utility functions for exporting coastal indicator and vessel datasets.
 * Supports CSV text, Excel workbook (Spreadsheet XML), and Graph PNG image exports.
 */

export interface ExportColumnHeader {
  key: string;
  label: string;
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
