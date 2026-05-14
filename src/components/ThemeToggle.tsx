import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 overflow-hidden rounded-xl border-white/35 bg-white/40 text-slate-700 shadow-[0_8px_22px_hsl(218_44%_34%/0.07)] backdrop-blur-xl hover:border-white/55 hover:bg-white/58 hover:text-slate-900 focus-visible:ring-gold/40 dark:border-white/12 dark:bg-slate-950/32 dark:text-white/88 dark:shadow-[0_8px_24px_hsl(222_47%_4%/0.18)] dark:hover:bg-slate-900/46 dark:hover:text-white"
    >
      <motion.div
        initial={false}
        animate={{ 
          rotate: theme === 'dark' ? 0 : 180,
          scale: 1
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {theme === 'dark' ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </motion.div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
