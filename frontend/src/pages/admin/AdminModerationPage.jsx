import { useState } from 'react';
import { toast } from 'sonner';

import {
  useHideModerationItem,
  useModerationProducts,
  useModerationReviews,
  useRestoreModerationProduct,
  useRestoreModerationReview,
} from '../../hooks/queries/admin/useAdminModeration';

import { ConfirmDialog } from '@/components/common/modal/ConfirmDialog';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { LazyImage } from '@/components/common/cards/LazyImage';
import { RatingStars } from '@/components/common/badges/RatingStars';
import { Badge } from '@/components/common/badges/Badge';
import { Button } from '@/components/common/forms/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/layout/Tabs';
import { SortSelect } from '@/components/common/table/SortSelect';
import { Textarea } from '@/components/common/forms/Textarea';

import './AdminModerationPage.css';

// AD-21, AD-23 and AD-24 all require 5 to 500 characters; rejecting shorter text here
// saves a round trip that would come back as a 400.
const REASON_MIN_LENGTH = 5;

function reviewTarget(review                  )         {
  return review.product
    ? review.product.name
    : `Stall review · Order #${review.order_id}`;
}

const PRODUCT_SORT = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'stall_name', label: 'Stall A–Z' },
  { value: '-price', label: 'Highest price' },
  { value: '-rating', label: 'Highest rated' },
  { value: 'rating', label: 'Lowest rated' },
  { value: '-is_hidden', label: 'Hidden first' },
];

const REVIEW_SORT = [
  { value: 'rating', label: 'Lowest rating' },
  { value: '-rating', label: 'Highest rating' },
  { value: 'created_at', label: 'Oldest first' },
];

export default function AdminModerationPage() {
  const [hideTarget, setHideTarget] = useState                         (null);
  const [reason, setReason] = useState('');

  // The two tabs sort independently: they are different lists with different columns.
  const [productOrdering, setProductOrdering] = useState                    (undefined);
  const [reviewOrdering, setReviewOrdering] = useState                    (undefined);
  const productsQuery = useModerationProducts({ ordering: productOrdering });
  const reviewsQuery = useModerationReviews({ ordering: reviewOrdering });
  const hide = useHideModerationItem();
  const restoreProduct = useRestoreModerationProduct();
  const restoreReview = useRestoreModerationReview();

  return (
    <div className="page-primitive__stack-4">
      <PageHeader
        title="Content moderation"
        description="Hide or restore products and reviews that need review."
      />
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="admin-moderation-page__list">
          <SortSelect
            id="product-moderation-sort"
            options={PRODUCT_SORT}
            value={productOrdering}
            onChange={setProductOrdering}
          />
          {productsQuery.isLoading ? (
            <PageSkeleton />
          ) : !productsQuery.data?.results.length ? (
            <EmptyState title="No products awaiting moderation" />
          ) : (
            productsQuery.data.results.map((p) => (
              <div key={p.id} className="admin-moderation-page__row">
                <div className="admin-moderation-page__info">
                  <LazyImage
                    src={p.image}
                    alt=""
                    className="admin-moderation-page__thumb"
                  />
                  <div>
                    <p className="admin-moderation-page__name">{p.name}</p>
                    <p className="page-primitive__muted-xs">{p.farmer.stall_name}</p>
                    {p.is_hidden_by_admin ? (
                      <Badge variant="danger" className="admin-moderation-page__badge">
                        Hidden: {p.hidden_reason}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {p.is_hidden_by_admin ? (
                  <Button size="sm" onClick={() => restoreProduct.mutate(p.id)}>
                    Restore
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setHideTarget({ type: 'product', id: p.id });
                      setReason('');
                    }}
                  >
                    Hide
                  </Button>
                )}
              </div>
            ))
          )}
        </TabsContent>
        <TabsContent value="reviews" className="admin-moderation-page__list">
          <SortSelect
            id="review-moderation-sort"
            options={REVIEW_SORT}
            value={reviewOrdering}
            onChange={setReviewOrdering}
          />
          {reviewsQuery.isLoading ? (
            <PageSkeleton />
          ) : !reviewsQuery.data?.results.length ? (
            <EmptyState title="No reviews awaiting moderation" />
          ) : (
            reviewsQuery.data.results.map((r) => (
              <div key={r.id} className="admin-moderation-page__review-card">
                <div className="admin-moderation-page__review-top">
                  <div>
                    <p className="admin-moderation-page__name">
                      {r.customer_display_name}
                    </p>
                    <RatingStars value={r.rating} />
                    <p className="page-primitive__muted-xs">{reviewTarget(r)}</p>
                    <p className="admin-moderation-page__comment">{r.comment}</p>
                    {r.is_hidden_by_admin ? (
                      <Badge variant="danger" className="admin-moderation-page__badge">
                        Hidden: {r.hidden_reason}
                      </Badge>
                    ) : null}
                  </div>
                  {r.is_hidden_by_admin ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        restoreReview.mutate({ id: r.id, reviewType: r.type })
                      }
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setHideTarget({ type: 'review', id: r.id, reviewType: r.type });
                        setReason('');
                      }}
                    >
                      Hide
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(hideTarget)}
        onOpenChange={(open) => {
          if (!open) setHideTarget(null);
        }}
        title="Hide this content"
        description="Add a short reason before hiding it from shoppers."
        destructive
        loading={hide.isPending}
        onConfirm={() => {
          if (!hideTarget || reason.trim().length < REASON_MIN_LENGTH) {
            toast.error(`Reason must be at least ${REASON_MIN_LENGTH} characters`);
            return;
          }
          hide.mutate(
            { ...hideTarget, reason },
            {
              onSuccess: () => {
                setHideTarget(null);
                setReason('');
              },
            },
          );
        }}
      >
        <Textarea
          className="admin-moderation-page__reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}
