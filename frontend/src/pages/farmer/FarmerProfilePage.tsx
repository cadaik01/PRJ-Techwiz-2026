import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

import { ApiError } from '@/lib/ApiError';
import {
  useFarmerProfile,
  useUpdateFarmerProfile,
} from '@/hooks/queries/farmer/useFarmerProfile';
import {
  farmerProfileSchema,
  type FarmerProfileFormValues,
} from '@/schemas/farmer/profile.schema';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { LazyImage } from '@/components/common/cards/LazyImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/common/avatar/Avatar';
import { Button } from '@/components/common/forms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/cards/Card';
import { Input } from '@/components/common/forms/Input';
import { Label } from '@/components/common/forms/Label';
import { Textarea } from '@/components/common/forms/Textarea';
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
        title="Profile couldn't be loaded"
        actionLabel="Try again"
        onAction={() => query.refetch()}
      />
    );
  }

  const profile = query.data;

  return (
    <div className="farmer-profile-page">
      <PageHeader
        title="Stall profile"
        description="This is what shoppers see when they discover and pre-order from you."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/farmer/settings">Change password</Link>
          </Button>
        }
      />

      {profile.image ? (
        <LazyImage
          src={profile.image}
          alt=""
          className="farmer-profile-page__banner"
        />
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
              <Input id="stall_name" label="Stall name" {...form.register('stall_name')} />
              {form.formState.errors.stall_name ? (
                <p className="page-primitive__error">
                  {form.formState.errors.stall_name.message}
                </p>
              ) : null}
            </div>
            <div className="page-primitive__form-field">
              <Input
                id="contact_person"
                label="Contact person"
                {...form.register('contact_person')}
              />
              {form.formState.errors.contact_person ? (
                <p className="page-primitive__error">
                  {form.formState.errors.contact_person.message}
                </p>
              ) : null}
            </div>
            <div className="page-primitive__form-field">
              <Input
                id="phone"
                type="tel"
                label="Phone number"
                {...form.register('phone')}
              />
              {form.formState.errors.phone ? (
                <p className="page-primitive__error">
                  {form.formState.errors.phone.message}
                </p>
              ) : null}
            </div>
            <div className="page-primitive__form-field">
              <Input id="address" label="Address" {...form.register('address')} />
              {form.formState.errors.address ? (
                <p className="page-primitive__error">
                  {form.formState.errors.address.message}
                </p>
              ) : null}
            </div>
            <div className="page-primitive__form-field farmer-profile-page__field--full">
              <Label htmlFor="description">About</Label>
              <Textarea id="description" rows={4} {...form.register('description')} />
              {form.formState.errors.description ? (
                <p className="page-primitive__error">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>
            <div className="farmer-profile-page__actions">
              <Button type="submit" data-write loading={mutation.isPending}>
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
