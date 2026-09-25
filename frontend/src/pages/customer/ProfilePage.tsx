import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import {
  useCustomerProfile,
  useUpdateCustomerProfile,
} from '@/features/customer/hooks/useCustomerProfile';
import {
  profileSchema,
  type ProfileFormValues,
} from '@/features/customer/schemas/profile.schema';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { mapServerErrorsToForm } from '@/utils/mapServerErrors';

import './ProfilePage.css';

function initials(fullName: string, email: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return email.trim().charAt(0).toUpperCase() || '?';
}

export default function ProfilePage() {
  const profileQuery = useCustomerProfile();
  const mutation = useUpdateCustomerProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profileQuery.data?.full_name ?? '',
      phone: profileQuery.data?.phone ?? '',
      address: profileQuery.data?.address ?? '',
    },
  });

  if (profileQuery.isLoading) return <PageSkeleton />;
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <EmptyState
        title="Profile couldn't be loaded"
        actionLabel="Try again"
        onAction={() => profileQuery.refetch()}
      />
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="profile-page">
      <PageHeader
        title="Your profile"
        description="Keep your name, phone, and address up to date for pickups."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/change-password">Change password</Link>
          </Button>
        }
      />

      <Card className="profile-page__card">
        <CardHeader className="profile-page__header">
          <Avatar className="profile-page__avatar">
            <AvatarFallback>{initials(profile.full_name, profile.email)}</AvatarFallback>
          </Avatar>
          <div className="profile-page__identity">
            <CardTitle className="profile-page__title-truncate">
              {profile.full_name || profile.email}
            </CardTitle>
            <p className="profile-page__email">{profile.email}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="profile-page__form"
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
            <div className="profile-page__field">
              <Input
                id="full_name"
                label="Full name"
                autoComplete="name"
                {...form.register('full_name')}
              />
              {form.formState.errors.full_name ? (
                <p className="profile-page__error">
                  {form.formState.errors.full_name.message}
                </p>
              ) : null}
            </div>
            <div className="profile-page__field">
              <Input
                id="phone"
                type="tel"
                label="Phone number"
                autoComplete="tel"
                {...form.register('phone')}
              />
              {form.formState.errors.phone ? (
                <p className="profile-page__error">
                  {form.formState.errors.phone.message}
                </p>
              ) : null}
            </div>
            <div className="profile-page__field profile-page__field--full">
              <Input
                id="address"
                label="Address"
                autoComplete="street-address"
                {...form.register('address')}
              />
              {form.formState.errors.address ? (
                <p className="profile-page__error">
                  {form.formState.errors.address.message}
                </p>
              ) : null}
            </div>
            <div className="profile-page__actions">
              <Button type="submit" loading={mutation.isPending}>
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
