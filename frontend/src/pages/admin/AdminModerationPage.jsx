import { useState } from 'react';
import { toast } from 'sonner';
import { useHideModerationItem, useModerationProducts, useModerationReviews, useRestoreModerationProduct, useRestoreModerationReview } from '@/features/admin/hooks/useAdminModeration';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { LazyImage } from '@/components/common/LazyImage';
import { RatingStars } from '@/components/common/RatingStars';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import './AdminModerationPage.css';
export default function AdminModerationPage() {
    const [hideTarget, setHideTarget] = useState(null);
    const [reason, setReason] = useState('');
    const productsQuery = useModerationProducts();
    const reviewsQuery = useModerationReviews();
    const hide = useHideModerationItem();
    const restoreProduct = useRestoreModerationProduct();
    const restoreReview = useRestoreModerationReview();
    return (<div className="admin-moderation-page">
      <PageHeader eyebrow="Content review" title="Content moderation" description="Hide or restore products and reviews that need review."/>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="admin-moderation-page__list">
          {productsQuery.isLoading ? (<PageSkeleton />) : !productsQuery.data?.results.length ? (<EmptyState title="No products awaiting moderation"/>) : (productsQuery.data.results.map((p) => (<div key={p.id} className="admin-moderation-page__row">
                <div className="admin-moderation-page__info">
                  <LazyImage src={p.image} alt="" className="admin-moderation-page__thumb"/>
                  <div>
                    <p className="admin-moderation-page__name">{p.name}</p>
                    <p className="page-primitive__muted-xs">{p.farmer.stall_name}</p>
                    {p.is_hidden_by_admin ? (<Badge variant="danger" className="admin-moderation-page__badge">
                        Hidden: {p.hidden_reason}
                      </Badge>) : null}
                  </div>
                </div>
                {p.is_hidden_by_admin ? (<Button size="sm" onClick={() => restoreProduct.mutate(p.id)}>
                    Restore
                  </Button>) : (<Button size="sm" variant="destructive" onClick={() => {
                    setHideTarget({ type: 'product', id: p.id });
                    setReason('');
                }}>
                    Hide
                  </Button>)}
              </div>)))}
        </TabsContent>
        <TabsContent value="reviews" className="admin-moderation-page__list">
          {reviewsQuery.isLoading ? (<PageSkeleton />) : !reviewsQuery.data?.results.length ? (<EmptyState title="No reviews awaiting moderation"/>) : (reviewsQuery.data.results.map((r) => (<div key={r.id} className="admin-moderation-page__review-card">
                <div className="admin-moderation-page__review-top">
                  <div>
                    <p className="admin-moderation-page__name">
                      {r.customer_display_name}
                    </p>
                    <RatingStars value={r.rating}/>
                    <p className="page-primitive__muted-xs">{r.target_label}</p>
                    <p className="admin-moderation-page__comment">{r.comment}</p>
                    {r.is_hidden_by_admin ? (<Badge variant="danger" className="admin-moderation-page__badge">
                        Hidden: {r.hidden_reason}
                      </Badge>) : null}
                  </div>
                  {r.is_hidden_by_admin ? (<Button size="sm" onClick={() => restoreReview.mutate(r.id)}>
                      Restore
                    </Button>) : (<Button size="sm" variant="destructive" onClick={() => {
                    setHideTarget({ type: 'review', id: r.id });
                    setReason('');
                }}>
                      Hide
                    </Button>)}
                </div>
              </div>)))}
        </TabsContent>
      </Tabs>

      <ConfirmDialog open={Boolean(hideTarget)} onOpenChange={(open) => {
            if (!open)
                setHideTarget(null);
        }} title="Hide this content" description="Add a short reason before hiding it from shoppers." destructive loading={hide.isPending} onConfirm={() => {
            if (!hideTarget || reason.trim().length < 3) {
                toast.error('Reason must be at least 3 characters');
                return;
            }
            hide.mutate({ ...hideTarget, reason }, {
                onSuccess: () => {
                    setHideTarget(null);
                    setReason('');
                },
            });
        }}>
        <Textarea className="admin-moderation-page__reason" value={reason} onChange={(e) => setReason(e.target.value)}/>
      </ConfirmDialog>
    </div>);
}
