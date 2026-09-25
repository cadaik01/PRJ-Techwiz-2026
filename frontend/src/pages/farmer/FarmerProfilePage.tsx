import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

import { ApiError } from '@/lib/ApiError';
import {
  useFarmerProfile,
  useUpdateFarmerProfile,
} from '@/features/farmer/hooks/useFarmerProfile';
import {
  farmerProfileSchema,
  type FarmerProfileFormValues,
} from '@/features/farmer/schemas/profile.schema';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { mapServerErrorsToForm } from '@/utils/mapServerErrors';

import './FarmerProfilePage.css';

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return email.trim().charAt(0).toUpperCase() || '?';
}

export default function FarmerProfilePage() {
  const query = useFarmerProfile();
  const mutation = useUpdateFarmerProfile();

  const form = useForm<FarmerProfileFormValues>({
    resolver: zodResolver(farmerProfileSchema),
    values: query.data
      ? {
          stall_name: query.data.stall_name,
          contact_person: query.data.contact_person,
          phone: query.data.phone,
          address: query.data.address,
          description: query.data.description ?? '',
        }
      : undefined,
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Không tải được hồ sơ"
        actionLabel="Thử lại"
        onAction={() => query.refetch()}
      />
    );
  }

  const profile = query.data;

  return (
    <div>
      <PageHeader
        title="Hồ sơ quầy"
        description="Thông tin hiển thị với khách hàng khi đặt trước."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/farmer/settings">Đổi mật khẩu</Link>
          </Button>
        }
      />

      {profile.image ? (
        <img src={profile.image} alt="" className="farmer-profile-page__banner" />
      ) : null}

      <Card className="farmer-profile-page__card">
        <CardHeader className="farmer-profile-page__header">
          <Avatar className="farmer-profile-page__avatar">
            {profile.image ? <AvatarImage src={profile.image} alt="" /> : null}
            <AvatarFallback>
              {initials(profile.contact_person || profile.stall_name, profile.email)}
            </AvatarFallback>
          </Avatar>
          <div className="farmer-profile-page__identity">
            <CardTitle className="farmer-profile-page__title-truncate">
              {profile.stall_name}
            </CardTitle>
            <p className="farmer-profile-page__email">{profile.email}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="farmer-profile-page__form"
            onSubmit={form.handleSubmit((values) =>
              mutation.mutate(values, {
                onError: (error) => {
                  const apiError = ApiError.fromUnknown(error);
                  if (Object.keys(apiError.fieldErrors).length > 0) {
                    mapServerErrorsToForm(apiError.fieldErrors, form.setError);
                    return;
                  }
                  toast.error(apiError.friendlyMessage);
                },
              }),
            )}
          >
            <div className="page-primitive__form-field">
              <Label htmlFor="stall_name">Tên quầy</Label>
              <Input id="stall_name" {...form.register('stall_name')} />
              {form.formState.errors.stall_name ? (
                <p className="page-primitive__error">
                  {form.formState.errors.stall_name.message}
                </p>
              ) : null}
            </div>
            <div className="page-primitive__form-field">
              <Label htmlFor="contact_person">Người liên hệ</Label>
              <Input id="contact_person" {...form.register('contact_person')} />
              {form.formState.errors.contact_person ? (
                <p className="page-primitive__error">
                  {form.formState.errors.contact_person.message}
                </p>
              ) : null}
            </div>
            <div className="page-primitive__form-field">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" type="tel" {...form.register('phone')} />
              {form.formState.errors.phone ? (
                <p className="page-primitive__error">
                  {form.formState.errors.phone.message}
                </p>
              ) : null}
            </div>
            <div className="page-primitive__form-field">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input id="address" {...form.register('address')} />
              {form.formState.errors.address ? (
                <p className="page-primitive__error">
                  {form.formState.errors.address.message}
                </p>
              ) : null}
            </div>
            <div className="page-primitive__form-field">
              <Label htmlFor="description">Giới thiệu</Label>
              <Textarea id="description" rows={4} {...form.register('description')} />
              {form.formState.errors.description ? (
                <p className="page-primitive__error">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" data-write loading={mutation.isPending}>
              Lưu hồ sơ
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
