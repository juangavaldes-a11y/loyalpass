'use client';

import { useState } from 'react';
import { useCreatePromotion, usePromotions, useUpdatePromotion } from '@/features/client/hooks/usePromotions';
import styles from '@/app/portal.module.css';

export default function ClientPromotionsPanel() {
  const [form, setForm] = useState({ name: '', description: '', reward_value: 10, status: 'draft', usage_limit: '' });
  const promotionsQuery = usePromotions();
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const promotions = promotionsQuery.data?.data || [];

  function handleCreate(event) {
    event.preventDefault();
    createMutation.mutate({ ...form, reward_value: Number(form.reward_value), usage_limit: form.usage_limit ? Number(form.usage_limit) : null });
  }

  function publish(promotion) {
    updateMutation.mutate({ promotionId: promotion.id, updates: { status: promotion.status === 'published' ? 'draft' : 'published' } });
  }

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Promotions</h2>
          <p className={styles.mutedText}>Create offers your members can redeem.</p>
        </div>
        <button type="button" onClick={() => promotionsQuery.refetch()} disabled={promotionsQuery.isFetching}>Refresh</button>
      </div>
      <form onSubmit={handleCreate} className={styles.form}>
        <input placeholder="Promotion name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
        <textarea placeholder="Describe the offer" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        <input type="number" min="1" placeholder="Reward points" value={form.reward_value} onChange={(event) => setForm((prev) => ({ ...prev, reward_value: event.target.value }))} required />
        <input type="number" min="1" placeholder="Usage limit (optional)" value={form.usage_limit} onChange={(event) => setForm((prev) => ({ ...prev, usage_limit: event.target.value }))} />
        <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button type="submit" disabled={createMutation.isPending}>Create promotion</button>
      </form>
      {promotionsQuery.error ? <p className={styles.status}>{promotionsQuery.error.message}</p> : null}
      {createMutation.isSuccess ? <p className={styles.status}>Promotion created.</p> : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Name</th><th>Reward</th><th>Status</th><th>Uses</th><th /></tr></thead>
          <tbody>{promotions.map((promotion) => (
            <tr key={promotion.id}>
              <td>{promotion.name}</td><td>{promotion.reward_value} points</td><td>{promotion.status}</td><td>{promotion.usage_limit || 'Unlimited'}</td>
              <td><button type="button" onClick={() => publish(promotion)} disabled={updateMutation.isPending}>{promotion.status === 'published' ? 'Pause' : 'Publish'}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}