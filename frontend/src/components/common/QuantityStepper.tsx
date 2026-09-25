import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

import './QuantityStepper.css';

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  className,
  disabled = false,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn('quantity-stepper', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="quantity-stepper__btn"
        disabled={disabled || value <= min}
        aria-label="Giảm số lượng"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="quantity-stepper__icon" />
      </Button>
      <span className="quantity-stepper__value">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="quantity-stepper__btn"
        disabled={disabled || value >= max}
        aria-label="Tăng số lượng"
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="quantity-stepper__icon" />
      </Button>
    </div>
  );
}
