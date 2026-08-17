import { useRef, useState } from 'react';
import { Upload, Link as LinkIcon, Download, Plus, Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useEditorStore } from '../store';
import { fileToDataUrl } from '../media';
import { useResponsive } from '../responsive';
import { getTypographyStyle, fontFamilyStack } from '../typography';
import type { BlockInstance, TextAlign } from '../types';
import {
  ensureTableColumnStyles,
  ensureTableRowStyles,
  ensureTableCellStyles,
  updateTableCellRangeStyle,
  getTableSections,
  hexToRgba,
  mergeCellsInAttributes,
  unmergeCellsInAttributes,
  removeRowSpans,
  removeColSpans,
  ensureCleanNewRowSpans,
  ensureCleanNewColSpans,
} from '../table';

interface BlockProps {
  block: BlockInstance;
  selected: boolean;
}

function alignClass(align: TextAlign): string {
  return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : align === 'justify' ? 'text-justify' : 'text-left';
}

export function TableBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const rows = a.rows as string[][];
  const hasHeader = Boolean(a.hasHeader);
  const hasFooter = Boolean(a.hasFooter);
  const align = a.align as TextAlign;
  const columnCount = rows[0]?.length ?? 0;
  const rowStyles = ensureTableRowStyles(a, rows.length);
  const columnStyles = ensureTableColumnStyles(a, columnCount);
  const cellSpans = (a.cellSpans as Record<string, any>) || {};
  const borderColor = typeof a.borderColor === 'string' && a.borderColor ? a.borderColor : '#d1d5db';
  const borderWidth = typeof a.borderWidth === 'number' ? a.borderWidth : 1;

  const [selectedRange, setSelectedRange] = useState<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const topLeftRadius = (a.borderTopLeftRadius as number) ?? (a.tableBorderRadius as number) ?? 0;
  const topRightRadius = (a.borderTopRightRadius as number) ?? (a.tableBorderRadius as number) ?? 0;
  const bottomLeftRadius = (a.borderBottomLeftRadius as number) ?? (a.tableBorderRadius as number) ?? 0;
  const bottomRightRadius = (a.borderBottomRightRadius as number) ?? (a.tableBorderRadius as number) ?? 0;

  const borderCollapse = (a.borderCollapse as string) || 'collapse';
  const tableWidth = (a.tableWidth as string) || '100%';

  const tableStyle = {
    ...getTypographyStyle('table', a),
    textAlign: align,
    borderCollapse: borderCollapse as any,
    borderSpacing: borderCollapse === 'separate' ? '4px' : 0,
    width: tableWidth,
  };

  const isCellSelected = (r: number, c: number) => {
    if (!selectedRange) return false;
    const minR = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxR = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minC = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxC = Math.max(selectedRange.startCol, selectedRange.endCol);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const isMultiCellSelected = selectedRange
    ? selectedRange.startRow !== selectedRange.endRow || selectedRange.startCol !== selectedRange.endCol
    : false;

  const getSelectionSummaryText = () => {
    if (!selectedRange) return '';
    const minR = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxR = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minC = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxC = Math.max(selectedRange.startCol, selectedRange.endCol);
    const rCount = maxR - minR + 1;
    const cCount = maxC - minC + 1;

    if (rCount === 1 && cCount === 1) {
      return `Selected: Row ${minR + 1}, Column ${minC + 1}`;
    }
    if (cCount === columnCount && rCount === 1) {
      return `Selected Entire Row ${minR + 1} (${cCount} Columns)`;
    }
    if (rCount === rows.length && cCount === 1) {
      return `Selected Entire Column ${minC + 1} (${rCount} Rows)`;
    }
    if (cCount === columnCount && rCount === rows.length) {
      return `Selected Entire Table (${rCount} Rows × ${cCount} Columns)`;
    }
    return `Selected Range: ${rCount} Rows × ${cCount} Columns (Row ${minR + 1}-${maxR + 1}, Col ${minC + 1}-${maxC + 1})`;
  };

  const selectRow = (rowIndex: number) => {
    setSelectedRange({ startRow: rowIndex, startCol: 0, endRow: rowIndex, endCol: columnCount - 1 });
  };

  const selectColumn = (colIndex: number) => {
    setSelectedRange({ startRow: 0, startCol: colIndex, endRow: rows.length - 1, endCol: colIndex });
  };

  const selectAll = () => {
    setSelectedRange({ startRow: 0, startCol: 0, endRow: rows.length - 1, endCol: columnCount - 1 });
  };

  const handleCellMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedRange) {
      setSelectedRange({ startRow: selectedRange.startRow, startCol: selectedRange.startCol, endRow: r, endCol: c });
    } else {
      setIsMouseDown(true);
      setSelectedRange({ startRow: r, startCol: c, endRow: r, endCol: c });
    }
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (isMouseDown && selectedRange) {
      setSelectedRange({ ...selectedRange, endRow: r, endCol: c });
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMerge = () => {
    if (!selectedRange) return;
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        cellSpans: mergeCellsInAttributes(
          b.attributes,
          selectedRange.startRow,
          selectedRange.startCol,
          selectedRange.endRow,
          selectedRange.endCol,
        ),
      },
    }));
  };

  const handleUnmerge = () => {
    if (!selectedRange) return;
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        cellSpans: unmergeCellsInAttributes(b.attributes, selectedRange.startRow, selectedRange.startCol),
      },
    }));
  };

  const updateCell = (r: number, c: number, value: string) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        rows: (b.attributes.rows as string[][]).map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? value : cell) : row),
      },
    }));
  };

  const addRow = (atIndex?: number) => {
    updateBlock(block.id, (b) => {
      const existingRows = (b.attributes.rows as string[][]) ?? [[]];
      const cols = existingRows[0]?.length || 3;
      const hasFooter = Boolean(b.attributes.hasFooter);
      const newRow = Array(cols).fill('');

      let targetIdx = typeof atIndex === 'number' ? atIndex : existingRows.length;
      if (typeof atIndex !== 'number' && hasFooter && existingRows.length > 1) {
        targetIdx = existingRows.length - 1;
      }

      const nextRows = [...existingRows];
      nextRows.splice(targetIdx, 0, newRow);

      const nextRowStyles = ensureTableRowStyles(b.attributes, existingRows.length);
      nextRowStyles.splice(targetIdx, 0, {});

      return {
        ...b,
        attributes: {
          ...b.attributes,
          rows: nextRows,
          rowStyles: nextRowStyles,
          cellSpans: ensureCleanNewRowSpans(b.attributes.cellSpans as any, targetIdx, cols),
        },
      };
    });
  };

  const addCol = (atIndex?: number) => {
    updateBlock(block.id, (b) => {
      const existingRows = (b.attributes.rows as string[][]) ?? [[]];
      const targetIdx = typeof atIndex === 'number' ? atIndex : (existingRows[0]?.length ?? 0);

      const nextRows = existingRows.map((row) => {
        const copy = [...row];
        copy.splice(targetIdx, 0, '');
        return copy;
      });

      const nextColStyles = ensureTableColumnStyles(b.attributes, existingRows[0]?.length ?? 0);
      nextColStyles.splice(targetIdx, 0, {});

      return {
        ...b,
        attributes: {
          ...b.attributes,
          rows: nextRows,
          columnStyles: nextColStyles,
          cellSpans: ensureCleanNewColSpans(b.attributes.cellSpans as any, targetIdx, existingRows.length),
        },
      };
    });
  };

  const removeRow = (r: number) => {
    updateBlock(block.id, (b) => {
      const existingRows = (b.attributes.rows as string[][]) ?? [];
      if (existingRows.length <= 1) return b;
      const nextRows = existingRows.filter((_, i) => i !== r);
      const nextStyles = ensureTableRowStyles(b.attributes, existingRows.length).filter((_, i) => i !== r);
      const nextSpans = removeRowSpans(b.attributes.cellSpans as any, r);
      return { ...b, attributes: { ...b.attributes, rows: nextRows, rowStyles: nextStyles, cellSpans: nextSpans } };
    });
  };

  const removeCol = (c: number) => {
    updateBlock(block.id, (b) => {
      const existingRows = (b.attributes.rows as string[][]) ?? [];
      if ((existingRows[0]?.length ?? 0) <= 1) return b;
      const nextRows = existingRows.map((row) => row.filter((_, ci) => ci !== c));
      const nextStyles = ensureTableColumnStyles(b.attributes, existingRows[0]?.length ?? 0).filter((_, ci) => ci !== c);
      const nextSpans = removeColSpans(b.attributes.cellSpans as any, c);
      return { ...b, attributes: { ...b.attributes, rows: nextRows, columnStyles: nextStyles, cellSpans: nextSpans } };
    });
  };

  const renderCell = (cellValue: string, rowIndex: number, colIndex: number, isHeaderCell: boolean) => {
    const spanKey = `${rowIndex},${colIndex}`;
    const span = cellSpans[spanKey];

    if (span?.hidden) return null;

    const cellStylesMatrix = ensureTableCellStyles(a, rows.length, columnCount);
    const cellStyle = cellStylesMatrix[rowIndex]?.[colIndex] ?? {};
    const rowStyle = rowStyles[rowIndex] ?? {};
    const colStyle = columnStyles[colIndex] ?? {};

    let cellBg: string | undefined = undefined;
    let cellColor: string | undefined = undefined;

    if (cellStyle.backgroundColor) {
      cellBg = cellStyle.backgroundColor;
    } else if (rowStyle.backgroundColor) {
      cellBg = rowStyle.backgroundColor;
    } else if (colStyle.backgroundColor) {
      cellBg = (isHeaderCell || rowIndex === 0) ? colStyle.backgroundColor : hexToRgba(colStyle.backgroundColor, 0.14);
    }

    if (cellStyle.textColor) {
      cellColor = cellStyle.textColor;
    } else if (rowStyle.textColor) {
      cellColor = rowStyle.textColor;
    } else if (colStyle.textColor) {
      cellColor = colStyle.textColor;
    }

    const cellFontFamily = cellStyle.fontFamily || rowStyle.fontFamily || colStyle.fontFamily;
    const cellFontSize = cellStyle.fontSize || rowStyle.fontSize || colStyle.fontSize;
    const cellFontWeight = cellStyle.fontWeight || rowStyle.fontWeight || colStyle.fontWeight;

    const cellAlign = cellStyle.align || colStyle.align || (isHeaderCell ? 'center' : 'left');
    const cellVerticalAlign = cellStyle.verticalAlign || rowStyle.verticalAlign || 'middle';
    const cellPadding = cellStyle.padding || (a.cellPadding ? `${a.cellPadding}px` : '8px');

    const Component = isHeaderCell ? 'th' : 'td';
    const selected = isCellSelected(rowIndex, colIndex);

    return (
      <Component
        key={colIndex}
        rowSpan={span?.rowSpan || 1}
        colSpan={span?.colSpan || 1}
        onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
        className={`border relative group/cell transition-all cursor-cell select-none ${selected
          ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-500/20 dark:bg-primary-500/35 z-20 shadow-2xs font-semibold'
          : ''
          }`}
        style={{
          borderColor: selected ? '#3b82f6' : (cellStyle.borderColor || borderColor),
          borderWidth: typeof cellStyle.borderWidth === 'number' ? cellStyle.borderWidth : borderWidth,
          borderStyle: 'solid',
          color: cellColor,
          backgroundColor: selected ? undefined : cellBg,
          fontFamily: cellFontFamily ? fontFamilyStack(cellFontFamily) : undefined,
          fontSize: cellFontSize ? `${cellFontSize}px` : undefined,
          fontWeight: cellFontWeight,
          textAlign: cellAlign as any,
          verticalAlign: cellVerticalAlign as any,
          padding: cellPadding,
          width: colStyle.width || undefined,
          borderRadius: cellStyle.borderRadius ? `${cellStyle.borderRadius}px` : undefined,
        }}
      >
        <input
          value={cellValue}
          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
          className={`w-full bg-transparent outline-none text-sm ${isHeaderCell ? 'font-semibold' : ''}`}
          style={{ color: 'inherit', textAlign: cellAlign as any }}
          placeholder={isHeaderCell ? 'Header' : 'Cell'}
        />
      </Component>
    );
  };

  const updateSelectedCells = (patch: any) => {
    if (!selectedRange) return;
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        cellStyles: updateTableCellRangeStyle(
          b.attributes,
          selectedRange.startRow,
          selectedRange.startCol,
          selectedRange.endRow,
          selectedRange.endCol,
          patch,
        ),
      },
    }));
  };

  const { header, body, footer } = getTableSections(rows, hasHeader, hasFooter);

  return (
    <div className="be-table be-table-wrapper overflow-x-auto max-w-full relative pt-1" onMouseUp={handleMouseUp}>
      {/* Quick Action Floating Bar for Styling / Merging Selected Cells */}
      {selectedRange && (
        <div className="mb-2.5 p-2 bg-white dark:bg-gray-900 rounded-xl border border-primary-200 dark:border-primary-900 shadow-xl text-xs space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-primary-700 dark:text-primary-300 px-2 py-1 bg-primary-50 dark:bg-primary-950/60 rounded-lg border border-primary-200/60 dark:border-primary-800/60">
              <span>{getSelectionSummaryText()}</span>
            </div>

            {/* Alignment Controls */}
            <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200/60 dark:border-gray-700">
              {(['left', 'center', 'right'] as const).map((al) => (
                <button
                  key={al}
                  type="button"
                  onClick={() => updateSelectedCells({ align: al })}
                  className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold cursor-pointer transition-colors"
                  title={`Align ${al}`}
                >
                  {al === 'left' ? <AlignLeft size={14} /> : al === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                </button>
              ))}
            </div>

            {/* Font Weight Control */}
            <button
              type="button"
              onClick={() => updateSelectedCells({ fontWeight: 700 })}
              className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs cursor-pointer border border-gray-200/60 dark:border-gray-700"
              title="Make Selected Text Bold"
            >
              B
            </button>

            {/* Merge / Unmerge */}
            {isMultiCellSelected && (
              <button
                type="button"
                onClick={handleMerge}
                className="px-2.5 py-1 font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white cursor-pointer transition-colors shadow-2xs"
              >
                Merge
              </button>
            )}
            <button
              type="button"
              onClick={handleUnmerge}
              className="px-2 py-1 font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200 cursor-pointer transition-colors"
            >
              Unmerge
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedRange(null)}
              className="px-2 py-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer ml-auto font-medium"
            >
              Clear Selection
            </button>
          </div>

          {/* Quick Color Swatches Bar */}
          <div className="flex items-center gap-4 pt-1 border-t border-gray-100 dark:border-gray-800 text-[11px] flex-wrap">
            {/* Cell BG Color */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-500">Cell BG:</span>
              {['#ea580c', '#15803d', '#6b7280', '#2563eb', '#fef3c7', '#ffffff'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateSelectedCells({ backgroundColor: c })}
                  className="w-4 h-4 rounded-md border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c }}
                  title={`Set Cell BG ${c}`}
                />
              ))}
              <label className="relative w-4 h-4 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden shrink-0" title="Custom Cell BG">
                <input
                  type="color"
                  onChange={(e) => updateSelectedCells({ backgroundColor: e.target.value })}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="w-full h-full rounded-md bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
              </label>
            </div>

            {/* Cell Text Color */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-500">Text:</span>
              {['#ffffff', '#111827', '#ea580c', '#15803d', '#4b5563', '#2563eb'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateSelectedCells({ textColor: c })}
                  className="w-4 h-4 rounded-md border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c }}
                  title={`Set Text Color ${c}`}
                />
              ))}
              <label className="relative w-4 h-4 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden shrink-0" title="Custom Text Color">
                <input
                  type="color"
                  onChange={(e) => updateSelectedCells({ textColor: e.target.value })}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="w-full h-full rounded-md bg-gradient-to-br from-yellow-400 via-pink-500 to-indigo-500" />
              </label>
            </div>

            {/* Reset Cell Style */}
            <button
              type="button"
              onClick={() => updateSelectedCells({ backgroundColor: '', textColor: '', align: undefined, fontWeight: undefined })}
              className="text-gray-400 hover:text-red-500 font-medium cursor-pointer ml-auto flex items-center gap-1"
            >
              Reset Cell Style
            </button>
          </div>
        </div>
      )}

      {/* Row & Column Selectors Bar */}
      <div className="mb-1.5 flex items-center gap-1 text-[11px] text-gray-400">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); selectAll(); }}
          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-primary-500 hover:text-white font-bold cursor-pointer transition-colors shrink-0"
          title="Select Entire Table"
        >
          All
        </button>
        <div className="flex-1 flex gap-1 overflow-x-auto">
          {Array.from({ length: columnCount }, (_, cIdx) => (
            <div key={`col-select-${cIdx}`} className="flex-1 min-w-[70px] flex items-center justify-between gap-1 py-1 px-2 rounded-lg bg-gray-50 dark:bg-gray-800/80 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-300 font-semibold group/col-select border border-gray-200/60 dark:border-gray-700/60 transition-colors">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); selectColumn(cIdx); }}
                className="flex-1 text-center font-semibold text-[11px] cursor-pointer"
                title={`Click to select Column ${cIdx + 1}`}
              >
                Col {cIdx + 1}
              </button>
              {columnCount > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeCol(cIdx); }}
                  className="opacity-0 group-hover/col-select:opacity-100 text-gray-400 hover:text-red-500 transition-opacity cursor-pointer p-0.5"
                  title={`Delete Column ${cIdx + 1}`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table Container with Corner Radii */}
      <div
        className="overflow-hidden border border-gray-200/80 dark:border-gray-800 shadow-2xs transition-all"
        style={{
          borderTopLeftRadius: `${topLeftRadius}px`,
          borderTopRightRadius: `${topRightRadius}px`,
          borderBottomLeftRadius: `${bottomLeftRadius}px`,
          borderBottomRightRadius: `${bottomRightRadius}px`,
        }}
      >
        <table className={`w-full ${alignClass(align)}`} style={tableStyle}>
          {hasHeader && header.length > 0 && (
            <thead>
              {header.map((row, ri) => {
                const rowIndex = ri;
                const rowStyle = rowStyles[rowIndex] ?? {};
                const cells = Array.isArray(row) ? row : (row && Array.isArray((row as any).cells) ? (row as any).cells : []);

                return (
                  <tr
                    key={`header-${ri}`}
                    className="group"
                    style={{
                      color: rowStyle.textColor || undefined,
                      backgroundColor: rowStyle.backgroundColor || undefined,
                      height: rowStyle.height || undefined,
                      verticalAlign: rowStyle.verticalAlign as any,
                    }}
                  >
                    {cells.map((cell: any, ci: number) => renderCell(cell, rowIndex, ci, true))}

                    <th className="w-16 p-1 border text-center whitespace-nowrap" style={{ borderColor, borderWidth, borderStyle: 'solid' }}>
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={(e) => { e.stopPropagation(); selectRow(rowIndex); }} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-800 hover:bg-primary-500 hover:text-white text-gray-500 font-semibold cursor-pointer transition-colors" title={`Select Row ${rowIndex + 1}`}>
                          Row {rowIndex + 1}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeRow(rowIndex); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer p-0.5" title="Delete Row">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </th>
                  </tr>
                );
              })}
            </thead>
          )}

          {body.length > 0 && (
            <tbody>
              {body.map((row, idx) => {
                const rowIndex = (hasHeader ? 1 : 0) + idx;
                const rowStyle = rowStyles[rowIndex] ?? {};
                const cells = Array.isArray(row) ? row : (row && Array.isArray((row as any).cells) ? (row as any).cells : []);

                return (
                  <tr
                    key={`body-${rowIndex}`}
                    className="group"
                    style={{
                      color: rowStyle.textColor || undefined,
                      backgroundColor: rowStyle.backgroundColor || undefined,
                      height: rowStyle.height || undefined,
                      verticalAlign: rowStyle.verticalAlign as any,
                    }}
                  >
                    {cells.map((cell: any, ci: number) => renderCell(cell, rowIndex, ci, false))}

                    <td className="w-16 p-1 border text-center whitespace-nowrap" style={{ borderColor, borderWidth, borderStyle: 'solid' }}>
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={(e) => { e.stopPropagation(); selectRow(rowIndex); }} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-800 hover:bg-primary-500 hover:text-white text-gray-500 font-semibold cursor-pointer transition-colors" title={`Select Row ${rowIndex + 1}`}>
                          Row {rowIndex + 1}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeRow(rowIndex); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer p-0.5" title="Delete Row">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}

          {hasFooter && footer.length > 0 && (
            <tfoot>
              {footer.map((row) => {
                const rowIndex = rows.length - 1;
                const rowStyle = rowStyles[rowIndex] ?? {};
                const cells = Array.isArray(row) ? row : (row && Array.isArray((row as any).cells) ? (row as any).cells : []);

                return (
                  <tr
                    key={`footer-${rowIndex}`}
                    className="group"
                    style={{
                      color: rowStyle.textColor || undefined,
                      backgroundColor: rowStyle.backgroundColor || undefined,
                      height: rowStyle.height || undefined,
                      verticalAlign: rowStyle.verticalAlign as any,
                    }}
                  >
                    {cells.map((cell: any, ci: number) => renderCell(cell, rowIndex, ci, false))}

                    <td className="w-16 p-1 border text-center whitespace-nowrap" style={{ borderColor, borderWidth, borderStyle: 'solid' }}>
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={(e) => { e.stopPropagation(); selectRow(rowIndex); }} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-800 hover:bg-primary-500 hover:text-white text-gray-500 font-semibold cursor-pointer transition-colors" title={`Select Row ${rowIndex + 1}`}>
                          Row {rowIndex + 1}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeRow(rowIndex); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer p-0.5" title="Delete Row">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); addRow(); }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          <Plus size={14} /> Add Row
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); addCol(); }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          <Plus size={14} /> Add Column
        </button>

        {rows.length > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeRow(rows.length - 1); }}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-xl border border-red-200/60 dark:border-red-900/60 transition-all cursor-pointer active:scale-95"
            title="Remove Last Row"
          >
            <Trash2 size={13} /> Remove Row
          </button>
        )}

        {columnCount > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeCol(columnCount - 1); }}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-xl border border-red-200/60 dark:border-red-900/60 transition-all cursor-pointer active:scale-95"
            title="Remove Last Column"
          >
            <Trash2 size={13} /> Remove Column
          </button>
        )}
      </div>
    </div>
  );
}

export function ButtonBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const width = (a.width as string) || 'auto';
  const { isMobile } = useResponsive();
  const align = (a.align as TextAlign) || 'left';

  return (
    <div className={`be-button w-full max-w-full flex ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'} py-1`}>
      <input
        type="text"
        value={(a.text as string) || ''}
        onChange={(e) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, text: e.target.value } }))}
        placeholder="Button text..."
        className="px-6 py-3 rounded-xl font-semibold text-sm outline-none border-0 cursor-pointer inline-block text-center shadow-xs transition-all min-h-[44px]"
        style={{
          width: isMobile ? '100%' : (width === 'auto' ? 'auto' : width),
          maxWidth: '100%',
          background: a.style === 'fill' ? (a.color as string) || '#3b82f6' : 'transparent',
          color: a.style === 'fill' ? (a.textColor as string) || '#ffffff' : (a.color as string) || '#3b82f6',
          border: a.style === 'outline' ? `2px solid ${(a.color as string) || '#3b82f6'}` : 'none',
          borderRadius: `${a.radius ?? 12}px`,
        }}
      />
    </div>
  );
}

export function FileBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');
  const fileUrl = a.url as string;
  const { isMobile } = useResponsive();

  if (!fileUrl) {
    return (
      <div className="be-file w-full max-w-full">
        {urlMode ? (
          <div className="flex flex-col gap-2 py-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="File URL"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:border-primary-500 min-h-[44px]" />
              <button onClick={() => url && updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url } }))}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white font-semibold cursor-pointer min-h-[44px]">Insert</button>
            </div>
            <button onClick={() => setUrlMode(false)} className="text-sm text-gray-400 self-start cursor-pointer">Back</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 sm:py-8 w-full">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 hover:bg-primary-100 font-semibold cursor-pointer min-h-[44px]">
                <Upload size={18} /> Upload File
              </button>
              <button onClick={() => setUrlMode(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 font-semibold cursor-pointer min-h-[44px]">
                <LinkIcon size={18} /> Insert from URL
              </button>
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const dataUrl = await fileToDataUrl(file);
                updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, url: dataUrl, fileName: file.name } }));
              }
            }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`be-file w-full max-w-full flex ${isMobile ? 'flex-col items-stretch gap-2.5 p-3' : 'flex-row items-center gap-3 p-3.5'} rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Download size={20} className="text-primary-500 flex-shrink-0" />
        <input value={a.fileName as string}
          onChange={(e) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, fileName: e.target.value } }))}
          className="flex-1 bg-transparent outline-none text-sm min-w-0 font-medium" />
      </div>
      <a href={fileUrl} download className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors text-center min-h-[40px] flex items-center justify-center">
        {(a.buttonText as string) || 'Download'}
      </a>
    </div>
  );
}

export function HtmlBlock({ block }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes;
  return (
    <div className="be-html">
      <div className="text-xs text-gray-400 mb-1 font-mono">HTML</div>
      <textarea value={a.content as string}
        onChange={(e) => updateBlock(block.id, (b) => ({ ...b, attributes: { ...b.attributes, content: e.target.value } }))}
        placeholder="Write custom HTML…"
        className="w-full bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm outline-none resize-y min-h-[100px]"
        spellCheck={false} />
    </div>
  );
}
