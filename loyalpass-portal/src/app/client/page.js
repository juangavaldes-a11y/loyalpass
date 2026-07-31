import ClientCustomersDashboard from '@/features/client/components/ClientCustomersDashboard';

export const metadata = {
  title: 'LoyalPass Client Portal',
  description: 'Manage loyalty customers and operations',
};

export default function ClientPage() {
  return <ClientCustomersDashboard />;
}
