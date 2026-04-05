import styles from "./styles/StarRating.module.css";

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

  function renderGlyph(isFull: boolean, isHalf: boolean) {
    if (isFull) return "★";
    if (isHalf) {
      return (
        <span className={styles.halfStar}>
          <span className={styles.halfStarEmpty}>☆</span>
          <span className={styles.halfStarFilled}>★</span>
        </span>
      );
    }
    return "☆";
  }

  function renderStars() {
    const stars: React.ReactNode[] = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = rating >= i;
      const isHalf = !isFull && rating >= i - 0.5;

      const starClass = [
        styles.star,
        isFull || isHalf ? styles.filled : "",
        isUnrated ? styles.disabled : "",
      ]
        .filter(Boolean)
        .join(" ");

      const glyph = renderGlyph(isFull, isHalf);

      if (isInteractive) {
        stars.push(
          <span key={i} className={`${starClass} ${styles.interactive}`}>
            <button
              type="button"
              className={styles.halfTarget}
              onClick={() => onChange(i - 0.5)}
              aria-label={`Rate ${i - 0.5} stars`}
            />
            <button
              type="button"
              className={styles.halfTarget}
              onClick={() => onChange(i)}
              aria-label={`Rate ${i} stars`}
            />
            <span className={styles.glyph}>{glyph}</span>
          </span>,
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
