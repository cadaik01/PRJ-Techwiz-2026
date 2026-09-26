import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';

import { FavoriteButton } from '../customer/FavoriteButton';
import { LazyImage } from '@/components/common/cards/LazyImage';
import { Badge } from '@/components/common/badges/Badge';
import { DAY_OF_WEEK_LABELS } from '@/utils/helpers/geo';
import { useFavorites } from '../../hooks/queries/customer/useFavorites';

import { cn } from '@/lib/cn';

import './MarketCard.css';

export function MarketCard({
  market,
  highlighted = false,
  onHover,
  className,
}

 ) {
  const { hasMarket, toggleMarket } = useFavorites();
  const favorited = hasMarket(market.id);

  return (
    <article
      className={cn('market-card', highlighted && 'is-highlighted', className)}
      onMouseEnter={() => onHover?.(market.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link to={`/markets/${market.id}`} className="market-card__media-link">
        <div className="market-card__media">
          <LazyImage
            src={market.image ?? ''}
            alt={market.name}
            className="market-card__image"
          />
          {market.distance_km !== null ? (
            <Badge className="market-card__distance" variant="secondary">
              {market.distance_km.toFixed(1)} km
            </Badge>
          ) : null}
        </div>
      </Link>
      <div className="market-card__body">
        <div className="market-card__head">
          <Link to={`/markets/${market.id}`} className="market-card__title-link">
            <h3 className="market-card__title">{market.name}</h3>
            <p className="market-card__address">
              <MapPin className="market-card__pin" />
              <span className="market-card__address-text">{market.address}</span>
            </p>
          </Link>
          <FavoriteButton
            active={favorited}
            onToggle={() => {
              void toggleMarket(market.id).then(() => {
                toast.success(favorited ? 'Removed from favorites' : 'Added to favorites');
              });
            }}
          />
        </div>
        <div className="market-card__days">
          {market.operating_days.map((d) => (
            <Badge key={d} variant="outline">
              {DAY_OF_WEEK_LABELS[d]}
            </Badge>
          ))}
        </div>
        <p className="market-card__meta">
          {market.open_time}–{market.close_time} · {market.farmer_count} stalls
        </p>
      </div>
    </article>
  );
}
