'use client';

import { useMemo, useState } from 'react';
import { useAuditLogs } from '@/features/admin/hooks/useAuditLogs';
import styles from '@/app/portal.module.css';

export default function AdminAuditDashboard() {
  const [filters, setFilters] = useState({
    businessId: '',
    action: '',
    entityType: '',
    from: '',
    to: '',
  });

  const queryParams = useMemo(() => {
    const params = {};
    if (filters.businessId) params.businessId = filters.businessId;
    if (filters.action) params.action = filters.action;
    if (filters.entityType) params.entityType = filters.entityType;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    return params;
  }, [filters]);

  const auditLogsQuery = useAuditLogs(queryParams);
  const entries = auditLogsQuery.data?.data || [];
  const pagination = auditLogsQuery.data?.pagination || null;

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <h2>Audit Trail</h2>
        <button type="button" onClick={() => auditLogsQuery.refetch()} disabled={auditLogsQuery.isFetching}>
          Refresh
        </button>
      </div>

      <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
        <input
          placeholder="Business ID"
          value={filters.businessId}
          onChange={(event) => setFilters((prev) => ({ ...prev, businessId: event.target.value }))}
        />
        <input
          placeholder="Action"
          value={filters.action}
          onChange={(event) => setFilters((prev) => ({ ...prev, action: event.target.value }))}
        />
        <input
          placeholder="Entity type"
          value={filters.entityType}
          onChange={(event) => setFilters((prev) => ({ ...prev, entityType: event.target.value }))}
        />
        <input
          type="date"
          value={filters.from}
          onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
        />
        <input
          type="date"
          value={filters.to}
          onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
        />
      </form>

      {auditLogsQuery.isLoading ? <p>Loading audit logs...</p> : null}
      {auditLogsQuery.error ? <p className={styles.status}>{auditLogsQuery.error.message}</p> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Business</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td>{entry.business_id || 'Platform'}</td>
                <td>{entry.actor_type || 'Unknown'}:{entry.actor_id || 'n/a'}</td>
                <td>{entry.action}</td>
                <td>{entry.entity_type || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <p className={styles.status}>
          Showing {entries.length} of {pagination.total} entries · page {pagination.page}/{pagination.totalPages}
        </p>
      ) : null}
    </section>
  );
}
