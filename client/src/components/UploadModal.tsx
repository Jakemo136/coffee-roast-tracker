import { useRef, useState } from "react";
import { Modal } from "./Modal";
import { Combobox } from "./Combobox";
import { AddBeanModal } from "./AddBeanModal";
import { formatDuration } from "../lib/formatters";
import styles from "./styles/UploadModal.module.css";

interface SuggestedBean {
  id: string;
  shortName: string | null;
  bean: { id: string; name: string };
}

interface RoastPreview {
  roastDate?: string | null;
  ambientTemp?: number | null;
  roastingLevel?: number | null;
  profileShortName?: string | null;
  profileDesigner?: string | null;
  colourChangeTime?: number | null;
  firstCrackTime?: number | null;
  roastEndTime?: number | null;
  developmentPercent?: number | null;
  totalDuration?: number | null;
  suggestedBeans: SuggestedBean[];
  parseWarnings: string[];
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (fileName: string, fileContent: string) => Promise<RoastPreview>;
  onSave: (
    beanId: string,
    fileName: string,
    fileContent: string,
    notes?: string,
  ) => Promise<{ roastId: string }>;
  beans: Array<{ id: string; name: string }>;
  onCreateBean: (bean: {
    name: string;
    origin: string;
    process: string;
    [key: string]: unknown;
  }) => Promise<{ id: string; name: string }>;
  flavors?: Array<{ name: string; color: string }>;
}

export function UploadModal({
  isOpen,
  onClose,
  onPreview,
  onSave,
  beans,
  onCreateBean,
  flavors,
}: UploadModalProps) {
  const [step, setStep] = useState<"dropzone" | "preview">("dropzone");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [preview, setPreview] = useState<RoastPreview | null>(null);
  const [selectedBeanId, setSelectedBeanId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [addBeanOpen, setAddBeanOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("dropzone");
    setIsDragging(false);
    setFileName("");
    setFileContent("");
    setPreview(null);
    setSelectedBeanId("");
    setNotes("");
    setError("");
    setSaving(false);
    setParsing(false);
    setAddBeanOpen(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileRead(name: string, content: string) {
    setFileName(name);
    setFileContent(content);
    setError("");
    setParsing(true);

    try {
      const result = await onPreview(name, content);
      setPreview(result);
      if (result.suggestedBeans.length > 0 && result.suggestedBeans[0]) {
        setSelectedBeanId(result.suggestedBeans[0].bean.id);
      }
      setStep("preview");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse file";
      setError(message);
    } finally {
      setParsing(false);
    }
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".klog")) {
      setError("Only .klog files are supported. Please select a Kaffelogic roast file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleFileRead(file.name, content);
    };
    reader.readAsText(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  }

  async function saveRoast(beanId: string) {
    setSaving(true);
    setError("");
    try {
      await onSave(beanId, fileName, fileContent, notes || undefined);
      onClose();
      reset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save roast";
      setError(message);
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!selectedBeanId || !fileName) return;
    await saveRoast(selectedBeanId);
  }

  async function handleCreateBean(bean: {
    name: string;
    origin: string;
    process: string;
    [key: string]: unknown;
  }) {
    const created = await onCreateBean(bean);
    setSelectedBeanId(created.id);
    setAddBeanOpen(false);

    // Auto-save the roast with the newly created bean
    if (fileName && fileContent) {
      await saveRoast(created.id);
    }
  }

  const beanOptions = beans.map((b) => ({ value: b.id, label: b.name }));

  if (step === "dropzone") {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="New Roast Upload">
        {parsing ? (
          <div className={styles.dropzone} data-testid="parsing-indicator">
            <p className={styles.dropText}>Parsing {fileName}…</p>
          </div>
        ) : (
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ""}`}
            data-testid="dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className={styles.dropText}>Drop your .klog file to upload roast data</p>
            <p>
              <span className={styles.browseLink}>or browse files</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".klog"
              style={{ display: "none" }}
              onChange={handleInputChange}
              data-testid="file-input"
            />
          </div>
        )}
        {error && (
          <div className={styles.errorMessage} data-testid="upload-error">
            {error}
          </div>
        )}
      </Modal>
    );
  }

  const footer = addBeanOpen ? undefined : (
    <>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={handleClose}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={handleSave}
        disabled={!selectedBeanId || saving}
        title={!selectedBeanId ? "Select a bean first" : undefined}
      >
        {saving ? "Saving\u2026" : "Save Roast"}
      </button>
    </>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="New Roast Upload"
        footer={footer}
      >
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>{fileName}</span>
          <span className={styles.parseSuccess}>Parsed successfully</span>
        </div>

        {preview && (
          <>
            <div className={styles.metadataGrid}>
              <div>
                <div className={styles.metaLabel}>Roast Date</div>
                <div className={styles.metaValue}>
                  {preview.roastDate
                    ? new Date(preview.roastDate).toLocaleDateString()
                    : "\u2014"}
                </div>
              </div>
              <div>
                <div className={styles.metaLabel}>Duration</div>
                <div className={styles.metaValue}>
                  {formatDuration(preview.totalDuration)}
                </div>
              </div>
              <div>
                <div className={styles.metaLabel}>Profile</div>
                <div className={styles.metaValue}>
                  {preview.profileShortName ?? "\u2014"}
                </div>
              </div>
              <div>
                <div className={styles.metaLabel}>Development %</div>
                <div className={styles.metaValue}>
                  {preview.developmentPercent != null
                    ? `${preview.developmentPercent.toFixed(1)}%`
                    : "\u2014"}
                </div>
              </div>
            </div>

            {preview.parseWarnings.length > 0 && (
              <div className={styles.warningBar} data-testid="parse-warnings">
                <ul className={styles.warningList}>
                  {preview.parseWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.suggestedBeans.length > 0 ? (
              <div
                className={`${styles.matchBanner} ${styles.matchFound}`}
                data-testid="bean-match-found"
              >
                Bean match found: {preview.suggestedBeans[0]?.bean.name}
              </div>
            ) : (
              <div
                className={`${styles.matchBanner} ${styles.noMatch}`}
                data-testid="no-bean-match"
              >
                <button
                  type="button"
                  className={styles.addBeanLink}
                  onClick={() => setAddBeanOpen(true)}
                >
                  No bean match — Add new bean
                </button>
              </div>
            )}
          </>
        )}

        <div className={styles.beanSection}>
          <div className={styles.metaLabel}>Bean</div>
          <Combobox
            options={beanOptions}
            value={selectedBeanId}
            onChange={setSelectedBeanId}
            placeholder="Select a bean..."
          />
          {(preview?.suggestedBeans.length ?? 0) > 0 && (
            <button
              type="button"
              className={styles.addBeanLink}
              onClick={() => setAddBeanOpen(true)}
            >
              + Add new bean
            </button>
          )}
        </div>

        <div>
          <div className={styles.metaLabel}>Notes</div>
          <textarea
            className={styles.notesTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this roast..."
            rows={3}
            data-testid="notes-input"
          />
        </div>

        {error && (
          <div className={styles.errorMessage} data-testid="save-error">
            {error}
          </div>
        )}
      </Modal>

      <AddBeanModal
        isOpen={addBeanOpen}
        onClose={() => setAddBeanOpen(false)}
        onSave={handleCreateBean}
        flavors={flavors}
        minimal
      />
    </>
  );
}
