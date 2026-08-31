export type MenuCategory = {
  id: string;
  label: string;
  terms: string[];
  isOther?: boolean;
};

export const menuCategories: MenuCategory[] = [
  { id: "cut", label: "カット", terms: ["カット", "cut"] },
  { id: "color", label: "カラー", terms: ["カラー", "color"] },
  { id: "perm", label: "パーマ", terms: ["パーマ", "perm"] },
  { id: "straightening", label: "縮毛矯正", terms: ["縮毛矯正", "ストレート", "straightening"] },
  { id: "treatment", label: "トリートメント", terms: ["トリートメント", "treatment"] },
  { id: "headSpa", label: "ヘッドスパ", terms: ["ヘッドスパ", "ヘットスパ", "head spa", "headspa"] },
  { id: "hairSet", label: "ヘアセット", terms: ["ヘアセット", "hair set", "hairset"] },
  { id: "kimono", label: "着付け", terms: ["着付け", "着付", "kimono"] },
  { id: "other", label: "その他", terms: [], isOther: true },
];

export type CatalogMenu = {
  title: string;
  categories: string[];
  beforePrice: number | null;
  price: number;
  priority: number;
};

export type MenuGroups<T> = {
  coupons: T[];
  regularMenus: T[];
};

export function groupVisibleMenus<T extends CatalogMenu>(
  menus: T[],
  selectedCategoryIds: string[],
): MenuGroups<T> {
  const filtered = selectedCategoryIds.length === 0
    ? menus
    : menus.filter((menu) => selectedCategoryIds.some((categoryId) =>
      menuMatchesCategory(menu, categoryId)
    ));
  const coupons = filtered.filter(isCoupon);
  const regularMenus = filtered.filter((menu) => !isCoupon(menu));
  return {
    coupons: sortMenus(coupons),
    regularMenus: sortMenus(regularMenus),
  };
}

export function isCoupon(menu: Pick<CatalogMenu, "beforePrice">) {
  return menu.beforePrice !== null;
}

export function toggleCategory(
  selectedCategoryIds: string[],
  categoryId: string,
) {
  return selectedCategoryIds.includes(categoryId)
    ? selectedCategoryIds.filter((id) => id !== categoryId)
    : [...selectedCategoryIds, categoryId];
}

export function canonicalCategoryIds(values: string[]) {
  const normalizedValues = new Set(values.map(normalize));
  return menuCategories
    .filter((category) => !category.isOther)
    .filter((category) =>
      [category.id, category.label, ...category.terms]
        .map(normalize)
        .some((value) => normalizedValues.has(value))
    )
    .map((category) => category.id);
}

export function categoryDisplayLabel(value: string) {
  const normalizedValue = normalize(value);
  const category = menuCategories.find((item) =>
    [item.id, item.label, ...item.terms]
      .map(normalize)
      .includes(normalizedValue)
  );
  return category?.label ?? value.trim();
}

function menuMatchesCategory(menu: CatalogMenu, categoryId: string) {
  const category = menuCategories.find((item) => item.id === categoryId);
  if (!category) return false;
  const values = [menu.title, ...menu.categories].map(normalize);
  if (category.isOther) {
    return !menuCategories
      .filter((item) => !item.isOther)
      .some((item) => termsMatch(values, item.terms));
  }
  return termsMatch(values, category.terms);
}

function termsMatch(values: string[], terms: string[]) {
  return terms.map(normalize).some((term) =>
    values.some((value) => value === term || value.includes(term))
  );
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sortMenus<T extends CatalogMenu>(menus: T[]) {
  return [...menus].sort((left, right) => {
    const priority = left.priority - right.priority;
    if (priority !== 0) return priority;
    const leftPrice = left.price > 0 ? left.price : Number.POSITIVE_INFINITY;
    const rightPrice = right.price > 0 ? right.price : Number.POSITIVE_INFINITY;
    if (leftPrice !== rightPrice) return leftPrice - rightPrice;
    return left.title.localeCompare(right.title, "ja");
  });
}
