"use client";
import * as React from "react";
import { useApi, type Query } from "@/lib/client/api";
import type { SettingsDto } from "@/lib/types";

const Ctx = React.createContext<Query<SettingsDto> | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const q = useApi<SettingsDto>("/settings");
  React.useEffect(() => {
    const theme = q.data?.theme;
    if (!theme) return;
    document.documentElement.classList.toggle("light", theme === "light");
    try { localStorage.setItem("hq-theme", theme); } catch { /* storage unavailable */ }
  }, [q.data?.theme]);
  return <Ctx.Provider value={q}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useSettings must be used inside SettingsProvider");
  return c;
}
