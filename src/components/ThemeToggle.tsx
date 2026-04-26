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
      className="relative h-10 w-10 overflow-hidden border-white/55 bg-white/62 text-slate-800 shadow-[0_10px_30px_hsl(218_44%_34%/0.10)] backdrop-blur-xl hover:border-gold/35 hover:bg-white/75 focus-visible:ring-gold/50 dark:border-white/18 dark:bg-white/12 dark:text-white dark:shadow-[0_10px_30px_hsl(222_47%_4%/0.16)] dark:backdrop-blur-md dark:hover:bg-white/18"
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
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </motion.div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
