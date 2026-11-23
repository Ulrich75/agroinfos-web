// Mise en forme en français (montants, dates, libellés de l'API).

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const months = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" });

export const amount = (value: number) => number.format(value);

export const pct = (value: number) => `${value > 0 ? "+" : ""}${number.format(value)} %`;

export const monthLabel = (iso: string) => months.format(new Date(`${iso}T00:00:00`));

export const shortMonthLabel = (iso: string) => shortMonth.format(new Date(`${iso}T00:00:00`));

export const PRICE_TYPES: Record<string, string> = {
  retail: "Prix de détail",
  wholesale: "Prix de gros",
  producer: "Prix producteur",
};

export const FRESHNESS: Record<string, string> = {
  recent: "Récent",
  aging: "Vieillissant",
  old: "Ancien",
};

export const NOTES: Record<string, string> = {
  variety_not_specified: "Variété non précisée",
  city_level_series: "Série au niveau de la ville",
  estimated: "Estimation",
  outlier_suspected: "Valeur suspecte",
};

export const HEALTH: Record<string, string> = {
  ok: "Opérationnelle",
  stale: "Données anciennes",
  failing: "En échec",
  never_synced: "Jamais synchronisée",
  inactive: "Inactive",
  not_automated: "Collecte non automatisée",
};

export const EXCLUSIONS: Record<string, string> = {
  price_too_old: "Prix trop ancien",
  estimated_price: "Prix estimé",
  outlier_suspected: "Valeur suspecte",
};
