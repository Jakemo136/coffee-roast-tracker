import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  MY_BEANS_QUERY,
  ROASTS_BY_BEAN_QUERY,
  UPDATE_USER_BEAN,
  UPDATE_BEAN,
  UPDATE_BEAN_SUGGESTED_FLAVORS,
} from "../../graphql/operations";
import { ParseSupplierModal } from "./ParseSupplierModal";
import type { ParseResult } from "./ParseSupplierModal";
import { ParseDiffModal } from "./ParseDiffModal";
import { FlavorPill } from "../../components/FlavorPill";
import { Combobox } from "../../components/Combobox";
import { COFFEE_PROCESSES } from "../../lib/coffeeProcesses";
import { StarRating } from "../../components/StarRating";
import { formatDuration, formatTemp, formatDate } from "../../lib/formatters";
import type { ResultOf } from "../../graphql/graphql";
import styles from "./styles/BeanDetailPage.module.css";

type RoastsByBeanResult = ResultOf<typeof ROASTS_BY_BEAN_QUERY>["roastsByBean"];
type BeanRoast = RoastsByBeanResult[number];

interface FlavorCount {
  name: string;
  color: string;
  count: number;
}

function aggregateFlavors(roasts: BeanRoast[]): FlavorCount[] {
  const flavorMap = new Map<string, FlavorCount>();
  for (const roast of roasts) {
    for (const flavor of roast.flavors) {
      const existing = flavorMap.get(flavor.name);
      if (existing) {
        existing.count++;
      } else {
        flavorMap.set(flavor.name, { name: flavor.name, color: flavor.color, count: 1 });
      }
    }
  }
  return [...flavorMap.values()].sort((a, b) => b.count - a.count);
}

function computeAvgRating(roasts: BeanRoast[]): number | null {
  const ratings = roasts
    .map((r) => r.rating)
    .filter((r): r is number => r != null);
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}

export function BeanDetailPage() {
  const { id: beanId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: beansData, loading: beansLoading } = useQuery(MY_BEANS_QUERY);
  const { data: roastsData, loading: roastsLoading } = useQuery(ROASTS_BY_BEAN_QUERY, {
    variables: { beanId: beanId! },
    skip: !beanId,
  });

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [editingBean, setEditingBean] = useState(false);
  const [editFields, setEditFields] = useState({ origin: "", process: "", elevation: "", variety: "", score: "" });
  const [selectedRoastIds, setSelectedRoastIds] = useState<Set<string>>(new Set());
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const [updateUserBean] = useMutation(UPDATE_USER_BEAN);
  const [updateBean] = useMutation(UPDATE_BEAN, { refetchQueries: [{ query: MY_BEANS_QUERY }] });
  const [updateSuggestedFlavors] = useMutation(UPDATE_BEAN_SUGGESTED_FLAVORS);

  const userBean = useMemo(() => {
    if (!beansData?.myBeans || !beanId) return undefined;
    return beansData.myBeans.find((ub) => ub.bean.id === beanId);
  }, [beansData, beanId]);

  const bean = userBean?.bean;
  const roasts = roastsData?.roastsByBean ?? [];
  const topFlavors = useMemo(() => aggregateFlavors(roasts), [roasts]);
  const avgRating = useMemo(() => computeAvgRating(roasts), [roasts]);

  const loading = beansLoading || roastsLoading;

  if (loading) {
    return <div className={styles.loading}>Loading bean details...</div>;
  }

  if (!userBean || !bean) {
    return <div className={styles.loading}>Bean not found</div>;
  }

  function handleEditBean() {
    if (!bean) return;
    setEditFields({
      origin: bean.origin ?? "",
      process: bean.process ?? "",
      elevation: bean.elevation ?? "",
      variety: bean.variety ?? "",
      score: bean.score != null ? String(bean.score) : "",
    });
    setEditingBean(true);
  }

  function handleSaveBean() {
    if (!bean) return;
    updateBean({
      variables: {
        id: bean.id,
        input: {
          origin: editFields.origin.trim() || null,
          process: editFields.process.trim() || null,
          elevation: editFields.elevation.trim() || null,
          variety: editFields.variety.trim() || null,
          score: editFields.score ? parseFloat(editFields.score) : null,
        },
      },
    });
    setEditingBean(false);
  }

  function handleEditNotes() {
    setNotesValue(userBean?.notes ?? "");
    setEditingNotes(true);
  }

  function handleCancelNotes() {
    setEditingNotes(false);
  }

  function handleSaveNotes() {
    if (!userBean) return;
    updateUserBean({
      variables: { id: userBean.id, notes: notesValue },
    });
    setEditingNotes(false);
  }

  function handleCompareAll() {
    const ids = roasts.map((r) => r.id).join(",");
    navigate(`/compare?ids=${ids}`);
  }

  function handleCompareSelected() {
    const ids = [...selectedRoastIds].join(",");
    navigate(`/compare?ids=${ids}`);
  }

  function toggleRoastSelection(roastId: string) {
    setSelectedRoastIds((prev) => {
      const next = new Set(prev);
      if (next.has(roastId)) next.delete(roastId);
      else next.add(roastId);
      return next;
    });
  }

  function handleRemoveSuggestedFlavor(flavor: string) {
    if (!bean) return;
    const updated = (bean.suggestedFlavors ?? []).filter((f) => f !== flavor);
    updateSuggestedFlavors({
      variables: { beanId: bean.id, suggestedFlavors: updated },
      refetchQueries: [{ query: MY_BEANS_QUERY }],
    });
  }

  function handleParseResult(result: ParseResult) {
    setShowParseModal(false);
    setParseResult(result);
  }

  async function handleApplyParsed(fields: Partial<ParseResult>) {
    if (!bean) return;
    const { suggestedFlavors: newFlavors, ...beanFields } = fields;
    const cleanFields = Object.fromEntries(
      Object.entries(beanFields).filter(([, v]) => v != null),
    );
    const mutations: Promise<unknown>[] = [];
    if (Object.keys(cleanFields).length > 0) {
      mutations.push(updateBean({ variables: { id: bean.id, input: cleanFields } }));
    }
    if (newFlavors) {
      mutations.push(updateSuggestedFlavors({
        variables: { beanId: bean.id, suggestedFlavors: [...newFlavors] },
      }));
    }
    await Promise.all(mutations);
    setParseResult(null);
  }

  const devDeltaT = (roast: BeanRoast) =>
    roast.roastEndTemp != null && roast.firstCrackTemp != null
      ? roast.roastEndTemp - roast.firstCrackTemp
      : null;

  return (
    <div className={styles.page}>
      <Link to="/beans" className={styles.backLink}>
        &larr; My Beans
      </Link>

      <div className={styles.header}>
        <div>
          <h2 className={styles.beanName}>{bean.name}</h2>
          <div className={styles.beanMeta}>
            {userBean.shortName && <em>{userBean.shortName}</em>}
            {bean.sourceUrl && (
              <>
                {userBean.shortName && " \u00B7 "}
                <a
                  href={bean.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sourceLink}
                >
                  View listing &rarr;
                </a>
              </>
            )}
          </div>
        </div>
        {editingBean ? (
          <div className={styles.editBtnRow}>
            <button type="button" className={styles.saveBtn} onClick={handleSaveBean}>Save</button>
            <button type="button" className={styles.cancelBtn} onClick={() => setEditingBean(false)}>Cancel</button>
          </div>
        ) : (
          <div className={styles.editBtnRow}>
            <button type="button" className={styles.reparseBtn} onClick={() => setShowParseModal(true)}>
              Re-parse from supplier
            </button>
            <button type="button" className={styles.editHeaderBtn} onClick={handleEditBean}>
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Metadata cards */}
      <div className={styles.metaGrid}>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Origin</div>
          {editingBean ? (
            <input className={styles.metaInput} value={editFields.origin} onChange={(e) => setEditFields((p) => ({ ...p, origin: e.target.value }))} />
          ) : (
            <div className={styles.metaValue}>{bean.origin ?? "—"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Process</div>
          {editingBean ? (
            <Combobox
              value={editFields.process}
              onChange={(v) => setEditFields((p) => ({ ...p, process: v }))}
              options={COFFEE_PROCESSES}
              placeholder="e.g. Washed"
              className={styles.metaInput}
            />
          ) : (
            <div className={styles.metaValue}>{bean.process ?? "—"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Elevation</div>
          {editingBean ? (
            <input className={styles.metaInput} value={editFields.elevation} onChange={(e) => setEditFields((p) => ({ ...p, elevation: e.target.value }))} />
          ) : (
            <div className={styles.metaValue}>{bean.elevation ?? "—"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Variety</div>
          {editingBean ? (
            <input className={styles.metaInput} value={editFields.variety} onChange={(e) => setEditFields((p) => ({ ...p, variety: e.target.value }))} />
          ) : (
            <div className={styles.metaValue}>{bean.variety ?? "—"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Score</div>
          {editingBean ? (
            <input className={styles.metaInput} value={editFields.score} onChange={(e) => setEditFields((p) => ({ ...p, score: e.target.value }))} placeholder="e.g. 86" />
          ) : (
            <div className={styles.metaValue}>{bean.score != null ? bean.score : "—"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Avg Rating</div>
          <div className={styles.metaValue}>
            {avgRating != null ? (
              <span className={styles.avgRating}>&#9733; {avgRating}</span>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {/* Common Flavors */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Common Flavors Across Roasts</span>
        </div>
        {topFlavors.length > 0 ? (
          <div className={styles.pillRow}>
            {topFlavors.map((f) => (
              <FlavorPill key={f.name} name={f.name} color={f.color} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyText}>No flavor data yet</div>
        )}
      </div>

      {/* Suggested Flavors */}
      {bean.suggestedFlavors && bean.suggestedFlavors.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Suggested Flavors</span>
          </div>
          <div className={styles.pillRow}>
            {bean.suggestedFlavors.map((f) => (
              <FlavorPill
                key={f}
                name={f}
                suggested
                onRemove={() => handleRemoveSuggestedFlavor(f)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Supplier Notes */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Supplier Notes</span>
        </div>
        {bean.bagNotes ? (
          <div className={styles.notesText}>{bean.bagNotes}</div>
        ) : (
          <div className={styles.emptyText}>No supplier notes</div>
        )}
      </div>

      {/* Your Notes */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Your Notes</span>
          {!editingNotes && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={handleEditNotes}
            >
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div>
            <textarea
              className={styles.notesTextarea}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              aria-label="Your notes"
            />
            <div className={styles.notesBtnRow}>
              <button type="button" className={styles.saveBtn} onClick={handleSaveNotes}>
                Save
              </button>
              <button type="button" className={styles.cancelBtn} onClick={handleCancelNotes}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.notesText}>
            {userBean.notes || <span className={styles.emptyText}>No notes yet</span>}
          </div>
        )}
      </div>

      {/* Roast Table */}
      <div className={styles.tableSection}>
        <div className={styles.tableTitleRow}>
          <span className={styles.tableTitleLabel}>Roasts</span>
          <div className={styles.compareActions}>
            {selectedRoastIds.size >= 2 && (
              <button type="button" className={styles.compareSelectedBtn} onClick={handleCompareSelected}>
                Compare {selectedRoastIds.size} selected
              </button>
            )}
            {roasts.length >= 2 && (
              <button type="button" className={styles.compareBtn} onClick={handleCompareAll}>
                Compare all
              </button>
            )}
          </div>
        </div>

        {roasts.length === 0 ? (
          <div className={styles.emptyText}>No roasts yet</div>
        ) : (
          <>
            <div className={styles.tableHeader}>
              <span className={styles.checkboxCol} />
              <span>Date</span>
              <span>Notes</span>
              <span>Flavors</span>
              <span>Dev Time</span>
              <span>Dev &Delta;T</span>
              <span>Rating</span>
            </div>

            {roasts.map((roast) => {
              const allFlavors = [...(roast.flavors ?? []), ...(roast.offFlavors ?? [])];
              const visibleFlavors = allFlavors.slice(0, 3);
              const overflowCount = allFlavors.length - 3;

              return (
                <div
                  key={roast.id}
                  className={styles.roastRow}
                  onClick={() => navigate(`/roasts/${roast.id}`)}
                  role="link"
                >
                  <div
                    className={styles.checkboxCol}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoastIds.has(roast.id)}
                      onChange={() => toggleRoastSelection(roast.id)}
                      aria-label={`Select roast from ${formatDate(roast.roastDate)}`}
                    />
                  </div>
                  <div>{formatDate(roast.roastDate)}</div>
                  <div>{roast.notes ?? ""}</div>
                  <div className={styles.pillRow}>
                    {visibleFlavors.map((f) => (
                      <FlavorPill
                        key={f.id}
                        name={f.name}
                        color={f.color ?? "#888888"}
                        isOffFlavor={f.isOffFlavor}
                      />
                    ))}
                    {overflowCount > 0 && <span>+{overflowCount}</span>}
                  </div>
                  <div>{formatDuration(roast.developmentTime)}</div>
                  <div>
                    {devDeltaT(roast) != null
                      ? formatTemp(devDeltaT(roast), "CELSIUS")
                      : "—"}
                  </div>
                  <div>
                    <StarRating value={roast.rating ?? null} readOnly />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      {showParseModal && (
        <ParseSupplierModal
          onClose={() => setShowParseModal(false)}
          onResult={handleParseResult}
          initialUrl={bean.sourceUrl ?? undefined}
        />
      )}
      {parseResult && (
        <ParseDiffModal
          current={bean}
          parsed={parseResult}
          onApply={handleApplyParsed}
          onClose={() => setParseResult(null)}
        />
      )}
    </div>
  );
}
