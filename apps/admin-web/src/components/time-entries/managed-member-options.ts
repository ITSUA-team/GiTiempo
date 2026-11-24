import type { ManagementMember } from '@/services/admin-time-entries-client';

function repeatedLabelCheck(labels: string[]) {
  const counts = new Map<string, number>();
  for (const label of labels) {
    const key = label.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return (label: string) => (counts.get(label.toLowerCase()) ?? 0) > 1;
}

export function managedMemberOptions(members: ManagementMember[]) {
  const repeatsName = repeatedLabelCheck(members.map(member => member.displayName ?? ''));
  const options = members.map(member => {
    const { displayName, email } = member;
    const label = displayName && repeatsName(displayName) ? `${displayName} (${email})` : displayName || email;
    return { ...member, label };
  });

  const repeatsLabel = repeatedLabelCheck(options.map(option => option.label));
  const shortLabels = options.map(({ label, id }) => repeatsLabel(label) ? `${id.slice(0, 8)} · ${label}` : label);
  const repeatsShortLabel = repeatedLabelCheck(shortLabels);

  return options.map((option, index) => {
    const shortLabel = shortLabels[index];
    const useFullId = repeatsLabel(option.label) && repeatsShortLabel(shortLabel);
    return { ...option, label: useFullId ? `${option.id} · ${option.label}` : shortLabel };
  });
}
