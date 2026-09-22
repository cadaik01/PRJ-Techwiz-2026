import { Link } from 'react-router-dom';

// Required by the Aptech brief: a visible tree of every page in the application.
// Extend this list as routes are added.
const TREE = [
  {
    label: 'Public',
    children: [
      { label: 'Login', to: '/login' },
      { label: 'Sitemap', to: '/sitemap' },
      { label: 'Forbidden (403)', to: '/403' },
    ],
  },
  {
    label: 'Authenticated',
    children: [
      { label: 'Home', to: '/' },
      { label: 'Change password', to: '/change-password' },
    ],
  },
];

export function SitemapPage() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Sitemap</h1>
      <ul className="flex flex-col gap-6">
        {TREE.map((section) => (
          <li key={section.label}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {section.label}
            </h2>
            <ul className="flex flex-col gap-1 border-l border-slate-200 pl-4">
              {section.children.map((page) => (
                <li key={page.to}>
                  <Link to={page.to} className="text-sm text-blue-600 hover:underline">
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
