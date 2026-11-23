import { useState } from "react";

import { Dashboard } from "./pages/Dashboard";
import { IndicatorsPage } from "./pages/IndicatorsPage";
import { MapPage } from "./pages/MapPage";
import { PricesPage } from "./pages/PricesPage";
import { SourcesPage } from "./pages/SourcesPage";

const TABS = [
  { id: "home", label: "Vue d'ensemble", page: Dashboard },
  { id: "prices", label: "Prix", page: PricesPage },
  { id: "map", label: "Comparer les marchés", page: MapPage },
  { id: "indicators", label: "Indicateurs", page: IndicatorsPage },
  { id: "sources", label: "Sources", page: SourcesPage },
] as const;

type TabId = (typeof TABS)[number]["id"];

function initialTab(): TabId {
  const hash = window.location.hash.slice(1);
  return (TABS.find((t) => t.id === hash)?.id ?? "home") as TabId;
}

export function App() {
  const [tab, setTab] = useState<TabId>(initialTab);
  const Page = TABS.find((t) => t.id === tab)!.page;
  const select = (id: TabId) => {
    setTab(id);
    window.location.hash = id;
  };
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div>
            <div className="title">Marchés agricoles du Bénin</div>
            <div className="subtitle">Affichage des données issue de l'API AgroInfos Bénin</div>
          </div>
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? "active" : ""} onClick={() => select(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        <Page />
      </main>
      <footer>
        Données : World Food Programme (WFP) – VAM, via Humanitarian Data Exchange, CC BY-IGO ·
        Fond de carte © OpenStreetMap · Prix observés : pas une garantie de vente.
      </footer>
    </>
  );
}
