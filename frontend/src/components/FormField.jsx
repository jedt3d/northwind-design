/** Label + control + inline error, per design system form layout. */
export default function FormField({ label, required, error, hint, children, htmlFor }) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="field-required"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
