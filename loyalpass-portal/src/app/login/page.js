import LoginForm from '@/features/auth/components/LoginForm';

export const metadata = {
  title: 'Login | LoyalPass Portal',
  description: 'Role-based login for LoyalPass admin and client portals',
};

export default function LoginPage() {
  return <LoginForm />;
}
