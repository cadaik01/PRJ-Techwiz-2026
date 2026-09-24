"""
Module: manager.categories.views_admin
Description: Admin category management (FR-56, AD-18, AD-19, screen A-07).
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Category
from manager.categories.serializers_admin import (
    CategoryAdminCreateSerializer,
    CategoryAdminReadSerializer,
    CategoryAdminUpdateSerializer,
)
from manager.categories.services import admin_categories, delete_category
from marketlink_core.permissions import IsAdmin
from marketlink_core.utils import api_response


def _category_data(category_id: int) -> dict:
    return CategoryAdminReadSerializer(admin_categories().get(id=category_id)).data


class CategoryAdminListView(APIView):
    """AD-18. Not paginated: the list is short and A-07 shows it whole."""

    permission_classes = [IsAdmin]

    def get(self, request):
        data = CategoryAdminReadSerializer(admin_categories(), many=True).data
        return api_response(message='Lấy danh sách danh mục thành công', data=data, request=request)

    def post(self, request):
        serializer = CategoryAdminCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return api_response(
            message='Đã thêm danh mục', data=_category_data(category.id),
            status_code=status.HTTP_201_CREATED, request=request,
        )


class CategoryAdminDetailView(APIView):
    """AD-19."""

    permission_classes = [IsAdmin]
    http_method_names = ['patch', 'delete', 'options']

    def patch(self, request, pk):
        category = get_object_or_404(Category, pk=pk)
        serializer = CategoryAdminUpdateSerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return api_response(message='Đã cập nhật danh mục', data=_category_data(pk), request=request)

    def delete(self, request, pk):
        get_object_or_404(Category, pk=pk)
        delete_category(category_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
