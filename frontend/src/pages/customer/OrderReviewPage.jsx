import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';

import {
  useCustomerOrder,
  useSubmitOrderReview,
} from '../../hooks/queries/customer/useCustomerOrders';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { Button } from '@/components/common/forms/Button';
import { Textarea } from '@/components/common/forms/Textarea';
import './OrderReviewPage.css';

function StarPicker({
  value,
  onChange,
}

 ) {
  return (
    <div className="order-review-page__star-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} stars`}
          onClick={() => onChange(n)}
          className="order-review-page__star-btn"
        >
          <Star
            className={
              n <= value
                ? 'order-review-page__star-icon order-review-page__star-icon--filled'
                : 'order-review-page__star-icon order-review-page__star-icon--empty'
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function OrderReviewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const orderQuery = useCustomerOrder(id);
  const submitMutation = useSubmitOrderReview(id);

  const [farmerRating, setFarmerRating] = useState(5);
  const [farmerComment, setFarmerComment] = useState('');
  const [productRatings, setProductRatings] = useState                        ({});
  const [productComments, setProductComments] = useState                        ({});

  if (orderQuery.isLoading) return <PageSkeleton />;
  if (orderQuery.isError || !orderQuery.data) {
    return <EmptyState title="Order couldn't be loaded" />;
  }

  const order = orderQuery.data;
  const canReview = order.allowed_actions.includes('REVIEW');
  const reviewState = order.review_state;
  const canReviewFarmer =
    canReview && reviewState !== null && !reviewState.farmer_reviewed;
  const pendingProductIds =
    canReview && reviewState !== null ? reviewState.items_pending_review : [];
  const reviewableItems = order.items.filter((item) =>
    pendingProductIds.includes(item.id),
  );

  if (order.status !== 'COMPLETED' || !canReview || reviewState === null) {
    return (
      <EmptyState
        title="Reviews open after pickup"
        description="Complete your collection first, then come back to rate the stall."
        actionLabel="Back to order details"
        onAction={() => navigate(`/app/orders/${id}`)}
      />
    );
  }

  return (
    <div className="order-review-page">
      <PageHeader
        title={`Review order #${order.id}`}
        description="Tell others about the produce and your pickup experience."
      />

      {canReviewFarmer ? (
        <section className="page-primitive__panel">
          <h2 className="order-review-page__section-title">
            Stall review · {order.farmer.stall_name}
          </h2>
          <div className="page-primitive__mt-3">
            <StarPicker value={farmerRating} onChange={setFarmerRating} />
          </div>
          <Textarea
            className="page-primitive__mt-3"
            maxLength={1000}
            value={farmerComment}
            onChange={(e) => setFarmerComment(e.target.value)}
            placeholder="Comments about the stall (≤ 1000 characters)"
          />
        </section>
      ) : null}

      {reviewableItems.length > 0 ? (
        <section className="order-review-page__product-list">
          <h2 className="order-review-page__section-title">Rate each item</h2>
          {reviewableItems.map((item) => (
            <div key={item.id} className="page-primitive__panel">
              <p className="page-primitive__font-medium">{item.product_name}</p>
              <div className="page-primitive__mt-2">
                <StarPicker
                  value={productRatings[item.id] ?? 5}
                  onChange={(value) =>
                    setProductRatings((prev) => ({ ...prev, [item.id]: value }))
                  }
                />
              </div>
              <Textarea
                className="page-primitive__mt-3"
                maxLength={1000}
                value={productComments[item.id] ?? ''}
                onChange={(e) =>
                  setProductComments((prev) => ({
                    ...prev,
                    [item.id]: e.target.value,
                  }))
                }
                placeholder="Product comments"
              />
            </div>
          ))}
        </section>
      ) : null}

      <Button
        loading={submitMutation.isPending}
        onClick={() =>
          submitMutation.mutate(
            {
              farmer: canReviewFarmer
                ? {
                    rating: farmerRating,
                    comment: farmerComment.slice(0, 1000),
                  }
                : undefined,
              products: reviewableItems.map((item) => ({
                itemId: item.id,
                rating: productRatings[item.id] ?? 5,
                comment: (productComments[item.id] ?? '').slice(0, 1000),
              })),
            },
            {
              onSuccess: () => navigate(`/app/orders/${id}`),
            },
          )
        }
      >
        Submit review
      </Button>
    </div>
  );
}
