import styles from "./styles/FlavorPill.module.css";

interface FlavorPillProps {
  name: string;
  color: string;
  variant?: "default" | "off-flavor";
  onRemove?: () => void;
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function FlavorPill({
  name,
  color,
  variant = "default",
  onRemove,
}: FlavorPillProps) {
  const isOffFlavor = variant === "off-flavor";
  const bgOpacity = isOffFlavor ? 0.1 : 0.15;

  const pillStyle = {
    backgroundColor: `rgba(${hexToRgb(color)}, ${bgOpacity})`,
    color: color,
    borderColor: isOffFlavor ? `rgba(${hexToRgb(color)}, 0.4)` : "transparent",
  };

  const className = [
    styles.pill,
    isOffFlavor ? styles.offFlavor : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      style={pillStyle}
      data-testid="flavor-pill"
      title={name}
    >
      <span
        className={styles.dot}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className={styles.name}>{name}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={`Remove ${name}`}
        >
          {"\u2715"}
        </button>
      )}
    </span>
  );
}
