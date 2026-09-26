import { formatMoney } from '@/utils/formatters';
import { cn } from '@/lib/cn';

import './PriceTag.css';

export function PriceTag({
  amount,
  unit,
  className,
}: {
  amount: string | number;
  unit?: string;
  className?: string;
}) {
  return (
    <span className={cn('price-tag', className)}>
      {formatMoney(amount)}
      {unit ? <span className="price-tag__unit">/{unit}</span> : null}
    </span>
  );
}
