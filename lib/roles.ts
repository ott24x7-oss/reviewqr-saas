/** Admin screens stay limited to the ADMIN role. AGENT is not an admin. */
export function canAccessAdmin(role: string | null | undefined) {
  return role === "ADMIN";
}
