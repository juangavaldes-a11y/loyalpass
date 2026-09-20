'use client';

import { useState } from 'react';
import { useBusinessModules, useUpdateBusinessModule } from '@/features/admin/hooks/useClients';
import styles from '@/app/portal.module.css';

export default function AdminModulesPanel() {
  const [businessId, setBusinessId] = useState('');
  const [reason, setReason] = useState('');
  const modulesQuery = useBusinessModules(businessId);
  const updateModule = useUpdateBusinessModule();
  const modules = modulesQuery.data?.data || [];

  function handleLoad(event) {
    event.preventDefault();
    modulesQuery.refetch();
  }

  function handleToggle(module) {
    const enabled = !module.enabled;
    if (!enabled && !reason.trim()) {
      return;
    }
    updateModule.mutate({
      businessId,
      moduleKey: module.key,
      enabled,
      reason: enabled ? '' : reason.trim(),
    });
  }

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Modules</h2>
          <p className={styles.mutedText}>Set tenant-level module access. Disabling a module requires a recorded reason.</p>
        </div>
      </div>
      <form onSubmit={handleLoad} className={styles.form}>
        <input
          aria-label="Business ID"
          placeholder="Business ID"
          value={businessId}
          onChange={(event) => setBusinessId(event.target.value)}
          required
        />
        <button type="submit" disabled={modulesQuery.isFetching}>Load modules</button>
      </form>
      {modules.length > 0 ? (
        <div className={styles.moduleList}>
          <textarea
            aria-label="Reason for disabling a module"
            placeholder="Reason required when disabling a module"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {modules.map((module) => (
            <div className={styles.moduleRow} key={module.key}>
              <div>
                <strong>{module.label}</strong>
                <p className={styles.mutedText}>{module.source === 'override' ? 'Admin override' : 'Plan default'}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(module)}
                disabled={updateModule.isPending || (!module.enabled && !reason.trim())}
              >
                {module.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {modulesQuery.error ? <p className={styles.status}>{modulesQuery.error.message}</p> : null}
      {updateModule.error ? <p className={styles.status}>{updateModule.error.message}</p> : null}
      {updateModule.isSuccess ? <p className={styles.status}>Module access updated.</p> : null}
    </section>
  );
}