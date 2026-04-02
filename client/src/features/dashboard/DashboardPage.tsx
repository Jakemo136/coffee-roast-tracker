import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import {
  MY_ROASTS_QUERY,
  MY_BEANS_QUERY,
  UPDATE_ROAST_RATING,
} from "../../graphql/operations";
import { StarRating } from "../../components/StarRating";
import { FlavorPill } from "../../components/FlavorPill";
import { UploadModal } from "../../components/UploadModal";
import { formatDuration, formatTemp, formatDate } from "../../lib/formatters";
import type { ResultOf } from "../../graphql/graphql";
import styles from "./styles/DashboardPage.module.css";

type Roast = ResultOf<typeof MY_ROASTS_QUERY>["myRoasts"][number];
type UserBean = ResultOf<typeof MY_BEANS_QUERY>["myBeans"][number];

const MAX_VISIBLE_PILLS = 3;

export function DashboardPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [beanFilter, setBeanFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);

  const { data: roastData, loading, error } = useQuery(MY_ROASTS_QUERY);
  const { data: beanData } = useQuery(MY_BEANS_QUERY);

  const [updateRating] = useMutation(UPDATE_ROAST_RATING);

  const userBeansByBeanId = useMemo(() => {
    const map = new Map<string, UserBean>();
    if (beanData?.myBeans) {
      for (const ub of beanData.myBeans) {
        map.set(ub.bean.id, ub);
      }
    }
    return map;
  }, [beanData]);

  const uniqueBeans = useMemo(() => {
    if (!roastData?.myRoasts) return [];
    const seen = new Map<string, string>();
    for (const roast of roastData.myRoasts) {
      if (!seen.has(roast.bean.id)) {
        seen.set(roast.bean.id, roast.bean.name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [roastData]);

  const filteredRoasts = useMemo(() => {
    if (!roastData?.myRoasts) return [];
    const q = search.toLowerCase();
    return roastData.myRoasts.filter((roast) => {
      if (beanFilter && roast.bean.id !== beanFilter) return false;
      if (q) {
        const matchesBean = roast.bean.name.toLowerCase().includes(q);
        const matchesNotes = roast.notes?.toLowerCase().includes(q);
        if (!matchesBean && !matchesNotes) return false;
      }
      return true;
    });
  }, [roastData, search, beanFilter]);

  function handleRatingChange(roastId: string, rating: number) {
    updateRating({
      variables: { id: roastId, input: { rating } },
    });
  }

  function toggleSelect(roastId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roastId)) {
        next.delete(roastId);
      } else {
        next.add(roastId);
      }
      return next;
    });
  }

  function handleCompare() {
    const ids = Array.from(selected).join(",");
    navigate(`/compare?ids=${ids}`);
  }

  if (loading) {
    return <div className={styles.loading}>Loading roasts...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error loading roasts: {error.message}</div>;
  }

  const roasts = filteredRoasts;
  const totalRoasts = roastData?.myRoasts.length ?? 0;
  const totalBeans = uniqueBeans.length;

  if (totalRoasts === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <p>No roasts yet</p>
          <button type="button" className={styles.uploadCta} onClick={() => setShowUpload(true)}>
            Upload your first roast
          </button>
        </div>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.titleBlock}>
          <h1>My Roasts</h1>
          <div className={styles.subtitle}>
            {totalRoasts} roast{totalRoasts !== 1 ? "s" : ""} across{" "}
            {totalBeans} bean{totalBeans !== 1 ? "s" : ""}
          </div>
        </div>
        <div className={styles.filters}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search bean or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.beanSelect}
            value={beanFilter}
            onChange={(e) => setBeanFilter(e.target.value)}
            aria-label="Filter by bean"
          >
            <option value="">All beans</option>
            {uniqueBeans.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tableHeader}>
        <span>Bean</span>
        <span>Date</span>
        <span className={styles.desktopOnly}>Notes</span>
        <span className={styles.desktopOnly}>Flavors</span>
        <span className={styles.mobileOnly}>Notes & Flavors</span>
        <span>Dev Time</span>
        <span>Dev &Delta;T</span>
        <span>Rating</span>
      </div>

      {roasts.map((roast) => (
        <RoastRow
          key={roast.id}
          roast={roast}
          userBean={userBeansByBeanId.get(roast.bean.id)}
          isSelected={selected.has(roast.id)}
          onSelect={() => toggleSelect(roast.id)}
          onRatingChange={(rating) => handleRatingChange(roast.id, rating)}
          onClick={() => navigate(`/roasts/${roast.id}`)}
        />
      ))}

      {selected.size >= 2 && (
        <div className={styles.compareBar}>
          <button
            type="button"
            className={styles.compareButton}
            onClick={handleCompare}
          >
            Compare {selected.size} roasts
          </button>
        </div>
      )}
    </div>
  );
}

interface RoastRowProps {
  roast: Roast;
  userBean: UserBean | undefined;
  isSelected: boolean;
  onSelect: () => void;
  onRatingChange: (rating: number) => void;
  onClick: () => void;
}

function RoastRow({
  roast,
  userBean,
  isSelected,
  onSelect,
  onRatingChange,
  onClick,
}: RoastRowProps) {
  const allFlavors = [...(roast.flavors ?? []), ...(roast.offFlavors ?? [])];
  const visibleFlavors = allFlavors.slice(0, MAX_VISIBLE_PILLS);
  const overflowCount = allFlavors.length - MAX_VISIBLE_PILLS;

  const devDeltaT =
    roast.roastEndTemp != null && roast.firstCrackTemp != null
      ? roast.roastEndTemp - roast.firstCrackTemp
      : null;

  const rowClass = [styles.row, isSelected ? styles.rowSelected : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rowClass}
      onClick={onClick}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${roast.bean.name}`}
            className={styles.checkboxCell}
          />
          <div>
            <div className={styles.beanName}>{roast.bean.name}</div>
            {userBean?.shortName && (
              <div className={styles.shortName}>{userBean.shortName}</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.dateCol}>{formatDate(roast.roastDate)}</div>

      <div className={styles.desktopOnly}>
        <div className={styles.notesText}>{roast.notes ?? ""}</div>
      </div>

      <div className={styles.desktopOnly}>
        <div className={styles.pillRow}>
          {visibleFlavors.map((f) => (
            <FlavorPill
              key={f.id}
              name={f.name}
              color={f.color ?? "#888888"}
              isOffFlavor={f.isOffFlavor}
            />
          ))}
          {overflowCount > 0 && (
            <span className={styles.moreChip}>+{overflowCount}</span>
          )}
        </div>
      </div>

      <div className={styles.mobileOnly}>
        <div className={styles.notesText}>{roast.notes ?? ""}</div>
        <div className={styles.pillRow}>
          {visibleFlavors.map((f) => (
            <FlavorPill
              key={f.id}
              name={f.name}
              color={f.color ?? "#888888"}
              isOffFlavor={f.isOffFlavor}
            />
          ))}
          {overflowCount > 0 && (
            <span className={styles.moreChip}>+{overflowCount}</span>
          )}
        </div>
      </div>

      <div className={styles.colDev}>{formatDuration(roast.developmentTime)}</div>

      <div className={styles.colDevDt}>
        {devDeltaT != null ? formatTemp(devDeltaT, "CELSIUS") : "---"}
      </div>

      <div
        className={styles.colRating}
        onClick={(e) => e.stopPropagation()}
      >
        <StarRating value={roast.rating ?? null} onChange={onRatingChange} />
      </div>
    </div>
  );
}
