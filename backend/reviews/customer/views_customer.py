from rest_framework.views import APIView

from marketlink_core.permissions import IsCustomer
from marketlink_core.responses import api_response
from reviews.customer.serializers_customer import CustomerReviewReadSerializer, ReviewWriteSerializer
from reviews.services.review_service import create_farmer_review, create_product_review


def _created(request, review):
    return api_response(message="Thank you for your review", data=CustomerReviewReadSerializer(review).data,
                        status_code=201, request=request)


class FarmerReviewView(APIView):
    """CU-10: review the Farmer of a completed order (C-07)."""

    permission_classes = [IsCustomer]

    def post(self, request, order_id: int):
        serializer = ReviewWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = create_farmer_review(customer=request.user, order_id=order_id, **serializer.validated_data)
        return _created(request, review)


class ProductReviewView(APIView):
    """CU-11: review one item of a completed order (C-07)."""

    permission_classes = [IsCustomer]

    def post(self, request, order_id: int, item_id: int):
        serializer = ReviewWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = create_product_review(customer=request.user, order_id=order_id, item_id=item_id,
                                       **serializer.validated_data)
        return _created(request, review)
