import { useState } from 'react';

import { useAdminAuditLogs } from '@/features/admin/hooks/useAdminAuditLogs';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { formatDateTime } from '@/utils/formatters';
import type { AuditLogItem } from '@/types';

import './AdminAuditLogsPage.css';

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState('');
  const [user, setUser] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    from: '',
    to: '',
  });
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const query = useAdminAuditLogs({
    action: filters.action || undefined,
    user: filters.user || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });

  return (
    <div className="admin-audit-logs-page">
      <PageHeader
        title="Audit trail"
        description="A chronological log of admin actions across the platform."
      />

      <form
        className="page-primitive__actions-row"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ action, user, from, to });
        }}
      >
        <Input
          label="Action (e.g. FARMER_APPROVE)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="page-primitive__input-narrow"
        />
        <Input
          label="Email actor"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="page-primitive__input-narrow"
        />
        <Input
          type="date"
          label="From"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="page-primitive__input-auto"
        />
        <Input
          type="date"
          label="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="page-primitive__input-auto"
        />
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>

      {query.isLoading ? (
        <PageSkeleton />
      ) : !query.data?.results.length ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <div className="page-primitive__table-wrap">
          <table className="page-primitive__table page-primitive__table-min-720">
            <thead className="page-primitive__table-head">
              <tr>
                <th className="page-primitive__table-th">Time</th>
                <th className="page-primitive__table-th">Action</th>
                <th className="page-primitive__table-th">Actor</th>
                <th className="page-primitive__table-th">Target</th>
                <th className="page-primitive__table-th" />
              </tr>
            </thead>
            <tbody>
              {query.data.results.map((log) => (
                <tr key={log.id} className="page-primitive__table-row">
                  <td className="page-primitive__table-td">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="page-primitive__table-td page-primitive__font-medium">
                    {log.action}
                  </td>
                  <td className="page-primitive__table-td">{log.user?.email ?? '—'}</td>
                  <td className="page-primitive__table-td">
                    {log.method ?? '—'} {log.endpoint ?? ''}
                  </td>
                  <td className="page-primitive__table-td">
                    <Button size="sm" variant="outline" onClick={() => setSelected(log)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="page-primitive__sheet-md">
          <SheetHeader>
            <SheetTitle>Audit details</SheetTitle>
          </SheetHeader>
          {selected ? (
            <pre className="page-primitive__pre-box">
              {JSON.stringify(selected, null, 2)}
            </pre>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
