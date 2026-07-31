'use client';

import styles from '@/app/portal.module.css';

export default function OnboardingChecklist({ title, subtitle, steps, accentLabel }) {
  const completedCount = steps.filter((step) => step.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className={styles.onboardingCard}>
      <div className={styles.sectionHeadline}>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className={styles.mutedText}>{subtitle}</p> : null}
        </div>
        {accentLabel ? <span className={styles.pill}>{accentLabel}</span> : null}
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>
      <p className={styles.mutedText}>{progressPercent}% complete</p>

      <ul className={styles.stepList}>
        {steps.map((step) => (
          <li key={step.key} className={`${styles.stepItem} ${step.completed ? styles.stepItemCompleted : ''}`}>
            <div className={styles.stepBadge}>{step.completed ? '✓' : '↳'}</div>
            <div>
              <p className={styles.stepTitle}>{step.label}</p>
              {step.description ? <p className={styles.stepDescription}>{step.description}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
