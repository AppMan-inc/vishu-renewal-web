export function customerMatchesQuery(
  customer: { displayName: string; telephoneNumber: string },
  query: string,
) {
  const normalizedQuery = normalize(query);
  return [customer.displayName, customer.telephoneNumber]
    .some((value) => normalize(value).includes(normalizedQuery));
}

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s-]/g, "");
}
