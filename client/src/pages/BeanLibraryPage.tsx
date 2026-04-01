import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { MY_BEANS_QUERY, MY_ROASTS_QUERY } from "../graphql/operations";
import { FlavorPill } from "../components/FlavorPill";
import { AddBeanModal } from "../components/AddBeanModal";
import styles from "./BeanLibraryPage.module.css";

interface FlavorCount {
  name: string;
  color: string;
  count: number;
}

interface BeanAggregation {
  roastCount: number;
  avgRating: number | null;
  topFlavors: FlavorCount[];
}

function useBeanAggregations(roasts: RoastData[]) {
  const aggregations = new Map<string, BeanAggregation>();

  for (const roast of roasts) {
    const beanId = roast.bean.id;
    let agg = aggregations.get(beanId);
    if (!agg) {
      agg = { roastCount: 0, avgRating: null, topFlavors: [] };
      aggregations.set(beanId, agg);
    }
    agg.roastCount++;
  }

  // Compute average ratings and flavor frequencies per bean
  for (const beanId of aggregations.keys()) {
    const beanRoasts = roasts.filter((r) => r.bean.id === beanId);
    const agg = aggregations.get(beanId)!;

    // Average rating
    const ratings = beanRoasts
      .map((r) => r.rating)
      .filter((r): r is number => r != null);
    agg.avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    // Flavor frequency (positive only)
    const flavorMap = new Map<string, { name: string; color: string; count: number }>();
    for (const roast of beanRoasts) {
      for (const flavor of roast.flavors) {
        const existing = flavorMap.get(flavor.name);
        if (existing) {
          existing.count++;
        } else {
          flavorMap.set(flavor.name, { name: flavor.name, color: flavor.color, count: 1 });
        }
      }
    }
    agg.topFlavors = [...flavorMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }

  return aggregations;
}

type RoastData = {
  bean: { id: string };
  rating: number | null;
  flavors: Array<{ name: string; color: string }>;
};

export function BeanLibraryPage() {
  const [showAddBean, setShowAddBean] = useState(false);
  const navigate = useNavigate();
  const { data: beansData, loading: beansLoading, error: beansError } = useQuery(MY_BEANS_QUERY);
  const { data: roastsData, loading: roastsLoading } = useQuery(MY_ROASTS_QUERY);

  const loading = beansLoading || roastsLoading;
  const beans = beansData?.myBeans ?? [];
  const roasts = (roastsData?.myRoasts ?? []) as RoastData[];

  const aggregations = useBeanAggregations(roasts);

  if (loading) {
    return <div className={styles.empty}>Loading beans...</div>;
  }

  if (beansError) {
    return <div className={styles.empty}>Error loading beans: {beansError.message}</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div>
          <h1 className={styles.title}>My Beans</h1>
          <p className={styles.subtitle}>
            {beans.length === 0
              ? "Your collection of beans"
              : `${beans.length} bean${beans.length === 1 ? "" : "s"} in your library`}
          </p>
        </div>
        <button type="button" className={styles.addBtn} onClick={() => setShowAddBean(true)}>
          + Add Bean
        </button>
      </div>

      {beans.length === 0 ? (
        <div className={styles.empty}>
          <p>No beans yet</p>
          <p>Add your first bean</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {beans.map((userBean) => {
            const agg = aggregations.get(userBean.bean.id);
            const process = userBean.bean.process;
            const rawElevation = userBean.bean.elevation;
            const elevation = rawElevation && !/masl|meters|m\b|ft/i.test(rawElevation)
              ? `${rawElevation} MASL`
              : rawElevation;
            const hasProcessInfo = process || elevation;
            const maxPills = 3;
            const topFlavors = agg?.topFlavors ?? [];
            const visibleFlavors = topFlavors.slice(0, maxPills);
            const overflowCount = topFlavors.length - maxPills;

            return (
              <div
                key={userBean.id}
                className={styles.card}
                onClick={() => navigate(`/beans/${userBean.bean.id}`)}
                role="link"
              >
                <div className={styles.beanName}>{userBean.bean.name}</div>
                {userBean.shortName && (
                  <div className={styles.shortName}>{userBean.shortName}</div>
                )}
                {hasProcessInfo && (
                  <div className={styles.processInfo}>
                    {[process, elevation].filter(Boolean).join(" \u00B7 ")}
                  </div>
                )}
                {visibleFlavors.length > 0 && (
                  <div className={styles.pillRow}>
                    {visibleFlavors.map((f) => (
                      <FlavorPill key={f.name} name={f.name} color={f.color} />
                    ))}
                    {overflowCount > 0 && (
                      <span className={styles.moreChip}>+{overflowCount}</span>
                    )}
                  </div>
                )}
                <div className={styles.footer}>
                  <span className={styles.roastCount}>
                    {agg && agg.roastCount > 0
                      ? `${agg.roastCount} roast${agg.roastCount === 1 ? "" : "s"}`
                      : "No roasts yet"}
                  </span>
                  {agg?.avgRating != null && (
                    <span className={styles.avgRating}>
                      ★ {agg.avgRating} avg
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddBean && (
        <AddBeanModal
          onClose={() => setShowAddBean(false)}
          onSaved={(beanId) => {
            setShowAddBean(false);
            navigate(`/beans/${beanId}`);
          }}
        />
      )}
    </div>
  );
}
