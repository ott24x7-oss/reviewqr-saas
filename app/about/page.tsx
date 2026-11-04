import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { buildSeoMetadata, routeDescription, SEO_STATIC_ROUTES } from "@/lib/seo";
import { getRequestLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/about", title: SEO_STATIC_ROUTES[4].titleEn, description: routeDescription("/about", "en") });
}

export default function AboutPage() {
  const locale = getRequestLocale();
  if (locale === "hi") return <LegalPage locale="hi" path="/about" breadcrumbName="हमारे बारे में" eyebrow="हमारी कहानी" title="भारत के छोटे व्यवसायों के लिए बना" intro="QR24x7 हर ग्राहक को एक ही स्क्रीन पर सार्वजनिक रिव्यू लिंक और निजी संदेश का विकल्प देता है।">
    <h2>हमने QR24x7 क्यों बनाया</h2>
    <p>अच्छे अनुभव के बाद कई ग्राहक रिव्यू देना भूल जाते हैं, जबकि खराब अनुभव वाले ग्राहक अपनी बात सिर्फ़ सार्वजनिक रूप से कह पाते हैं। एक QR से हर ग्राहक दोनों विकल्प देख सकता है। वे Google या Trustpilot पर सार्वजनिक रिव्यू दे सकते हैं और व्यवसाय मालिक को निजी फ़ीडबैक भी भेज सकते हैं। कम रेटिंग के साथ नोट आने पर मालिक को सूचना मिलती है। सार्वजनिक लिंक हर ग्राहक को दिखता है।</p>
    <h2>हमारी सोच</h2>
    <ul>
      <li><strong>सादगी सबसे ज़रूरी है।</strong> दुकान मालिक फ़ोन से कुछ मिनटों में बिना ट्रेनिंग के इसे सेट कर सके।</li>
      <li><strong>फ़ीडबैक सुधार का अवसर है।</strong> निजी संदेश से आप ग्राहक का अनुभव बेहतर कर सकते हैं। इसे सार्वजनिक रिव्यू लिंक छिपाने या रिव्यू के बदले इनाम देने के लिए इस्तेमाल नहीं किया जाता।</li>
      <li><strong>भारत के लिए बना।</strong> UPI से भुगतान, WhatsApp सूचना और रुपये में कीमतें हमारे प्रोडक्ट का हिस्सा हैं।</li>
    </ul>
    <h2>यह किनके लिए है</h2>
    <p>भारत के कैफ़े, सैलून, क्लिनिक, दुकान, रेस्टोरेंट, जिम और सेवा व्यवसायों के लिए — जो ग्राहकों से आमने-सामने मिलते हैं और उनसे Google या Trustpilot पर ईमानदार रिव्यू पाना चाहते हैं।</p>
    <h2>हमसे बात करें</h2>
    <p>सवाल, सुझाव या साझेदारी का विचार हो तो हमसे संपर्क करें। हमारी टीम जवाब देगी।</p>
  </LegalPage>;
  return (
    <LegalPage path="/about"
      eyebrow="Our story"
      title="Built for Indian small businesses"
      intro="QR24x7 shows every customer a public review link and a private note, on the same screen and in the same order."
    >
      <h2>Why we built QR24x7</h2>
      <p>
        A customer who had a good visit often leaves without posting, and a customer who had a bad one
        may only say so in public. One QR gives every customer both choices. Whatever star they tap,
        they see the Google or Trustpilot link and a private form. A low rating with a written note
        alerts the owner, and the public link stays on that same screen.
      </p>

      <h2>What we believe</h2>
      <ul>
        <li><strong>Simple beats powerful.</strong> A shop owner should set this up in minutes, from a phone, with no training.</li>
        <li><strong>Feedback is a gift.</strong> A private note helps you fix a visit. It is never a reason to hide the public review link, or to offer a reward for posting one.</li>
        <li><strong>Made for India.</strong> UPI-first billing, WhatsApp alerts, and pricing in rupees — not an afterthought bolted onto a US product.</li>
      </ul>

      <h2>Who it's for</h2>
      <p>
        Cafés, salons, clinics, retail stores, restaurants, gyms, and service businesses across India —
        anyone who meets customers in person and wants more (and better) Google &amp; Trustpilot reviews without chasing them.
      </p>

      <h2>Say hello</h2>
      <p>
        Questions, feedback, or partnership ideas? We'd love to hear from you — reach us any time and a
        real person will reply.
      </p>
    </LegalPage>
  );
}
