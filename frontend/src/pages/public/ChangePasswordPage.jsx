import { ChangePasswordForm } from '../../features/auth/ChangePasswordForm';

export function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-lg font-semibold text-slate-900">Change your password</h1>
      <ChangePasswordForm />
    </div>
  );
}
