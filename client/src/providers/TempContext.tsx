import { createContext, useCallback, useContext, useState } from "react";
import type { TempUnit } from "../lib/formatters";

interface TempContextValue {
  tempUnit: TempUnit;
  toggleTempUnit: () => void;
}

const TempContext = createContext<TempContextValue | null>(null);

function getInitialTempUnit(): TempUnit {
  try {
    const stored = localStorage.getItem("tempUnit");
    if (stored === "CELSIUS" || stored === "FAHRENHEIT") return stored;
  } catch {
    // localStorage unavailable (SSR, privacy mode)
  }
  return "CELSIUS";
}

interface TempProviderProps {
  children: React.ReactNode;
}

export function TempProvider({ children }: TempProviderProps) {
  const [tempUnit, setTempUnit] = useState<TempUnit>(
    getInitialTempUnit,
  );

  const toggleTempUnit = useCallback(() => {
    setTempUnit((prev) => {
      const next = prev === "CELSIUS" ? "FAHRENHEIT" : "CELSIUS";
      try {
        localStorage.setItem("tempUnit", next);
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  return (
    <TempContext.Provider value={{ tempUnit, toggleTempUnit }}>
      {children}
    </TempContext.Provider>
  );
}

export function useTempUnit(): TempContextValue {
  const context = useContext(TempContext);
  if (!context) {
    throw new Error("useTempUnit must be used within a TempProvider");
  }
  return context;
}
