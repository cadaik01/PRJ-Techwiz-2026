import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { FavoriteButton } from '../customer/FavoriteButton';
import { LazyImage } from '@/components/common/cards/LazyImage';
import { PriceTag } from '@/components/common/badges/PriceTag';
import { RatingStars } from '@/components/common/badges/RatingStars';
import { Badge } from '@/components/common/badges/Badge';
import { Button } from '@/components/common/forms/Button';
import { useCartStore } from '@/stores/cart.store';
import { useFavorites } from '../../hooks/queries/customer/useFavorites';

import { cn } from '@/lib/cn';

import './ProductCardView.css';

function availabilityBadge(availability, stock) {
  if (availability === 'UNAVAILABLE') {
    return { label: 'Unavailable', variant: 'secondary' };
  }
  if (availability === 'OUT_OF_STOCK') {
    return { label: 'Out of stock', variant: 'danger' };
  }
  if (stock <= 10) {
    return { label: `Low stock · ${stock} left`, variant: 'warning' };
  }
  return { label: `${stock} left`, variant: 'success' };
}

export function ProductCardView({ product, className }) {
  const addItem = useCartStore((s) => s.addItem);
  const { hasProduct, toggleProduct } = useFavorites();
  const favorited = Boolean(product.is_favorite) || hasProduct(product.id);
  const stock = availabilityBadge(product.availability, product.stock_quantity);
  const canAdd = product.availability === 'IN_STOCK' && product.stock_quantity > 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('product-card', className)}
    >
      <Link to={`/products/${product.id}`} className="product-card__media-link">
        <div className="product-card__media">
          {product.image ? (
            <LazyImage
              src={product.image}
              alt={product.name}
              className="product-card__image"
            />
          ) : (
            <div className="product-card__placeholder">No image</div>
          )}
          <div className="product-card__stock-badge">
            <Badge variant={stock.variant}>{stock.label}</Badge>
          </div>
          <div className="product-card__favorite">
            <FavoriteButton
              active={favorited}
              onToggle={() => {
                void toggleProduct(product.id).then(() => {
                  toast.success(
                    favorited ? 'Removed from favorites' : 'Added to favorites',
                  );
                });
              }}
              className="product-card__favorite-btn"
            />
          </div>
        </div>
        <div className="product-card__body">
          <p className="product-card__category">{product.category.name}</p>
          <h3 className="product-card__title">{product.name}</h3>
          <p className="product-card__stall">{product.farmer.stall_name}</p>
          <div className="product-card__meta-row">
            <PriceTag amount={product.price} unit={product.unit} />
            <RatingStars value={product.rating_avg ?? 0} count={product.rating_count} />
          </div>
        </div>
      </Link>
      <div className="product-card__footer">
        <Button
          className="product-card__add-btn"
          size="sm"
          disabled={!canAdd}
          onClick={() => {
            addItem({
              product_id: product.id,
              farmer_id: product.farmer.id,
              farmer_name: product.farmer.stall_name,
              name: product.name,
              unit: product.unit,
              price: product.price,
              quantity: 1,
              image: product.image,
              is_available: canAdd,
            });
            toast.success('Reserved for pickup');
          }}
        >
          <ShoppingCart className="product-card__cart-icon" />
          Reserve for pickup
        </Button>
      </div>
    </motion.article>
  );
}
