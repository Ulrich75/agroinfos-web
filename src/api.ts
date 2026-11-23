// Client de l'API (via le relais du serveur Vite, qui ajoute la clé d'API).
// Toutes les réponses suivent l'enveloppe commune : success / data / meta / error.

export interface ApiErrorBody {
  code: string;
  message: string;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export interface Meta {
  timestamp: string;
  page?: number;
  per_page?: number;
  total?: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta: Meta;
  error: ApiErrorBody | null;
}

type Params = Record<string, string | number | boolean | undefined | null>;

function query(params: Params = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function get<T>(path: string, params?: Params): Promise<{ data: T; meta: Meta }> {
  const response = await fetch(`/api/v1${path}${query(params)}`);
  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Réponse illisible de l'API.");
  }
  if (!response.ok || !body.success) {
    const error = body.error ?? { code: "HTTP_ERROR", message: response.statusText };
    throw new ApiError(response.status, error.code, error.message);
  }
  return { data: body.data, meta: body.meta };
}

/** Récupère toutes les pages d'une liste (au plus `maxPages` pages de 100). */
export async function getAll<T>(path: string, params: Params = {}, maxPages = 10): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data, meta } = await get<T[]>(path, { ...params, page, per_page: 100 });
    items.push(...data);
    if (!meta.total || page * 100 >= meta.total) break;
  }
  return items;
}

// --- Types des ressources utilisées par la démo -----------------------------------------

export interface Ref {
  id: string;
  code: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name_fr: string;
  category: { code: string; name_fr: string };
  is_processed: boolean;
}

export interface ProductDetail extends Product {
  varieties: { id: string; code: string; name_fr: string }[];
}

export interface Category {
  code: string;
  name_fr: string;
}

export interface AdminArea {
  id: string;
  code: string;
  name: string;
  level: string;
}

export interface Market {
  id: string;
  code: string;
  name: string;
  market_type: string;
  department: { code: string; name: string } | null;
  commune: { code: string; name: string } | null;
  coordinates: { latitude: number; longitude: number; precision_m: number | null } | null;
  distance_km?: number;
}

export interface Freshness {
  age_days: number;
  status: "recent" | "aging" | "old";
}

export interface Period {
  granularity: string;
  start: string;
  end: string;
}

export interface Price {
  id: string;
  product: Ref;
  variety: Ref | null;
  market: Market;
  price: number;
  currency: string;
  unit: { code: string; name: string };
  price_type: "producer" | "wholesale" | "retail";
  source_price_type: string;
  period: Period;
  freshness: Freshness;
  is_estimated: boolean;
  quality_flags: string[];
  comparability_notes: string[];
  source: { code: string; attribution: string | null };
}

export interface HistorySeries {
  product: Ref;
  variety: Ref | null;
  market: Market;
  unit: { code: string };
  currency: string;
  source: { code: string; attribution: string | null };
  points: { id: string; period: Period; price: number; quality_flags: string[] }[];
}

export interface Indicator {
  id: string;
  origin: "computed" | "official";
  indicator_type: string;
  name: string | null;
  methodology: { id: string; version: string } | null;
  variety: Ref | null;
  scope: { level: string; market: Ref | null };
  period: Period;
  value: number;
  value_unit: string;
  details: Record<string, unknown>;
  n_inputs: number;
}

export interface Methodology {
  id: string;
  name: string;
  formula: string;
  rules: string[];
  parameters: Record<string, unknown>;
}

export interface DataSource {
  code: string;
  name: string;
  owner: string;
  license: string | null;
  redistribution: string;
  update_frequency: string | null;
  attribution_text: string | null;
  automated: boolean;
  is_active: boolean;
}

export interface SourceStatus {
  source: string;
  health: string;
  health_reasons: string[];
  observations: number;
  records_by_status: Record<string, number>;
  freshness: { latest_period_end: string | null; age_days: number | null };
  last_run: { status: string; finished_at: string | null } | null;
}



export interface ComparisonEntry {
  market: Market;
  distance_km: number;
  price: number;
  period: Period;
  freshness: Freshness;
  usable: boolean;
  unusable_reasons: string[];
  gap_vs_reference: { absolute: number; percent: number } | null;
  is_reference: boolean;
  is_best: boolean;
}

export interface Comparison {
  groups: {
    key: { source: string; variety: string | null; unit: string; price_type: string };
    markets: ComparisonEntry[];
  }[];
  markets_in_radius: number;
  markets_without_price: { code: string; name: string; distance_km: number }[];
  warnings: string[];
}
