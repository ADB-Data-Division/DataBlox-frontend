import {
  generateCsvContent,
  generateExcelXml,
  escapeXml,
  exportToCsv,
  exportToExcel,
  exportGraphAsPng,
} from '@/src/utils/coastalExport';

describe('Coastal Data Export Utilities', () => {
  const sampleData = [
    { period_start: '2024-01-01', chlor_a: 2.34, vessels: 45 },
    { period_start: '2024-02-01', chlor_a: 3.12, vessels: 50 },
  ];
  const headers = [
    { key: 'period_start', label: 'Period' },
    { key: 'chlor_a', label: 'Chlorophyll-a' },
    { key: 'vessels', label: 'Vessel Count' },
  ];

  test('escapeXml escapes XML special characters correctly', () => {
    expect(escapeXml('<tag & "quote" \'apostrophe\'>')).toBe(
      '&lt;tag &amp; &quot;quote&quot; &apos;apostrophe&apos;&gt;'
    );
  });

  test('generateCsvContent creates valid RFC 4180 CSV string with headers', () => {
    const csv = generateCsvContent(sampleData, headers);
    const lines = csv.split('\r\n');

    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('"Period","Chlorophyll-a","Vessel Count"');
    expect(lines[1]).toBe('"2024-01-01","2.34","45"');
    expect(lines[2]).toBe('"2024-02-01","3.12","50"');
  });

  test('generateCsvContent handles empty and null values properly', () => {
    const dataWithNulls = [{ period_start: '2024-01-01', chlor_a: null, vessels: undefined }];
    const csv = generateCsvContent(dataWithNulls, headers);
    const lines = csv.split('\r\n');

    expect(lines[1]).toBe('"2024-01-01","",""');
  });

  test('generateExcelXml creates valid XML Spreadsheet 2003 structure', () => {
    const xml = generateExcelXml('Coastal Data', sampleData, headers);

    expect(xml).toContain('<?xml version="1.0"?>');
    expect(xml).toContain('ss:Name="Coastal Data"');
    expect(xml).toContain('<Data ss:Type="String">Chlorophyll-a</Data>');
    expect(xml).toContain('<Data ss:Type="Number">2.34</Data>');
    expect(xml).toContain('<Data ss:Type="Number">45</Data>');
  });

  test('exportToCsv and exportToExcel execute safely in node environment without window', () => {
    expect(() => exportToCsv('test.csv', sampleData, headers)).not.toThrow();
    expect(() => exportToExcel('test.xls', 'Sheet1', sampleData, headers)).not.toThrow();
  });

  test('exportGraphAsPng executes safely when window is undefined', async () => {
    await expect(exportGraphAsPng('container', 'graph.png')).resolves.toBeUndefined();
  });
});
