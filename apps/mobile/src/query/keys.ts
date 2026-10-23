/** Cache keys start with the signed-in user so the next account cannot read them. */
export function accountKey(userId: string, ...parts: (string | null | undefined)[]) {
  return [userId, ...parts.map((part) => part ?? "")];
}
