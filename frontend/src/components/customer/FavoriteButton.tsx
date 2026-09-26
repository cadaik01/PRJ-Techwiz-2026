import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/common/forms/Button';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/cn';

import './FavoriteButton.css';

export function FavoriteButton({
  active,
  onToggle,
  className,
  label = 'Favorites',
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      className={cn('favorite-button', className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!accessToken) {
          toast.info('Sign in to save your favorites');
          navigate('/login');
          return;
        }
        onToggle();
      }}
    >
      <motion.span
        key={active ? 'on' : 'off'}
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <Heart
          className={cn('favorite-button__icon', active ? 'is-active' : 'is-idle')}
        />
      </motion.span>
    </Button>
  );
}
