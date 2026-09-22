import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-slate-300">403</p>
      <h1 className="text-lg font-semibold text-slate-900">You do not have access to this page</h1>
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
