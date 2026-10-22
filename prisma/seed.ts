/**
 * Demo data seed — creates an admin, a demo SMB, locations, staff,
 * a few QR codes, and ~100 realistic reviews so the dashboard
 * looks alive on first login.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, ReviewSentiment, FeedbackStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ensureCatalogWith } from "../lib/shop/catalog-ensure";

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@reviewqr.in").toLowerCase().trim();
const DEMO_EMAIL = "demo@reviewqr.in";
const DEMO_PASSWORD = "Demo@123";

const FIRST_NAMES = ["Ananya", "Rohit", "Priya", "Vikram", "Neha", "Sandeep", "Meera", "Karthik", "Ishita", "Arjun", "Pooja", "Rahul", "Sneha", "Aakash", "Divya", "Manish", "Riya", "Nikhil", "Shruti", "Tanvi"];
const LAST_NAMES = ["Sharma", "Iyer", "Reddy", "Pillai", "Verma", "Mehta", "Shah", "Patel", "Kumar", "Singh", "Joshi", "Nair", "Khan", "Rao", "Das", "Gupta", "Bose", "Kapoor", "Malhotra", "Choudhury"];

const POSITIVE = [
  "Loved the masala dosa! Best in Indiranagar.",
  "Service was super quick. Coffee was on point.",
  "Beautiful ambience, friendly staff, will be back.",
  "The chef came out to ask if we liked the food. Touched.",
  "Tried the new biryani — absolutely delicious!",
  "Great value for money. Portions are huge.",
  "Best place for a Sunday brunch with family.",
  "Loved the vibe and the live music on Friday.",
  "Staff was very helpful with menu suggestions.",
  "Hot, fresh, perfectly spiced. 10/10."
];

const NEGATIVE = [
  "Cold parathas, no apology after I complained.",
  "Bill was wrong. Took 30 min to fix.",
  "Music too loud, couldn't talk.",
  "Server was rude when we asked for water.",
  "Long wait despite reservation.",
  "Food was over-salted today, not the usual quality.",
  "Toilet wasn't clean. Disappointing.",
  "Coffee was lukewarm and the cup was chipped."
];

const NEUTRAL = [
  "Food was okay, nothing special.",
  "Decent place, but a bit overpriced for what you get.",
  "Average experience. Service slow during peak hours.",
  "Good idea, average execution."
];

const TAGS_POOL = ["service", "quality", "price", "staff", "ambience", "speed", "cleanliness"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomPhone() {
  const start = pick(["6", "7", "8", "9"]);
  let rest = "";
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  return `${start}${rest}`;
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000 + Math.floor(Math.random() * 1000 * 60 * 60));
}

async function main() {
  console.log("🌱 Seeding QR24x7...");

  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existingAdmin) {
    console.log(`  ✓ Admin already exists: ${existingAdmin.email} (password unchanged)`);
  } else {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 8) {
      throw new Error(
        "Set ADMIN_PASSWORD (8+ characters) before seeding a new admin. The old default password is not used."
      );
    }
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: "QR24x7 Admin",
        password: adminHash,
        role: "ADMIN",
        subscriptionTier: "AGENCY",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });
    console.log(`  ✓ Admin created: ${admin.email}`);
  }

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      name: "Rakesh Sharma",
      phone: "9876543210",
      password: demoHash,
      role: "USER",
      subscriptionTier: "GROWTH",
      subscriptionStatus: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    },
    update: {
      password: demoHash,
      subscriptionTier: "GROWTH",
      subscriptionStatus: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });
  console.log(`  ✓ Demo user: ${demoUser.email} / ${DEMO_PASSWORD}`);

  // Demo business
  const demoCafe = await prisma.business.upsert({
    where: { slug: "demo-cafe" },
    create: {
      ownerId: demoUser.id,
      name: "Spice Junction Café",
      slug: "demo-cafe",
      industry: "Café · Restaurant",
      description: "Authentic South Indian cuisine, since 1998",
      googleReviewUrl: "https://www.google.com/search?q=spice+junction+cafe",
      ratingThreshold: 4,
      reviewGating: false,
      primaryColor: "#1a73e8",
      whatsappNumber: "9876543210",
      email: DEMO_EMAIL,
      phone: "9876543210",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      address: "100 Feet Road, Indiranagar, Bengaluru",
      customThankYou:
        "We're sorry your experience wasn't up to mark. The owner will personally call you within 24 hours."
    },
    update: { reviewGating: false }
  });
  console.log(`  ✓ Demo business: ${demoCafe.slug}`);

  // Locations
  const indiranagar = await prisma.location.upsert({
    where: { businessId_slug: { businessId: demoCafe.id, slug: "indiranagar" } },
    create: {
      businessId: demoCafe.id,
      name: "Indiranagar (Main)",
      slug: "indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038"
    },
    update: {}
  });
  const koramangala = await prisma.location.upsert({
    where: { businessId_slug: { businessId: demoCafe.id, slug: "koramangala" } },
    create: {
      businessId: demoCafe.id,
      name: "Koramangala",
      slug: "koramangala",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034"
    },
    update: {}
  });
  console.log(`  ✓ 2 locations`);

  // Staff
  const staffData = [
    { name: "Arjun Kumar", role: "Server", locationId: indiranagar.id },
    { name: "Meera Lakshmi", role: "Manager", locationId: indiranagar.id },
    { name: "Sandeep Rao", role: "Server", locationId: koramangala.id },
    { name: "Pooja Sharma", role: "Barista", locationId: indiranagar.id }
  ];
  const staffMembers: any[] = [];
  for (const s of staffData) {
    const exists = await prisma.staff.findUnique({
      where: { businessId_slug: { businessId: demoCafe.id, slug: s.name.toLowerCase().replace(/\s+/g, "-") } }
    });
    if (!exists) {
      const created = await prisma.staff.create({
        data: {
          businessId: demoCafe.id,
          name: s.name,
          slug: s.name.toLowerCase().replace(/\s+/g, "-"),
          role: s.role,
          locationId: s.locationId
        }
      });
      staffMembers.push(created);
    } else {
      staffMembers.push(exists);
    }
  }
  console.log(`  ✓ ${staffMembers.length} staff`);

  // QR codes
  const qrData = [
    { type: "COUNTER" as const, label: "Front counter", code: "DEMO-CNTR" },
    { type: "TABLE" as const, label: "Table tents", code: "DEMO-TBL" },
    { type: "BILL" as const, label: "Bill receipts", code: "DEMO-BILL" },
    { type: "POSTER" as const, label: "Wall poster", code: "DEMO-PSTR" }
  ];
  for (const q of qrData) {
    await prisma.qRCode.upsert({
      where: { shortCode: q.code },
      create: {
        businessId: demoCafe.id,
        type: q.type,
        label: q.label,
        shortCode: q.code,
        scans: Math.floor(Math.random() * 200)
      },
      update: {}
    });
  }
  console.log(`  ✓ ${qrData.length} QR codes`);

  const demoPage = {
    bio: "Filter coffee, dosa, and a quiet corner in Indiranagar.",
    bioHi: "फ़िल्टर कॉफ़ी, डोसा, और एक शांत कोना।",
    theme: "coffee-house",
    links: [
      { key: "menu", type: "menu", labelEn: "View Menu", labelHi: "मेनू देखें", enabled: true, sort: 10, featured: true, url: "", emoji: "", schedule: null },
      { key: "order", type: "whatsapp_order", labelEn: "Order on WhatsApp", labelHi: "WhatsApp पर ऑर्डर", enabled: true, sort: 20, featured: true, url: "", emoji: "", schedule: null },
      { key: "feedback", type: "feedback", labelEn: "Give Feedback", labelHi: "प्रतिक्रिया दें", enabled: true, sort: 30, featured: true, url: "", emoji: "", schedule: null },
      { key: "upi", type: "upi", labelEn: "Pay by UPI", labelHi: "UPI से भुगतान", enabled: true, sort: 40, featured: false, url: "upi://pay?pa=spice@upi&pn=Spice%20Junction&cu=INR", emoji: "", schedule: null },
      { key: "wifi", type: "wifi", labelEn: "Wi-Fi", labelHi: "वाई-फाई", enabled: true, sort: 50, featured: false, url: "Network SpiceGuest · Password filtercoffee", emoji: "", schedule: null },
      { key: "offer", type: "offer", labelEn: "Today's offer", labelHi: "आज का ऑफ़र", enabled: true, sort: 60, featured: false, url: "Filter coffee and bun for ₹99 before 11am", emoji: "", schedule: null },
      { key: "instagram", type: "instagram", labelEn: "Instagram", labelHi: "Instagram", enabled: true, sort: 70, featured: false, url: "https://instagram.com/spicejunctioncafe", emoji: "", schedule: null },
      { key: "youtube", type: "youtube", labelEn: "Watch the café", labelHi: "कैफ़े देखें", enabled: true, sort: 80, featured: false, url: "https://youtu.be/aqz-KE-bpKQ", emoji: "", schedule: null },
      { key: "card", type: "vcard", labelEn: "Save contact", labelHi: "संपर्क सहेजें", enabled: true, sort: 90, featured: false, url: "", emoji: "", schedule: null }
    ],
    gallery: []
  };
  await prisma.tapPage.upsert({
    where: { businessId: demoCafe.id },
    create: { businessId: demoCafe.id, draft: demoPage, published: demoPage, publishedAt: new Date() },
    update: { draft: demoPage, published: demoPage, publishedAt: new Date() }
  });
  console.log("  ✓ Published tap page");

  const menuCount = await prisma.menuItem.count({ where: { businessId: demoCafe.id } });
  if (menuCount === 0) {
    const drinks = await prisma.menuCategory.create({
      data: { businessId: demoCafe.id, name: "Drinks", nameHi: "पेय", sortOrder: 0 }
    });
    const food = await prisma.menuCategory.create({
      data: { businessId: demoCafe.id, name: "Food", nameHi: "खाना", sortOrder: 1 }
    });
    await prisma.menuItem.createMany({
      data: [
        { businessId: demoCafe.id, categoryId: drinks.id, name: "Filter coffee", nameHi: "फ़िल्टर कॉफ़ी", pricePaise: 8000, veg: "VEG", sortOrder: 0 },
        { businessId: demoCafe.id, categoryId: food.id, name: "Masala dosa", nameHi: "मसाला डोसा", pricePaise: 12000, veg: "VEG", sortOrder: 0 }
      ]
    });
  }
  const demoQr = await prisma.qRCode.findUnique({ where: { shortCode: "DEMO-CNTR" }, select: { id: true } });
  await prisma.menuOrder.upsert({
    where: { number: "DEMO-1001" },
    create: {
      businessId: demoCafe.id,
      qrCodeId: demoQr?.id || null,
      number: "DEMO-1001",
      customerName: "Ananya",
      tableOrAddress: "Table 4",
      note: "Less sugar",
      totalPaise: 20000,
      items: [
        { name: "Filter coffee", qty: 1, linePaise: 8000 },
        { name: "Masala dosa", qty: 1, linePaise: 12000 }
      ],
      source: "qr",
      status: "NEW"
    },
    update: {}
  });
  console.log("  ✓ Menu and one sample order");

  // Tags
  for (const t of TAGS_POOL) {
    await prisma.feedbackTag.upsert({
      where: { businessId_name: { businessId: demoCafe.id, name: t } },
      create: { businessId: demoCafe.id, name: t, color: t === "price" ? "#f59e0b" : "#3b82f6" },
      update: {}
    });
  }

  // Skip if reviews already exist
  const existing = await prisma.review.count({ where: { businessId: demoCafe.id } });
  if (existing > 50) {
    console.log(`  ✓ Reviews already seeded (${existing}) — skipping`);
  } else {
    console.log("  ⏳ Generating reviews...");
    let count = 0;
    for (let i = 0; i < 120; i++) {
      const r = Math.random();
      const rating = r < 0.6 ? 5 : r < 0.78 ? 4 : r < 0.86 ? 3 : r < 0.94 ? 2 : 1;
      const sentiment: ReviewSentiment =
        rating >= 4 ? "POSITIVE" : rating === 3 ? "NEUTRAL" : "NEGATIVE";
      const redirected = rating >= 4 && Math.random() > 0.2;
      const customerName = Math.random() > 0.3 ? randomName() : null;
      const location = Math.random() > 0.4 ? indiranagar : koramangala;
      const staff = Math.random() > 0.5 ? pick(staffMembers) : null;
      const createdAt = daysAgo(Math.floor(Math.random() * 60));

      const review = await prisma.review.create({
        data: {
          businessId: demoCafe.id,
          locationId: location.id,
          staffId: staff?.id || null,
          rating,
          sentiment,
          redirected,
          source: pick(["qr", "link", "whatsapp", "email"]),
          customerName,
          customerPhone: customerName && Math.random() > 0.5 ? randomPhone() : null,
          customerEmail: customerName && Math.random() > 0.7 ? `${customerName.toLowerCase().replace(/\s+/g, ".")}@gmail.com` : null,
          createdAt,
          fingerprint: `seed-${i}`
        }
      });

      // Add feedback for non-redirected ones
      if (!redirected && Math.random() > 0.3) {
        const message =
          sentiment === "POSITIVE" ? pick(POSITIVE) : sentiment === "NEUTRAL" ? pick(NEUTRAL) : pick(NEGATIVE);
        const status: FeedbackStatus =
          sentiment === "POSITIVE"
            ? "RESOLVED"
            : pick(["NEW", "NEW", "IN_PROGRESS", "RESOLVED"]) as any;
        const feedback = await prisma.feedback.create({
          data: {
            reviewId: review.id,
            businessId: demoCafe.id,
            locationId: location.id,
            staffId: staff?.id || null,
            message,
            status,
            npsScore: rating >= 4 ? 9 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 7),
            createdAt
          }
        });
        // Random tags
        const tagCount = Math.floor(Math.random() * 3);
        const chosenTags = TAGS_POOL.sort(() => Math.random() - 0.5).slice(0, tagCount);
        for (const tName of chosenTags) {
          const tag = await prisma.feedbackTag.findFirst({
            where: { businessId: demoCafe.id, name: tName }
          });
          if (tag) {
            await prisma.feedbackTagOnFeedback.create({
              data: { feedbackId: feedback.id, tagId: tag.id }
            });
          }
        }
      }
      count++;
    }
    console.log(`  ✓ ${count} reviews + feedbacks`);
  }

  await ensureCatalogWith(prisma);
  console.log("  ✓ Hardware catalogue");

  console.log("\n✅ Seed complete!");
  console.log(`\n   Admin: ${ADMIN_EMAIL} (password is ADMIN_PASSWORD; unchanged if the user already existed)`);
  console.log(`   Demo:  ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`   Try:   http://localhost:3000/r/demo-cafe\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
