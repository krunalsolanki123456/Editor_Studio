import type { BlockAttributes } from './types';

export interface TableRowStyle {
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textTransform?: string;
  lineHeight?: number;
  letterSpacing?: number;
  height?: string;
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

export interface TableColumnStyle {
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textTransform?: string;
  lineHeight?: number;
  letterSpacing?: number;
  width?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface TableCellStyle {
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  textTransform?: string;
  lineHeight?: number;
  letterSpacing?: number;
  padding?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export interface TableCellSpan {
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean;
  mergedInto?: string; // 'r,c'
}

export type TableCellSpansMap = Record<string, TableCellSpan>;
export type TableCellStylesMatrix = TableCellStyle[][];

export function hexToRgba(hex: string, alpha: number = 0.14): string {
  if (!hex || typeof hex !== 'string') return '';
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((char) => char + char).join('');
  }
  if (cleanHex.length !== 6) return hex;
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isDarkColor(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((char) => char + char).join('');
  }
  if (cleanHex.length !== 6) return false;
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 165;
}

export type TableRowRole = 'header' | 'body' | 'footer';

export function getTableRowRole(
  rowIndex: number,
  rowCount: number,
  hasHeader: boolean,
  hasFooter: boolean,
): TableRowRole {
  if (hasHeader && rowIndex === 0) return 'header';
  if (hasFooter && rowIndex === rowCount - 1) return 'footer';
  return 'body';
}

export function getTableSections<T>(
  rows: T[],
  hasHeader: boolean,
  hasFooter: boolean,
): { header: T[]; body: T[]; footer: T[] } {
  const header = hasHeader && rows.length > 0 ? [rows[0]] : [];
  const footer = hasFooter && rows.length > 0 ? [rows[rows.length - 1]] : [];

  const bodyStart = hasHeader ? 1 : 0;
  const bodyEnd = hasFooter ? rows.length - 1 : rows.length;
  const body = rows.slice(bodyStart, bodyEnd);

  return { header, body, footer };
}

export function ensureTableRowStyles(attributes: BlockAttributes, rowCount: number): TableRowStyle[] {
  const styles = Array.isArray(attributes.rowStyles) ? (attributes.rowStyles as TableRowStyle[]) : [];
  return Array.from({ length: rowCount }, (_, index) => styles[index] ?? {});
}

export function ensureTableColumnStyles(attributes: BlockAttributes, columnCount: number): TableColumnStyle[] {
  const styles = Array.isArray(attributes.columnStyles) ? (attributes.columnStyles as TableColumnStyle[]) : [];
  return Array.from({ length: columnCount }, (_, index) => styles[index] ?? {});
}

export function updateTableRowStyle(
  attributes: BlockAttributes,
  rowIndex: number,
  patch: TableRowStyle,
): TableRowStyle[] {
  const rowCount = Array.isArray(attributes.rows) ? (attributes.rows as unknown[]).length : 0;
  const next = ensureTableRowStyles(attributes, rowCount);
  next[rowIndex] = { ...next[rowIndex], ...patch };
  return next;
}

export function updateTableColumnStyle(
  attributes: BlockAttributes,
  columnIndex: number,
  patch: TableColumnStyle,
): TableColumnStyle[] {
  const rows = Array.isArray(attributes.rows) ? (attributes.rows as string[][]) : [];
  const columnCount = rows[0]?.length ?? 0;
  const next = ensureTableColumnStyles(attributes, columnCount);
  next[columnIndex] = { ...next[columnIndex], ...patch };
  return next;
}

export function clearAllRowStyles(attributes: BlockAttributes): TableRowStyle[] {
  const rowCount = Array.isArray(attributes.rows) ? (attributes.rows as unknown[]).length : 0;
  return Array.from({ length: rowCount }, () => ({}));
}

export function clearAllColumnStyles(attributes: BlockAttributes): TableColumnStyle[] {
  const rows = Array.isArray(attributes.rows) ? (attributes.rows as string[][]) : [];
  const columnCount = rows[0]?.length ?? 0;
  return Array.from({ length: columnCount }, () => ({}));
}

export function applyZebraStriping(
  attributes: BlockAttributes,
  evenBg: string = '#f9fafb',
  oddBg: string = '#ffffff',
): TableRowStyle[] {
  const rows = Array.isArray(attributes.rows) ? (attributes.rows as unknown[]) : [];
  const hasHeader = Boolean(attributes.hasHeader);
  const currentStyles = ensureTableRowStyles(attributes, rows.length);

  return currentStyles.map((style, i) => {
    if (hasHeader && i === 0) return style;
    const isEven = hasHeader ? i % 2 === 1 : i % 2 === 0;
    return {
      ...style,
      backgroundColor: isEven ? evenBg : oddBg,
    };
  });
}

export function ensureTableCellStyles(
  attributes: BlockAttributes,
  rowCount: number,
  columnCount: number,
): TableCellStylesMatrix {
  const matrix = Array.isArray(attributes.cellStyles) ? (attributes.cellStyles as TableCellStyle[][]) : [];
  return Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: columnCount }, (_, c) => matrix[r]?.[c] ?? {})
  );
}

export function updateTableCellStyle(
  attributes: BlockAttributes,
  rowIndex: number,
  columnIndex: number,
  patch: TableCellStyle,
): TableCellStylesMatrix {
  const rows = Array.isArray(attributes.rows) ? (attributes.rows as string[][]) : [];
  const rowCount = rows.length;
  const columnCount = rows[0]?.length ?? 0;
  const next = ensureTableCellStyles(attributes, rowCount, columnCount);
  next[rowIndex] = [...(next[rowIndex] ?? [])];
  next[rowIndex][columnIndex] = { ...next[rowIndex][columnIndex], ...patch };
  return next;
}

export function updateTableCellRangeStyle(
  attributes: BlockAttributes,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  patch: TableCellStyle,
): TableCellStylesMatrix {
  const rows = Array.isArray(attributes.rows) ? (attributes.rows as string[][]) : [];
  const rowCount = rows.length;
  const columnCount = rows[0]?.length ?? 0;
  const next = ensureTableCellStyles(attributes, rowCount, columnCount);
  const minR = Math.min(startRow, endRow);
  const maxR = Math.max(startRow, endRow);
  const minC = Math.min(startCol, endCol);
  const maxC = Math.max(startCol, endCol);

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      next[r] = [...(next[r] ?? [])];
      next[r][c] = { ...next[r][c], ...patch };
    }
  }
  return next;
}

export function clearAllCellStyles(attributes: BlockAttributes): TableCellStylesMatrix {
  const rows = Array.isArray(attributes.rows) ? (attributes.rows as string[][]) : [];
  const rowCount = rows.length;
  const columnCount = rows[0]?.length ?? 0;
  return Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => ({})));
}

export function mergeCellsInAttributes(
  attributes: BlockAttributes,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): Record<string, TableCellSpan> {
  const spans = { ...(attributes.cellSpans as Record<string, TableCellSpan> || {}) };
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const rowSpan = maxRow - minRow + 1;
  const colSpan = maxCol - minCol + 1;

  if (rowSpan === 1 && colSpan === 1) return spans;

  const originKey = `${minRow},${minCol}`;
  spans[originKey] = { rowSpan, colSpan, hidden: false };

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (r === minRow && c === minCol) continue;
      spans[`${r},${c}`] = { rowSpan: 1, colSpan: 1, hidden: true, mergedInto: originKey };
    }
  }

  return spans;
}

export function unmergeCellsInAttributes(
  attributes: BlockAttributes,
  startRow: number,
  startCol: number,
): Record<string, TableCellSpan> {
  const spans = { ...(attributes.cellSpans as Record<string, TableCellSpan> || {}) };
  const key = `${startRow},${startCol}`;
  const target = spans[key];

  if (!target) return spans;

  const rowSpan = target.rowSpan || 1;
  const colSpan = target.colSpan || 1;

  delete spans[key];

  for (let r = startRow; r < startRow + rowSpan; r++) {
    for (let c = startCol; c < startCol + colSpan; c++) {
      delete spans[`${r},${c}`];
    }
  }

  return spans;
}

export function removeRowSpans(
  spans: Record<string, TableCellSpan> | undefined,
  removedRowIndex: number,
): Record<string, TableCellSpan> {
  if (!spans) return {};
  const nextSpans: Record<string, TableCellSpan> = {};

  Object.entries(spans).forEach(([key, val]) => {
    const [rStr, cStr] = key.split(',');
    const r = parseInt(rStr, 10);
    const c = parseInt(cStr, 10);

    if (r === removedRowIndex) return;

    if (r > removedRowIndex) {
      nextSpans[`${r - 1},${c}`] = val;
    } else {
      nextSpans[key] = val;
    }
  });

  return nextSpans;
}

export function removeColSpans(
  spans: Record<string, TableCellSpan> | undefined,
  removedColIndex: number,
): Record<string, TableCellSpan> {
  if (!spans) return {};
  const nextSpans: Record<string, TableCellSpan> = {};

  Object.entries(spans).forEach(([key, val]) => {
    const [rStr, cStr] = key.split(',');
    const r = parseInt(rStr, 10);
    const c = parseInt(cStr, 10);

    if (c === removedColIndex) return;

    if (c > removedColIndex) {
      nextSpans[`${r},${c - 1}`] = val;
    } else {
      nextSpans[key] = val;
    }
  });

  return nextSpans;
}

export function ensureCleanNewRowSpans(
  spans: Record<string, TableCellSpan> | undefined,
  newRowIndex: number,
  totalCols: number,
): Record<string, TableCellSpan> {
  if (!spans) return {};
  const nextSpans = { ...spans };
  for (let c = 0; c < totalCols; c++) {
    delete nextSpans[`${newRowIndex},${c}`];
  }
  return nextSpans;
}

export function ensureCleanNewColSpans(
  spans: Record<string, TableCellSpan> | undefined,
  newColIndex: number,
  totalRows: number,
): Record<string, TableCellSpan> {
  if (!spans) return {};
  const nextSpans = { ...spans };
  for (let r = 0; r < totalRows; r++) {
    delete nextSpans[`${r},${newColIndex}`];
  }
  return nextSpans;
}
