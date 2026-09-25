import { useState } from 'react';
import { toast } from 'sonner';

import {
  useFarmerMyReviews,
  useReplyReview,
} from '@/features/farmer/hooks/useFarmerReviews';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { RatingStars } from '@/components/common/RatingStars';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { formatRelative } from '@/utils/formatters';

import './FarmerReviewsPage.css';

export default function FarmerReviewsPage() {
  const [targetType, setTargetType] = useState<'ALL' | 'FARMER' | 'PRODUCT'>('ALL');
  const [rating, setRating] = useState<string>('');
  const [replied, setReplied] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const query = useFarmerMyReviews({
    type: targetType === 'ALL' ? undefined : targetType,
    rating: rating ? Number(rating) : undefined,
    replied: replied === '' ? undefined : replied === 'true',
  });

  const replyMutation = useReplyReview();

  return (
    <div className="farmer-reviews-page">
      <PageHeader title="Đánh giá" description="Phản hồi đánh giá về quầy và sản phẩm." />

      <div className="page-primitive__actions-row">
        <select
          className="page-primitive__select"
          value={targetType}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'ALL' || v === 'FARMER' || v === 'PRODUCT') setTargetType(v);
          }}
        >
          <option value="ALL">Tất cả</option>
          <option value="FARMER">Quầy</option>
          <option value="PRODUCT">Sản phẩm</option>
        </select>
        <select
          className="page-primitive__select"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        >
          <option value="">Mọi sao</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} sao
            </option>
          ))}
        </select>
        <select
          className="page-primitive__select"
          value={replied}
          onChange={(e) => setReplied(e.target.value)}
        >
          <option value="">Mọi phản hồi</option>
          <option value="false">Chưa trả lời</option>
          <option value="true">Đã trả lời</option>
        </select>
      </div>

      {query.isLoading ? (
        <PageSkeleton />
      ) : query.isError ? (
        <EmptyState
          title="Không tải được đánh giá"
          actionLabel="Thử lại"
          onAction={() => query.refetch()}
        />
      ) : !query.data?.results.length ? (
        <EmptyState title="Chưa có đánh giá" />
      ) : (
        <ul className="farmer-reviews-page__list">
          {query.data.results.map((review) => (
            <li key={review.id} className="farmer-reviews-page__item">
              <div className="page-primitive__row-start">
                <div>
                  <p className="page-primitive__semibold">
                    {review.customer_display_name}
                  </p>
                  <p className="page-primitive__muted-xs">
                    {review.type === 'PRODUCT'
                      ? (review.product?.name ?? 'Sản phẩm')
                      : 'Đánh giá quầy'}{' '}
                    · {formatRelative(review.created_at)}
                  </p>
                </div>
                <RatingStars value={review.rating} />
              </div>
              <p className="page-primitive__muted-sm page-primitive__mt-2">
                {review.comment}
              </p>
              {review.reply ? (
                <div className="page-primitive__reply-box page-primitive__mt-3">
                  <p className="page-primitive__font-medium">Phản hồi của bạn</p>
                  <p className="page-primitive__muted-sm">{review.reply}</p>
                </div>
              ) : (
                <div className="farmer-reviews-page__reply-form">
                  <Textarea
                    placeholder="Viết phản hồi (1–500 ký tự)"
                    value={drafts[review.id] ?? ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [review.id]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    size="sm"
                    data-write
                    loading={replyMutation.isPending}
                    onClick={() => {
                      const reply = (drafts[review.id] ?? '').trim();
                      if (!reply) {
                        toast.error('Nhập nội dung phản hồi');
                        return;
                      }
                      replyMutation.mutate({ id: review.id, reply });
                    }}
                  >
                    Gửi phản hồi
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
