/** `all`, `agents`, or `module:MENU|STORE|REVIEWS`. Outside the window is hidden. */
export function announcementVisible(input: {
  audience: string;
  startsAt: Date;
  endsAt: Date;
  now: Date;
  modules: string[];
  isAgent: boolean;
}) {
  if (input.now.getTime() < input.startsAt.getTime()) return false;
  if (input.now.getTime() > input.endsAt.getTime()) return false;
  if (input.audience === "all") return true;
  if (input.audience === "agents") return input.isAgent;
  if (input.audience.startsWith("module:")) return input.modules.includes(input.audience.slice("module:".length));
  return false;
}

export function articleMatches(article: { title: string; body: string; category: string }, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = `${article.title} ${article.body} ${article.category}`.toLowerCase();
  return hay.includes(needle);
}
