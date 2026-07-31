import AdminClientsDashboard from '@/features/admin/components/AdminClientsDashboard';
import AdminAuditDashboard from '@/features/admin/components/AdminAuditDashboard';

export const metadata = {
  title: 'LoyalPass Admin Portal',
  description: 'Manage client onboarding, business profiles, and audit trails',
};

export default function AdminPage() {
  return (
    <div>
      <AdminClientsDashboard />
      <div style={{ marginTop: '2rem' }}>
        <AdminAuditDashboard />
      </div>
    </div>
  );
}
