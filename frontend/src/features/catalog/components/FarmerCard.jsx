import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FavoriteButton } from '@/features/customer/components/FavoriteButton';
import { RatingStars } from '@/components/common/RatingStars';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { useFavorites } from '@/features/customer/hooks/useFavorites';
import { cn } from '@/lib/cn';
import './FarmerCard.css';
export function FarmerCard({ farmer, className, }) {
    const { hasFarmer, toggleFarmer } = useFavorites();
    const favorited = Boolean(farmer.is_favorite) || hasFarmer(farmer.id);
    return (<article className={cn('farmer-card', className)}>
      <div className="farmer-card__row">
        <Link to={`/farmers/${farmer.id}`}>
          <Avatar className="farmer-card__avatar">
            {farmer.image ? <AvatarImage src={farmer.image} alt=""/> : null}
            <AvatarFallback>{farmer.stall_name.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="farmer-card__main">
          <div className="farmer-card__head">
            <Link to={`/farmers/${farmer.id}`} className="farmer-card__title-link">
              <h3 className="farmer-card__title">{farmer.stall_name}</h3>
            </Link>
            <FavoriteButton active={favorited} onToggle={() => {
            void toggleFarmer(farmer.id).then(() => {
                toast.success(favorited ? 'Removed from favorites' : 'Added to favorites');
            });
        }}/>
          </div>
          <div className="farmer-card__stats">
            <RatingStars value={farmer.rating_avg ?? 0} count={farmer.rating_count}/>
            <span className="farmer-card__stat">
              {farmer.in_stock_product_count} products in stock
            </span>
            {farmer.distance_km !== null ? (<span className="farmer-card__stat">
                {farmer.distance_km.toFixed(1)} km
              </span>) : null}
          </div>
          <p className="farmer-card__markets">
            {farmer.markets.map((m) => m.market_name).join(' · ')}
          </p>
        </div>
      </div>
    </article>);
}

FarmerCard.propTypes = {
    farmer: PropTypes.object.isRequired,
    className: PropTypes.string,
};
