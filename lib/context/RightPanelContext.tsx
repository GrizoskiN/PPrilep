"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface RightPanelCtx {
  overridePanel: ReactNode;
  setOverridePanel: (node: ReactNode) => void;
}

const RightPanelContext = createContext<RightPanelCtx>({
  overridePanel: null,
  setOverridePanel: () => {},
});

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [overridePanel, setOverridePanel] = useState<ReactNode>(null);
  return (
    <RightPanelContext.Provider value={{ overridePanel, setOverridePanel }}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  return useContext(RightPanelContext);
}
