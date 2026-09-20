'use client';

import styles from '@/app/portal.module.css';

export default function PortalShell({ eyebrow, title, description, modules = [], onLogout, children }) {
  return (
    <div className={styles.pageShell}>
      <header className={styles.hero}>
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.kicker}>{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {onLogout ? <button type="button" className={styles.ghostButton} onClick={onLogout}>Logout</button> : null}
        </div>
        {modules.length > 0 ? (
          <nav className={styles.moduleNavigation} aria-label="Application modules">
            {modules.map((module) => <a key={module.key} href={`#${module.anchor}`}>{module.label}</a>)}
          </nav>
        ) : null}
      </header>
      {children}
    </div>
  );
}