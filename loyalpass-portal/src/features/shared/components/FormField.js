export default function FormField({ label, hint, children }) {
  return (
    <label>
      <span className="fieldLabel">{label}</span>
      {children}
      {hint ? <span className="fieldHint">{hint}</span> : null}
    </label>
  );
}