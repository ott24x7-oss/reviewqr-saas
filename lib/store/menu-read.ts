import { prisma } from "../db";
import { cursorQuery, type PageQuery } from "../api/cursor";
import { takePage } from "../api/page";
import { fail, ok } from "../api/result";
import { requireBusinessRole } from "../tenant";
import { featureBlock } from "../plans/feature-gate";

/** Categories in display order, plus one page of items with variants, add-ons, and photos. */
export async function listMenu(userId: string, businessId: string, page: PageQuery) {
  const business = await requireBusinessRole(userId, businessId, "read");
  if (!business) return fail(404, "Not found");
  const locked = await featureBlock(business.ownerId, "menu");
  if (locked) return locked;
  const categories = await prisma.menuCategory.findMany({
    where: { businessId: business.id },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
  });
  const items = await takePage(
    () =>
      prisma.menuItem.findMany({
        where: { businessId: business.id },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
          addOns: { orderBy: { sortOrder: "asc" } }
        },
        ...cursorQuery(page.cursorId, page.limit)
      }),
    page.limit
  );
  if (!items.ok) return items;
  return ok({ categories, items: items.data.items, nextCursor: items.data.nextCursor });
}
