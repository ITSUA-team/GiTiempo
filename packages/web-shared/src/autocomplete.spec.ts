import { describe, expect, it } from 'vitest';

import {
  filterAutocompleteOptions,
  filterAutocompleteStrings,
  matchesAutocompleteLabel,
} from './autocomplete';

describe('autocomplete helpers', () => {
  it('matches labels with trimmed case-insensitive queries', () => {
    expect(matchesAutocompleteLabel('Admin Web', ' admin ')).toBe(true);
    expect(matchesAutocompleteLabel('Project Orion', 'admin')).toBe(false);
  });

  it('returns all string options for an empty query as a fresh array', () => {
    const options = ['Admin Web', 'Project Orion'];
    const suggestions = filterAutocompleteStrings(options, '   ');

    expect(suggestions).toEqual(options);
    expect(suggestions).not.toBe(options);
  });

  it('filters object options by a provided label getter', () => {
    const options = [
      { label: 'Admin Web', value: 'admin' },
      { label: 'Project Orion', value: 'orion' },
    ];

    expect(
      filterAutocompleteOptions(options, 'orion', (option) => option.label),
    ).toEqual([{ label: 'Project Orion', value: 'orion' }]);
  });
});
