import styles from "./StarRating.module.css";

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, readOnly }: StarRatingProps) {
  const rating = value ?? 0;
  const isUnrated = value == null;
  const isInteractive = !readOnly && onChange;

  const label = isUnrated
    ? "Unrated"
    : `Rating: ${rating} out of 5`;

  function renderStars() {
    const stars: React.ReactNode[] = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = rating >= i;
      const isHalf = !isFull && rating >= i - 0.5;

      const glyph = isFull ? "★" : isHalf ? "½" : "☆";
      const starClass = [
        styles.star,
        isFull || isHalf ? styles.filled : "",
        isUnrated ? styles.disabled : "",
      ]
        .filter(Boolean)
        .join(" ");

      if (isInteractive) {
        stars.push(
          <button
            key={i}
            type="button"
            className={`${starClass} ${styles.interactive}`}
            onClick={() => onChange(i)}
            aria-label={`Rate ${i} stars`}
          >
            {glyph}
          </button>,
        );
      } else {
        stars.push(
          <span key={i} className={starClass}>
            {glyph}
          </span>,
        );
      }
    }
    return stars;
  }

  return (
    <div className={styles.container} aria-label={label}>
      {renderStars()}
    </div>
  );
}
