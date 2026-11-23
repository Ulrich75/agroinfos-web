import "leaflet/dist/leaflet.css";

import { useState } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMapEvents } from "react-leaflet";

import { get, getAll, type Comparison, type Market } from "../api";
import { ProductPicker, type ProductChoice } from "../components/ProductPicker";
import { Card, Empty, ErrorBox, Field, FreshnessBadge, Loading, PeriodLabel } from "../components/ui";
import { EXCLUSIONS, amount, pct } from "../format";
import { useAsync } from "../hooks";

const BENIN: [number, number] = [9.3, 2.3];

function ClickToPlace({ onPlace }: { onPlace: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPlace(e.latlng.lat, e.latlng.lng) });
  return null;
}

interface Query extends ProductChoice {
  latitude: number;
  longitude: number;
  radius: number;
}

async function compare(q: Query) {
  const { data } = await get<Comparison>("/comparisons/markets", {
    product: q.product,
    variety: q.variety,
    latitude: q.latitude.toFixed(5),
    longitude: q.longitude.toFixed(5),
    max_distance_km: q.radius,
  });
  return data;
}

function ComparisonView({ c }: { c: Comparison }) {
  if (!c.groups.length) return <Empty>Aucun prix publié dans le rayon.</Empty>;
  return (
    <>
      {c.warnings.map((w) => (
        <p key={w} className="muted small">
          ⚠️ {w}
        </p>
      ))}
      {c.groups.map((g) => (
        <div key={JSON.stringify(g.key)} className="group">
          <h4>
            Variété : {g.key.variety ?? "non précisée"} · {g.key.price_type} · par {g.key.unit} ·
            source {g.key.source}
          </h4>
          <table>
            <thead>
              <tr>
                <th>Marché</th>
                <th className="num">Distance</th>
                <th className="num">Prix</th>
                <th className="num">Écart / marché proche</th>
                <th>Période</th>
                <th>Fraîcheur</th>
              </tr>
            </thead>
            <tbody>
              {g.markets.map((m) => (
                <tr key={m.market.code} className={m.usable ? "" : "unusable"}>
                  <td>
                    {m.market.name} {m.is_reference && <span className="chip">référence</span>}
                    {m.is_best && <span className="chip chip-best">meilleur prix</span>}
                  </td>
                  <td className="num">{amount(m.distance_km)} km</td>
                  <td className="num">{amount(m.price)}</td>
                  <td className="num">
                    {m.gap_vs_reference
                      ? `${amount(m.gap_vs_reference.absolute)} (${pct(m.gap_vs_reference.percent)})`
                      : m.unusable_reasons.map((x) => EXCLUSIONS[x] ?? x).join(", ")}
                  </td>
                  <td>
                    <PeriodLabel period={m.period} />
                  </td>
                  <td>
                    <FreshnessBadge freshness={m.freshness} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

export function MapPage() {
  const [choice, setChoice] = useState<ProductChoice>({ product: "maize", variety: "white" });
  const [position, setPosition] = useState<[number, number]>([7.75, 2.18]);
  const [radius, setRadius] = useState(100);
  const markets = useAsync(() => getAll<Market>("/markets"), []);
  const result = useAsync(
    () => compare({ ...choice, latitude: position[0], longitude: position[1], radius }),
    [choice.product, choice.variety, position[0], position[1], radius],
  );
  const nearby = new Set(result.data?.groups.flatMap((g) => g.markets.map((m) => m.market.code)));

  return (
    <div className="page map-page">
      <Card title="Comparer les marchés : cliquer sur la carte pour placer le producteur">
        <div className="filters">
          <ProductPicker value={choice} onChange={setChoice} />
          <Field label={`Rayon : ${radius} km`}>
            <input type="range" min={10} max={300} step={10} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))} />
          </Field>
          <Field label="Position">
            <span className="muted">
              {position[0].toFixed(3)}, {position[1].toFixed(3)}
            </span>
          </Field>
        </div>
        <div className="map">
          <MapContainer center={BENIN} zoom={7} scrollWheelZoom style={{ height: "100%" }}>
            <TileLayer
              attribution='&copy; contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToPlace onPlace={(lat, lon) => setPosition([lat, lon])} />
            <Circle center={position} radius={radius * 1000}
              pathOptions={{ color: "#1b7f4b", weight: 1, fillOpacity: 0.05 }} />
            <CircleMarker center={position} radius={8}
              pathOptions={{ color: "#fff", weight: 2, fillColor: "#c0662b", fillOpacity: 1 }}>
              <Tooltip>Producteur</Tooltip>
            </CircleMarker>
            {(markets.data ?? [])
              .filter((m) => m.coordinates)
              .map((m) => (
                <CircleMarker
                  key={m.code}
                  center={[m.coordinates!.latitude, m.coordinates!.longitude]}
                  radius={nearby.has(m.code) ? 7 : 4}
                  pathOptions={{
                    color: nearby.has(m.code) ? "#1b7f4b" : "#6b7a72",
                    fillOpacity: nearby.has(m.code) ? 0.9 : 0.5,
                  }}
                >
                  <Tooltip>
                    {m.name} — {m.commune?.name}, {m.department?.name}
                  </Tooltip>
                </CircleMarker>
              ))}
          </MapContainer>
        </div>
      </Card>
      {result.loading && <Loading label="Comparaison des marchés…" />}
      <ErrorBox error={result.error} />
      {result.data && (
        <Card title={`Comparaison des marchés (${result.data.markets_in_radius} marchés dans le rayon)`}>
          <ComparisonView c={result.data} />
        </Card>
      )}
    </div>
  );
}
