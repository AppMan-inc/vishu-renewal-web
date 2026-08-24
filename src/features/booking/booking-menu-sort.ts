export type PriceSortableMenu = {
  price: number;
  priority: number;
};

export function sortMenusByPriorityAndPrice<T extends PriceSortableMenu>(
  menus: T[],
): T[] {
  return [...menus].sort((left, right) => {
    const priorityComparison = left.priority - right.priority;
    if (priorityComparison !== 0) return priorityComparison;

    const leftPrice = left.price > 0 ? left.price : Number.POSITIVE_INFINITY;
    const rightPrice = right.price > 0 ? right.price : Number.POSITIVE_INFINITY;
    if (leftPrice === rightPrice) return 0;
    return leftPrice - rightPrice;
  });
}
