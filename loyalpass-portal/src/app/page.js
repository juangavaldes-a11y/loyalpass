import Link from 'next/link';
import styles from './portal.module.css';

export default function Home() {
  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.kicker}>LoyalPass SaaS</p>
        <h1>Operations Portal</h1>
        <p>
          Separate web surface for platform admins and client teams, with server-side API
          management and cache-first client workflows.
        </p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Sign In</h2>
          <p>Authenticate to access your role-specific workspace.</p>
          <Link href="/login" className={styles.linkButton}>
            Go to login
          </Link>
        </article>

        <article className={styles.card}>
          <h2>Admin Portal</h2>
          <p>Create and maintain loyalty business clients.</p>
          <Link href="/admin" className={styles.linkButton}>
            Open admin workspace
          </Link>
        </article>

        <article className={styles.card}>
          <h2>Client Portal</h2>
          <p>Manage customer records for a single loyalty program.</p>
          <Link href="/client" className={styles.linkButton}>
            Open client workspace
          </Link>
        </article>
      </section>
    </main>
  );
}
