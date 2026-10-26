import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as catalogGet } from "../../app/api/v1/shop/catalog/route";
import { GET as productGet } from "../../app/api/v1/shop/products/[slug]/route";
import { POST as cartItemPost } from "../../app/api/v1/shop/cart/items/route";
import { GET as cartGet, PUT as cartPut } from "../../app/api/v1/shop/cart/route";
import { POST as checkoutPost } from "../../app/api/v1/shop/checkout/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";
import { shopCatalog } from "../../lib/shop/cart-store";
import { FOUNDER_SKU } from "../../lib/shop/catalog-seed";
import { shopCategory } from "../../lib/shop/physical";

describe("shop categories", () => {
  it("keeps hardware physical and the lifetime plan digital", () => {
    const physical = { ships: true, includedLifetime: false, includedTier: null };
    expect(shopCategory({ slug: "qr-stand", name: "QR table stand", variants: [physical] })).toBe("stand");
    expect(shopCategory({ slug: "nfc-qr-combo", name: "NFC + QR combo", variants: [physical] })).toBe("stand");
    expect(shopCategory({ slug: "pvc-nfc-card", name: "PVC NFC card", variants: [physical] })).toBe("card");
    expect(shopCategory({ slug: "table-stickers", name: "Table stickers", variants: [physical] })).toBe("sticker");
    expect(shopCategory({ slug: "keychain-tag", name: "Keychain tag", variants: [physical] })).toBe("keychain");
    expect(
      shopCategory({
        slug: "founder-lifetime",
        name: "Founder lifetime",
        variants: [{ ships: false, includedLifetime: true, includedTier: "FOUNDER" }]
      })
    ).toBe("digital");
  });
});

describe("app shop sells physical products only", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.shopOrder.deleteMany({ where: { userId: { in: users } } });
    await prisma.payment.deleteMany({ where: { userId: { in: users } } });
    await prisma.shopCart.deleteMany({ where: { userId: { in: users } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("hides the founder plan from /api/v1 and still lists it on the web", async () => {
    const user = await prisma.user.create({ data: { email: `shop-phys-${Date.now()}@example.test`, role: "USER" } });
    users.push(user.id);
    const pair = await issueTokenPair(user, { deviceName: "shop-physical" });
    const headers = { authorization: `Bearer ${pair.accessToken}`, "content-type": "application/json" };

    const catalog = await catalogGet(new NextRequest("http://127.0.0.1/api/v1/shop/catalog", { headers }));
    expect(catalog.status).toBe(200);
    const items = (await catalog.json()).data.items as { slug: string; category: string; variants: { sku: string; salePaise: number }[] }[];
    const bySlug = Object.fromEntries(items.map((item) => [item.slug, item.category]));
    expect(bySlug["qr-stand"]).toBe("stand");
    expect(bySlug["nfc-qr-combo"]).toBe("stand");
    expect(bySlug["pvc-nfc-card"]).toBe("card");
    expect(bySlug["table-stickers"]).toBe("sticker");
    expect(bySlug["keychain-tag"]).toBe("keychain");
    expect(bySlug["founder-lifetime"]).toBeUndefined();
    expect(items.every((item) => item.category !== "digital")).toBe(true);
    const body = JSON.stringify(items);
    expect(body).not.toContain(FOUNDER_SKU);
    expect(body).not.toContain("24999");

    const hidden = await productGet(new NextRequest("http://127.0.0.1/api/v1/shop/products/founder-lifetime", { headers }), {
      params: { slug: "founder-lifetime" }
    });
    expect(hidden.status).toBe(404);
    const stand = await productGet(new NextRequest("http://127.0.0.1/api/v1/shop/products/qr-stand", { headers }), {
      params: { slug: "qr-stand" }
    });
    expect(stand.status).toBe(200);
    expect((await stand.json()).data.category).toBe("stand");

    const web = await shopCatalog();
    expect(web.some((item) => item.slug === "founder-lifetime")).toBe(true);

    const added = await cartItemPost(
      new NextRequest("http://127.0.0.1/api/v1/shop/cart/items", {
        method: "POST",
        headers,
        body: JSON.stringify({ sku: FOUNDER_SKU, qty: 1 })
      })
    );
    expect(added.status).toBe(404);

    const replaced = await cartPut(
      new NextRequest("http://127.0.0.1/api/v1/shop/cart", {
        method: "PUT",
        headers,
        body: JSON.stringify({ lines: [{ sku: FOUNDER_SKU, qty: 1 }] })
      })
    );
    expect(replaced.status).toBe(404);

    const variant = await prisma.catalogVariant.findUnique({ where: { sku: FOUNDER_SKU } });
    expect(variant?.includedLifetime).toBe(true);
    const cart = await prisma.shopCart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    await prisma.shopCartLine.create({ data: { cartId: cart.id, variantId: variant!.id, qty: 1 } });
    const viewed = await cartGet(new NextRequest("http://127.0.0.1/api/v1/shop/cart", { headers }));
    expect(viewed.status).toBe(200);
    const cartBody = JSON.stringify((await viewed.json()).data.lines);
    expect(cartBody).not.toContain(FOUNDER_SKU);

    const checkout = await checkoutPost(new NextRequest("http://127.0.0.1/api/v1/shop/checkout", { method: "POST", headers }));
    expect(checkout.status).toBe(400);
    expect(await prisma.shopOrder.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.payment.count({ where: { userId: user.id } })).toBe(0);
  });
});
