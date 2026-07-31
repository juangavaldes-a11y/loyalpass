'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClientLookup, useCreateClient, useUpdateClient, useUpdateOnboarding } from '@/features/admin/hooks/useClients';
import styles from '@/app/portal.module.css';

function statusFromMutation(mutation) {
  if (mutation.isPending) return 'Working...';
  if (mutation.isSuccess) return 'Completed successfully.';
  if (mutation.isError) return mutation.error?.message || 'Request failed.';
  return null;
}

export default function AdminClientsDashboard() {
  const router = useRouter();
  const [createForm, setCreateForm] = useState({
    name: '',
    logo_url: '',
    brand_color: '#18406f',
    text_color: '#ffffff',
  });

  const [lookup, setLookup] = useState({
    businessId: '',
  });

  const [updateForm, setUpdateForm] = useState({
    name: '',
    logo_url: '',
    brand_color: '',
    text_color: '',
  });

  const [onboardingForm, setOnboardingForm] = useState({
    onboardingStatus: 'not_started',
    plan: 'starter',
    trialEndsAt: '',
  });

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const updateOnboardingMutation = useUpdateOnboarding();
  const businessListQuery = useClientLookup({});
  const clientLookup = useClientLookup({ businessId: lookup.businessId });

  const lookupData = clientLookup.data?.data || null;
  const businessList = businessListQuery.data?.data || [];

  const updatePayload = useMemo(() => {
    const payload = {};
    if (updateForm.name) payload.name = updateForm.name;
    if (updateForm.logo_url) payload.logo_url = updateForm.logo_url;
    if (updateForm.brand_color) payload.brand_color = updateForm.brand_color;
    if (updateForm.text_color) payload.text_color = updateForm.text_color;
    return payload;
  }, [updateForm]);

  function handleCreate(event) {
    event.preventDefault();
    createClientMutation.mutate(createForm);
  }

  function handleLookup(event) {
    event.preventDefault();
    clientLookup.refetch();
  }

  function handleUpdate(event) {
    event.preventDefault();

    updateClientMutation.mutate({
      businessId: lookup.businessId,
      apiKey: lookup.apiKey,
      updates: updatePayload,
    });
  }

  function handleOnboarding(event) {
    event.preventDefault();

    updateOnboardingMutation.mutate({
      businessId: lookup.businessId,
      payload: {
        onboardingStatus: onboardingForm.onboardingStatus,
        plan: onboardingForm.plan,
        trialEndsAt: onboardingForm.trialEndsAt || undefined,
      },
    });
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Admin Portal</p>
        <h1>Client Lifecycle Management</h1>
        <p>
          Create new loyalty clients, inspect an existing client profile, and update brand settings.
        </p>
        <button type="button" className={styles.ghostButton} onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Onboard Client</h2>
          <form onSubmit={handleCreate} className={styles.form}>
            <input
              placeholder="Business name"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              placeholder="Logo URL"
              value={createForm.logo_url}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, logo_url: event.target.value }))}
            />
            <input
              placeholder="#18406f"
              value={createForm.brand_color}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, brand_color: event.target.value }))}
            />
            <input
              placeholder="#ffffff"
              value={createForm.text_color}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, text_color: event.target.value }))}
            />
            <button type="submit" disabled={createClientMutation.isPending}>Create client</button>
          </form>
          {createClientMutation.data?.data?.apiKey ? (
            <div className={styles.notice}>
              <p><strong>Business ID:</strong> {createClientMutation.data.data.business.id}</p>
              <p><strong>API Key:</strong> {createClientMutation.data.data.apiKey}</p>
              {createClientMutation.data.data.owner ? (
                <>
                  <p><strong>Owner Email:</strong> {createClientMutation.data.data.owner.email}</p>
                  <p><strong>Owner Password:</strong> {createClientMutation.data.data.owner.password}</p>
                </>
              ) : null}
            </div>
          ) : null}
          {statusFromMutation(createClientMutation) ? (
            <p className={styles.status}>{statusFromMutation(createClientMutation)}</p>
          ) : null}
        </article>

        <article className={styles.card}>
          <h2>Lookup Client</h2>
          <form onSubmit={handleLookup} className={styles.form}>
            <input
              placeholder="Business ID"
              value={lookup.businessId}
              onChange={(event) => setLookup((prev) => ({ ...prev, businessId: event.target.value }))}
            />
            <button type="submit" disabled={clientLookup.isFetching}>Load client</button>
          </form>

          {lookupData ? (
            <div className={styles.notice}>
              <p><strong>Name:</strong> {lookupData.name}</p>
              <p><strong>Brand:</strong> {lookupData.brand_color || 'N/A'}</p>
              <p><strong>Text:</strong> {lookupData.text_color || 'N/A'}</p>
            </div>
          ) : null}

          {clientLookup.error ? (
            <p className={styles.status}>{clientLookup.error.message}</p>
          ) : null}
        </article>

        <article className={styles.card}>
          <h2>Update Client</h2>
          <form onSubmit={handleUpdate} className={styles.form}>
            <input
              placeholder="New name"
              value={updateForm.name}
              onChange={(event) => setUpdateForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              placeholder="New logo URL"
              value={updateForm.logo_url}
              onChange={(event) => setUpdateForm((prev) => ({ ...prev, logo_url: event.target.value }))}
            />
            <input
              placeholder="New brand color"
              value={updateForm.brand_color}
              onChange={(event) => setUpdateForm((prev) => ({ ...prev, brand_color: event.target.value }))}
            />
            <input
              placeholder="New text color"
              value={updateForm.text_color}
              onChange={(event) => setUpdateForm((prev) => ({ ...prev, text_color: event.target.value }))}
            />
            <button type="submit" disabled={updateClientMutation.isPending || !lookup.businessId || !lookup.apiKey}>
              Update client
            </button>
          </form>

          {statusFromMutation(updateClientMutation) ? (
            <p className={styles.status}>{statusFromMutation(updateClientMutation)}</p>
          ) : null}
        </article>

        <article className={styles.card}>
          <h2>Onboarding & Plan</h2>
          <form onSubmit={handleOnboarding} className={styles.form}>
            <select
              value={onboardingForm.onboardingStatus}
              onChange={(event) => setOnboardingForm((prev) => ({ ...prev, onboardingStatus: event.target.value }))}
            >
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={onboardingForm.plan}
              onChange={(event) => setOnboardingForm((prev) => ({ ...prev, plan: event.target.value }))}
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <input
              type="date"
              value={onboardingForm.trialEndsAt}
              onChange={(event) => setOnboardingForm((prev) => ({ ...prev, trialEndsAt: event.target.value }))}
            />
            <button type="submit" disabled={updateOnboardingMutation.isPending || !lookup.businessId}>
              Save onboarding
            </button>
          </form>

          {statusFromMutation(updateOnboardingMutation) ? (
            <p className={styles.status}>{statusFromMutation(updateOnboardingMutation)}</p>
          ) : null}
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2>All Clients</h2>
          <button type="button" onClick={() => businessListQuery.refetch()} disabled={businessListQuery.isFetching}>
            Refresh
          </button>
        </div>

        {businessListQuery.isLoading ? <p>Loading clients...</p> : null}
        {businessListQuery.error ? <p className={styles.status}>{businessListQuery.error.message}</p> : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Plan</th>
                <th>Onboarding</th>
              </tr>
            </thead>
            <tbody>
              {businessList.map((business) => (
                <tr key={business.id}>
                  <td>{business.id}</td>
                  <td>{business.name}</td>
                  <td>{business.plan || 'starter'}</td>
                  <td>{business.onboarding_status || 'not_started'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
