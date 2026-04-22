import { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Download, Plus, Trash2, Table2, FileSpreadsheet, Send, Upload } from 'lucide-react';
import SendDocumentDialog from './SendDocumentDialog';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type CellData = string;

const INITIAL_ROWS = 20;
const INITIAL_COLS = 10;

const createEmptyGrid = (rows: number, cols: number): CellData[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));

const colLabel = (i: number): string => {
  let label = '';
  let n = i;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
};

export default function ExcelEditor() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [fileName, setFileName] = useState('spreadsheet');
  const [grid, setGrid] = useState<CellData[][]>(createEmptyGrid(INITIAL_ROWS, INITIAL_COLS));
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendBlob, setSendBlob] = useState<Blob | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error(t('docs.invalidFormat'));
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('No worksheet');

      const rows = worksheet.rowCount;
      const cols = worksheet.columnCount;
      const newGrid = createEmptyGrid(Math.max(rows, INITIAL_ROWS), Math.max(cols, INITIAL_COLS));

      worksheet.eachRow((row, ri) => {
        row.eachCell((cell, ci) => {
          if (ri - 1 < newGrid.length && ci - 1 < newGrid[0].length) {
            newGrid[ri - 1][ci - 1] = cell.text || String(cell.value ?? '');
          }
        });
      });

      setGrid(newGrid);
      setFileName(file.name.replace(/\.(xlsx|xls)$/i, ''));
      setSelectedCell(null);
      toast.success(t('docs.fileLoaded'));
    } catch {
      toast.error(t('docs.fileLoadError'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateCell = useCallback((r: number, c: number, value: string) => {
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = value;
      return next;
    });
  }, []);

  const handleCellClick = (r: number, c: number) => {
    setSelectedCell({ r, c });
    setEditValue(grid[r][c]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCellBlur = () => {
    if (selectedCell) {
      updateCell(selectedCell.r, selectedCell.c, editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (e.key === 'Enter') {
      updateCell(r, c, editValue);
      if (r < grid.length - 1) {
        setSelectedCell({ r: r + 1, c });
        setEditValue(grid[r + 1][c]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      updateCell(r, c, editValue);
      if (c < grid[0].length - 1) {
        setSelectedCell({ r, c: c + 1 });
        setEditValue(grid[r][c + 1]);
      }
    } else if (e.key === 'Escape') {
      setEditValue(grid[r][c]);
    }
  };

  const addRow = () => {
    setGrid(prev => [...prev, Array.from({ length: prev[0].length }, () => '')]);
  };

  const addCol = () => {
    setGrid(prev => prev.map(row => [...row, '']));
  };

  const deleteRow = () => {
    if (grid.length <= 1) return;
    setGrid(prev => prev.slice(0, -1));
  };

  const deleteCol = () => {
    if (grid[0].length <= 1) return;
    setGrid(prev => prev.map(row => row.slice(0, -1)));
  };

  const applyTemplate = async (type: string) => {
    const now = new Date().toLocaleDateString('ru-RU');

    if (type === 'inventory') {
      try {
        const result = await api.getAssets({ limit: '100' });
        const assets = result.data || [];

        const header = [
          '№', t('docs.assetName'), t('docs.assetType'), t('docs.serialNumber'),
          t('docs.inventoryNumber'), t('docs.status'), t('docs.location'), t('docs.manufacturer'), t('docs.model'),
        ];
        const rows: string[][] = [header];
        assets.forEach((a: any, i: number) => {
          rows.push([
            String(i + 1), a.name, a.asset_type || a.assetType, a.serial_number || a.serialNumber || '',
            a.inventory_number || a.inventoryNumber || '',
            a.status, a.location || '', a.manufacturer || '', a.model || '',
          ]);
        });

        const newGrid = createEmptyGrid(Math.max(rows.length + 5, INITIAL_ROWS), header.length);
        rows.forEach((row, ri) => row.forEach((val, ci) => { newGrid[ri][ci] = val; }));
        setGrid(newGrid);
        setFileName(`inventory_${now.replace(/\./g, '_')}`);
        toast.success(t('docs.templateApplied'));
      } catch { toast.error('Error loading assets'); }
    } else if (type === 'ticket_report') {
      try {
        const result = await api.getTickets({ limit: '100' });
        const tickets = result.data || [];

        const header = ['№', 'ID', t('docs.subject'), t('docs.status'), t('docs.priority'), t('docs.createdAt'), t('docs.closedAt')];
        const rows: string[][] = [header];
        tickets.forEach((tk: any, i: number) => {
          rows.push([
            String(i + 1),
            (tk.id || '').slice(0, 8).toUpperCase(),
            tk.title,
            tk.status,
            tk.priority,
            new Date(tk.created_at || tk.createdAt).toLocaleDateString('ru-RU'),
            (tk.closed_at || tk.closedAt) ? new Date(tk.closed_at || tk.closedAt).toLocaleDateString('ru-RU') : '-',
          ]);
        });

        const newGrid = createEmptyGrid(Math.max(rows.length + 5, INITIAL_ROWS), header.length);
        rows.forEach((row, ri) => row.forEach((val, ci) => { newGrid[ri][ci] = val; }));
        setGrid(newGrid);
        setFileName(`ticket_report_${now.replace(/\./g, '_')}`);
        toast.success(t('docs.templateApplied'));
      } catch { toast.error('Error loading tickets'); }
    } else if (type === 'blank') {
      setGrid(createEmptyGrid(INITIAL_ROWS, INITIAL_COLS));
      setFileName('spreadsheet');
    }
  };

  const generateXlsxBlob = async (): Promise<Blob> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    grid.forEach((row, ri) => {
      const excelRow = worksheet.addRow(row);
      if (ri === 0) {
        excelRow.eachCell((cell) => {
          cell.font = { bold: true, size: 11 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5E8F0' } };
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          };
        });
      }
    });

    worksheet.columns.forEach((col, i) => {
      let maxLen = 10;
      grid.forEach(row => {
        if (row[i] && row[i].length > maxLen) maxLen = row[i].length;
      });
      col.width = Math.min(maxLen + 2, 40);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const downloadXlsx = async () => {
    const blob = await generateXlsxBlob();
    saveAs(blob, `${fileName}.xlsx`);
    toast.success(t('docs.downloaded'));
  };

  const handleSendXlsx = async () => {
    const blob = await generateXlsxBlob();
    setSendBlob(blob);
    setShowSendDialog(true);
  };

  return (
    <div className="space-y-4">
      {/* Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('docs.templates')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyTemplate('blank')}>
              {t('docs.blankSheet')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('ticket_report')}>
              {t('docs.ticketReportTemplate')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('inventory')}>
              {t('docs.inventoryTemplate')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-48 h-8 text-sm"
              />
              <span className="text-muted-foreground text-sm">.xlsx</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUploadXlsx}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="gap-1">
                <Upload className="h-3 w-3" /> {t('docs.uploadXlsx')}
              </Button>
              <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
                <Plus className="h-3 w-3" /> {t('docs.addRow')}
              </Button>
              <Button variant="outline" size="sm" onClick={addCol} className="gap-1">
                <Plus className="h-3 w-3" /> {t('docs.addCol')}
              </Button>
              <Button variant="outline" size="sm" onClick={deleteRow} className="gap-1">
                <Trash2 className="h-3 w-3" /> {t('docs.delRow')}
              </Button>
              <Button variant="outline" size="sm" onClick={deleteCol} className="gap-1">
                <Trash2 className="h-3 w-3" /> {t('docs.delCol')}
              </Button>
              <Button onClick={downloadXlsx} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {t('docs.download')}
              </Button>
              <Button onClick={handleSendXlsx} size="sm" variant="outline" className="gap-2">
                <Send className="h-4 w-4" />
                {t('docs.sendDocument')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Formula bar */}
          {selectedCell && (
            <div className="flex items-center gap-2 mb-2 text-sm">
              <span className="px-2 py-1 bg-muted rounded font-mono text-xs min-w-[40px] text-center">
                {colLabel(selectedCell.c)}{selectedCell.r + 1}
              </span>
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleCellBlur}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm"
              />
            </div>
          )}

          {/* Spreadsheet grid */}
          <div className="overflow-auto border rounded-lg max-h-[600px]">
            <table className="border-collapse w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-muted border border-border px-1 py-1 text-center text-xs font-medium text-muted-foreground w-10 sticky left-0 z-20">
                    #
                  </th>
                  {grid[0]?.map((_, ci) => (
                    <th key={ci} className="bg-muted border border-border px-2 py-1 text-center text-xs font-medium text-muted-foreground min-w-[80px]">
                      {colLabel(ci)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, ri) => (
                  <tr key={ri}>
                    <td className="bg-muted border border-border px-1 py-0.5 text-center text-xs text-muted-foreground font-medium sticky left-0 z-10">
                      {ri + 1}
                    </td>
                    {row.map((cell, ci) => {
                      const isSelected = selectedCell?.r === ri && selectedCell?.c === ci;
                      return (
                        <td
                          key={ci}
                          onClick={() => handleCellClick(ri, ci)}
                          className={`border border-border px-1.5 py-0.5 cursor-cell transition-colors ${
                            isSelected
                              ? 'bg-primary/10 ring-2 ring-primary ring-inset'
                              : ri === 0
                              ? 'bg-muted/30 font-medium'
                              : 'bg-background hover:bg-muted/20'
                          }`}
                        >
                          {isSelected ? (
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellBlur}
                              onKeyDown={handleKeyDown}
                              className="w-full bg-transparent outline-none text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm truncate block">{cell}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SendDocumentDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        fileBlob={sendBlob}
        fileName={fileName}
        fileType="xlsx"
      />
    </div>
  );
}
