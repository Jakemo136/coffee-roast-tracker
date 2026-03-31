import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { UPDATE_TEMP_UNIT } from "../graphql/operations";
import styles from "./SettingsPage.module.css";

type TempUnit = "CELSIUS" | "FAHRENHEIT";

export function SettingsPage() {
  // TODO: Load user's tempUnit preference from server once a `me` query exists.
  // Currently defaults to CELSIUS on page load; the mutation persists correctly.
  const [tempUnit, setTempUnit] = useState<TempUnit>("CELSIUS");
  const [updateTempUnit] = useMutation(UPDATE_TEMP_UNIT);

  function handleTempUnitChange(unit: TempUnit) {
    setTempUnit(unit);
    updateTempUnit({ variables: { tempUnit: unit } });
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      <div className={styles.card}>
        <div className={styles.settingRow}>
          <span className={styles.settingLabel}>Temperature Unit</span>
          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.segBtn} ${tempUnit === "CELSIUS" ? styles.segBtnActive : ""}`}
              onClick={() => handleTempUnitChange("CELSIUS")}
              aria-pressed={tempUnit === "CELSIUS"}
            >
              °C
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${tempUnit === "FAHRENHEIT" ? styles.segBtnActive : ""}`}
              onClick={() => handleTempUnitChange("FAHRENHEIT")}
              aria-pressed={tempUnit === "FAHRENHEIT"}
            >
              °F
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
