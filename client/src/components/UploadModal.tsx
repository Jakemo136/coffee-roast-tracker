import { useRef, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { Modal } from "./Modal";
import { PREVIEW_ROAST_LOG, UPLOAD_ROAST_LOG, MY_BEANS_QUERY, MY_ROASTS_QUERY } from "../graphql/operations";
import styles from "./UploadModal.module.css";

interface UploadModalProps {
  onClose: () => void;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function UploadModal({ onClose }: UploadModalProps) {
  const [step, setStep] = useState<"dropzone" | "preview">("dropzone");
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedBeanId, setSelectedBeanId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewRoastLog, { data: previewData, loading: previewLoading, error: previewError }] =
    useLazyQuery(PREVIEW_ROAST_LOG);

  const { data: beansData } = useQuery(MY_BEANS_QUERY);

  const [uploadRoastLog, { loading: uploadLoading }] = useMutation(UPLOAD_ROAST_LOG, {
    refetchQueries: [{ query: MY_ROASTS_QUERY }],
    onCompleted: () => onClose(),
  });

  function handleFile(selected: File) {
    if (!selected.name.endsWith(".klog")) return;
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      previewRoastLog({ variables: { fileName: selected.name, fileContent: content } }).then(
        (result) => {
          if (result.data) {
            const suggested = result.data.previewRoastLog.suggestedBean;
            if (suggested) {
              setSelectedBeanId(suggested.id);
            }
            setStep("preview");
          }
        },
      );
    };
    reader.readAsText(selected);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragEnter(e: React.DragEvent) {
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

  function handleSave() {
    if (!selectedBeanId || !file) return;
    uploadRoastLog({
      variables: { beanId: selectedBeanId, fileName: file.name, fileContent },
    });
  }

  const preview = previewData?.previewRoastLog;
  const beans = beansData?.myBeans ?? [];

  if (step === "dropzone") {
    return (
      <Modal title="Upload Roast Log" onClose={onClose}>
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ""}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="drop-zone"
        >
          <p className={styles.dropText}>Drop your .klog file here</p>
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
        {previewLoading && <p>Parsing file...</p>}
        {previewError && <p>Error parsing file: {previewError.message}</p>}
      </Modal>
    );
  }

  return (
    <Modal
      title="Upload Roast Log"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={!selectedBeanId || uploadLoading}
          >
            Save Roast
          </button>
        </>
      }
    >
      {file && (
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>{file.name}</span>
          <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
          <span className={styles.parseSuccess}>Parsed successfully ✓</span>
        </div>
      )}

      {preview && (
        <>
          <div className={styles.metadataGrid}>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Bean Match</div>
              <div className={styles.metaValue}>
                {preview.suggestedBean
                  ? `${preview.suggestedBean.shortName} — ${preview.suggestedBean.bean.name}`
                  : "No match found"}
              </div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Roast Date</div>
              <div className={styles.metaValue}>
                {preview.roastDate
                  ? new Date(preview.roastDate).toLocaleDateString()
                  : "—"}
              </div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Duration</div>
              <div className={styles.metaValue}>
                {formatDuration(preview.totalDuration)}
              </div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Development</div>
              <div className={styles.metaValue}>
                {preview.developmentPercent != null
                  ? `${preview.developmentPercent.toFixed(1)}%`
                  : "—"}
              </div>
            </div>
          </div>

          {preview.parseWarnings.length > 0 && (
            <div className={styles.warningBar} data-testid="parse-warnings">
              {preview.parseWarnings.join(". ")}
            </div>
          )}
        </>
      )}

      <label>
        <span className={styles.metaLabel}>Bean</span>
        <select
          className={styles.beanSelect}
          value={selectedBeanId}
          onChange={(e) => setSelectedBeanId(e.target.value)}
          data-testid="bean-select"
        >
          <option value="">Select a bean...</option>
          {beans.map((ub) => (
            <option key={ub.id} value={ub.id}>
              {ub.shortName} — {ub.bean.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={styles.metaLabel}>Notes</span>
        <textarea
          className={styles.notesTextarea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this roast..."
        />
      </label>
    </Modal>
  );
}
