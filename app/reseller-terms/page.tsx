import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { AppLanguageProvider, AppText } from "@/components/app-ui/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "QR24x7 Reseller Terms",
  description: "Terms for QR24x7 resellers."
};

export default function ResellerTermsPage() {
  return (
    <AppLanguageProvider>
      <LegalPage
        eyebrow={<AppText en="QR24x7" hi="QR24x7" />}
        title={<AppText en="Reseller terms" hi="रीसेलर की शर्तें" />}
        intro={<AppText en="These terms explain how QR24x7 reseller commissions and payouts work." hi="इन शर्तों में QR24x7 रीसेलर कमीशन और पेआउट की जानकारी है।" />}
      >
        <p><AppText en="There is no joining fee. Applying does not guarantee approval or a particular amount of income." hi="जुड़ने की कोई फीस नहीं है। आवेदन से मंज़ूरी या किसी निश्चित कमाई की गारंटी नहीं मिलती।" /></p>
        <h2><AppText en="Commission" hi="कमीशन" /></h2>
        <p><AppText en="Commission is earned on eligible paid plan purchases and QR24x7 shop orders attributed to your reseller account. The active commission rules determine the amount. Commission examples shown in the app are estimates based on the settings shown when you view them." hi="आपके रीसेलर खाते से जुड़ी योग्य भुगतान वाली प्लान खरीद और QR24x7 शॉप ऑर्डर पर कमीशन मिलता है। कमीशन की राशि लागू नियम तय करते हैं। ऐप में दिखाए गए उदाहरण उस समय की सेटिंग के आधार पर अनुमान हैं।" /></p>
        <p><AppText en="Inviting or recruiting people does not earn a commission. Refunds, chargebacks, cancellations, or other reversals remove the related commission." hi="लोगों को आमंत्रित करने या जोड़ने पर कमीशन नहीं मिलता। रिफंड, चार्जबैक, रद्दीकरण या अन्य रिवर्सल से संबंधित कमीशन हटा दिया जाएगा।" /></p>
        <h2><AppText en="Payouts" hi="पेआउट" /></h2>
        <p><AppText en="Before payout, complete the payout details requested in your agent profile, including required identity and bank or UPI details. QR24x7 sends eligible payouts to the verified payout method after review and any required tax withholding." hi="पेआउट से पहले अपने एजेंट प्रोफ़ाइल में मांगी गई जानकारी भरें, जिसमें ज़रूरी पहचान और बैंक या UPI विवरण शामिल हैं। जाँच और लागू टैक्स कटौती के बाद योग्य पेआउट सत्यापित तरीके से भेजे जाते हैं।" /></p>
        <h2><AppText en="Changes and conduct" hi="बदलाव और आचरण" /></h2>
        <p><AppText en="QR24x7 may change commission rules for future sales and may pause or end reseller access for misuse. Existing commission records remain subject to their recorded sale terms and reversal rules." hi="QR24x7 भविष्य की बिक्री के लिए कमीशन नियम बदल सकता है और गलत इस्तेमाल पर रीसेलर पहुँच रोक या समाप्त कर सकता है। मौजूदा कमीशन रिकॉर्ड पर दर्ज बिक्री की शर्तें और रिवर्सल नियम लागू रहेंगे।" /></p>
      </LegalPage>
    </AppLanguageProvider>
  );
}
