"""
Module: catalog.public.views_public
Description: Public catalog endpoints, open to guests and every role (Pass 4B §4.2).
"""

from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from catalog.models import Category
from catalog.public.serializers_public import CategoryReadSerializer
from core.utils import api_response


class CategoryPublicListView(APIView):
    """PU-02: active categories only, unpaginated (home page, catalog filter, product form)."""

    permission_classes = [AllowAny]

    def get(self, request):
        data = CategoryReadSerializer(Category.objects.filter(is_active=True), many=True).data
        return api_response(message='Lấy danh sách danh mục thành công', data=data, request=request)
