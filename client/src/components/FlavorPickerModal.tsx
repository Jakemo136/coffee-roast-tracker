import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  FLAVOR_DESCRIPTORS_QUERY,
  SET_ROAST_FLAVORS,
  SET_ROAST_OFF_FLAVORS,
  CREATE_FLAVOR_DESCRIPTOR,
} from "../graphql/operations";
import { Modal } from "./Modal";
import { FlavorPill } from "./FlavorPill";
import styles from "./styles/FlavorPickerModal.module.css";

interface FlavorPickerModalProps {
  roastId: string;
  mode: "flavors" | "offFlavors";
  initialSelected: string[];
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORY_ORDER = [
  "FLORAL",
  "HONEY",
  "SUGARS",
  "CARAMEL",
  "FRUITS",
  "CITRUS",
  "BERRY",
  "COCOA",
  "NUTS",
  "RUSTIC",
  "SPICE",
  "BODY",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  FLORAL: "\uD83C\uDF38 Floral",
  HONEY: "\uD83C\uDF6F Honey",
  SUGARS: "\uD83C\uDF6C Sugars",
  CARAMEL: "\uD83C\uDF6E Caramel",
  FRUITS: "\uD83C\uDF51 Fruits",
  CITRUS: "\uD83C\uDF4B Citrus",
  BERRY: "\uD83E\uDED0 Berry",
  COCOA: "\uD83C\uDF6B Cocoa",
  NUTS: "\uD83E\uDD5C Nuts",
  RUSTIC: "\uD83C\uDF3F Rustic",
  SPICE: "\uD83E\uDEDA Spice",
  BODY: "\u2615 Body",
  OFF_FLAVOR: "\u26A0\uFE0F Off-Flavors",
};

const FLAVOR_CATEGORIES = [
  "FLORAL",
  "HONEY",
  "SUGARS",
  "CARAMEL",
  "FRUITS",
  "CITRUS",
  "BERRY",
  "COCOA",
  "NUTS",
  "RUSTIC",
  "SPICE",
  "BODY",
] as const;

interface Descriptor {
  id: string;
  name: string;
  category: string;
  isOffFlavor: boolean;
  isCustom: boolean;
  color: string;
}

export function FlavorPickerModal({
  roastId,
  mode,
  initialSelected,
  onClose,
  onSaved,
}: FlavorPickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelected),
  );
  const [searchText, setSearchText] = useState("");
  const [customCategory, setCustomCategory] = useState<typeof FLAVOR_CATEGORIES[number]>("FLORAL");

  const { data, loading } = useQuery(FLAVOR_DESCRIPTORS_QUERY, {
    variables: { isOffFlavor: mode === "offFlavors" ? true : false },
  });

  const [setRoastFlavors, { loading: savingFlavors }] =
    useMutation(SET_ROAST_FLAVORS);
  const [setRoastOffFlavors, { loading: savingOffFlavors }] =
    useMutation(SET_ROAST_OFF_FLAVORS);
  const [createDescriptor] = useMutation(CREATE_FLAVOR_DESCRIPTOR);

  const saving = savingFlavors || savingOffFlavors;

  const allDescriptors: Descriptor[] = (data?.flavorDescriptors ?? []) as Descriptor[];

  const filtered = searchText
    ? allDescriptors.filter((d) =>
        d.name.toLowerCase().includes(searchText.toLowerCase()),
      )
    : allDescriptors;

  const noMatch =
    searchText.length > 0 &&
    !allDescriptors.some(
      (d) => d.name.toLowerCase() === searchText.toLowerCase(),
    );

  const selectedDescriptors = allDescriptors.filter((d) =>
    selectedIds.has(d.id),
  );

  // Group by category
  const grouped = new Map<string, Descriptor[]>();
  for (const d of filtered) {
    const list = grouped.get(d.category) ?? [];
    list.push(d);
    grouped.set(d.category, list);
  }

  const categoryKeys =
    mode === "offFlavors"
      ? (["OFF_FLAVOR"] as string[])
      : (CATEGORY_ORDER as readonly string[]);

  function toggleDescriptor(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAddCustom() {
    const category = mode === "offFlavors" ? "OFF_FLAVOR" : customCategory;
    const result = await createDescriptor({
      variables: { name: searchText.trim(), category },
      refetchQueries: [{ query: FLAVOR_DESCRIPTORS_QUERY, variables: { isOffFlavor: mode === "offFlavors" } }],
    });
    const created = result.data?.createFlavorDescriptor;
    if (created) {
      setSelectedIds((prev) => new Set(prev).add(created.id));
      setSearchText("");
    }
  }

  async function handleSave() {
    const ids = Array.from(selectedIds);
    if (mode === "flavors") {
      await setRoastFlavors({
        variables: { roastId, descriptorIds: ids },
      });
    } else {
      await setRoastOffFlavors({
        variables: { roastId, descriptorIds: ids },
      });
    }
    onSaved();
  }

  const title = mode === "flavors" ? "Edit Flavors" : "Edit Off-Flavors";

  const footer = (
    <div className={styles.footer}>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );

  return (
    <Modal title={title} onClose={onClose} footer={footer}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Search descriptors..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      {noMatch && (
        <div>
          <button
            type="button"
            className={styles.addCustom}
            onClick={handleAddCustom}
          >
            Add &apos;{searchText}&apos; as custom descriptor
          </button>
          {mode === "flavors" && (
            <select
              className={styles.categorySelect}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value as typeof FLAVOR_CATEGORIES[number])}
              aria-label="Category for custom descriptor"
            >
              {FLAVOR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Selected section */}
      <div className={styles.selectedSection}>
        <div className={styles.selectedHeader}>
          Selected ({selectedIds.size})
        </div>
        {selectedDescriptors.length > 0 ? (
          <div className={styles.selectedPills}>
            {selectedDescriptors.map((d) => (
              <FlavorPill
                key={d.id}
                name={d.name}
                color={d.color}
                isOffFlavor={d.isOffFlavor}
                onRemove={() => toggleDescriptor(d.id)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptySelected}>None selected</div>
        )}
      </div>

      {/* Category groups */}
      {loading ? (
        <div>Loading descriptors...</div>
      ) : (
        categoryKeys.map((cat) => {
          const descriptors = grouped.get(cat);
          if (!descriptors || descriptors.length === 0) return null;
          return (
            <div key={cat} className={styles.categoryGroup} data-testid={`category-${cat}`}>
              <div className={styles.categoryHeader}>
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div className={styles.categoryPills}>
                {descriptors.map((d) => (
                  <FlavorPill
                    key={d.id}
                    name={d.name}
                    color={d.color}
                    isOffFlavor={d.isOffFlavor}
                    selected={selectedIds.has(d.id)}
                    onClick={() => toggleDescriptor(d.id)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </Modal>
  );
}
