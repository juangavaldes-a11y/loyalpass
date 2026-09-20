export default function AsyncStatus({ children, tone = 'default' }) {
  if (!children) return null;

  return (
    <p className={`asyncStatus asyncStatus${tone[0].toUpperCase()}${tone.slice(1)}`} aria-live="polite" aria-atomic="true">
      {children}
    </p>
  );
}