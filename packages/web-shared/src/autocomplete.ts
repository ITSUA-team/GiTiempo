/* eslint-disable no-unused-vars */
type AutocompleteLabelGetter<Option> = (option: Option) => string;
/* eslint-enable no-unused-vars */

export function matchesAutocompleteLabel(label: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  return normalizedQuery.length === 0 || label.toLowerCase().includes(normalizedQuery);
}

export function filterAutocompleteStrings(
  options: readonly string[],
  query: string,
): string[] {
  return filterAutocompleteOptions(options, query, (option) => option);
}

export function filterAutocompleteOptions<Option>(
  options: readonly Option[],
  query: string,
  getLabel: AutocompleteLabelGetter<Option>,
): Option[] {
  return options.filter((option) =>
    matchesAutocompleteLabel(getLabel(option), query),
  );
}
