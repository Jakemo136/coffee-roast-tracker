import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthState } from "../../lib/useAuthState";
import {
  PUBLIC_BEAN_QUERY,
  PUBLIC_ROASTS_QUERY,
  ROASTS_BY_BEAN_QUERY,
  UPDATE_BEAN,
  UPDATE_BEAN_SUGGESTED_FLAVORS,
  MY_BEANS_QUERY,
} from "../../graphql/operations";
import { FlavorPill } from "../../components/FlavorPill";
import { RoastsTable } from "../../components/RoastsTable";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonLoader } from "../../components/SkeletonLoader";
import { Combobox } from "../../components/Combobox";
import { COFFEE_PROCESSES } from "../../lib/coffeeProcesses";
import { useTempUnit } from "../../providers/TempContext";
import type { ResultOf } from "../../graphql/graphql";
import type { RoastRow } from "../../components/RoastsTable";
import styles from "./BeanDetailPage.module.css";

type BeanResult = ResultOf<typeof PUBLIC_BEAN_QUERY>["bean"];
type PrivateRoast = ResultOf<typeof ROASTS_BY_BEAN_QUERY>["roastsByBean"][number];
type PublicRoast = ResultOf<typeof PUBLIC_ROASTS_QUERY>["publicRoasts"][number];

const processOptions = COFFEE_PROCESSES.map((p) => ({ value: p, label: p }));

const ROASTS_PAGE_SIZE = 10;

export function BeanDetailPage() {
  const { id: beanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSignedIn, userId } = useAuthState();
  const { tempUnit } = useTempUnit();

  // Bean data (public query works for everyone)
  const {
    data: beanData,
    loading: beanLoading,
    error: beanError,
    refetch: refetchBean,
  } = useQuery(PUBLIC_BEAN_QUERY, {
    variables: { id: beanId! },
    skip: !beanId,
  });

  // Determine ownership via myBeans
  const { data: myBeansData } = useQuery(MY_BEANS_QUERY, {
    skip: !isSignedIn,
  });

  const userBean = useMemo(() => {
    if (!myBeansData?.myBeans || !beanId) return undefined;
    return myBeansData.myBeans.find((ub) => ub.bean.id === beanId);
  }, [myBeansData, beanId]);

  const isOwner = !!userBean;

  // Roast history: logged-in owner gets their roasts, others get public roasts
  const {
    data: privateRoastsData,
    loading: privateRoastsLoading,
  } = useQuery(ROASTS_BY_BEAN_QUERY, {
    variables: { beanId: beanId! },
    skip: !beanId || !isOwner,
  });

  const [publicRoastsOffset, setPublicRoastsOffset] = useState(0);
  const {
    data: publicRoastsData,
    loading: publicRoastsLoading,
  } = useQuery(PUBLIC_ROASTS_QUERY, {
    variables: { beanId: beanId!, limit: ROASTS_PAGE_SIZE, offset: publicRoastsOffset },
    skip: !beanId || isOwner,
  });

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    origin: "",
    process: "",
    elevation: "",
    variety: "",
    score: "",
  });

  // Cupping notes paste
  const [cuppingText, setCuppingText] = useState("");
  const [parsedFlavors, setParsedFlavors] = useState<string[]>([]);

  // Mutations
  const [updateBean] = useMutation(UPDATE_BEAN, {
    refetchQueries: [{ query: PUBLIC_BEAN_QUERY, variables: { id: beanId } }],
  });
  const [updateSuggestedFlavors] = useMutation(UPDATE_BEAN_SUGGESTED_FLAVORS, {
    refetchQueries: [{ query: PUBLIC_BEAN_QUERY, variables: { id: beanId } }],
  });

  const bean: BeanResult | undefined = beanData?.bean;
  const loading = beanLoading || (isOwner ? privateRoastsLoading : publicRoastsLoading);

  // Map roasts to RoastsTable format
  const roastRows: RoastRow[] = useMemo(() => {
    const rawRoasts: Array<PrivateRoast | PublicRoast> =
      isOwner && privateRoastsData?.roastsByBean
        ? privateRoastsData.roastsByBean
        : publicRoastsData?.publicRoasts ?? [];

    const beanName = bean?.name ?? "";
    return rawRoasts.map((r) => ({
      id: r.id,
      beanName,
      roastDate: r.roastDate ?? undefined,
      rating: r.rating ?? undefined,
      duration: r.totalDuration ?? undefined,
      firstCrackTemp: r.firstCrackTemp ?? undefined,
      devPercent: r.developmentPercent ?? undefined,
    }));
  }, [isOwner, privateRoastsData, publicRoastsData, bean?.name]);

  function handleStartEdit() {
    if (!bean) return;
    setEditFields({
      origin: bean.origin ?? "",
      process: bean.process ?? "",
      elevation: bean.elevation ?? "",
      variety: bean.variety ?? "",
      score: bean.score != null ? String(bean.score) : "",
    });
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
  }

  function handleSaveEdit() {
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
    setEditing(false);
  }

  function handleParseCuppingNotes() {
    if (!cuppingText.trim()) return;
    // Simple word-boundary matching
    const words = cuppingText
      .toLowerCase()
      .split(/[\s,;./:]+/)
      .filter(Boolean);
    // For now, use the words directly as flavor names (capitalized)
    const unique = [...new Set(words)].map(
      (w) => w.charAt(0).toUpperCase() + w.slice(1),
    );
    setParsedFlavors(unique);
  }

  function handleSaveParsedFlavors() {
    if (!bean || parsedFlavors.length === 0) return;
    const existing = bean.suggestedFlavors ?? [];
    const merged = [...new Set([...existing, ...parsedFlavors])];
    updateSuggestedFlavors({
      variables: { beanId: bean.id, suggestedFlavors: merged },
    });
    setCuppingText("");
    setParsedFlavors([]);
  }

  function handleRemoveSuggestedFlavor(flavor: string) {
    if (!bean) return;
    const updated = (bean.suggestedFlavors ?? []).filter((f) => f !== flavor);
    updateSuggestedFlavors({
      variables: { beanId: bean.id, suggestedFlavors: updated },
    });
  }

  if (loading) {
    return (
      <div className={styles.page} data-testid="bean-detail-loading">
        <SkeletonLoader variant="text" count={3} />
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="table-row" count={5} />
      </div>
    );
  }

  if (beanError) {
    return (
      <div className={styles.page}>
        <ErrorState
          message="Failed to load bean details"
          onRetry={() => refetchBean()}
        />
      </div>
    );
  }

  if (!bean) {
    return (
      <div className={styles.page}>
        <p className={styles.notFound} data-testid="bean-not-found">
          Bean not found
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="bean-detail">
      <Link to="/beans" className={styles.backLink}>
        &larr; Back to Beans
      </Link>

      <div className={styles.header}>
        <h1 className={styles.beanName}>{bean.name}</h1>
        {isOwner && !editing && (
          <button
            type="button"
            className={styles.editBtn}
            onClick={handleStartEdit}
            data-testid="edit-btn"
          >
            Edit
          </button>
        )}
        {editing && (
          <div className={styles.editBtnRow}>
            <button type="button" className={styles.saveBtn} onClick={handleSaveEdit}>
              Save
            </button>
            <button type="button" className={styles.cancelBtn} onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className={styles.metaGrid} data-testid="bean-metadata">
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Origin</div>
          {editing ? (
            <input
              className={styles.metaInput}
              value={editFields.origin}
              onChange={(e) => setEditFields((p) => ({ ...p, origin: e.target.value }))}
              aria-label="Origin"
            />
          ) : (
            <div className={styles.metaValue}>{bean.origin ?? "\u2014"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Process</div>
          {editing ? (
            <Combobox
              options={processOptions}
              value={editFields.process}
              onChange={(v) => setEditFields((p) => ({ ...p, process: v }))}
              placeholder="e.g. Washed"
            />
          ) : (
            <div className={styles.metaValue}>{bean.process ?? "\u2014"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Variety</div>
          {editing ? (
            <input
              className={styles.metaInput}
              value={editFields.variety}
              onChange={(e) => setEditFields((p) => ({ ...p, variety: e.target.value }))}
              aria-label="Variety"
            />
          ) : (
            <div className={styles.metaValue}>{bean.variety ?? "\u2014"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Score</div>
          {editing ? (
            <input
              className={styles.metaInput}
              value={editFields.score}
              onChange={(e) => setEditFields((p) => ({ ...p, score: e.target.value }))}
              placeholder="e.g. 86"
              aria-label="Score"
            />
          ) : (
            <div className={styles.metaValue}>{bean.score != null ? bean.score : "\u2014"}</div>
          )}
        </div>
        {bean.elevation && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Elevation</div>
            <div className={styles.metaValue}>{bean.elevation}</div>
          </div>
        )}
        {bean.sourceUrl && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Supplier</div>
            <div className={styles.metaValue}>
              <a
                href={bean.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sourceLink}
              >
                View listing &rarr;
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Cupping Notes (suggested flavors) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Cupping Notes</span>
        </div>
        {bean.suggestedFlavors && bean.suggestedFlavors.length > 0 ? (
          <div className={styles.pillRow} data-testid="cupping-notes">
            {bean.suggestedFlavors.map((f) => (
              <FlavorPill
                key={f}
                name={f}
                color="#888888"
                onRemove={isOwner ? () => handleRemoveSuggestedFlavor(f) : undefined}
              />
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>No cupping notes</p>
        )}
      </div>

      {/* Paste cupping notes (owner only) */}
      {isOwner && (
        <div className={styles.card} data-testid="cupping-paste">
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Paste Cupping Notes</span>
          </div>
          <div className={styles.cuppingRow}>
            <textarea
              className={styles.cuppingTextarea}
              placeholder="Paste tasting notes to match flavors..."
              value={cuppingText}
              onChange={(e) => setCuppingText(e.target.value)}
              rows={3}
              aria-label="Cupping notes text"
            />
            <button
              type="button"
              className={styles.parseBtn}
              onClick={handleParseCuppingNotes}
            >
              Parse
            </button>
          </div>
          {parsedFlavors.length > 0 && (
            <div className={styles.parsedSection}>
              <div className={styles.pillRow}>
                {parsedFlavors.map((f) => (
                  <FlavorPill
                    key={f}
                    name={f}
                    color="#888888"
                    onRemove={() =>
                      setParsedFlavors((prev) => prev.filter((pf) => pf !== f))
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveParsedFlavors}
              >
                Save Cupping Notes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Roast History */}
      <div className={styles.roastSection} data-testid="roast-history">
        <h2 className={styles.sectionTitle}>Roast History</h2>
        {roastRows.length > 0 ? (
          <RoastsTable
            roasts={roastRows}
            sortable
            pageSize={ROASTS_PAGE_SIZE}
            onRowClick={(roastId) => navigate(`/roasts/${roastId}`)}
            tempUnit={tempUnit}
          />
        ) : (
          <p className={styles.emptyText} data-testid="no-roasts">
            No roasts logged for this bean yet
          </p>
        )}
      </div>
    </div>
  );
}
