import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ROAST_BY_ID_QUERY,
  DELETE_ROAST_MUTATION,
  TOGGLE_ROAST_SHARING_MUTATION,
  UPDATE_ROAST_MUTATION,
  MY_ROASTS_QUERY,
} from "../graphql/operations";
import { RoastChart } from "../components/RoastChart";
import { MetricsTable } from "../components/MetricsTable";
import { StarRating } from "../components/StarRating";
import { FlavorPill } from "../components/FlavorPill";
import { formatDate } from "../lib/formatters";
import type { ResultOf } from "../graphql/graphql";
import styles from "./RoastDetailPage.module.css";

type Roast = NonNullable<ResultOf<typeof ROAST_BY_ID_QUERY>["roastById"]>;

export function RoastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const { data, loading, error } = useQuery(ROAST_BY_ID_QUERY, {
    variables: { id: id! },
    skip: !id,
  });

  const [deleteRoast] = useMutation(DELETE_ROAST_MUTATION, {
    refetchQueries: [{ query: MY_ROASTS_QUERY }],
  });

  const [toggleSharing] = useMutation(TOGGLE_ROAST_SHARING_MUTATION);

  const [updateRoast] = useMutation(UPDATE_ROAST_MUTATION);

  const roast: Roast | null | undefined = data?.roastById;

  if (loading) {
    return <div className={styles.loadingState}>Loading roast...</div>;
  }

  if (error) {
    return (
      <div className={styles.errorState}>Error loading roast: {error.message}</div>
    );
  }

  if (!roast) {
    return <div className={styles.errorState}>Roast not found</div>;
  }

  function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this roast?")) return;
    deleteRoast({ variables: { id: id! } })
      .then(() => {
        navigate("/");
      })
      .catch(() => {
        // Deletion failed — stay on page
      });
  }

  function handleToggleShare() {
    toggleSharing({ variables: { id: id! } });
  }

  function handleRatingChange(rating: number) {
    updateRoast({
      variables: { id: id!, input: { rating } },
    });
  }

  function handleStartEditNotes() {
    setNotesDraft(roast?.notes ?? "");
    setIsEditingNotes(true);
  }

  function handleSaveNotes() {
    updateRoast({
      variables: { id: id!, input: { notes: notesDraft } },
    });
    setIsEditingNotes(false);
  }

  function handleCancelNotes() {
    setIsEditingNotes(false);
  }

  const timeSeriesData = roast.timeSeriesData as Array<{
    time: number;
    spotTemp: number;
    temp: number;
    meanTemp: number;
    profileTemp: number;
    profileROR: number;
    actualROR: number;
    desiredROR: number;
    powerKW: number;
    actualFanRPM: number;
  }> | null;

  const roastProfileCurve = roast.roastProfileCurve as Array<{
    time: number;
    temp: number;
  }> | null;

  const fanProfileCurve = roast.fanProfileCurve as Array<{
    time: number;
    rpm: number;
  }> | null;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => navigate("/")}
        >
          &larr; My Roasts
        </button>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.shareBtn}
            onClick={handleToggleShare}
          >
            {roast.isShared ? "Unshare" : "Share"}
          </button>
          {roast.roastProfile && (
            <button type="button" className={styles.downloadBtn}>
              Download .kpro
            </button>
          )}
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>

      {roast.isShared && (
        <div className={styles.shareUrl}>
          Share URL: {window.location.origin}/share/{roast.shareToken}
        </div>
      )}

      <div className={styles.splitLayout}>
        <div className={styles.chartPanel}>
          <RoastChart
            timeSeriesData={timeSeriesData}
            roastProfileCurve={roastProfileCurve}
            fanProfileCurve={fanProfileCurve}
            colourChangeTime={roast.colourChangeTime}
            colourChangeTemp={roast.colourChangeTemp}
            firstCrackTime={roast.firstCrackTime}
            firstCrackTemp={roast.firstCrackTemp}
            roastEndTime={roast.roastEndTime}
            roastEndTemp={roast.roastEndTemp}
            totalDuration={roast.totalDuration}
          />
        </div>

        <div className={styles.detailPanel}>
          {/* Header */}
          <div>
            <h2 className={styles.beanName}>{roast.bean.name}</h2>
            <div className={styles.beanMeta}>
              {formatDate(roast.roastDate)}
              {roast.bean.sourceUrl && (
                <>
                  {" \u00b7 "}
                  <a
                    href={roast.bean.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    View listing &rarr;
                  </a>
                </>
              )}
            </div>
            <StarRating value={roast.rating} onChange={handleRatingChange} />
          </div>

          {/* Metrics */}
          <MetricsTable
            totalDuration={roast.totalDuration}
            colourChangeTime={roast.colourChangeTime}
            colourChangeTemp={roast.colourChangeTemp}
            firstCrackTime={roast.firstCrackTime}
            firstCrackTemp={roast.firstCrackTemp}
            roastEndTime={roast.roastEndTime}
            roastEndTemp={roast.roastEndTemp}
            developmentTime={roast.developmentTime}
            developmentPercent={roast.developmentPercent}
            tempUnit="CELSIUS"
          />

          {/* Flavors */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Flavors</span>
              <button type="button" className={styles.editBtn}>
                + Edit
              </button>
            </div>
            {roast.flavors.length > 0 ? (
              <div className={styles.pillRow}>
                {roast.flavors.map((f) => (
                  <FlavorPill
                    key={f.id}
                    name={f.name}
                    color={f.color}
                    isOffFlavor={f.isOffFlavor}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>No flavors added</div>
            )}
          </div>

          {/* Off-Flavors */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Off-Flavors</span>
              <button type="button" className={styles.editBtn}>
                + Edit
              </button>
            </div>
            {roast.offFlavors.length > 0 ? (
              <div className={styles.pillRow}>
                {roast.offFlavors.map((f) => (
                  <FlavorPill
                    key={f.id}
                    name={f.name}
                    color={f.color}
                    isOffFlavor={f.isOffFlavor}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>None detected</div>
            )}
          </div>

          {/* Notes */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Notes</span>
              {!isEditingNotes && (
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={handleStartEditNotes}
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <>
                <textarea
                  className={styles.notesTextarea}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                />
                <div className={styles.notesActions}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={handleSaveNotes}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCancelNotes}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.notesText}>
                {roast.notes || "No notes yet"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
