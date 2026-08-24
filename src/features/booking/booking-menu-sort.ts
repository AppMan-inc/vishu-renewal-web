export type PriceSortableMenu = {
  price: number;
};

export function sortMenusByPrice<T extends PriceSortableMenu>(menus: T[]): T[] {
  return [...menus].sort((left, right) => {
    const leftPrice = left.price > 0 ? left.price : Number.POSITIVE_INFINITY;
    const rightPrice = right.price > 0 ? right.price : Number.POSITIVE_INFINITY;
    if (leftPrice === rightPrice) return 0;
    return leftPrice - rightPrice;
  });
}
