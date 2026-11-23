import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAll, type Indicator, type Methodology } from "../api";
import { ProductPicker, type ProductChoice } from "../components/ProductPicker";
import { Card, Empty, ErrorBox, Loading, Stat } from "../components/ui";
import { amount, monthLabel, pct, shortMonthLabel } from "../format";
import { useAsync } from "../hooks";

async function load(product: string, variety: string) {
  const fetch = (type: string) =>
    getAll<Indicator>("/indicators", { type, product, variety, scope: "national" }, 5).then(
      // Sans variété choisie : la série « variété non précisée » uniquement (jamais de mélange).
      (rows) => rows.filter((i) => (variety ? true : !i.variety)),
    );
  const [index, mom, yoy, dispersion, methodologies] = await Promise.all([
    fetch("product_price_index"),
    fetch("national_change_mom"),
    fetch("national_change_yoy"),
    fetch("market_dispersion"),
    getAll<Methodology>("/indicators/methodologies"),
  ]);
  const byPeriod = (rows: Indicator[]) =>
    [...rows].sort((a, b) => a.period.start.localeCompare(b.period.start));
  return {
    index: byPeriod(index),
    mom: byPeriod(mom),
    yoy: byPeriod(yoy),
    dispersion: byPeriod(dispersion),
    methodology: methodologies.find((m) => m.id === "product_price_index"),
  };
}

const last = <T,>(rows: T[]) => rows[rows.length - 1];

export function IndicatorsPage() {
  const [choice, setChoice] = useState<ProductChoice>({ product: "maize", variety: "white" });
  const state = useAsync(() => load(choice.product, choice.variety), [choice.product, choice.variety]);
  const d = state.data;

  return (
    <div className="page">
      <Card title="Indicateurs nationaux">
        <div className="filters">
          <ProductPicker value={choice} onChange={setChoice} allLabel="Non précisée" />
        </div>
        {state.loading && <Loading />}
        <ErrorBox error={state.error} />
        {d && !d.index.length && !d.mom.length && <Empty>Aucun indicateur calculé pour cette série.</Empty>}
        {d && d.index.length > 0 && (
          <>
            <div className="stats">
              <Stat label={`indice (base ${String(d.methodology?.parameters.base_year ?? "")} = 100)`}
                value={amount(last(d.index).value)} hint={monthLabel(last(d.index).period.start)} />
              {last(d.mom) && <Stat label="variation sur 1 mois" value={pct(last(d.mom).value)}
                hint={`${String(last(d.mom).details.n_matched_markets)} marchés appariés`} />}
              {last(d.yoy) && <Stat label="variation sur 1 an" value={pct(last(d.yoy).value)}
                hint={`${String(last(d.yoy).details.n_matched_markets)} marchés appariés`} />}
              {last(d.dispersion) && <Stat label="écart entre marchés" value={pct(last(d.dispersion).value)}
                hint={`${String(last(d.dispersion).details.n_markets)} marchés`} />}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={d.index.map((i) => ({ period: i.period.start, value: i.value }))}
                margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e8e5" />
                <XAxis dataKey="period" tickFormatter={shortMonthLabel} minTickGap={30} />
                <YAxis width={50} />
                <ReferenceLine y={100} stroke="#9aa5a0" strokeDasharray="4 4" />
                <Tooltip labelFormatter={(v) => monthLabel(String(v))}
                  formatter={(v: number) => [amount(v), "Indice"]} />
                <Line type="monotone" dataKey="value" stroke="#1b7f4b" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>
      {d?.methodology && (
        <Card title={`Méthodologie — ${d.methodology.name}`}>
          <p>
            <code>{d.methodology.formula}</code>
          </p>
          <ul>
            {d.methodology.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="muted small">
            Indice calculé par la plateforme, à ne pas confondre avec un indice officiel. Chaque
            valeur conserve la liste des observations utilisées (reproductibilité).
          </p>
        </Card>
      )}
    </div>
  );
}
