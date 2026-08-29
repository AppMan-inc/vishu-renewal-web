type RestBlockInput = {
  startTime: string;
  endTime: string;
};

export function legacyRestMutations(
  body: Record<string, unknown>,
): Record<string, unknown>[] | null {
  if (
    body.action !== "rest.apply" ||
    !Array.isArray(body.blocks) ||
    !Array.isArray(body.deleteIds)
  ) {
    return null;
  }

  const blocks = body.blocks.filter(isRestBlockInput);
  const deleteIds = body.deleteIds.filter((id): id is string =>
    typeof id === "string" && id.length > 0);
  if (blocks.length !== body.blocks.length || deleteIds.length !== body.deleteIds.length) {
    return null;
  }

  return [
    ...deleteIds.map((id) => ({ action: "rest.delete", id })),
    ...blocks.map((block) => ({
      action: "rest.create",
      startTime: block.startTime,
      endTime: block.endTime,
    })),
  ];
}

function isRestBlockInput(value: unknown): value is RestBlockInput {
  if (!value || typeof value !== "object") return false;
  const block = value as Record<string, unknown>;
  return typeof block.startTime === "string" &&
    typeof block.endTime === "string";
}
