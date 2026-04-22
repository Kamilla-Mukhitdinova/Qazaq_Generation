import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, Calendar, Eye, EyeOff, Tag, FolderOpen, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface KBArticle {
  id: string;
  title: string;
  short_description: string | null;
  content: string;
  category_id: string | null;
  tags: string[];
  visibility: 'public' | 'internal';
  author_id: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

export default function KnowledgeBaseArticle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t } = useLanguage();

  const [article, setArticle] = useState<KBArticle | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const data = await api.getKBArticle(id!);
      const normalized: KBArticle = {
        id: data.id,
        title: data.title,
        short_description: pick<string | null>(data, 'short_description', 'shortDescription') || null,
        content: data.content,
        category_id: pick<string | null>(data, 'category_id', 'categoryId') || null,
        tags: data.tags || [],
        visibility: data.visibility,
        author_id: pick<string>(data, 'author_id', 'authorId') || '',
        view_count: pick<number>(data, 'view_count', 'viewCount') || 0,
        created_at: pick<string>(data, 'created_at', 'createdAt') || new Date().toISOString(),
        updated_at: pick<string>(data, 'updated_at', 'updatedAt') || new Date().toISOString(),
      };
      setArticle(normalized);
      setCategoryName(pick<string>(data, 'category_name', 'categoryName') || '');
      setAuthorName(pick<string>(data, 'author_name', 'authorName') || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!article) return (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground">{t('kb.articleNotFound')}</p>
      <Button className="mt-4" onClick={() => navigate('/knowledge')}>{t('common.back')}</Button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/knowledge')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />{t('common.back')}
      </Button>

      <div className="space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          <Badge variant="secondary" className={article.visibility === 'internal' ? 'bg-amber-500/10 text-amber-600' : 'bg-green-500/10 text-green-600'}>
            {article.visibility === 'internal' ? <><EyeOff className="h-3 w-3 mr-1" />{t('kb.internal')}</> : <><Eye className="h-3 w-3 mr-1" />{t('kb.public')}</>}
          </Badge>
          {categoryName && <Badge variant="outline"><FolderOpen className="h-3 w-3 mr-1" />{categoryName}</Badge>}
        </div>

        <h1 className="text-3xl font-bold">{article.title}</h1>
        {article.short_description && <p className="text-lg text-muted-foreground">{article.short_description}</p>}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-4 w-4" />{authorName || t('common.unknown')}</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(new Date(article.created_at), 'dd.MM.yyyy')}</span>
          {article.updated_at !== article.created_at && <span className="flex items-center gap-1">{t('kb.updated')}: {format(new Date(article.updated_at), 'dd.MM.yyyy')}</span>}
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{article.view_count} {t('kb.views')}</span>
        </div>

        {(article.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map(tag => <Badge key={tag} variant="secondary"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>)}
          </div>
        )}
      </div>

      <Separator />

      <Card>
        <CardContent className="py-8 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </CardContent>
      </Card>
    </motion.div>
  );
}
