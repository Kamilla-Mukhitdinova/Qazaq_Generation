import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Globe } from 'lucide-react';

type LanguageSelectorProps = {
  variant?: 'default' | 'glass';
};

export function LanguageSelector({ variant = 'default' }: LanguageSelectorProps) {
  const { language, setLanguage, languages } = useLanguage();

  const currentLang = languages.find(l => l.code === language);
  const isGlass = variant === 'glass';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-2 rounded-xl px-2.5 text-sm font-medium focus-visible:ring-gold/40 sm:px-3',
            isGlass
              ? 'border-white/35 bg-white/40 text-slate-700 shadow-[0_8px_22px_hsl(218_44%_34%/0.07)] backdrop-blur-xl hover:border-white/55 hover:bg-white/58 hover:text-slate-900 dark:border-white/12 dark:bg-slate-950/32 dark:text-white/88 dark:shadow-[0_8px_24px_hsl(222_47%_4%/0.18)] dark:hover:bg-slate-900/46 dark:hover:text-white'
              : 'border-border/70 bg-background/90 text-foreground shadow-[0_10px_30px_hsl(222_47%_4%/0.16)] backdrop-blur-md hover:border-gold/45 hover:bg-background hover:text-foreground dark:border-white/18 dark:bg-white/12 dark:text-white dark:hover:bg-white/18 dark:hover:text-white'
          )}
        >
          <Globe className={cn('h-4 w-4', isGlass ? 'text-gold/85' : 'text-gold')} />
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <span className="text-sm leading-none">{currentLang?.flag}</span>
            <span>{currentLang?.name}</span>
          </span>
          <span className="text-sm leading-none sm:hidden">{currentLang?.flag}</span>
          <ChevronDown className={cn('h-3.5 w-3.5', isGlass ? 'text-slate-500 dark:text-white/70' : 'text-muted-foreground dark:text-white/75')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between gap-3"
          >
            <span>
              <span className="mr-2">{lang.flag}</span>
              {lang.name}
            </span>
            {language === lang.code && <Check className="h-4 w-4 text-gold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
