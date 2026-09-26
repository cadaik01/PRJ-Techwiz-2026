import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/common/forms/Button';
import { Input } from '@/components/common/forms/Input';
import { useAuth } from '@/hooks/authentication/useAuth';
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from '@/schemas/auth/auth.schemas';
import { ApiError } from '@/lib/ApiError';
import { mapServerErrorsToForm } from '@/utils/mapServerErrors';

import './ChangePasswordForm.css';

export function ChangePasswordForm() {
  const { changePassword, changePasswordPending } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  return (
    <form
      className="change-password-form"
      onSubmit={handleSubmit(async (values) => {
        try {
          await changePassword({
            current_password: values.current_password,
            new_password: values.new_password,
            confirm_password: values.confirm_password,
          });
        } catch (error) {
          mapServerErrorsToForm(ApiError.fromUnknown(error).fieldErrors, setError);
        }
      })}
    >
      <div className="change-password-form__field">
        <Input
          id="current_password"
          type="password"
          label="Current password"
          autoComplete="current-password"
          {...register('current_password')}
        />
        {errors.current_password ? (
          <p className="change-password-form__error">{errors.current_password.message}</p>
        ) : null}
      </div>
      <div className="change-password-form__field">
        <Input
          id="new_password"
          type="password"
          label="New password"
          autoComplete="new-password"
          {...register('new_password')}
        />
        {errors.new_password ? (
          <p className="change-password-form__error">{errors.new_password.message}</p>
        ) : null}
      </div>
      <div className="change-password-form__field">
        <Input
          id="confirm_password"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          {...register('confirm_password')}
        />
        {errors.confirm_password ? (
          <p className="change-password-form__error">{errors.confirm_password.message}</p>
        ) : null}
      </div>
      <Button type="submit" loading={changePasswordPending}>
        Change password
      </Button>
    </form>
  );
}
