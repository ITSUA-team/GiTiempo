import type { ManagementMember } from '@/services/admin-time-entries-client';

export function managedMemberOptions(members: ManagementMember[]) {
  const counts = new Map<string, number>();
  for (const { displayName } of members) {
    const name = displayName?.toLowerCase() ?? '';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return members.map(member => {
    const { displayName, email } = member;
    const duplicateName = displayName && (counts.get(displayName.toLowerCase()) ?? 0) > 1;
    return { ...member, label: duplicateName ? `${displayName} (${email})` : displayName || email };
  });
}
