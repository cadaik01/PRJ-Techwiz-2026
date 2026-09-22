import { useAuth } from '../../features/auth/useAuth';

// Placeholder landing page. Replace with the real dashboard once the SRS is chosen.
export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-900">Signed in</h1>
      <p className="mt-2 text-sm text-slate-600">{user?.email}</p>
    </div>
  );
}
