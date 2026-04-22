import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileBlob: Blob | null;
  fileName: string;
  fileType: string;
}

export default function DocumentPreviewDialog({
  open,
  onOpenChange,
  fileBlob,
  fileName,
  fileType,
}: DocumentPreviewDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [xlsxData, setXlsxData] = useState<string[][]>([]);

  useEffect(() => {
    if (!open || !fileBlob) return;
    setLoading(true);
    setHtmlContent('');
    setXlsxData([]);

    const parse = async () => {
      try {
        const arrayBuffer = await fileBlob.arrayBuffer();

        if (fileType === 'docx') {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setHtmlContent(result.value);
        } else if (fileType === 'xlsx') {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(arrayBuffer);
          const worksheet = workbook.worksheets[0];
          if (worksheet) {
            const rows: string[][] = [];
            worksheet.eachRow((row) => {
              const cells: string[] = [];
              row.eachCell({ includeEmpty: true }, (cell) => {
                cells.push(cell.text || String(cell.value ?? ''));
              });
              rows.push(cells);
            });
            setXlsxData(rows);
          }
        }
      } catch {
        setHtmlContent(`<p class="text-destructive">${t('docs.previewError')}</p>`);
      } finally {
        setLoading(false);
      }
    };

    parse();
  }, [open, fileBlob, fileType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{t('docs.preview')}: {fileName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : fileType === 'docx' ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert p-6"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : fileType === 'xlsx' && xlsxData.length > 0 ? (
            <div className="overflow-auto p-2">
              <table className="border-collapse w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {xlsxData[0]?.map((cell, ci) => (
                      <th
                        key={ci}
                        className="bg-muted border border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {xlsxData.slice(1).map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/30">
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-border px-3 py-1.5 text-sm">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">{t('docs.noPreview')}</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
