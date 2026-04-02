import { createPortal } from "react-dom";
import styles from "./styles/Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function Modal({ title, onClose, footer, children }: ModalProps) {
  return createPortal(
    <div
      className={styles.backdrop}
      data-testid="modal-backdrop"
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button
            className={styles.closeBtn}
            aria-label="Close modal"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
