import { useParams, Link } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { ROAST_BY_SHARE_TOKEN } from "../../graphql/operations";
import { RoastChart } from "../roast-detail/RoastChart";
import { MetricsTable } from "../roast-detail/MetricsTable";
import { StarRating } from "../../components/StarRating";
import { FlavorPill } from "../../components/FlavorPill";
import { formatDate } from "../../lib/formatters";
import type { ResultOf } from "../../graphql/graphql";
import styles from "./styles/SharedRoastPage.module.css";

type SharedRoast = NonNullable<ResultOf<typeof ROAST_BY_SHARE_TOKEN>["roastByShareToken"]>;

export function SharedRoastPage() {
  const { token } = useParams<{ token: string }>();

  const { data, loading, error } = useQuery(ROAST_BY_SHARE_TOKEN, {
    variables: { token: token! },
    skip: !token,
  });

  const roast: SharedRoast | null | undefined = data?.roastByShareToken;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.wordmark}>Coffee Roast Tracker</span>
      </header>

      <div className={styles.content}>
        {loading && <div>Loading...</div>}
        {error && <div className={styles.notAvailable}>This roast is not available</div>}
        {!loading && !error && !roast && (
          <div className={styles.notAvailable}>This roast is not available</div>
        )}
        {roast && <SharedRoastContent roast={roast} />}
      </div>

      <div className={styles.cta}>
        <div className={styles.ctaWordmark}>Coffee Roast Tracker</div>
        <Link to="/sign-up" className={styles.ctaLink}>
          Track your own roasts &rarr;
        </Link>
      </div>
    </div>
  );
}

function SharedRoastContent({ roast }: { roast: SharedRoast }) {
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
    <>
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
          <div>
            <h2 className={styles.beanName}>{roast.bean.name}</h2>
            <div className={styles.roastDate}>{formatDate(roast.roastDate)}</div>
            <StarRating value={roast.rating} readOnly />
          </div>

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

          {roast.flavors.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Flavors</div>
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
            </div>
          )}

          {roast.offFlavors.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Off-Flavors</div>
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
            </div>
          )}

          {roast.notes && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Notes</div>
              <p className={styles.notesText}>{roast.notes}</p>
            </div>
          )}

          {roast.roastProfile && (
            <button type="button" className={styles.downloadBtn}>
              Download .kpro
            </button>
          )}
        </div>
      </div>
    </>
  );
}
