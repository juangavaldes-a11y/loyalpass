'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessProfile, useCreateCustomer, useCustomers, useUpdateCustomer } from '@/features/client/hooks/useCustomers';
import { useQuotaStatus } from '@/features/admin/hooks/useClients';
import { useAddPoints, usePoints, useRedeemPoints } from '@/features/client/hooks/usePoints';
import { useCreatePass, usePass, useUpdatePass } from '@/features/client/hooks/usePasses';
import OnboardingChecklist from '@/features/shared/components/OnboardingChecklist';
import styles from '@/app/portal.module.css';

function mutationStatus(mutation) {
  if (mutation.isPending) return 'Working...';
  if (mutation.isSuccess) return 'Completed successfully.';
  if (mutation.isError) return mutation.error?.message || 'Request failed.';
  return null;
}

export default function ClientCustomersDashboard() {
  const router = useRouter();
  const [createForm, setCreateForm] = useState({ name: '', email: '' });
  const [editForm, setEditForm] = useState({ customerId: '', name: '', email: '' });
  const [pointsForm, setPointsForm] = useState({ customerId: '', amount: '' });
  const [passForm, setPassForm] = useState({ customerId: '', passId: '' });

  const businessProfileQuery = useBusinessProfile();
  const customersQuery = useCustomers();
  const businessId = businessProfileQuery.data?.data?.id;
  const quotaStatusQuery = useQuotaStatus(businessId);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const addPointsMutation = useAddPoints();
  const redeemPointsMutation = useRedeemPoints();
  const createPassMutation = useCreatePass();
  const updatePassMutation = useUpdatePass();

  const pointsQuery = usePoints(pointsForm.customerId);
  const passQuery = usePass(passForm.customerId);

  const customers = customersQuery.data?.data || [];
  const businessProfile = businessProfileQuery.data?.data || null;

  const onboardingSteps = [
    {
      key: 'profile',
      label: 'Complete your business profile',
      description: 'Add the brand story, colors, and core business details so the portal feels ready for launch.',
      completed: Boolean(businessProfile?.name),
    },
    {
      key: 'customers',
      label: 'Add your first loyalty customer',
      description: 'Create the first member record so the program has a real audience to engage.',
      completed: customers.length > 0,
    },
    {
      key: 'points',
      label: 'Issue your first points activity',
      description: 'Reward a member with an initial points transaction to demonstrate the program loop.',
      completed: false,
    },
    {
      key: 'passes',
      label: 'Create your first wallet pass',
      description: 'Generate a pass so customers can carry membership details into Apple or Google Wallet.',
      completed: Boolean(passQuery.data?.data?.id),
    },
  ];

  const completedSteps = onboardingSteps.filter((step) => step.completed).length;
  const progressPercent = Math.round((completedSteps / onboardingSteps.length) * 100);
  const onboardingStatusLabel = businessProfile?.onboarding_status || 'not_started';
  const nextBestAction = onboardingSteps.find((step) => !step.completed)?.label || 'You are fully set up.';
  const customerCount = customers.length;
  const passReady = Boolean(passQuery.data?.data?.id);
  const launchNarrative = customerCount > 0
    ? 'Your loyalty program has a live member base. Focus on rewarding activity and making the first wallet pass feel seamless.'
    : 'You are still in the early stage. Add your first customer and turn the workspace into an active loyalty loop.';
  const guidedAction = passReady
    ? 'You already have a pass ready. Use it to show members how their benefits travel with them.'
    : 'Create the first pass so customers can keep their membership experience mobile and visible.';

  function handleCreate(event) {
    event.preventDefault();
    createMutation.mutate(createForm);
  }

  function handleUpdate(event) {
    event.preventDefault();

    updateMutation.mutate({
      customerId: editForm.customerId,
      updates: {
        ...(editForm.name ? { name: editForm.name } : {}),
        ...(editForm.email ? { email: editForm.email } : {}),
      },
    });
  }

  function handleAddPoints(event) {
    event.preventDefault();
    addPointsMutation.mutate({
      customerId: pointsForm.customerId,
      amount: Number(pointsForm.amount),
    });
  }

  function handleRedeemPoints(event) {
    event.preventDefault();
    redeemPointsMutation.mutate({
      customerId: pointsForm.customerId,
      amount: Number(pointsForm.amount),
    });
  }

  function handleCreatePass(event) {
    event.preventDefault();
    createPassMutation.mutate(passForm.customerId);
  }

  function handleUpdatePass(event) {
    event.preventDefault();
    updatePassMutation.mutate({
      customerId: passForm.customerId,
      passId: passForm.passId,
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
        <p className={styles.kicker}>Client Portal</p>
        <h1>Customer Management</h1>
        <p>Add and update loyalty members with a cached query layer for responsive workflows.</p>
        <button type="button" className={styles.ghostButton} onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.statCard}>
          <span className={styles.pill}>Onboarding</span>
          <h3>{progressPercent}% complete</h3>
          <p className={styles.mutedText}>Current phase: {onboardingStatusLabel}</p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
        </article>
        <article className={styles.statCard}>
          <span className={styles.pill}>Customers</span>
          <h3>{customerCount}</h3>
          <p className={styles.mutedText}>Members currently tracked in your loyalty workspace.</p>
        </article>
        <article className={styles.statCard}>
          <span className={styles.pill}>Wallet</span>
          <h3>{passReady ? 'Ready' : 'Pending'}</h3>
          <p className={styles.mutedText}>Passes become available as soon as the first member is onboarded.</p>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.sectionHeadline}>
            <h2>Onboarding Guide</h2>
            <span className={styles.pill}>{onboardingStatusLabel}</span>
          </div>
          <div className={styles.guidedPanel}>
            <h3>What to do next</h3>
            <p>{nextBestAction}</p>
            <p>{launchNarrative}</p>
            <p>{guidedAction}</p>
          </div>
          <div className={styles.notice}>
            <p><strong>Status:</strong> {onboardingStatusLabel}</p>
            <p><strong>Plan:</strong> {businessProfile?.plan || 'starter'}</p>
            <p><strong>Billing:</strong> {businessProfile?.subscription_status || 'trial'}</p>
            {quotaStatusQuery.data?.data ? (
              <p><strong>Quota:</strong> {quotaStatusQuery.data.data.checks?.customers?.allowed ? 'Within plan limits' : 'Needs attention'} </p>
            ) : null}
          </div>
          <p className={styles.status}>Next step: {nextBestAction}</p>
          <OnboardingChecklist
            title="Launch checklist"
            subtitle="A practical journey from profile setup to wallet-ready customer engagement."
            steps={onboardingSteps}
            accentLabel="Client flow"
          />
        </article>

        <article className={styles.card}>
          <h2>Create Customer</h2>
          <form onSubmit={handleCreate} className={styles.form}>
            <input
              placeholder="Customer name"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              type="email"
              placeholder="customer@email.com"
              value={createForm.email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <button type="submit" disabled={createMutation.isPending}>Create customer</button>
          </form>
          {mutationStatus(createMutation) ? <p className={styles.status}>{mutationStatus(createMutation)}</p> : null}
        </article>

        <article className={styles.card}>
          <h2>Update Customer</h2>
          <form onSubmit={handleUpdate} className={styles.form}>
            <input
              placeholder="Customer ID"
              value={editForm.customerId}
              onChange={(event) => setEditForm((prev) => ({ ...prev, customerId: event.target.value }))}
              required
            />
            <input
              placeholder="New name"
              value={editForm.name}
              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              type="email"
              placeholder="new@email.com"
              value={editForm.email}
              onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <button type="submit" disabled={updateMutation.isPending}>Update customer</button>
          </form>
          {mutationStatus(updateMutation) ? <p className={styles.status}>{mutationStatus(updateMutation)}</p> : null}
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Points</h2>
          <form className={styles.form} onSubmit={handleAddPoints}>
            <input
              placeholder="Customer ID"
              value={pointsForm.customerId}
              onChange={(event) => setPointsForm((prev) => ({ ...prev, customerId: event.target.value }))}
              required
            />
            <input
              type="number"
              min="1"
              placeholder="Amount"
              value={pointsForm.amount}
              onChange={(event) => setPointsForm((prev) => ({ ...prev, amount: event.target.value }))}
              required
            />
            <button type="submit" disabled={addPointsMutation.isPending}>Add points</button>
            <button type="button" onClick={handleRedeemPoints} disabled={redeemPointsMutation.isPending}>
              Redeem points
            </button>
          </form>
          {mutationStatus(addPointsMutation) ? <p className={styles.status}>{mutationStatus(addPointsMutation)}</p> : null}
          {mutationStatus(redeemPointsMutation) ? <p className={styles.status}>{mutationStatus(redeemPointsMutation)}</p> : null}
          {pointsQuery.data?.data ? (
            <p className={styles.status}>Balance: {pointsQuery.data.data.balance}</p>
          ) : null}
        </article>

        <article className={styles.card}>
          <h2>Passes</h2>
          <form className={styles.form} onSubmit={handleCreatePass}>
            <input
              placeholder="Customer ID"
              value={passForm.customerId}
              onChange={(event) => setPassForm((prev) => ({ ...prev, customerId: event.target.value }))}
              required
            />
            <button type="submit" disabled={createPassMutation.isPending}>Create pass</button>
          </form>

          <form className={styles.form} onSubmit={handleUpdatePass}>
            <input
              placeholder="Pass ID"
              value={passForm.passId}
              onChange={(event) => setPassForm((prev) => ({ ...prev, passId: event.target.value }))}
              required
            />
            <button type="submit" disabled={updatePassMutation.isPending || !passForm.customerId}>
              Update pass
            </button>
          </form>

          {mutationStatus(createPassMutation) ? <p className={styles.status}>{mutationStatus(createPassMutation)}</p> : null}
          {mutationStatus(updatePassMutation) ? <p className={styles.status}>{mutationStatus(updatePassMutation)}</p> : null}
          {passQuery.data?.data ? (
            <div className={styles.notice}>
              <p><strong>Pass ID:</strong> {passQuery.data.data.id}</p>
              <p><strong>Apple Serial:</strong> {passQuery.data.data.apple_pass_serial || 'N/A'}</p>
              <p><strong>Google Object:</strong> {passQuery.data.data.google_pass_object_id || 'N/A'}</p>
            </div>
          ) : null}
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2>Customer List</h2>
          <button type="button" onClick={() => customersQuery.refetch()} disabled={customersQuery.isFetching}>
            Refresh
          </button>
        </div>

        {customersQuery.isLoading ? <p>Loading customers...</p> : null}
        {customersQuery.error ? <p className={styles.status}>{customersQuery.error.message}</p> : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.id}</td>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
