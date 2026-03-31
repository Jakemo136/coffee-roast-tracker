import styles from "./FlavorPill.module.css";

interface FlavorPillProps {
  name: string;
  color: string;
  isOffFlavor?: boolean;
  selected?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}

export function FlavorPill({
  name,
  color,
  isOffFlavor,
  selected,
  onRemove,
  onClick,
}: FlavorPillProps) {
  const bgOpacity = isOffFlavor ? 0.12 : selected ? 0.25 : 0.15;
  const pillStyle = {
    background: `rgba(${hexToRgb(color)}, ${bgOpacity})`,
    borderColor: isOffFlavor ? `rgba(${hexToRgb(color)}, 0.3)` : "transparent",
  };

  const className = [
    styles.pill,
    isOffFlavor ? styles.offFlavor : "",
    selected ? styles.selected : "",
    onClick ? styles.clickable : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      style={pillStyle}
      onClick={onClick}
      title={name}
    >
      <span className={styles.dot} style={{ background: color }} />
      {selected && <span className={styles.check}>✓</span>}
      <span className={styles.name}>{name}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${name}`}
        >
          ✕
        </button>
      )}
    </span>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
