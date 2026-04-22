import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Table2, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import WordEditor from '@/components/documents/WordEditor';
import ExcelEditor from '@/components/documents/ExcelEditor';
import ReceivedDocuments from '@/components/documents/ReceivedDocuments';

export default function Documents() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('word');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('docs.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('docs.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="word" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Word
          </TabsTrigger>
          <TabsTrigger value="excel" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Excel
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {t('docs.inbox')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="word" className="mt-4">
          <WordEditor />
        </TabsContent>

        <TabsContent value="excel" className="mt-4">
          <ExcelEditor />
        </TabsContent>

        <TabsContent value="inbox" className="mt-4">
          <ReceivedDocuments />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
