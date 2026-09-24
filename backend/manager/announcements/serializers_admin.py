"""
Module: manager.announcements.serializers_admin
Description: Admin announcement shapes (Pass 4B §3.6 `AnnouncementAdmin`, AD-27, AD-28; A-10 rules).
"""

from rest_framework import serializers

from notifications.models import Announcement

TITLE_MESSAGE = 'Tiêu đề từ 5–150 ký tự'


class AnnouncementAdminReadSerializer(serializers.ModelSerializer):
    # The admin's email: admins have no profile name, and "Quản trị viên" would not
    # tell two admins apart.
    created_by_name = serializers.EmailField(source='created_by.email', default=None, read_only=True)

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'audience', 'starts_at', 'ends_at',
            'is_active', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class AnnouncementAdminWriteSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        min_length=5, max_length=150,
        error_messages={key: TITLE_MESSAGE for key in ('min_length', 'max_length', 'blank', 'required')},
    )
    content = serializers.CharField(
        max_length=1000,
        error_messages={'max_length': 'Nội dung tối đa 1.000 ký tự', 'blank': 'Vui lòng nhập nội dung',
                        'required': 'Vui lòng nhập nội dung'},
    )

    class Meta:
        model = Announcement
        fields = ['title', 'content', 'audience', 'starts_at', 'ends_at', 'is_active']
        extra_kwargs = {
            'audience': {'required': True, 'error_messages': {'invalid_choice': 'Đối tượng không hợp lệ',
                                                              'required': 'Vui lòng chọn đối tượng'}},
            'starts_at': {'error_messages': {'required': 'Vui lòng chọn thời điểm bắt đầu'}},
        }

    def validate(self, attrs):
        # On PATCH either bound may come from the stored row.
        starts_at = attrs.get('starts_at', getattr(self.instance, 'starts_at', None))
        ends_at = attrs.get('ends_at', getattr(self.instance, 'ends_at', None))
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({'ends_at': ['Thời điểm kết thúc phải sau thời điểm bắt đầu']})
        return attrs
