export type GrowthComponent = {
  key: string;
  labelEn: string;
  labelHi: string;
  weight: number;
  earned: number;
  ratio: number;
  titleEn: string;
  titleHi: string;
  href: string;
  appHref: string;
};

export type GrowthTip = {
  key: string;
  titleEn: string;
  titleHi: string;
  href: string;
  appHref: string;
};

export type GrowthChecklistItem = GrowthTip & { done: boolean };

export type GrowthInput = {
  businessId: string;
  ageDays: number;
  storeOn: boolean;
  menuOn: boolean;
  reviewsLast7: number;
  reviewsPrev7: number;
  avgRating: number | null;
  ratingCount: number;
  feedbackTotal: number;
  feedbackReplied: number;
  hasLogo: boolean;
  hasHours: boolean;
  linkCount: number;
  hasMenu: boolean;
  orderCount: number;
  repeatCustomers: number;
  scansLast7: number;
  scansPrev7: number;
  doneTips: string[];
};

const BASE = {
  reviewVelocity: 20,
  avgRating: 20,
  feedbackResponse: 15,
  logo: 5,
  hours: 5,
  links: 5,
  menu: 5,
  ordersRepeat: 15,
  scansTrend: 10
} as const;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function pace(current: number, previous: number) {
  if (current <= 0 && previous <= 0) return 0;
  if (previous <= 0) return clamp01(current / 4);
  return clamp01(current / previous);
}

function part(
  key: string,
  labelEn: string,
  labelHi: string,
  weight: number,
  ratio: number,
  titleEn: string,
  titleHi: string,
  href: string,
  appHref: string
): GrowthComponent {
  const earned = Math.round(clamp01(ratio) * weight * 10) / 10;
  return { key, labelEn, labelHi, weight, earned, ratio: clamp01(ratio), titleEn, titleHi, href, appHref };
}

export function growthWeights(storeOn: boolean) {
  return {
    reviewVelocity: BASE.reviewVelocity,
    avgRating: BASE.avgRating,
    feedbackResponse: BASE.feedbackResponse,
    tapPage: BASE.logo + BASE.hours + BASE.links + BASE.menu,
    ordersRepeat: storeOn ? BASE.ordersRepeat : 0,
    scansTrend: storeOn ? BASE.scansTrend : BASE.scansTrend + BASE.ordersRepeat
  };
}

export function businessAgeDays(createdAt: Date, now = new Date()) {
  const ms = now.getTime() - createdAt.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function scoreGrowth(input: GrowthInput) {
  const business = `/dashboard/businesses/${input.businessId}`;
  const weights = growthWeights(input.storeOn);
  const checklist: GrowthChecklistItem[] = [
    {
      key: "logo",
      titleEn: "Add your logo",
      titleHi: "अपना लोगो जोड़ें",
      href: `${business}/edit`,
      appHref: "/(app)/business-edit",
      done: input.hasLogo
    },
    {
      key: "hours",
      titleEn: "Add your opening hours",
      titleHi: "खुलने का समय जोड़ें",
      href: `${business}/store`,
      appHref: "/(app)/store",
      done: input.hasHours
    },
    {
      key: "links",
      titleEn: "Add a button on your tap page",
      titleHi: "टैप पेज पर एक बटन जोड़ें",
      href: `${business}/tap`,
      appHref: "/(app)/tap",
      done: input.linkCount >= 1
    },
    {
      key: "menu",
      titleEn: "Add a menu item",
      titleHi: "एक मेनू आइटम जोड़ें",
      href: `${business}/menu`,
      appHref: "/(app)/menu",
      done: !input.menuOn || input.hasMenu
    },
    {
      key: "scans",
      titleEn: "Print a table QR",
      titleHi: "टेबल QR प्रिंट करें",
      href: `${business}/print`,
      appHref: "/(app)/tap",
      done: input.scansLast7 > 0
    }
  ];

  if (input.ageDays < 7) {
    return {
      ready: false as const,
      score: null,
      weights,
      components: [] as GrowthComponent[],
      tips: [] as GrowthTip[],
      checklist
    };
  }

  const unreplied = Math.max(0, input.feedbackTotal - input.feedbackReplied);
  const feedbackRatio = input.feedbackTotal <= 0 ? 1 : input.feedbackReplied / input.feedbackTotal;
  const menuRatio = !input.menuOn || input.hasMenu ? 1 : 0;
  const orderRatio =
    input.orderCount <= 0
      ? 0
      : clamp01(input.orderCount / 5) * 0.5 + clamp01(input.repeatCustomers / input.orderCount) * 0.5;

  const components: GrowthComponent[] = [
    part(
      "reviews",
      "Review velocity",
      "रिव्यू की रफ़्तार",
      weights.reviewVelocity,
      pace(input.reviewsLast7, input.reviewsPrev7),
      "Ask for more reviews",
      "और रिव्यू माँगें",
      `${business}/print`,
      "/(app)/tap"
    ),
    part(
      "rating",
      "Average rating",
      "औसत रेटिंग",
      weights.avgRating,
      input.ratingCount <= 0 || input.avgRating == null ? 0 : input.avgRating / 5,
      "Look at recent low ratings",
      "हाल की कम रेटिंग देखें",
      "/dashboard/reviews",
      "/(app)/feedback"
    ),
    part(
      "feedback",
      "Private feedback replies",
      "निजी फ़ीडबैक के जवाब",
      weights.feedbackResponse,
      feedbackRatio,
      unreplied > 0 ? `Reply to ${unreplied} private feedbacks` : "Reply to private feedback",
      unreplied > 0 ? `${unreplied} निजी फ़ीडबैक का जवाब दें` : "निजी फ़ीडबैक का जवाब दें",
      "/dashboard/feedback",
      "/(app)/feedback"
    ),
    part(
      "logo",
      "Tap page",
      "टैप पेज",
      BASE.logo,
      input.hasLogo ? 1 : 0,
      "Add your logo",
      "अपना लोगो जोड़ें",
      `${business}/edit`,
      "/(app)/business-edit"
    ),
    part(
      "hours",
      "Tap page",
      "टैप पेज",
      BASE.hours,
      input.hasHours ? 1 : 0,
      "Add your opening hours",
      "खुलने का समय जोड़ें",
      `${business}/store`,
      "/(app)/store"
    ),
    part(
      "links",
      "Tap page",
      "टैप पेज",
      BASE.links,
      input.linkCount >= 1 ? 1 : 0,
      "Add a button on your tap page",
      "टैप पेज पर एक बटन जोड़ें",
      `${business}/tap`,
      "/(app)/tap"
    ),
    part(
      "menu",
      "Tap page",
      "टैप पेज",
      BASE.menu,
      menuRatio,
      "Add a menu item",
      "एक मेनू आइटम जोड़ें",
      `${business}/menu`,
      "/(app)/menu"
    ),
    part(
      "scans",
      "Scans trend",
      "स्कैन का रुझान",
      weights.scansTrend,
      pace(input.scansLast7, input.scansPrev7),
      "Print a table QR",
      "टेबल QR प्रिंट करें",
      `${business}/print`,
      "/(app)/tap"
    )
  ];
  if (input.storeOn) {
    components.push(
      part(
        "orders",
        "Orders and repeat customers",
        "ऑर्डर और दोबारा ग्राहक",
        weights.ordersRepeat,
        orderRatio,
        input.orderCount <= 0 ? "Take your first WhatsApp order" : "Open your WhatsApp store",
        input.orderCount <= 0 ? "पहला WhatsApp ऑर्डर लें" : "अपना WhatsApp स्टोर खोलें",
        `${business}/store`,
        "/(app)/store"
      )
    );
  }

  const done = new Set(input.doneTips);
  const tips = components
    .filter((row) => row.ratio < 1 && !done.has(row.key))
    .sort((a, b) => a.ratio - b.ratio || b.weight - a.weight)
    .slice(0, 3)
    .map((row) => ({
      key: row.key,
      titleEn: row.titleEn,
      titleHi: row.titleHi,
      href: row.href,
      appHref: row.appHref
    }));

  const score = Math.max(0, Math.min(100, Math.round(components.reduce((sum, row) => sum + row.earned, 0))));
  return { ready: true as const, score, weights, components, tips, checklist };
}
