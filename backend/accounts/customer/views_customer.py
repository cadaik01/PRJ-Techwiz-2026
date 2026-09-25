from rest_framework.views import APIView

from accounts.customer.serializers_customer import CustomerProfileReadSerializer, CustomerProfileWriteSerializer
from accounts.services.customer_profile_service import update_customer_profile
from marketlink_core.permissions import IsCustomer
from marketlink_core.responses import api_response


class CustomerProfileView(APIView):
    """CU-02 / CU-03: the signed-in customer's own profile (C-10)."""

    permission_classes = [IsCustomer]

    def get(self, request):
        profile = request.user.customer_profile
        return api_response(message="Profile retrieved", data=CustomerProfileReadSerializer(profile).data, request=request)

    def patch(self, request):
        serializer = CustomerProfileWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = update_customer_profile(user=request.user, data=serializer.validated_data)
        return api_response(message="Profile updated", data=CustomerProfileReadSerializer(profile).data, request=request)
