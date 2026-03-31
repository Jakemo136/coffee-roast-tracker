import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { USER_SETTINGS_QUERY, UPDATE_TEMP_UNIT } from "../graphql/operations";
import styles from "./SettingsPage.module.css";

type TempUnit = "CELSIUS" | "FAHRENHEIT";

export function SettingsPage() {
  const { data, loading } = useQuery(USER_SETTINGS_QUERY);
  const [tempUnit, setTempUnit] = useState<TempUnit>("CELSIUS");
  const [updateTempUnit] = useMutation(UPDATE_TEMP_UNIT);

  useEffect(() => {
    if (data?.userSettings.tempUnit) {
      setTempUnit(data.userSettings.tempUnit as TempUnit);
    }
  }, [data]);

  function handleTempUnitChange(unit: TempUnit) {
    setTempUnit(unit);
    updateTempUnit({ variables: { tempUnit: unit } });
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Settings</h1>
        <p>Loading...</p>
      </div>
    );
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
