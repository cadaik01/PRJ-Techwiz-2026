import { Outlet } from 'react-router-dom';

// Centred card for the signed-out screens: login, forgot password, reset.
export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="mb-6 text-center text-xl font-semibold text-slate-900">PRJ-Techwiz 2026</h1>
        <Outlet />
      </div>
    </div>
  );
}
