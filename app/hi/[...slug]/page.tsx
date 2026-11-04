import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomePage from "@/app/page";
import FeaturesPage from "@/app/features/page";
import HowItWorksPage from "@/app/how-it-works/page";
import PricingPage from "@/app/pricing/page";
import DemoPage from "@/app/demo/page";
import PlanPage from "@/app/plans/[slug]/page";
import AboutPage from "@/app/about/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import RefundPage from "@/app/refund/page";
import { LegalPage } from "@/components/marketing/legal-page";
import { SEO_STATIC_ROUTES, buildSeoMetadata, planSeoDescription, planSeoTitle, routeDescription } from "@/lib/seo";
import { listPublicPlans } from "@/lib/plans/public";
import { formatRupees } from "@/lib/landing/money";

export const dynamic = "force-dynamic";

type Params = { slug?: string[] };

function routeFromParams(params: Params) {
  const tail = params.slug?.length ? `/${params.slug.join("/")}` : "/";
  return tail === "/" ? "/" : tail;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const path = routeFromParams(params);
  const route = SEO_STATIC_ROUTES.find((item) => item.path === path);
  if (route) {
    return buildSeoMetadata({ path, locale: "hi", title: route.titleHi, description: routeDescription(path, "hi"), translated: route.translated });
  }
  const planMatch = path.match(/^\/plans\/([a-z0-9-]+)$/);
  if (planMatch) {
    const plan = (await listPublicPlans().catch(() => [])).find((item) => item.slug === planMatch[1]);
    if (!plan) return { title: "प्लान नहीं मिला", robots: { index: false, follow: false } };
    return buildSeoMetadata({ path, locale: "hi", title: planSeoTitle(plan.nameHi, plan.modules, "hi"), description: planSeoDescription(plan.nameHi, plan.descriptionHi, "hi"), image: plan.imageUrl, ogContext: plan.prices[0] ? `${formatRupees(plan.prices[0].pricePaise)} · ${plan.nameHi}` : plan.nameHi });
  }
  return { title: "पेज नहीं मिला", robots: { index: false, follow: false } };
}

export default async function HindiMarketingPage({ params }: { params: Params }) {
  const path = routeFromParams(params);
  if (path === "/") return <HomePage />;
  if (path === "/features") return <FeaturesPage />;
  if (path === "/how-it-works") return <HowItWorksPage />;
  if (path === "/pricing") return <PricingPage />;
  if (path === "/demo") return <DemoPage />;
  if (path === "/about") return <AboutPage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;
  if (path === "/refund") return <RefundPage />;
  if (path === "/reseller-terms") return <LegalPage locale="hi" path="/reseller-terms" breadcrumbName="रीसेलर की शर्तें" eyebrow="QR24x7" title="रीसेलर की शर्तें" intro="इन शर्तों में QR24x7 रीसेलर कमीशन और पेआउट की जानकारी है।">
    <p>जुड़ने की कोई फ़ीस नहीं है। आवेदन से मंज़ूरी या किसी निश्चित कमाई की गारंटी नहीं मिलती।</p>
    <h2>कमीशन</h2>
    <p>आपके रीसेलर खाते से जुड़ी योग्य भुगतान वाली प्लान खरीद और QR24x7 शॉप ऑर्डर पर कमीशन मिलता है। कमीशन की राशि लागू नियम तय करते हैं। ऐप में दिखाए गए उदाहरण उस समय की सेटिंग के आधार पर अनुमान हैं।</p>
    <p>लोगों को आमंत्रित करने या जोड़ने पर कमीशन नहीं मिलता। रिफंड, चार्जबैक, रद्दीकरण या अन्य रिवर्सल से संबंधित कमीशन हटा दिया जाएगा।</p>
    <h2>पेआउट</h2>
    <p>पेआउट से पहले अपने एजेंट प्रोफ़ाइल में मांगी गई जानकारी भरें, जिसमें ज़रूरी पहचान और बैंक या UPI विवरण शामिल हैं। जाँच और लागू टैक्स कटौती के बाद योग्य पेआउट सत्यापित तरीके से भेजे जाते हैं।</p>
    <h2>बदलाव और आचरण</h2>
    <p>QR24x7 भविष्य की बिक्री के लिए कमीशन नियम बदल सकता है और गलत इस्तेमाल पर रीसेलर पहुँच रोक या समाप्त कर सकता है। मौजूदा कमीशन रिकॉर्ड पर दर्ज बिक्री की शर्तें और रिवर्सल नियम लागू रहेंगे।</p>
  </LegalPage>;
  const planMatch = path.match(/^\/plans\/([a-z0-9-]+)$/);
  if (planMatch) return <PlanPage params={{ slug: planMatch[1] }} searchParams={{}} />;
  notFound();
}
