import { get, getAll, isPublished, type DataSource, type Price, type SourceStatus } from "../api";
import { Card, Empty, ErrorBox, FreshnessBadge, Loading, Stat } from "../components/ui";
import { HEALTH, amount, monthLabel } from "../format";
import { useAsync } from "../hooks";

const HIGHLIGHTS = [
  { product: "maize", variety: "white", label: "Maïs blanc" },
  { product: "rice", variety: "imported", label: "Riz importé" },
  { product: "gari", variety: "", label: "Gari" },
  { product: "tomato", variety: "", label: "Tomate" },
];

async function overview() {
  const [products, markets, prices, sources] = await Promise.all([
    get<unknown[]>("/products", { per_page: 1 }),
    get<unknown[]>("/markets", { per_page: 1 }),
    get<unknown[]>("/prices", { per_page: 1 }),
    getAll<DataSource>("/data-sources"),
  ]);
  const statuses = await Promise.all(
    sources
      .filter((s) => s.automated && isPublished(s))
      .map((s) => get<SourceStatus>(`/data-sources/${s.code}/status`).then((r) => r.data)),
  );
  return {
    products: products.meta.total ?? 0,
    markets: markets.meta.total ?? 0,
    prices: prices.meta.total ?? 0,
    statuses,
  };
}

/** Prix moyen, minimum et maximum des derniers relevés d'un produit sur tous les marchés. */
async function highlight(product: string, variety: string) {
  const latest = await getAll<Price>("/prices/latest", { product, variety, price_type: "retail" }, 2);
  const series = variety ? latest : latest.filter((p) => !p.variety);
  if (!series.length) return null;
  const newest = series.reduce((a, b) => (a.period.end > b.period.end ? a : b));
  const current = series.filter((p) => p.period.end === newest.period.end);
  const values = current.map((p) => p.price);
  return {
    period: newest.period.start,
    freshness: newest.freshness,
    average: values.reduce((a, b) => a + b, 0) / values.length,
    min: current.reduce((a, b) => (a.price < b.price ? a : b)),
    max: current.reduce((a, b) => (a.price > b.price ? a : b)),
    markets: current.length,
    unit: newest.unit.code,
  };
}

function Highlight({ product, variety, label }: (typeof HIGHLIGHTS)[number]) {
  const state = useAsync(() => highlight(product, variety), [product, variety]);
  return (
    <Card title={label}>
      {state.loading && <Loading />}
      <ErrorBox error={state.error} />
      {state.data === null && !state.loading && !state.error && <Empty>Aucun prix publié.</Empty>}
      {state.data && (
        <div className="highlight">
          <div className="big">
            {amount(state.data.average)} <small>FCFA/{state.data.unit}</small>
          </div>
          <div className="muted">
            Moyenne simple de {state.data.markets} marchés · {monthLabel(state.data.period)}{" "}
            <FreshnessBadge freshness={state.data.freshness} />
          </div>
          <div className="range">
            <span>
              ↓ {amount(state.data.min.price)} — {state.data.min.market.name}
            </span>
            <span>
              ↑ {amount(state.data.max.price)} — {state.data.max.market.name}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

export function Dashboard() {
  const state = useAsync(overview, []);
  return (
    <div className="page">
      <p className="lead">
        Démonstration de l'API d'information sur les marchés agricoles du Bénin : prix des
        produits vivriers, et comparaison des marchés, avec la source, la date et
        les limites de chaque donnée. Aucun prix n'est présenté comme « en temps réel ».
      </p>
      <ErrorBox error={state.error} />
      {state.loading && <Loading />}
      {state.data && (
        <div className="stats">
          <Stat label="produits vivriers" value={state.data.products} />
          <Stat label="marchés référencés" value={state.data.markets} />
          <Stat label="observations de prix publiées" value={amount(state.data.prices)} />
          {state.data.statuses.map((s) => (
            <Stat
              key={s.source}
              label={`source ${s.source}`}
              value={HEALTH[s.health] ?? s.health}
              hint={
                s.freshness.latest_period_end
                  ? `données jusqu'au ${s.freshness.latest_period_end}`
                  : "aucune donnée publiée"
              }
            />
          ))}
        </div>
      )}
      <h3 className="section-title">Derniers prix de détail observés</h3>
      <div className="grid">
        {HIGHLIGHTS.map((h) => (
          <Highlight key={h.product + h.variety} {...h} />
        ))}
      </div>
    </div>
  );
}
