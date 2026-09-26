from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.farmer.serializers_farmer import FarmerProfileUpdateSerializer
from accounts.models import FarmerProfile
from accounts.selectors import build_farmer_own_profile
from accounts.services.farmer_profile import update_farmer_profile
from marketlink_core.exceptions import ErrorCode, ResourceNotFoundError
from marketlink_core.permissions import IsFarmer
from marketlink_core.responses import api_response


class FarmerProfileView(APIView):
    """FA-02 / FA-03. Every farmer status may edit its own profile (decision v1.8)."""

    permission_classes = [IsFarmer]

    def _get_profile(self, request: Request) -> FarmerProfile:
        profile = getattr(request.user, "farmer_profile", None)
        if profile is None:
            raise ResourceNotFoundError("Farmer profile not found.", code=ErrorCode.NOT_FOUND)
        return profile

    def get(self, request: Request) -> Response:
        """FA-02: own profile = FarmerPublic + email, status, status_reason, location_found."""
        profile = self._get_profile(request)
        return api_response(
            message="OK", data=build_farmer_own_profile(profile, request=request), request=request
        )

    def patch(self, request: Request) -> Response:
        """FA-03: partial update (JSON, or multipart when an image is sent)."""
        profile = self._get_profile(request)
        serializer = FarmerProfileUpdateSerializer(
            data=request.data, partial=True, context={"farmer_id": profile.pk}
        )
        serializer.is_valid(raise_exception=True)

        result = update_farmer_profile(farmer_id=profile.pk, data=serializer.validated_data)
        data = build_farmer_own_profile(result.profile, request=request)
        if result.deactivated_slot_count is not None:
            data["deactivated_slot_count"] = result.deactivated_slot_count
        return api_response(message="Profile updated successfully.", data=data, request=request)
