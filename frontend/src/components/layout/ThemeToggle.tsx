import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/stores/ui.store';

import './ThemeToggle.css';

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <Sun className="theme-toggle__icon" />
      ) : (
        <Moon className="theme-toggle__icon" />
      )}
    </Button>
  );
}
