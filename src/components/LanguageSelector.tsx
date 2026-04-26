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
            'h-10 gap-2 px-3 font-semibold focus-visible:ring-gold/50',
            isGlass
              ? 'border-white/55 bg-white/62 text-slate-800 shadow-[0_10px_30px_hsl(218_44%_34%/0.10)] backdrop-blur-xl hover:border-gold/35 hover:bg-white/75 hover:text-slate-950 dark:border-white/14 dark:bg-slate-950/45 dark:text-white dark:shadow-[0_10px_30px_hsl(222_47%_4%/0.24)] dark:hover:bg-slate-900/58 dark:hover:text-white'
              : 'border-border/70 bg-background/90 text-foreground shadow-[0_10px_30px_hsl(222_47%_4%/0.16)] backdrop-blur-md hover:border-gold/45 hover:bg-background hover:text-foreground dark:border-white/18 dark:bg-white/12 dark:text-white dark:hover:bg-white/18 dark:hover:text-white'
          )}
        >
          <Globe className="h-4 w-4 text-gold" />
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <span className="text-base leading-none">{currentLang?.flag}</span>
            <span>{currentLang?.name}</span>
          </span>
          <span className="text-base leading-none sm:hidden">{currentLang?.flag}</span>
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
