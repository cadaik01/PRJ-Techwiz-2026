import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FavoriteButton } from '@/features/customer/components/FavoriteButton';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { LazyImage } from '@/components/common/LazyImage';
import { RatingStars } from '@/components/common/RatingStars';
import { ProductCardView } from '@/features/catalog/components/ProductCardView';
import { useFarmer, useFarmerPickupOptions, useFarmerProducts, useFarmerReviews } from '@/features/catalog/hooks/useCatalog';
import { googleMapsDirectionsUrl, WEEKDAY_LABELS } from '@/utils/helpers/geo';
import { formatDateTime } from '@/utils/formatters';
import { useFavorites } from '@/features/customer/hooks/useFavorites';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import './FarmerDetailPage.css';
const MiniMap = lazy(() => import('@/components/common/MarketsMap').then((m) => ({ default: m.MiniMap })));
export default function FarmerDetailPage() {
    const { id = '' } = useParams();
    const farmerQuery = useFarmer(id);
    const pickupQuery = useFarmerPickupOptions(id);
    const productsQuery = useFarmerProducts(id);
    const reviewsQuery = useFarmerReviews(id);
    const { hasFarmer, toggleFarmer } = useFavorites();
    if (farmerQuery.isLoading)
        return <PageSkeleton />;
    if (farmerQuery.isError || !farmerQuery.data) {
        return (<div className="farmer-detail-page__empty-wrap">
        <EmptyState title="This stall could not be found" actionLabel="Try again" onAction={() => farmerQuery.refetch()}/>
      </div>);
    }
    const farmer = farmerQuery.data;
    const favorited = hasFarmer(farmer.id);
    const primaryWindow = farmer.pickup_windows[0];
    return (<div className="farmer-detail-page">
      <div className="farmer-detail-page__cover">
        {farmer.image ? (<LazyImage src={farmer.image} alt="" className="farmer-detail-page__cover-img"/>) : null}
        <div className="farmer-detail-page__cover-gradient" aria-hidden/>
      </div>

      <div className="farmer-detail-page__container">
        <div className="farmer-detail-page__profile-row">
          <div className="farmer-detail-page__profile-main">
            <Avatar className="farmer-detail-page__avatar">
              {farmer.image ? <AvatarImage src={farmer.image} alt=""/> : null}
              <AvatarFallback className="farmer-detail-page__avatar-fallback">
                {farmer.stall_name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="farmer-detail-page__profile-copy">
              <h1 className="farmer-detail-page__name">{farmer.stall_name}</h1>
              <p className="farmer-detail-page__contact">{farmer.contact_person}</p>
              <div className="farmer-detail-page__rating-wrap">
                <RatingStars value={farmer.rating_avg} count={farmer.rating_count} size="md"/>
              </div>
            </div>
          </div>
          <FavoriteButton active={favorited} onToggle={() => {
            toggleFarmer(farmer.id);
            toast.success(favorited ? 'Removed from favorites' : 'Added to favorites');
        }} className="farmer-detail-page__fav"/>
        </div>

        <div className="farmer-detail-page__badges">
          {farmer.markets.map((m) => (<Badge key={m.market_id} variant="secondary">
              {m.market_name} · {m.stall_label}
            </Badge>))}
        </div>

        <Tabs defaultValue="products" className="farmer-detail-page__tabs">
          <TabsList>
            <TabsTrigger value="products">On the stall</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="about">About the stall</TabsTrigger>
            <TabsTrigger value="schedule">Pickup times</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {productsQuery.isLoading ? (<div className="farmer-detail-page__products-grid">
                {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="farmer-detail-page__product-skeleton"/>))}
              </div>) : productsQuery.data?.results.length ? (<div className="farmer-detail-page__products-grid">
                {productsQuery.data.results.map((p) => (<ProductCardView key={p.id} product={p}/>))}
              </div>) : (<EmptyState title="Nothing listed yet — check back soon"/>)}
          </TabsContent>

          <TabsContent value="reviews" className="farmer-detail-page__reviews-panel">
            {reviewsQuery.data?.results.map((review) => (<div key={review.id} className="farmer-detail-page__review">
                <div className="farmer-detail-page__review-head">
                  <p className="farmer-detail-page__review-author">
                    {review.customer_display_name}
                  </p>
                  <RatingStars value={review.rating}/>
                </div>
                <p className="farmer-detail-page__review-body">{review.comment}</p>
                <p className="farmer-detail-page__review-date">
                  {formatDateTime(review.created_at)}
                </p>
                {review.reply ? (<div className="farmer-detail-page__reply">
                    <p className="farmer-detail-page__reply-title">Reply from the stall</p>
                    <p className="farmer-detail-page__reply-body">{review.reply}</p>
                  </div>) : null}
              </div>))}
            {!reviewsQuery.data?.results.length ? (<p className="farmer-detail-page__no-reviews">
                No reviews yet — be the first to share your experience.
              </p>) : null}
          </TabsContent>

          <TabsContent value="about" className="farmer-detail-page__about-layout">
            <div className="farmer-detail-page__about-copy">
              <p className="farmer-detail-page__bio">{farmer.description}</p>
              {farmer.phone ? (<p className="farmer-detail-page__phone">
                  Phone:{' '}
                  <a className="farmer-detail-page__phone-link" href={`tel:${farmer.phone}`}>
                    {farmer.phone}
                  </a>
                </p>) : null}
              <div className="farmer-detail-page__market-links">
                {farmer.markets.map((m) => (<Button key={m.market_id} asChild variant="outline" size="sm">
                    <Link to={`/markets/${m.market_id}`}>{m.market_name}</Link>
                  </Button>))}
              </div>
            </div>
            <div className="farmer-detail-page__about-map">
              {primaryWindow ? (<>
                  <Suspense fallback={<Skeleton className="farmer-detail-page__map-skeleton"/>}>
                    <MiniMap latitude={primaryWindow.latitude} longitude={primaryWindow.longitude} label={farmer.stall_name} className="farmer-detail-page__map"/>
                  </Suspense>
                  <Button asChild className="farmer-detail-page__directions" variant="outline">
                    <a href={googleMapsDirectionsUrl(primaryWindow.latitude, primaryWindow.longitude)} target="_blank" rel="noreferrer">
                      <ExternalLink className="farmer-detail-page__directions-icon" aria-hidden/>
                      Get directions to the stall
                    </a>
                  </Button>
                </>) : null}
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="farmer-detail-page__schedule-list">
              {pickupQuery.data?.map((option) => (<div key={option.market_id} className="farmer-detail-page__schedule-card">
                  <div>
                    <h3 className="farmer-detail-page__schedule-market">
                      {option.market_name}
                    </h3>
                    <p className="farmer-detail-page__schedule-stall">
                      {option.stall_label}
                    </p>
                  </div>
                  <div className="farmer-detail-page__schedule-dates">
                    {option.dates.map((dateOption) => (<div key={dateOption.date}>
                        <p className="farmer-detail-page__date-label">
                          {WEEKDAY_LABELS[dateOption.day_of_week]} · {dateOption.date}
                        </p>
                        <div className="farmer-detail-page__slots">
                          {dateOption.slots
                    .filter((s) => s.is_bookable)
                    .map((slot) => (<div key={slot.pickup_slot_id} className="farmer-detail-page__slot">
                                <p className="farmer-detail-page__slot-time">
                                  {slot.start_time}–{slot.end_time}
                                </p>
                                <p className="farmer-detail-page__slot-cutoff">
                                  Cut-off {formatDateTime(slot.cutoff_at)}
                                </p>
                              </div>))}
                        </div>
                      </div>))}
                  </div>
                </div>))}
              {!pickupQuery.data?.length ? (<EmptyState title="Pickup times are not set yet"/>) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>);
}
