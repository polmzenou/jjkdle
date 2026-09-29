"use client";

import { useState, type ReactNode } from "react";
import { SegmentedTabs } from "@/components/profile/SegmentedTabs";

export type AccountTab = "palmares" | "compte";

const TABS = [
  { key: "compte", label: "Mon compte" },
  { key: "palmares", label: "Palmarès" },
] as const;

/**
 * Bascule « MON COMPTE | PALMARÈS » de `/account`.
 *
 * Les deux panneaux sont rendus par le SERVEUR et passés en children : ce
 * composant ne fait que choisir lequel est visible. Les deux restent montés
 * (l'inactif est `hidden`) → bascule instantanée, et un formulaire à moitié
 * rempli survit à un aller-retour. L'onglet est reflété dans `?tab=` via
 * `history.replaceState` (lien partageable, sans refetch serveur).
 */
export function AccountView({
  initialTab,
  palmares,
  account,
}: {
  initialTab: AccountTab;
  palmares: ReactNode;
  account: ReactNode;
}) {
  const [tab, setTab] = useState<AccountTab>(initialTab);

  const change = (next: AccountTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "palmares") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className="mt-10">
      <SegmentedTabs
        tabs={TABS}
        active={tab}
        onChange={change}
        idPrefix="account"
        label="Sections du compte"
      />

      <div
        role="tabpanel"
        id="account-panel-palmares"
        aria-labelledby="account-tab-palmares"
        hidden={tab !== "palmares"}
        className="mt-8"
      >
        {palmares}
      </div>
      <div
        role="tabpanel"
        id="account-panel-compte"
        aria-labelledby="account-tab-compte"
        hidden={tab !== "compte"}
        className="mt-8"
      >
        {account}
      </div>
    </div>
  );
}
