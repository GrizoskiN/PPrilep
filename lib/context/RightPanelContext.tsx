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
      setEntry(node ? { panel: node, route, exact } : null);
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
