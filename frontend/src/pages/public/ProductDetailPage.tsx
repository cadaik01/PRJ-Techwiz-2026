import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/feedback/EmptyState';
import { FavoriteButton } from '@/features/customer/components/FavoriteButton';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { LazyImage } from '@/components/common/LazyImage';
import { PriceTag } from '@/components/common/PriceTag';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { RatingStars } from '@/components/common/RatingStars';
import { ProductCardView } from '@/features/catalog/components/ProductCardView';
import {
  useProduct,
  useProductRating,
  useProductReviews,
  useProducts,
} from '@/features/catalog/hooks/useCatalog';
import { formatDateTime } from '@/utils/formatters';
import { useCartStore } from '@/stores/cart.store';
import { useFavorites } from '@/features/customer/hooks/useFavorites';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import './ProductDetailPage.css';

function ratingFillClass(pct: number): string {
  if (pct === 0) return 'product-detail-page__rating-fill--0';
  if (pct <= 20) return 'product-detail-page__rating-fill--1';
  if (pct <= 40) return 'product-detail-page__rating-fill--2';
  if (pct <= 60) return 'product-detail-page__rating-fill--3';
  if (pct <= 80) return 'product-detail-page__rating-fill--4';
  return 'product-detail-page__rating-fill--5';
}

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const productQuery = useProduct(id);
  const reviewsQuery = useProductReviews(id);
  const ratingQuery = useProductRating(id);
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const { hasProduct, toggleProduct } = useFavorites();

  const relatedQuery = useProducts({
    category: productQuery.data ? [productQuery.data.category.id] : undefined,
    page_size: 5,
    ordering: 'rating',
  });

  const related = useMemo(
    () => relatedQuery.data?.results.filter((p) => String(p.id) !== id).slice(0, 4) ?? [],
    [relatedQuery.data, id],
  );

  if (productQuery.isLoading) return <PageSkeleton />;
  if (productQuery.isError || !productQuery.data) {
    return (
      <div className="product-detail-page__empty-wrap">
        <EmptyState
          title="This product is unavailable"
          actionLabel="Try again"
          onAction={() => productQuery.refetch()}
        />
      </div>
    );
  }

  const product = productQuery.data;
  const favorited = hasProduct(product.id);
  const canAdd = product.availability === 'IN_STOCK' && product.stock_quantity > 0;
  const stockLabel =
    product.availability === 'UNAVAILABLE'
      ? 'Unavailable'
      : product.availability === 'OUT_OF_STOCK'
        ? 'Out of stock'
        : product.stock_quantity <= 10
          ? `Low stock · ${product.stock_quantity} left`
          : `${product.stock_quantity} in stock`;

  return (
    <div className="product-detail-page">
      <div className="product-detail-page__main">
        <div>
          <div className="product-detail-page__media">
            {product.image ? (
              <LazyImage
                src={product.image}
                alt={product.name}
                className="product-detail-page__media-img"
              />
            ) : (
              <div className="product-detail-page__media-placeholder">Photo coming soon</div>
            )}
          </div>
        </div>

        <div className="product-detail-page__info">
          <div className="product-detail-page__head">
            <div>
              <p className="product-detail-page__category">{product.category.name}</p>
              <h1 className="product-detail-page__title">{product.name}</h1>
              <div>
                <RatingStars
                  value={product.rating_avg}
                  count={product.rating_count}
                  size="md"
                />
              </div>
            </div>
            <FavoriteButton
              active={favorited}
              onToggle={() => {
                toggleProduct(product.id);
                toast.success(favorited ? 'Removed from favorites' : 'Added to favorites');
              }}
            />
          </div>

          <PriceTag
            amount={product.price}
            unit={product.unit}
            className="product-detail-page__price"
          />
          <Badge
            variant={
              product.availability === 'IN_STOCK'
                ? product.stock_quantity <= 10
                  ? 'warning'
                  : 'success'
                : 'danger'
            }
          >
            {stockLabel}
          </Badge>
          <p className="product-detail-page__desc">{product.description}</p>

          <div className="product-detail-page__stall-box">
            <p className="product-detail-page__stall-label">From the stall</p>
            <Link
              to={`/farmers/${product.farmer.id}`}
              className="product-detail-page__stall-link"
            >
              {product.farmer.stall_name}
            </Link>
            {product.markets[0] ? (
              <p className="product-detail-page__market-note">
                At {product.markets[0].market_name}
              </p>
            ) : null}
          </div>

          <div className="product-detail-page__actions">
            <QuantityStepper
              value={qty}
              max={Math.max(1, product.stock_quantity)}
              onChange={setQty}
              disabled={!canAdd}
            />
            <Button
              disabled={!canAdd}
              onClick={() => {
                addItem({
                  product_id: product.id,
                  farmer_id: product.farmer.id,
                  farmer_name: product.farmer.stall_name,
                  name: product.name,
                  unit: product.unit,
                  price: product.price,
                  quantity: qty,
                  image: product.image,
                  is_available: canAdd,
                });
                toast.success(`Reserved ${qty} ${product.unit} for pickup`);
              }}
            >
              <ShoppingCart className="product-detail-page__cart-icon" aria-hidden />
              Reserve for pickup
            </Button>
          </div>
        </div>
      </div>

      <div className="product-detail-page__reviews-layout">
        <Card className="product-detail-page__rating-card">
          <CardHeader>
            <CardTitle>How shoppers rated it</CardTitle>
          </CardHeader>
          <CardContent className="product-detail-page__card-content--stack">
            {ratingQuery.data
              ? (['5', '4', '3', '2', '1'] as const).map((star) => {
                  const summary = ratingQuery.data;
                  const count = summary.distribution[star];
                  const pct =
                    summary.rating_count === 0
                      ? 0
                      : Math.round((count / summary.rating_count) * 100);
                  return (
                    <div key={star} className="product-detail-page__rating-row">
                      <span className="product-detail-page__rating-star-label">
                        {star}★
                      </span>
                      <div className="product-detail-page__rating-track">
                        <div
                          className={`product-detail-page__rating-fill ${ratingFillClass(pct)}`}
                        />
                      </div>
                      <span className="product-detail-page__rating-count">{count}</span>
                    </div>
                  );
                })
              : null}
          </CardContent>
        </Card>

        <Card className="product-detail-page__comments-card">
          <CardHeader>
            <CardTitle>What shoppers say</CardTitle>
          </CardHeader>
          <CardContent className="product-detail-page__comments-stack">
            {reviewsQuery.data?.results.length ? (
              reviewsQuery.data.results.map((review) => (
                <div key={review.id} className="product-detail-page__comment">
                  <div className="product-detail-page__comment-head">
                    <p className="product-detail-page__comment-author">
                      {review.customer_display_name}
                    </p>
                    <RatingStars value={review.rating} />
                  </div>
                  <p className="product-detail-page__comment-body">{review.comment}</p>
                  <p className="product-detail-page__comment-date">
                    {formatDateTime(review.created_at)}
                  </p>
                  {review.reply ? (
                    <div className="product-detail-page__reply">
                      <p className="product-detail-page__reply-title">Reply from the stall</p>
                      <p className="product-detail-page__reply-body">{review.reply}</p>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="product-detail-page__no-comments">
                No reviews yet — be the first to share how it tasted.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {related.length > 0 ? (
        <section className="product-detail-page__related">
          <h2 className="product-detail-page__related-title">You may also like</h2>
          <div className="product-detail-page__related-grid">
            {related.map((p) => (
              <ProductCardView key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
