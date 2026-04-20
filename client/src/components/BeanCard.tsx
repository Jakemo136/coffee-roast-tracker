import { Link } from "react-router-dom";
import { FlavorPill } from "./FlavorPill";
import { StarRating } from "./StarRating";
import styles from "./styles/BeanCard.module.css";

interface BeanCardProps {
  id: string;
  name: string;
  origin?: string;
  process?: string;
  flavors?: Array<{ name: string; color: string }>;
  roastCount?: number;
  avgRating?: number;
}

const MAX_VISIBLE_FLAVORS = 3;

export function BeanCard({
  id,
  name,
  origin,
  process,
  flavors = [],
  roastCount,
  avgRating,
}: BeanCardProps) {
  const visibleFlavors = flavors.slice(0, MAX_VISIBLE_FLAVORS);
  const overflowCount = flavors.length - MAX_VISIBLE_FLAVORS;

  return (
    <Link
      to={`/beans/${id}`}
      className={styles.card}
      data-testid="bean-card"
    >
      <h3 className={styles.name}>{name}</h3>

      {(origin || process) && (
        <p className={styles.details}>
          {[origin, process].filter(Boolean).join(" \u00B7 ")}
        </p>
      )}

      {flavors.length > 0 && (
        <div className={styles.flavors}>
          {visibleFlavors.map((flavor) => (
            <FlavorPill
              key={flavor.name}
              name={flavor.name}
              color={flavor.color}
            />
          ))}
          {overflowCount > 0 && (
            <span className={styles.more}>+{overflowCount} more</span>
          )}
        </div>
      )}

      <div className={styles.footer}>
        {roastCount != null && (
          <span className={styles.roastCount}>
            {roastCount} roast{roastCount === 1 ? "" : "s"}
          </span>
        )}
        {avgRating != null && (
          <StarRating value={avgRating} readOnly size="sm" />
        )}
      </div>
    </Link>
  );
}
