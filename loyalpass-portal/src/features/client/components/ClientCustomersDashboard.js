'use client';

import { useDeferredValue, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBusinessProfile, useCreateCustomer, useCustomers, useUpdateCustomer } from '@/features/client/hooks/useCustomers';
import { useQuotaStatus } from '@/features/admin/hooks/useClients';
import { useAddPoints, usePointTransactions, usePoints, useRedeemPoints } from '@/features/client/hooks/usePoints';
import { useCreatePass, usePass, useUpdatePass } from '@/features/client/hooks/usePasses';
import OnboardingChecklist from '@/features/shared/components/OnboardingChecklist';
import MilestoneTimeline from '@/features/shared/components/MilestoneTimeline';
import ClientPromotionsPanel from './ClientPromotionsPanel';
import { useClientModules } from '@/features/client/hooks/useModules';
import { getEnabledClientModules } from '@/modules/registry';
import PortalShell from '@/features/shared/components/PortalShell';
import ModuleSection from '@/features/shared/components/ModuleSection';
import { useOperationalAnalytics } from '@/features/client/hooks/useOperationalAnalytics';
import ClientTeamPanel from './ClientTeamPanel';
import styles from '@/app/portal.module.css';

function mutationStatus(mutation) {
  if (mutation.isPending) return 'Working...';
  if (mutation.isSuccess) return 'Completed successfully.';
  if (mutation.isError) return mutation.error?.message || 'Request failed.';
  return null;
}

export default function ClientCustomersDashboard() {
  const router = useRouter();
  const [createForm, setCreateForm] = useState({ name: '', email: '', tags: '', marketingConsent: false });
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [pointsForm, setPointsForm] = useState({ amount: '', reason: '' });
  const [passForm, setPassForm] = useState({ passId: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const deferredCustomerSearch = useDeferredValue(customerSearch);

  const businessProfileQuery = useBusinessProfile();
  const customersQuery = useCustomers({ search: deferredCustomerSearch });
  const businessId = businessProfileQuery.data?.data?.id;
  const quotaStatusQuery = useQuotaStatus(businessId);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const addPointsMutation = useAddPoints();
  const redeemPointsMutation = useRedeemPoints();
  const createPassMutation = useCreatePass();
  const updatePassMutation = useUpdatePass();

  const customers = customersQuery.data?.data || [];
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null;
  const pointsQuery = usePoints(selectedCustomerId);
  const pointTransactionsQuery = usePointTransactions(selectedCustomerId);
  const passQuery = usePass(selectedCustomerId);
  const modulesQuery = useClientModules();
  const analyticsQuery = useOperationalAnalytics();

  const businessProfile = businessProfileQuery.data?.data || null;
  const analytics = analyticsQuery.data?.data;
  const enabledModules = new Set(
    (modulesQuery.data?.data || []).filter((module) => module.enabled).map((module) => module.key)
  );
  const enabledModuleDefinitions = getEnabledClientModules(modulesQuery.data?.data || []);
  const moduleByKey = new Map(enabledModuleDefinitions.map((module) => [module.key, module]));

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
  const clientMilestones = [
    {
      key: 'profile',
      label: 'Profile foundation',
      description: 'Complete the business profile and define the campaign style.',
      status: businessProfile?.name ? 'completed' : 'current',
    },
    {
      key: 'members',
      label: 'Member onboarding',
      description: 'Capture the first loyalty customers and build a vibrant member list.',
      status: customerCount > 0 ? 'completed' : 'current',
    },
    {
      key: 'reward',
      label: 'Points loop',
      description: 'Issue rewards so customers can see value in the program immediately.',
      status: 'upcoming',
    },
    {
      key: 'wallet',
      label: 'Wallet launch',
      description: 'Ship the first mobile pass and connect the experience across devices.',
      status: passReady ? 'completed' : 'upcoming',
    },
  ];

  function handleCreate(event) {
    event.preventDefault();
    createMutation.mutate({
      name: createForm.name,
      email: createForm.email,
      tags: createForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      marketing_consent: createForm.marketingConsent,
    });
  }

  function handleUpdate(event) {
    event.preventDefault();

    updateMutation.mutate({
      customerId: selectedCustomerId,
      updates: {
        ...(editForm.name ? { name: editForm.name } : {}),
        ...(editForm.email ? { email: editForm.email } : {}),
      },
    });
  }

  function handleAddPoints(event) {
    event.preventDefault();
    addPointsMutation.mutate({
      customerId: selectedCustomerId,
      amount: Number(pointsForm.amount),
      reason: pointsForm.reason || undefined,
    });
  }

  function handleRedeemPoints(event) {
    event.preventDefault();
    redeemPointsMutation.mutate({
      customerId: selectedCustomerId,
      amount: Number(pointsForm.amount),
      reason: pointsForm.reason || undefined,
    });
  }

  function handleCreatePass(event) {
    event.preventDefault();
    createPassMutation.mutate(selectedCustomerId);
  }

  function handleUpdatePass(event) {
    event.preventDefault();
    updatePassMutation.mutate({
      customerId: selectedCustomerId,
      passId: passForm.passId,
    });
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <PortalShell
      eyebrow="Client Portal"
      title="Customer Management"
      description="Run the loyalty program through the modules enabled for your organization."
      modules={enabledModuleDefinitions}
      onLogout={handleLogout}
    >

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
        <article className={styles.statCard}>
          <span className={styles.pill}>30-day activity</span>
          <h3>{analytics?.transactionCount ?? '—'}</h3>
          <p className={styles.mutedText}>{analytics ? `${analytics.pointsIssued} issued · ${analytics.pointsRedeemed} redeemed` : 'Loading loyalty activity.'}</p>
        </article>
      </section>

      {enabledModules.has('customers') ? <section className={styles.moduleSection}>
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
          <MilestoneTimeline
            title="Milestone timeline"
            subtitle="A compact view of the rollout phases that matter most for the first launch."
            milestones={clientMilestones}
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
            <input
              placeholder="Tags, separated by commas"
              value={createForm.tags}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, tags: event.target.value }))}
            />
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={createForm.marketingConsent}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, marketingConsent: event.target.checked }))}
              />
              Customer agreed to marketing communications
            </label>
            <button type="submit" disabled={createMutation.isPending}>Create customer</button>
          </form>
          {mutationStatus(createMutation) ? <p className={styles.status}>{mutationStatus(createMutation)}</p> : null}
        </article>

        <article className={styles.card}>
          <h2>Update Customer</h2>
          <form onSubmit={handleUpdate} className={styles.form}>
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
            <button type="submit" disabled={updateMutation.isPending || !selectedCustomer}>Update selected customer</button>
          </form>
          {mutationStatus(updateMutation) ? <p className={styles.status}>{mutationStatus(updateMutation)}</p> : null}
        </article>
      </section>
      </section> : null}

      <section className={styles.grid}>
        {enabledModules.has('points') ? <ModuleSection module={moduleByKey.get('points')}>
        <article className={styles.card}>
          <h2>Points</h2>
          <form className={styles.form} onSubmit={handleAddPoints}>
            <p className={styles.mutedText}>{selectedCustomer ? `Selected: ${selectedCustomer.name}` : 'Select a customer from the directory.'}</p>
            <input
              type="number"
              min="1"
              placeholder="Amount"
              value={pointsForm.amount}
              onChange={(event) => setPointsForm((prev) => ({ ...prev, amount: event.target.value }))}
              required
            />
            <input
              placeholder="Reason for this adjustment"
              value={pointsForm.reason}
              onChange={(event) => setPointsForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
            <button type="submit" disabled={addPointsMutation.isPending || !selectedCustomer}>Add points</button>
            <button type="button" onClick={handleRedeemPoints} disabled={redeemPointsMutation.isPending || !selectedCustomer}>
              Redeem points
            </button>
          </form>
          {mutationStatus(addPointsMutation) ? <p className={styles.status}>{mutationStatus(addPointsMutation)}</p> : null}
          {mutationStatus(redeemPointsMutation) ? <p className={styles.status}>{mutationStatus(redeemPointsMutation)}</p> : null}
          {pointsQuery.data?.data ? (
            <p className={styles.status}>Balance: {pointsQuery.data.data.balance}</p>
          ) : null}
          {pointTransactionsQuery.data?.data?.length ? (
            <div className={styles.ledgerList}>
              <h3>Recent activity</h3>
              {pointTransactionsQuery.data.data.map((entry) => (
                <div className={styles.ledgerEntry} key={entry.id}>
                  <strong>{entry.amount > 0 ? '+' : ''}{entry.amount} points</strong>
                  <span>{entry.reason || entry.action}</span>
                  <span>Balance {entry.balance_after}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>
        </ModuleSection> : null}

        {enabledModules.has('passes') ? <ModuleSection module={moduleByKey.get('passes')}>
        <article className={styles.card}>
          <h2>Passes</h2>
          <form className={styles.form} onSubmit={handleCreatePass}>
            <p className={styles.mutedText}>{selectedCustomer ? `Selected: ${selectedCustomer.name}` : 'Select a customer from the directory.'}</p>
            <button type="submit" disabled={createPassMutation.isPending || !selectedCustomer}>Create pass</button>
          </form>

          <form className={styles.form} onSubmit={handleUpdatePass}>
            <input
              placeholder="Pass ID"
              value={passForm.passId}
              onChange={(event) => setPassForm((prev) => ({ ...prev, passId: event.target.value }))}
              required
            />
            <button type="submit" disabled={updatePassMutation.isPending || !selectedCustomer}>
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
        </ModuleSection> : null}
      </section>

      {enabledModules.has('customers') ? <ModuleSection module={moduleByKey.get('customers')}>
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2>Customer List</h2>
          <button type="button" onClick={() => customersQuery.refetch()} disabled={customersQuery.isFetching}>
            Refresh
          </button>
        </div>

        <input
          aria-label="Search customers"
          className={styles.directorySearch}
          placeholder="Search by customer name or email"
          value={customerSearch}
          onChange={(event) => setCustomerSearch(event.target.value)}
        />

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
              {customers.length === 0 && !customersQuery.isLoading ? <tr><td colSpan="3">No customers match this search.</td></tr> : null}
              {customers.map((customer) => (
                <tr key={customer.id} className={customer.id === selectedCustomerId ? styles.selectedRow : ''}>
                  <td>{customer.id}</td>
                  <td><button type="button" className={styles.tableAction} onClick={() => setSelectedCustomerId(customer.id)}>{customer.name}</button></td>
                  <td>{customer.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </ModuleSection> : null}

      {enabledModules.has('promotions') ? <ModuleSection module={moduleByKey.get('promotions')}><ClientPromotionsPanel /></ModuleSection> : null}
      <ClientTeamPanel />
    </PortalShell>
  );
}
