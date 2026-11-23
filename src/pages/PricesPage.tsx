import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { get, getAll, type AdminArea, type HistorySeries, type Price } from "../api";
import { ProductPicker, type ProductChoice } from "../components/ProductPicker";
import {
  Card,
  Empty,
  ErrorBox,
  Field,
  FreshnessBadge,
  Loading,
  Notes,
  PeriodLabel,
} from "../components/ui";
import { PRICE_TYPES, amount, shortMonthLabel } from "../format";
import { useAsync } from "../hooks";

const COLORS = ["#1b7f4b", "#c0662b", "#2b6cb0", "#8a3ffc", "#b8860b", "#c53030"];

function History({ product, variety, market }: { product: string; variety: string; market: string }) {
  const state = useAsync(
    () =>
      get<HistorySeries[]>("/prices/history", { product, variety, market, per_page: 10 }).then(
        (r) => r.data,
      ),
    [product, variety, market],
  );
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorBox error={state.error} />;
  const series = state.data ?? [];
  if (!series.length) return <Empty>Pas d'historique.</Empty>;

  // Une ligne par série comparable (variété, type de prix, source) ; axe : début de période.
  const rows = new Map<string, Record<string, number | string>>();
  series.forEach((s, i) =>
    s.points.forEach((p) => {
      const row = rows.get(p.period.start) ?? { period: p.period.start };
      row[`s${i}`] = p.price;
      rows.set(p.period.start, row);
    }),
  );
  const data = [...rows.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  return (
    <>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e8e5" />
          <XAxis dataKey="period" tickFormatter={shortMonthLabel} minTickGap={30} />
          <YAxis width={60} />
          <Tooltip
            labelFormatter={(v) => shortMonthLabel(String(v))}
            formatter={(v: number) => `${amount(v)} FCFA/${series[0].unit.code}`}
          />
          <Legend />
          {series.map((s, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={`s${i}`}
              name={`${s.variety?.name ?? "Variété non précisée"} · ${s.source.code}`}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              connectNulls={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="muted small">
        Une courbe par série comparable. Les mois sans relevé ne sont pas interpolés.
        {series[0].source.attribution && ` ${series[0].source.attribution}.`}
      </p>
    </>
  );
}

export function PricesPage() {
  const [choice, setChoice] = useState<ProductChoice>({ product: "maize", variety: "white" });
  const [department, setDepartment] = useState("");
  const [priceType, setPriceType] = useState("");
  const [selected, setSelected] = useState<Price | null>(null);

  const departments = useAsync(
    () => getAll<AdminArea>("/admin-areas", { level: "department" }),
    [],
  );
  const prices = useAsync(
    () =>
      getAll<Price>("/prices/latest", {
        product: choice.product,
        variety: choice.variety,
        department,
        price_type: priceType,
      }, 3),
    [choice.product, choice.variety, department, priceType],
  );
  const rows = [...(prices.data ?? [])].sort((a, b) => b.period.end.localeCompare(a.period.end) || a.price - b.price);

  return (
    <div className="page">
      <Card title="Derniers prix disponibles par marché">
        <div className="filters">
          <ProductPicker value={choice} onChange={(c) => { setChoice(c); setSelected(null); }} />
          <Field label="Département">
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Tout le Bénin</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type de prix">
            <select value={priceType} onChange={(e) => setPriceType(e.target.value)}>
              <option value="">Tous</option>
              {Object.entries(PRICE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <ErrorBox error={prices.error} />
        {prices.loading && <Loading />}
        {!prices.loading && !prices.error && !rows.length && (
          <Empty>Aucun prix publié pour ces critères.</Empty>
        )}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Marché</th>
                  <th>Commune / département</th>
                  <th>Variété</th>
                  <th className="num">Prix</th>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Fraîcheur</th>
                  <th>Remarques</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className={selected?.id === p.id ? "selected" : "clickable"}
                    onClick={() => setSelected(p)}
                    title="Afficher l'historique"
                  >
                    <td>{p.market.name}</td>
                    <td className="muted">
                      {p.market.commune?.name} · {p.market.department?.name}
                    </td>
                    <td>{p.variety?.name ?? "—"}</td>
                    <td className="num">
                      <strong>{amount(p.price)}</strong> FCFA/{p.unit.code}
                    </td>
                    <td>{PRICE_TYPES[p.price_type]}</td>
                    <td>
                      <PeriodLabel period={p.period} />
                    </td>
                    <td>
                      <FreshnessBadge freshness={p.freshness} />
                    </td>
                    <td>
                      <Notes notes={p.comparability_notes} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows[0] && (
          <p className="muted small">
            {rows.length} séries · Source : {rows[0].source.attribution ?? rows[0].source.code}.
            Cliquer sur une ligne pour afficher l'historique du marché.
          </p>
        )}
      </Card>
      {selected && (
        <Card title={`Historique — ${selected.product.name} à ${selected.market.name}`}>
          <History
            product={choice.product}
            variety={choice.variety}
            market={selected.market.code}
          />
        </Card>
      )}
    </div>
  );
}
