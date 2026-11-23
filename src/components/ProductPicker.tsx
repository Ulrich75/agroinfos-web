import { get, getAll, type Product, type ProductDetail } from "../api";
import { useAsync } from "../hooks";
import { Field } from "./ui";

export interface ProductChoice {
  product: string;
  variety: string;
}

/** Sélection d'un produit puis d'une de ses variétés (« » = toutes les variétés). */
export function ProductPicker({ value, onChange, allLabel = "Toutes" }: {
  value: ProductChoice;
  onChange: (value: ProductChoice) => void;
  /** Libellé de l'option sans variété : « Toutes » (filtre) ou « Non précisée » (série). */
  allLabel?: string;
}) {
  const products = useAsync(() => getAll<Product>("/products"), []);
  const detail = useAsync(
    () => get<ProductDetail>(`/products/${value.product}`).then((r) => r.data),
    [value.product],
  );
  const varieties = detail.data?.varieties ?? [];

  return (
    <>
      <Field label="Produit">
        <select
          value={value.product}
          onChange={(e) => onChange({ product: e.target.value, variety: "" })}
        >
          {(products.data ?? []).map((p) => (
            <option key={p.code} value={p.code}>
              {p.name_fr} ({p.category.name_fr})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Variété">
        <select
          value={value.variety}
          onChange={(e) => onChange({ ...value, variety: e.target.value })}
          disabled={!varieties.length}
        >
          <option value="">{varieties.length ? allLabel : "Non précisée"}</option>
          {varieties.map((v) => (
            <option key={v.code} value={v.code}>
              {v.name_fr}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}
