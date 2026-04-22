import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import SendDocumentDialog from './SendDocumentDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Download, FileText, Undo, Redo, Type, Heading1, Heading2,
  FileDown, Palette, Send, Upload,
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Template {
  id: string;
  nameKey: string;
  generate: (data: any) => string;
}

export default function WordEditor() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('document');
  const [showTemplates, setShowTemplates] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [ticketId, setTicketId] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendBlob, setSendBlob] = useState<Blob | null>(null);

  const handleUploadDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      toast.error(t('docs.invalidFormat'));
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      if (editorRef.current) {
        editorRef.current.innerHTML = result.value;
      }
      setFileName(file.name.replace(/\.docx$/i, ''));
      toast.success(t('docs.fileLoaded'));
    } catch {
      toast.error(t('docs.fileLoadError'));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const loadTicketForAct = async () => {
    if (!ticketId.trim()) return;
    try {
      const data = await api.getTicket(ticketId);
      if (!data) {
        toast.error(t('docs.ticketNotFound'));
        return;
      }
      setTicketData(data);
      const now = new Date().toLocaleDateString('ru-RU');
      const html = `
        <h1 style="text-align:center">${t('docs.actTitle')}</h1>
        <p style="text-align:center"><strong>${t('docs.date')}: ${now}</strong></p>
        <br/>
        <p><strong>${t('docs.ticketNumber')}:</strong> ${data.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>${t('docs.category')}:</strong> ${(data as any).category_name || '-'}</p>
        <p><strong>${t('docs.priority')}:</strong> ${data.priority}</p>
        <p><strong>${t('docs.status')}:</strong> ${data.status}</p>
        <p><strong>${t('docs.subject')}:</strong> ${data.title}</p>
        <br/>
        <p><strong>${t('docs.description')}:</strong></p>
        <p>${data.description || '-'}</p>
        <br/>
        <p><strong>${t('docs.workPerformed')}:</strong></p>
        <p>_____________________________________________</p>
        <p>_____________________________________________</p>
        <br/><br/>
        <table style="width:100%">
          <tr>
            <td style="width:50%"><strong>${t('docs.executor')}:</strong> ______________</td>
            <td style="width:50%"><strong>${t('docs.customer')}:</strong> ______________</td>
          </tr>
          <tr>
            <td>${t('docs.signature')}: ______________</td>
            <td>${t('docs.signature')}: ______________</td>
          </tr>
        </table>
      `;
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
      setFileName(`act_${data.id.slice(0, 8)}`);
      setShowTemplates(false);
      toast.success(t('docs.templateApplied'));
    } catch {
      toast.error(t('docs.ticketNotFound'));
    }
  };

  const applyTemplate = (type: string) => {
    const now = new Date().toLocaleDateString('ru-RU');
    let html = '';

    if (type === 'blank') {
      html = `<h1>${t('docs.documentTitle')}</h1><p>${t('docs.enterTextHere')}</p>`;
      setFileName('document');
    } else if (type === 'report') {
      html = `
        <h1 style="text-align:center">${t('docs.ticketReport')}</h1>
        <p style="text-align:center"><strong>${t('docs.date')}: ${now}</strong></p>
        <p><strong>${t('docs.author')}:</strong> ${profile?.name || '-'}</p>
        <br/>
        <h2>${t('docs.summary')}</h2>
        <p>${t('docs.enterSummaryHere')}</p>
        <br/>
        <h2>${t('docs.details')}</h2>
        <p>${t('docs.enterDetailsHere')}</p>
        <br/>
        <h2>${t('docs.conclusions')}</h2>
        <p>${t('docs.enterConclusionsHere')}</p>
      `;
      setFileName(`report_${now.replace(/\./g, '_')}`);
    } else if (type === 'memo') {
      html = `
        <h1 style="text-align:center">${t('docs.memo')}</h1>
        <p style="text-align:right">${t('docs.date')}: ${now}</p>
        <br/>
        <p><strong>${t('docs.from')}:</strong> ${profile?.name || '___________'}</p>
        <p><strong>${t('docs.to')}:</strong> ___________</p>
        <p><strong>${t('docs.subject')}:</strong> ___________</p>
        <br/>
        <p>${t('docs.enterTextHere')}</p>
        <br/><br/>
        <p>${t('docs.signature')}: ______________</p>
      `;
      setFileName(`memo_${now.replace(/\./g, '_')}`);
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setShowTemplates(false);
    toast.success(t('docs.templateApplied'));
  };

  const generateDocxBlob = async (): Promise<Blob | null> => {
    if (!editorRef.current) return null;

    const htmlContent = editorRef.current;
    const paragraphs: Paragraph[] = [];

    const parseNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text.trim()) {
          paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1') {
        paragraphs.push(new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: el.style.textAlign === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 32 })],
        }));
      } else if (tag === 'h2') {
        paragraphs.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 28 })],
        }));
      } else if (tag === 'br') {
        paragraphs.push(new Paragraph({ children: [] }));
      } else if (tag === 'p' || tag === 'div') {
        const runs: TextRun[] = [];
        const processInline = (n: Node) => {
          if (n.nodeType === Node.TEXT_NODE) {
            runs.push(new TextRun(n.textContent || ''));
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            const inEl = n as HTMLElement;
            const inTag = inEl.tagName.toLowerCase();
            const opts: any = { text: inEl.textContent || '' };
            if (inTag === 'strong' || inTag === 'b') opts.bold = true;
            if (inTag === 'em' || inTag === 'i') opts.italics = true;
            if (inTag === 'u') opts.underline = {};
            runs.push(new TextRun(opts));
          }
        };
        el.childNodes.forEach(processInline);
        if (runs.length === 0) runs.push(new TextRun(''));

        const alignMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
          center: AlignmentType.CENTER,
          right: AlignmentType.RIGHT,
          justify: AlignmentType.JUSTIFIED,
        };
        const alignment = alignMap[el.style.textAlign] || AlignmentType.LEFT;

        paragraphs.push(new Paragraph({ alignment, children: runs }));
      } else if (tag === 'table') {
        el.querySelectorAll('td, th').forEach(cell => {
          paragraphs.push(new Paragraph({ children: [new TextRun(cell.textContent || '')] }));
        });
      } else {
        el.childNodes.forEach(parseNode);
      }
    };

    htmlContent.childNodes.forEach(parseNode);

    if (paragraphs.length === 0) {
      paragraphs.push(new Paragraph({ children: [new TextRun(' ')] }));
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children: paragraphs,
      }],
    });

    return await Packer.toBlob(doc);
  };

  const downloadDocx = async () => {
    const blob = await generateDocxBlob();
    if (!blob) return;
    saveAs(blob, `${fileName}.docx`);
    toast.success(t('docs.downloaded'));
  };

  const handleSendDocx = async () => {
    const blob = await generateDocxBlob();
    if (!blob) return;
    setSendBlob(blob);
    setShowSendDialog(true);
  };

  const ToolBtn = ({ icon: Icon, title, onClick, active }: { icon: any; title: string; onClick: () => void; active?: boolean }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="space-y-4">
      {/* Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('docs.templates')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyTemplate('blank')}>
              {t('docs.blankDoc')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('report')}>
              {t('docs.reportTemplate')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('memo')}>
              {t('docs.memoTemplate')}
            </Button>
            <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">{t('docs.actTemplate')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('docs.actFromTicket')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('docs.enterTicketId')}</label>
                    <Input
                      placeholder="e.g. 12345678-..."
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                    />
                  </div>
                  <Button onClick={loadTicketForAct} className="w-full">{t('docs.generateAct')}</Button>
                </div>
              </DialogContent>
            </Dialog>
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
              <span className="text-muted-foreground text-sm">.docx</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={handleUploadDocx}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                {t('docs.uploadDocx')}
              </Button>
              <Button onClick={downloadDocx} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {t('docs.download')}
              </Button>
              <Button onClick={handleSendDocx} size="sm" variant="outline" className="gap-2">
                <Send className="h-4 w-4" />
                {t('docs.sendDocument')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 rounded-lg border">
            <Select onValueChange={(v) => execCommand('formatBlock', v)} defaultValue="p">
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="p">{t('docs.paragraph')}</SelectItem>
                <SelectItem value="h1">{t('docs.heading')} 1</SelectItem>
                <SelectItem value="h2">{t('docs.heading')} 2</SelectItem>
                <SelectItem value="h3">{t('docs.heading')} 3</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Select onValueChange={(v) => execCommand('fontSize', v)} defaultValue="3">
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">8</SelectItem>
                <SelectItem value="2">10</SelectItem>
                <SelectItem value="3">12</SelectItem>
                <SelectItem value="4">14</SelectItem>
                <SelectItem value="5">18</SelectItem>
                <SelectItem value="6">24</SelectItem>
                <SelectItem value="7">36</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolBtn icon={Bold} title="Bold" onClick={() => execCommand('bold')} />
            <ToolBtn icon={Italic} title="Italic" onClick={() => execCommand('italic')} />
            <ToolBtn icon={Underline} title="Underline" onClick={() => execCommand('underline')} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolBtn icon={AlignLeft} title="Align Left" onClick={() => execCommand('justifyLeft')} />
            <ToolBtn icon={AlignCenter} title="Align Center" onClick={() => execCommand('justifyCenter')} />
            <ToolBtn icon={AlignRight} title="Align Right" onClick={() => execCommand('justifyRight')} />
            <ToolBtn icon={AlignJustify} title="Justify" onClick={() => execCommand('justifyFull')} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolBtn icon={List} title="Bullet List" onClick={() => execCommand('insertUnorderedList')} />
            <ToolBtn icon={ListOrdered} title="Numbered List" onClick={() => execCommand('insertOrderedList')} />

            <Separator orientation="vertical" className="h-6 mx-1" />

            <ToolBtn icon={Undo} title="Undo" onClick={() => execCommand('undo')} />
            <ToolBtn icon={Redo} title="Redo" onClick={() => execCommand('redo')} />
          </div>

          {/* Content Area */}
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[500px] p-8 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 prose prose-sm max-w-none dark:prose-invert"
            style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}
            suppressContentEditableWarning
          >
            <h1 style={{ textAlign: 'center' }}>{t('docs.documentTitle')}</h1>
            <p>{t('docs.enterTextHere')}</p>
          </div>
        </CardContent>
      </Card>

      <SendDocumentDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        fileBlob={sendBlob}
        fileName={fileName}
        fileType="docx"
      />
    </div>
  );
}
