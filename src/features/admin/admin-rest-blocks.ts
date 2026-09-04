import type { AdminRestBlock, ClosurePeriod } from "@/features/admin/types";

const closurePeriods = new Set<ClosurePeriod>([
  "fullDay",
  "morning",
  "afternoon",
  "custom",
]);

export function normalizeAdminRestBlocks(value: unknown): AdminRestBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const block = item as Record<string, unknown>;
    if (
      typeof block.id !== "string" ||
      typeof block.startTime !== "string" ||
      typeof block.endTime !== "string"
    ) {
      return [];
    }

    const closurePeriod = typeof block.closurePeriod === "string" &&
        closurePeriods.has(block.closurePeriod as ClosurePeriod)
      ? block.closurePeriod as ClosurePeriod
      : "custom";
    const businessDate = typeof block.businessDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(block.businessDate)
      ? block.businessDate
      : null;

    return [{
      id: block.id,
      startTime: block.startTime,
      endTime: block.endTime,
      createdAt: typeof block.createdAt === "string" ? block.createdAt : block.startTime,
      closurePeriod,
      closureGroupId: typeof block.closureGroupId === "string"
        ? block.closureGroupId
        : null,
      businessDate,
    }];
  });
}

export function isClosureBlock(block: AdminRestBlock) {
  return block.closurePeriod !== "custom";
}
