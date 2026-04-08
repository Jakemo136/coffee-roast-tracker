import { useState, useMemo } from "react";
import { StarRating } from "./StarRating";
import { Pagination } from "./Pagination";
import { formatDuration, formatTemp, formatDate } from "../lib/formatters";
import type { TempUnit } from "../lib/formatters";
import styles from "./styles/RoastsTable.module.css";

interface RoastRow {
  id: string;
  beanName: string;
  roastDate?: string;
  rating?: number;
  duration?: number;
  firstCrackTemp?: number;
  devPercent?: number;
}

interface RoastsTableProps {
  roasts: RoastRow[];
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  beans?: Array<{ id: string; name: string }>;
  pageSize?: number;
  selectable?: boolean;
  maxSelections?: number;
  minSelections?: number;
  onCompare?: (selectedIds: string[]) => void;
  onRatingChange?: (roastId: string, rating: number) => void;
  onRowClick?: (roastId: string) => void;
  tempUnit?: TempUnit;
}

type SortField = "beanName" | "roastDate" | "rating" | "duration" | "firstCrackTemp" | "devPercent";
type SortDir = "asc" | "desc";

function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  let cmp: number;
  if (typeof a === "string" && typeof b === "string") {
    cmp = a.localeCompare(b);
  } else {
    cmp = (a as number) - (b as number);
  }
  return dir === "asc" ? cmp : -cmp;
}

export function RoastsTable({
  roasts,
  searchable = false,
  filterable = false,
  sortable = false,
  beans,
  pageSize = 10,
  selectable = false,
  maxSelections = 5,
  minSelections = 2,
  onCompare,
  onRatingChange,
  onRowClick,
  tempUnit = "CELSIUS",
}: RoastsTableProps) {
  const [search, setSearch] = useState("");
  const [beanFilter, setBeanFilter] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = roasts;

    if (searchable && search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.beanName.toLowerCase().includes(q));
    }

    if (filterable && beanFilter) {
      result = result.filter((r) => {
        const matchingBean = beans?.find((b) => b.id === beanFilter);
        return matchingBean ? r.beanName === matchingBean.name : r.beanName === beanFilter;
      });
    }

    return result;
  }, [roasts, search, beanFilter, searchable, filterable, beans]);

  const sorted = useMemo(() => {
    if (!sortable || !sortField) return filtered;
    return [...filtered].sort((a, b) =>
      compareValues(a[sortField], b[sortField], sortDir),
    );
  }, [filtered, sortField, sortDir, sortable]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  function handleSort(field: SortField) {
    if (!sortable) return;
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const atLimit = selected.size >= maxSelections;

  function sortIndicator(field: SortField) {
    if (!sortable) return null;
    if (sortField !== field) return null;
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleBeanFilterChange(value: string) {
    setBeanFilter(value);
    setCurrentPage(1);
  }

  return (
    <div className={styles.container} data-testid="roasts-table">
      {selectable && (
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.compareButton}
            disabled={selected.size < minSelections}
            onClick={() => onCompare?.(Array.from(selected))}
            title={selected.size < 2 ? "Select at least 2 roasts to compare" : undefined}
          >
            Compare ({selected.size})
          </button>
          {atLimit && (
            <span className={styles.limitMessage}>
              Maximum of {maxSelections} selections reached
            </span>
          )}
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            {selectable && <th className={styles.checkboxCol}></th>}
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("beanName")}
            >
              Bean Name{sortIndicator("beanName")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("roastDate")}
            >
              Date{sortIndicator("roastDate")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("rating")}
            >
              Rating{sortIndicator("rating")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("duration")}
            >
              Time{sortIndicator("duration")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("firstCrackTemp")}
            >
              FC Temp{sortIndicator("firstCrackTemp")}
            </th>
            <th
              className={sortable ? styles.sortableHeader : undefined}
              onClick={() => handleSort("devPercent")}
            >
              DTR%{sortIndicator("devPercent")}
            </th>
          </tr>
        </thead>
        <tbody>
          {paged.map((roast) => {
            const isSelected = selected.has(roast.id);
            const isDisabled = !isSelected && atLimit;

            return (
              <tr
                key={roast.id}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ""} ${onRowClick ? styles.clickable : ""}`}
                onClick={() => onRowClick?.(roast.id)}
              >
                {selectable && (
                  <td
                    className={styles.checkboxCell}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleSelect(roast.id)}
                      aria-label={`Select ${roast.beanName}`}
                    />
                  </td>
                )}
                <td className={styles.beanNameCell}>{roast.beanName}</td>
                <td>{formatDate(roast.roastDate)}</td>
                <td
                  className={styles.ratingCell}
                  onClick={(e) => e.stopPropagation()}
                >
                  <StarRating
                    value={roast.rating ?? 0}
                    onChange={
                      onRatingChange
                        ? (rating) => onRatingChange(roast.id, rating)
                        : undefined
                    }
                    readOnly={!onRatingChange}
                    size="sm"
                  />
                </td>
                <td>{formatDuration(roast.duration)}</td>
                <td>{formatTemp(roast.firstCrackTemp, tempUnit)}</td>
                <td>
                  {roast.devPercent != null
                    ? `${roast.devPercent.toFixed(1)}%`
                    : "\u2014"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {(searchable || (filterable && beans)) && (
        <div className={styles.toolbar}>
          {searchable && (
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search roasts..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="search-input"
            />
          )}
          {filterable && beans && (
            <select
              className={styles.beanFilter}
              value={beanFilter}
              onChange={(e) => handleBeanFilterChange(e.target.value)}
              data-testid="bean-filter"
              aria-label="Filter by bean"
            >
              <option value="">All beans</option>
              {beans.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

export type { RoastRow, RoastsTableProps };
