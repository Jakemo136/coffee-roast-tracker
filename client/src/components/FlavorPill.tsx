import styles from "./FlavorPill.module.css";

interface FlavorPillProps {
  name: string;
  color?: string;
  isOffFlavor?: boolean;
  selected?: boolean;
  suggested?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}

export function FlavorPill({
  name,
  color,
  isOffFlavor,
  selected,
  suggested,
  onRemove,
  onClick,
}: FlavorPillProps) {
  const defaultColor = suggested ? "#5a7247" : "#888888";
  const resolvedColor = color || defaultColor;
  const bgOpacity = isOffFlavor ? 0.12 : selected ? 0.25 : suggested ? 0.08 : 0.15;
  const pillStyle = {
    background: `rgba(${hexToRgb(resolvedColor)}, ${bgOpacity})`,
    borderColor: isOffFlavor ? `rgba(${hexToRgb(resolvedColor)}, 0.3)` : "transparent",
  };

  const className = [
    styles.pill,
    isOffFlavor ? styles.offFlavor : "",
    selected ? styles.selected : "",
    suggested ? styles.suggested : "",
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
      <span className={styles.dot} style={{ background: resolvedColor }} />
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
