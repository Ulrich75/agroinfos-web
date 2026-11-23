import { get, getAll, type DataSource, type SourceStatus } from "../api";
import { Card, ErrorBox, Loading } from "../components/ui";
import { HEALTH, amount } from "../format";
import { useAsync } from "../hooks";

async function load() {
  const sources = await getAll<DataSource>("/data-sources");
  const statuses = await Promise.all(
    sources.map((s) => get<SourceStatus>(`/data-sources/${s.code}/status`).then((r) => r.data)),
  );
  return sources.map((s, i) => ({ source: s, status: statuses[i] }));
}

const REDISTRIBUTION: Record<string, string> = {
  public: "Publique",
  agreement: "Sous convention",
  restricted: "Restreinte",
  forbidden: "Interdite sans convention",
  unknown: "Non confirmée (non diffusée)",
};

export function SourcesPage() {
  const state = useAsync(load, []);
  return (
    <div className="page">
      <p className="lead">
        Chaque prix affiché indique sa source.
      </p>
      {state.loading && <Loading />}
      <ErrorBox error={state.error} />
      <div className="grid">
        {(state.data ?? []).map(({ source, status }) => (
          <Card key={source.code} title={source.name}>
            <dl className="facts">
              <dt>Organisme</dt>
              <dd>{source.owner}</dd>
              <dt>État</dt>
              <dd>
                <span className={`badge badge-health-${status.health}`}>
                  {HEALTH[status.health] ?? status.health}
                </span>
              </dd>
              <dt>Diffusion</dt>
              <dd>{REDISTRIBUTION[source.redistribution] ?? source.redistribution}</dd>
              <dt>Licence</dt>
              <dd>{source.license ?? "Non précisée"}</dd>
              <dt>Fréquence</dt>
              <dd>{source.update_frequency ?? "—"}</dd>
              <dt>Observations</dt>
              <dd>{amount(status.observations)}</dd>
              <dt>Données jusqu'au</dt>
              <dd>{status.freshness.latest_period_end ?? "—"}</dd>
            </dl>
            {status.health_reasons.length > 0 && (
              <ul className="muted small">
                {status.health_reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
