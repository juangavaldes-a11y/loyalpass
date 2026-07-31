'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/portal.module.css';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.data.role === 'platform_admin') {
        router.push('/admin');
      } else {
        router.push('/client');
      }

      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Secure Access</p>
        <h1>LoyalPass Sign In</h1>
        <p>Role-based access for platform admins and client teams, with guided next steps after login.</p>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionHeadline}>
          <h2>Login</h2>
          <span className={styles.pill}>Portal access</span>
        </div>
        <p className={styles.mutedText}>Use your configured admin or client credentials to continue into the workspace.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {error ? <p className={styles.status}>{error}</p> : null}
      </section>
    </div>
  );
}
