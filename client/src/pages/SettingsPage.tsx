import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { USER_SETTINGS_QUERY, UPDATE_TEMP_UNIT } from "../graphql/operations";
import styles from "./SettingsPage.module.css";

type TempUnit = "CELSIUS" | "FAHRENHEIT";

export function SettingsPage() {
  const { data, loading } = useQuery(USER_SETTINGS_QUERY);
  const [tempUnit, setTempUnit] = useState<TempUnit>("CELSIUS");
  const [savedUnit, setSavedUnit] = useState<TempUnit>("CELSIUS");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [updateTempUnit] = useMutation(UPDATE_TEMP_UNIT);

  useEffect(() => {
    if (data?.userSettings.tempUnit) {
      const unit = data.userSettings.tempUnit as TempUnit;
      setTempUnit(unit);
      setSavedUnit(unit);
    }
  }, [data]);

  const dirty = tempUnit !== savedUnit;

  async function handleSave() {
    setSaveState("saving");
    await updateTempUnit({ variables: { tempUnit } });
    setSavedUnit(tempUnit);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
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
              onClick={() => setTempUnit("CELSIUS")}
              aria-pressed={tempUnit === "CELSIUS"}
            >
              °C
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${tempUnit === "FAHRENHEIT" ? styles.segBtnActive : ""}`}
              onClick={() => setTempUnit("FAHRENHEIT")}
              aria-pressed={tempUnit === "FAHRENHEIT"}
            >
              °F
            </button>
          </div>
        </div>
      </div>

      <div className={styles.saveRow}>
        <button
          type="button"
          className={`${styles.saveBtn} ${dirty ? styles.saveBtnActive : ""}`}
          disabled={!dirty || saveState === "saving"}
          onClick={handleSave}
        >
          {saveState === "saving" ? "Saving..." : "Save"}
        </button>
        {saveState === "saved" && (
          <span className={styles.savedConfirm}>&#10003; Saved</span>
        )}
      </div>
    </div>
  );
}
