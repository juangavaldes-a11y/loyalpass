import styles from '@/app/portal.module.css';

export default function ModuleSection({ module, children, className = '' }) {
  return (
    <section id={module.anchor} className={`${styles.moduleSection} ${className}`.trim()}>
      <div className={styles.moduleSectionHeader}>
        <div>
          <p className={styles.moduleEyebrow}>Module</p>
          <h2>{module.label}</h2>
          <p className={styles.mutedText}>{module.description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}