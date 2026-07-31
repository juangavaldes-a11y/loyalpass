import Link from 'next/link';
import styles from './portal.module.css';

const highlightPoints = ['Role-based access', 'Live onboarding guidance', 'Wallet-ready customer workflows'];

export default function Home() {
  return (
    <main className={styles.pageShell}>
      <header className={styles.hero}>
        <p className={styles.kicker}>LoyalPass SaaS</p>
        <h1>Operations Portal</h1>
        <p>
          Launch loyalty programs faster with a polished admin console, guided client onboarding,
          and a streamlined workspace for customer and wallet operations.
        </p>
        <div className={styles.heroActions}>
          <Link href="/login" className={styles.linkButton}>
            Sign in
          </Link>
          <Link href="/admin" className={styles.ghostButton}>
            Open admin workspace
          </Link>
        </div>
        <div className={styles.heroMeta}>
          {highlightPoints.map((item) => (
            <span key={item} className={styles.pill}>
              {item}
            </span>
          ))}
        </div>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Secure sign-in</h2>
          <p>Authenticate into a role-aware workspace tailored to admins or client teams.</p>
          <Link href="/login" className={styles.linkButton}>
            Go to login
          </Link>
        </article>

        <article className={styles.card}>
          <h2>Admin portal</h2>
          <p>Onboard clients, manage plans, billing, and keep lifecycle states visible.</p>
          <Link href="/admin" className={styles.linkButton}>
            Open admin workspace
          </Link>
        </article>

        <article className={styles.card}>
          <h2>Client portal</h2>
          <p>Manage customers, points, and wallet passes from one guided workspace.</p>
          <Link href="/client" className={styles.linkButton}>
            Open client workspace
          </Link>
        </article>
      </section>
    </main>
  );
}
