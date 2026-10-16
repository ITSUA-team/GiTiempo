/**
 * Escapes special LIKE pattern characters (backslash, %, _) so a user
 * search string is matched literally in an ILIKE expression.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
