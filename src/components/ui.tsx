import type { ReactNode } from "react";

import { ApiError, type Freshness, type Period } from "../api";
import { FRESHNESS, NOTES, monthLabel } from "../format";

export function Card({ title, children, actions }: {
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-header">
          {title && <h2>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return <p className="muted loading">{label}</p>;
}

export function ErrorBox({ error }: { error: Error | null }) {
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : "ERREUR";
  return (
    <div className="alert alert-error">
      <strong>{code}</strong> — {error.message}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted empty">{children}</p>;
}

export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  return (
    <span className={`badge badge-${freshness.status}`} title="Âge depuis la fin de la période observée">
      {FRESHNESS[freshness.status]} · {freshness.age_days} j
    </span>
  );
}

export function PeriodLabel({ period }: { period: Period }) {
  return <span>{period.granularity === "month" ? monthLabel(period.start) : `${period.start} → ${period.end}`}</span>;
}

export function Notes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <span className="notes">
      {notes.map((n) => (
        <span key={n} className="chip">
          {NOTES[n] ?? n}
        </span>
      ))}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
