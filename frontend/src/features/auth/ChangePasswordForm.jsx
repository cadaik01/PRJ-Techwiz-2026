import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/useAuthStore';
import { authApi } from './authApi';

const schema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one digit.'),
    confirm_password: z.string(),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match.',
  });

export function ChangePasswordForm() {
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: ({ current_password, new_password }) =>
      authApi.changePassword({ current_password, new_password }),
    onSuccess: () => {
      // The server revokes the current token on success, so sign in again.
      toast.success('Password changed. Please sign in again.');
      clearTokens();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      // axiosClient lifts the envelope's `errors` map onto the rejection.
      const fields = error.fieldErrors ?? {};
      if (fields.current_password) {
        setError('current_password', { message: fields.current_password[0] });
      } else if (fields.new_password) {
        setError('new_password', { message: fields.new_password[0] });
      } else {
        toast.error(error.apiMessage || 'Could not change the password.');
      }
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.current_password?.message}
        {...register('current_password')}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.new_password?.message}
        {...register('new_password')}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm_password?.message}
        {...register('confirm_password')}
      />
      <Button type="submit" loading={mutation.isPending} className="mt-2">
        Change password
      </Button>
    </form>
  );
}
