"""
Module: manager.moderation.views_admin
Description: Content moderation (FR-54, AD-20 -> AD-24, screen A-08).
"""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from catalog.models import Product
from core.exceptions import BusinessValidationError
from core.utils import api_response
from manager.common.audit import audited
from manager.common.products import FarmerProductSerializer, admin_products
from manager.common.serializers import ReasonWriteSerializer
from manager.moderation.serializers_admin import ReviewAdminSerializer, reviews_with_relations
from manager.moderation.services import REVIEW_MODELS, review_keys, set_hidden
from manager.pagination import ContractPagination
from system.models import AuditAction

BOOLEAN_PARAMS = {'true': True, 'false': False}


def _flag(params, name) -> bool | None:
    return BOOLEAN_PARAMS.get(params.get(name, ''))


def _product_data(request, pk):
    return FarmerProductSerializer(admin_products().get(pk=pk), context={'request': request}).data


class ProductModerationListView(APIView):
    """AD-20: every product (archived too); `q` (product or stall name), `farmer_id`, `is_hidden`."""

    permission_classes = [IsAdmin]

    def get(self, request):
        params = request.query_params
        queryset = admin_products().order_by('-created_at', '-id')
        if q := params.get('q', '').strip():
            queryset = queryset.filter(Q(name__icontains=q) | Q(farmer__stall_name__icontains=q))
        if (farmer_id := params.get('farmer_id', '').strip()).isdigit():
            queryset = queryset.filter(farmer_id=int(farmer_id))
        if (is_hidden := _flag(params, 'is_hidden')) is not None:
            queryset = queryset.filter(is_hidden_by_admin=is_hidden)
        paginator = ContractPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(
            FarmerProductSerializer(page, many=True, context={'request': request}).data,
        )


def _reason_or_none(request, hide: bool) -> str | None:
    if not hide:
        return None
    serializer = ReasonWriteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data['reason']


class ProductVisibilityView(APIView):
    """AD-21: POST …/hide/ (reason) and …/restore/."""

    permission_classes = [IsAdmin]
    hide = True

    def post(self, request, pk):
        get_object_or_404(Product, pk=pk)
        reason = _reason_or_none(request, self.hide)
        audited(
            request, action=AuditAction.PRODUCT_HIDDEN if self.hide else AuditAction.PRODUCT_RESTORED,
            details={'product_id': pk, **({'reason': reason} if reason else {})},
            operation=lambda: set_hidden(model=Product, object_id=pk, actor=request.user, reason=reason),
        )
        message = 'Đã gỡ sản phẩm' if self.hide else 'Đã khôi phục sản phẩm'
        return api_response(message=message, data=_product_data(request, pk), request=request)


class ReviewModerationListView(APIView):
    """AD-22: both review tables in one list; `type` FARMER | PRODUCT, `rating` 1-5, `is_hidden`."""

    permission_classes = [IsAdmin]

    def get(self, request):
        params = request.query_params
        review_type = params.get('type', '').strip().upper() or None
        rating = params.get('rating', '').strip()
        errors = {}
        if review_type and review_type not in REVIEW_MODELS:
            errors['type'] = ['Loại đánh giá không hợp lệ']
        if rating and rating not in {'1', '2', '3', '4', '5'}:
            errors['rating'] = ['Số sao từ 1 đến 5']
        if errors:
            raise BusinessValidationError('Dữ liệu không hợp lệ', errors=errors)

        keys = review_keys(review_type=review_type, rating=int(rating) if rating else None,
                           is_hidden=_flag(params, 'is_hidden'))
        paginator = ContractPagination()
        page = paginator.paginate_queryset(keys, request, view=self)
        loaded = {
            (type_code, review.id): review
            for type_code, model in REVIEW_MODELS.items()
            for review in reviews_with_relations(model).filter(
                id__in=[key['id'] for key in page if key['type'] == type_code])
        }
        reviews = [loaded[(key['type'], key['id'])] for key in page]
        return paginator.get_paginated_response(ReviewAdminSerializer(reviews, many=True).data)


class ReviewVisibilityView(APIView):
    """AD-23 (farmer-reviews) and AD-24 (product-reviews): POST …/hide/ (reason) and …/restore/."""

    permission_classes = [IsAdmin]
    review_type = 'FARMER'
    hide = True

    def post(self, request, pk):
        model = REVIEW_MODELS[self.review_type]
        get_object_or_404(model, pk=pk)
        reason = _reason_or_none(request, self.hide)
        audited(
            request, action=AuditAction.REVIEW_HIDDEN if self.hide else AuditAction.REVIEW_RESTORED,
            details={'review_type': self.review_type, 'review_id': pk, **({'reason': reason} if reason else {})},
            operation=lambda: set_hidden(model=model, object_id=pk, actor=request.user, reason=reason),
        )
        data = ReviewAdminSerializer(reviews_with_relations(model).get(pk=pk)).data
        message = 'Đã ẩn đánh giá' if self.hide else 'Đã hiện lại đánh giá'
        return api_response(message=message, data=data, request=request)
