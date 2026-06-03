"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface PanelEntry {
  panel: ReactNode;
  route: string;
  exact?: boolean;
}

interface RightPanelCtx {
  entry: PanelEntry | null;
  setOverridePanel: (node: ReactNode | null, route?: string, exact?: boolean) => void;
}

const RightPanelContext = createContext<RightPanelCtx>({
  entry: null,
  setOverridePanel: () => {},
});

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<PanelEntry | null>(null);

  const setOverridePanel = useCallback(
    (node: ReactNode | null, route = "/", exact = false) => {
      setEntry((prev) => {
        // Clearing (node === null): only the route that currently owns the slot
        // may clear it. During client-side navigation the outgoing route's
        // cleanup can fire *after* the incoming route already injected its panel;
        // without this guard that stale cleanup would wipe the new panel and the
        // user would see an empty/default panel until a hard refresh.
        if (node === null) {
          if (prev && prev.route !== route) return prev;
          return null;
        }
        return { panel: node, route, exact };
      });
    },
    [],
  );

  return (
    <RightPanelContext.Provider value={{ entry, setOverridePanel }}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  return useContext(RightPanelContext);
}
