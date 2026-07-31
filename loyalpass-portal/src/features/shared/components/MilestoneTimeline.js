'use client';

import styles from '@/app/portal.module.css';

export default function MilestoneTimeline({ title, subtitle, milestones }) {
  const statusClasses = {
    completed: styles.timelineStepCompleted,
    current: styles.timelineStepCurrent,
    upcoming: styles.timelineStepUpcoming,
  };

  return (
    <div className={styles.timelineCard}>
      <div className={styles.sectionHeadline}>
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className={styles.mutedText}>{subtitle}</p> : null}
        </div>
      </div>

      <ol className={styles.timelineList}>
        {milestones.map((milestone, index) => {
          const status = milestone.status || 'upcoming';
          const statusLabel = status === 'completed'
            ? 'Complete'
            : status === 'current'
              ? 'In progress'
              : 'Planned';

          return (
            <li key={milestone.key || `${title}-${index}`} className={`${styles.timelineItem} ${statusClasses[status] || styles.timelineStepUpcoming}`}>
              <div className={styles.timelineMarker}>{index + 1}</div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineMeta}>
                  <p className={styles.stepTitle}>{milestone.label}</p>
                  <span className={styles.timelineStatusBadge}>{statusLabel}</span>
                </div>
                {milestone.description ? <p className={styles.stepDescription}>{milestone.description}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
