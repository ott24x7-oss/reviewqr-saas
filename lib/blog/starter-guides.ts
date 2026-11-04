import type { PrismaClient } from "@prisma/client";

type Draft = { slug: string; locale: "en" | "hi"; title: string; description: string; bodyMarkdown: string; tags: string[]; translationKey: string };

const drafts: Draft[] = [
  {
    slug: "get-more-google-reviews-for-your-shop",
    locale: "en",
    title: "How to get more Google reviews for your shop (the right way)",
    description: "A practical, policy-safe way for Indian shops to invite honest Google reviews, make the link easy to find and learn from customer feedback.",
    translationKey: "google-reviews-shop",
    tags: ["Google reviews", "shops", "customer feedback"],
    bodyMarkdown: String.raw`## Start with a simple, fair invitation

Customers are busy, and many will not remember to review a shop unless you make the next step easy. You can remind customers to leave an honest review after a real visit or purchase. Use the same invitation for everyone, regardless of whether you think they are satisfied. A short sentence such as “If you have a moment, please share an honest review of your experience” is enough. Do not ask for five stars, suggest words to copy, or pressure someone to post while they are at the counter.

Google lets businesses share a review link or QR code. In your Google Business Profile, open the reviews area and choose the option to get more reviews, then copy the link. Google’s screen labels can change over time, so use the current help page if the menu looks different. Send the link in a thank-you message, include it on a receipt, or place a clearly labelled QR near checkout. A QR code should open your real review page, not a page that first asks the customer how happy they are.

## Make the request easy to act on

Keep the invitation close to the interaction it refers to. For a neighbourhood grocery shop, that may be a thank-you after a completed purchase. For a salon, it could be a follow-up after the appointment. For a clinic, use a neutral message after the visit and do not connect a review request with treatment decisions. For a restaurant, a receipt or follow-up message is less intrusive than asking a guest to stop eating and write a review in front of staff.

Use a direct, readable link on WhatsApp. Write one short line about what the link does, and make sure the message is sent only to customers who have agreed to receive that kind of message. If you print a QR, test it on both Android and iPhone cameras, check that it opens the correct business profile, and replace damaged signs. Keep a second way to find your shop, such as the name and address, in case the scan fails.

## Give every customer the same choice

Do not use a rating question to decide who gets the Google link. Sending only people who give four or five stars to Google and directing lower ratings to a private form is review gating. Google prohibits selectively soliciting positive reviews and discouraging negative ones. You may offer a private feedback form as an additional route, but the public review option should still be available to every customer. The customer chooses whether to write publicly, privately, or not at all.

Never offer cash, a discount, free goods, loyalty points, a lucky draw entry, or a service upgrade in return for a Google review. The same rule applies if the customer promises to change or remove a negative review. Do not ask staff to reach a review quota or to request specific words or staff names. Reviews should describe genuine experiences in the customer’s own words.

## Respond thoughtfully and protect privacy

Reply to reviews in a calm, specific way. Thank the reviewer for taking time to write. If they describe a problem, acknowledge it without arguing in public, then invite them to contact the shop through a private channel. Do not publish order numbers, phone numbers, health details, or other personal information in a reply. A thoughtful response can help a future customer understand how you handle feedback, even when you cannot resolve the issue in a public thread.

For a review that appears to violate Google’s content rules, use Google’s reporting process and provide factual context. Do not ask a customer to remove a review in exchange for a benefit. Google decides whether content breaks its policy; a business should not promise that a report will result in removal.

## Track the process, not a promised score

Choose a small routine your team can follow: keep the review link current, make the QR easy to see, and offer the same neutral invitation. Count invitations or link visits if that helps you find a broken step, but do not set pressure targets for individual staff. Read a sample of new reviews each week and note repeated themes such as stock availability, wait time, billing clarity, or opening hours. Use those themes to improve the shop, not to suppress criticism.

Google reviews can take time to appear and Google may filter contributions. A sudden increase is not a reliable goal, and no QR service can guarantee that a review will be published or improve your ranking. A consistent, honest request and a useful customer experience are the durable practices.

## A short weekly checklist

At the start of the week, ask one staff member to scan the sign and confirm the link still opens your shop’s profile. Check that the message is neutral and the same for all customers. At the end of the week, read a few new reviews and note one change you can make, such as clearer return hours or better stock information. If the same issue is raised more than once, discuss a practical fix with the team. Do not single out the reviewer, ask an employee to dispute criticism, or remove a customer benefit because of a review. This routine helps you use feedback while keeping the invitation voluntary and fair.`
  },
  {
    slug: "whatsapp-ordering-for-restaurants-without-commission",
    locale: "en",
    title: "WhatsApp ordering setup for restaurants without commission",
    description: "Set up a direct restaurant ordering flow in India with a current menu, clear delivery limits, WhatsApp confirmation and transparent costs.",
    translationKey: "whatsapp-ordering-restaurants",
    tags: ["WhatsApp", "restaurants", "ordering"],
    bodyMarkdown: String.raw`## Decide what the order flow should do

A simple WhatsApp ordering setup starts with a menu and a way for the customer to send an item list to your restaurant. The message can carry item names, quantities, variants and a pickup or delivery note. Your staff still confirms availability, the final amount, delivery timing and payment. Treat the message as an enquiry until your team accepts the order; a customer tapping a button does not mean the kitchen has accepted it.

Write down which orders you can reliably handle. Decide whether the link is for takeaway, dine-in, local delivery, or all three. Set practical service hours, a delivery radius, a minimum order if you use one, and a backup phone number. If you close ordering during a rush, tell customers when the next response is likely. A clear limit is more useful than promising delivery everywhere.

## Prepare a menu people can actually use

Start with the items customers order most often rather than uploading every old catalogue line. Give each item a familiar name, a current price, and a short description. Add sizes or variants as separate choices when the price changes. Mark common additions clearly. If you list vegetarian or non-vegetarian items, use labels consistently and verify them with the kitchen. Keep allergen information accurate and do not guess when a customer asks about an ingredient.

Photos should help customers identify the dish and should represent what you serve. Compress large images before uploading so the menu loads on mobile data. Remove items that are permanently unavailable and update temporary stock changes. In India, customers may compare menu prices with the bill, so make it clear whether a listed price includes taxes or whether any additional charges apply under your restaurant’s billing practice.

## Set up WhatsApp and order confirmation

Use a WhatsApp number that the staff can monitor during your advertised hours. Test the order link from a phone that is not signed in to your business account. Check that the message opens in WhatsApp, the restaurant name is clear, and the item list is readable. If you use a catalogue or QR page, add instructions for substitutions, delivery address, landmark, and preferred payment only where those details are needed.

Create a repeatable confirmation message. Staff can confirm the items in stock, final total, estimated preparation time, pickup point or delivery fee, and payment method. If an item is unavailable, ask before substituting. Do not send an unsolicited payment link until the customer has seen and accepted the final amount. Reconcile UPI payments against the transaction record; a screenshot alone is not proof that money reached the account.

## Understand what “no commission” means

Direct ordering can avoid a marketplace’s per-order commission when the order is placed with your own business. It does not mean the operation has no cost. A QR or menu service may charge a subscription, a printer may charge for stands, and a payment provider, delivery partner, data plan or messaging service may have separate fees. Read each provider’s current terms. Compare the complete cost with the customer reach and delivery support a marketplace provides.

The trade-off is discovery. A direct QR is useful for regular guests, people at your counter and customers who already know your restaurant. It does not automatically list you in a marketplace search. Some restaurants use both: marketplaces for discovery and direct ordering for repeat customers or pickup. Keep prices and availability consistent across every channel you choose to maintain.

## Protect customer details and measure carefully

Ask only for information needed to fulfil the order. Tell customers if a phone number or address will be retained for delivery records, and follow your privacy obligations. Do not add every person who messages you to a promotional broadcast list without permission. Keep access to the shared business device limited to staff who need it, and agree how unresolved orders are handed over between shifts.

Review the order log at the end of a shift. Look for missed replies, incomplete addresses, frequent substitutions and menu items that cause confusion. Track accepted and completed orders separately from enquiries, because an opened WhatsApp message is not a sale. Use the patterns to adjust menu wording and staffing. Test the flow after every menu or number change, and scan the printed QR before ordering new signs.

## Test with a real shift

Before sharing the link widely, run a few test orders with staff and cancel them clearly so they do not enter the kitchen queue as real purchases. Then pilot the page for one shift with a small sign at the counter. Agree on who watches messages during lunch and dinner, and how staff will mark an order as accepted, ready or cancelled. Review whether the menu shows the right choices and whether the message includes the details your team actually needs. If staff copy information into another system, check for transcription mistakes. Make a short change list after the pilot and repeat the scan test before adding more QR signs.`
  },
  {
    slug: "nfc-vs-qr-code-stands",
    locale: "en",
    title: "NFC vs QR code stands: which should you use?",
    description: "Compare NFC tap stands and QR codes for Indian shops, restaurants and service businesses, including phone support, placement and upkeep.",
    translationKey: "nfc-vs-qr-stands",
    tags: ["NFC", "QR codes", "business setup"],
    bodyMarkdown: String.raw`## The short answer: use the method customers can open

A QR code is a pattern a phone camera can scan. NFC is a small wireless tag that a compatible phone can read when it is brought close. Both can open the same web page, review link or menu. A QR code works on most modern smartphones with a camera and usually needs no special setup. NFC can be faster for a tap, but support and the exact tap area vary by phone. For many Indian counters, a stand that offers both gives customers a choice.

Before buying anything, decide which page should open. It could be your digital menu, business page, Google review link or WhatsApp contact. Test the destination and make sure the page is yours to update. A printed QR that points to a permanent URL is easier to maintain than one that depends on an unowned short link.

## Where QR is a good fit

QR works well when a sign can be seen and held steady: restaurant tables, shop counters, product packaging, bills, appointment cards and posters. It can be printed at different sizes. The code needs enough contrast, a clear margin around it and a label explaining what happens after scanning. Avoid placing it on reflective surfaces, curved bottles, dark glass or a cluttered background. If the QR is too small or the camera cannot focus, customers may give up.

Use a QR generator that creates a scannable code with sufficient error correction. Do not put a logo over so much of the code that it becomes unreadable. Print a test copy at the final size and scan it from several phones and distances. Keep a short written link or business name nearby as a backup. If the QR opens a page that changes over time, make sure you can still edit that page after the sign is printed.

## Where NFC helps

NFC is convenient for a quick tap at a counter or table. A phone with NFC enabled can open the tag’s web address when it is close enough. The tag itself does not provide internet access; the phone still needs a working data connection or Wi-Fi to load the page. Some phones may require the screen to be awake or may position the reader in a different place. A customer who does not know where to tap may need a small “Tap phone here” label.

NFC tags can be rewritten or locked depending on the hardware and how they are programmed. Use tags from a reliable supplier, verify the saved URL after programming, and avoid writing sensitive information to an open tag. If a stand has a QR plus NFC chip, check that both open the same destination. A tag that points to the wrong page can quietly send customers somewhere unexpected.

## Compare costs and upkeep

QR printing is inexpensive and works without a chip, but a damaged print must be replaced. NFC adds the cost of the tag and a programming step, and some customers may not have compatible settings or may simply prefer scanning. A combined stand costs more than a paper sign but offers both choices in one place. Include design, shipping and replacement costs in your decision rather than comparing only the tag price.

Dynamic QR services can let you change a destination without printing again, but this depends on the provider keeping the redirect active. Ask whether you own the destination, what happens if you cancel, and whether analytics collect customer data. With static QR, the URL is encoded directly and cannot be changed after printing. Choose based on how often the destination might change and how much control you require.

## A practical rollout

Start with one counter or table. Print a small batch, label it in plain language, and ask staff to test it at opening each day. Watch a few customers use the sign only to find practical barriers such as glare, height, or confusing instructions; do not pressure customers to leave reviews. Offer both methods where possible. Measure scans or page visits to check whether placement works, and review orders or enquiries separately. Replace signs that are faded, keep the web page current, and include a non-QR contact option for customers who prefer it.

## Choose a destination you can maintain

Use a page address you control and keep a copy of the URL in your business records. If the sign is placed on a table, mark the table number separately rather than encoding a one-time web address that staff cannot maintain. Keep a spare print file and note the date the code was last tested. If a supplier programs NFC tags for you, ask them to show the saved address and explain whether the tag can be updated. Store the tag destination securely. These details matter when a manager changes, a phone is replaced, or a location moves, because the stand should continue to point customers to the correct current page.`
  },
  {
    slug: "digital-menu-with-qr-code-guide",
    locale: "en",
    title: "Digital menu with QR code: a complete guide",
    description: "Build a mobile friendly QR menu for an Indian restaurant or cafe with accurate prices, readable item details and a simple update routine.",
    translationKey: "digital-menu-qr-guide",
    tags: ["digital menu", "QR menu", "restaurants"],
    bodyMarkdown: String.raw`## Plan the menu around a customer’s visit

A digital menu is useful when a customer can find an item, understand its price and decide what to do next without asking a staff member to decode the page. Organise the menu into familiar groups such as breakfast, snacks, meals, beverages or desserts. Put frequently ordered items near the top. Use names customers recognise, and add a short description when a dish has a regional name, a choice of size or a preparation detail that affects the order.

Decide whether the QR should open a read-only menu, a cart, a WhatsApp order, or a table ordering flow. Explain the next step before customers reach the end. If orders are confirmed by staff, say so. A digital menu alone does not guarantee that a dish is available, so give your team a simple way to update sold-out items during the day.

## Enter prices and item details carefully

Check every item against the current printed menu or billing system before publishing. Show pack size, portion, add-ons and variants when they change the price. Avoid vague labels such as “market price” unless customers are told how to confirm it. Make any taxes, packaging charges or delivery fees clear using the same approach as your normal menu and bill. If you list an offer, include the eligibility and end date so an old promotion does not surprise a customer.

For India’s varied food preferences, label vegetarian and non-vegetarian choices consistently and check the label against the recipe. If you state that a dish contains nuts, dairy, gluten or another ingredient, verify it with the kitchen and supplier. Do not claim a dish is safe for an allergy unless you can control cross-contact and confirm that claim. When unsure, tell the customer to speak with staff before ordering.

## Make it readable on a phone

Most guests scan while standing at a counter or sitting across a table, often on mobile data. Keep the page narrow, use readable text, and avoid making every item depend on a large photo. Compress images and use a stable connection. Give pictures descriptive text where possible, and do not rely on colour alone to distinguish categories or availability. A menu should be usable with screen readers, keyboard controls and zoom.

Write item descriptions in plain language. If customers use Hindi, Kannada, Tamil, Marathi or another local language, consider including the terms they use to ask for dishes. Keep product names consistent with what staff call them. Make the QR label say “View menu” or “Scan for today’s menu” rather than leaving a customer to guess. Include the restaurant name or a short URL in case the QR cannot be scanned.

## Choose how to take orders

For WhatsApp, show the customer which items and details will be sent. Ask for an address or table number only when needed. Staff should confirm availability, final amount and estimated time. For dine-in, confirm whether guests order at the counter, through staff, or from the table. A QR page should not imply that an order is accepted before the restaurant confirms it.

If a marketplace is also used, assign someone to keep prices and stock aligned across channels. Direct WhatsApp orders can avoid a marketplace commission, but your plan, delivery, payment or messaging provider may still charge fees. A marketplace can provide discovery or logistics. Choose the channel based on your capacity and actual costs, not on the word “free.”

## Keep it current

Assign one person to own menu changes. Update a price before a new menu cycle starts, remove items you no longer prepare, and mark temporary stock changes promptly. Scan the QR after changing its destination. Once a month, compare a sample of menu items with the bill, check that links still open, and review the page on a low-end Android phone. Ask staff where customers get stuck, then fix that step. The best menu is the one your team can maintain reliably and customers can use without confusion.

## A practical launch checklist

Ask a staff member who did not build the page to find a popular item, understand its price and explain how to order it. If they cannot do that quickly, simplify the category names or description. Test links on mobile data, not only on the restaurant’s Wi-Fi. Keep the QR away from spills, heat and direct glare. Put a clear contact method on the same page for questions about availability. During the first week, compare a handful of bills with the online menu and correct mismatches promptly. A short daily review is often enough for a small team and prevents an outdated menu from becoming a source of avoidable customer frustration.

Plan for an internet or power interruption too. Keep a small printed menu, a short URL, or a staff member who can take orders directly. If the menu provider is unavailable, customers should still know how to order. Make a backup plan that does not depend on a guest installing an app, creating an account or sharing unnecessary personal information. Review it when you test the QR each month.`
  },
  {
    slug: "ask-customers-for-reviews-google-rules",
    locale: "en",
    title: "How to ask customers for reviews without breaking Google’s rules",
    description: "Invite genuine, balanced Google reviews without incentives, pressure or rating based routing. Includes a safe request script for Indian businesses.",
    translationKey: "ask-for-reviews-google-policy",
    tags: ["Google policy", "reviews", "customer service"],
    bodyMarkdown: String.raw`## Ask for an honest account of a real visit

Google reviews should reflect a genuine experience with the business. You may remind customers to leave a review using a Google link or QR code. Keep the request neutral: “If you would like, please share an honest review about your visit. Feedback helps us understand what worked and what we can improve.” Do not ask for a positive review, a particular star rating, or a sentence that mentions a product or staff member.

Give customers a choice. A review is voluntary, and people may decide not to write one. Avoid standing over a customer while they type, repeatedly asking after they decline, or making service conditional on a review. Do not set a quota that pressures employees to solicit a certain number of reviews. A consistent invitation that any customer can receive is easier to explain and fairer to the people you serve.

## Do not offer a reward for a review

Do not give a discount, free item, cash, loyalty points, contest entry, upgrade or other benefit in exchange for writing, changing or removing a Google review. This includes asking someone to revise a negative review for a reward. You can run a loyalty programme for purchases, visits or referrals, but make it independent of whether a customer writes a review and what the review says. A benefit that is described as optional can still influence a review if it is tied to posting one.

Do not ask only customers you believe are pleased to post publicly. A short satisfaction survey can help your team understand service quality, but it must not determine whether a customer gets the public review link. Routing lower star ratings to private feedback while sending higher ratings to Google is review gating. A private feedback form can be offered as an additional option to everyone, but it should not replace the public review route based on rating or sentiment.

## Use a simple request across channels

In a shop, place a small “Share an honest review” QR near the exit or on the receipt. In a restaurant, include the link on a receipt or in a neutral follow-up. A salon can send one polite message after the appointment. A clinic should keep the request separate from care decisions and avoid exposing patient information. For WhatsApp, send only messages permitted by your customer communication practices. Do not add customers to promotions just because they completed an order.

Test the link with a staff device before using it. Check that it opens the right Google Business Profile, the business name and location are clear, and the QR is readable at its final printed size. If you have multiple branches, use the link for the correct branch. Tell the customer what the link opens. Keep a telephone or map option available for people who cannot scan.

## Handle feedback with care

Read critical feedback without trying to identify or punish the reviewer. A public reply should be brief, respectful and focused on next steps. Thank the customer, acknowledge the concern and offer a suitable private contact route. Do not share a person’s phone number, purchase details, medical information or other private facts in the reply. If you believe a review breaks Google’s policy, report it through Google’s official process and provide factual evidence. Google decides whether the review should be removed.

Ask staff to listen and record recurring operational problems such as long queues, unclear prices or unavailable items. Do not ask them to coach customers toward positive language. A review prompt should not include a pre-written review that the customer can post as their own. If you help a customer understand how to find the review form, let them write in their own words.

## A safe script to put into practice

“Thank you for visiting [business name]. If you have a moment, you can share an honest review here: [Google link]. It is completely up to you. You can also tell us privately at [contact].” Use the public link for every customer who receives the message, and keep the private contact available to anyone. Do not add “please give us five stars” or mention a reward.

Keep the routine measurable without manipulating reviews. Check that staff are using the current link, look for themes in feedback, and respond on time. Do not promise a rating increase or a certain number of reviews. Google may filter contributions and its rules can change, so review the official Business Profile Help guidance periodically.

## Check the process when your team changes

Show new staff the neutral request and explain that it is for every customer, not only a particular rating. Make sure they know not to read a review aloud, stand beside a customer while they write, or offer a discount for posting. Put the correct branch link in the approved message template and remove old versions from shared devices. If you use a printed QR, label its destination in an internal inventory so a manager can replace it later. This handover reduces accidental pressure and broken links, especially when a shop has several branches or seasonal staff.`
  },
  {
    slug: "dukaan-ke-google-reviews-sahi-tarika",
    locale: "hi",
    title: "दुकान के लिए ज़्यादा Google रिव्यू कैसे पाएँ (सही तरीके से)",
    description: "भारतीय दुकानों के लिए ईमानदार Google रिव्यू का निमंत्रण देने, लिंक साझा करने और ग्राहक फ़ीडबैक से सीखने का नीति-सुरक्षित तरीका।",
    translationKey: "google-reviews-shop",
    tags: ["Google रिव्यू", "दुकान", "ग्राहक फ़ीडबैक"],
    bodyMarkdown: String.raw`## सरल और सबके लिए समान निमंत्रण दें

ग्राहक व्यस्त रहते हैं और कई बार दुकान का अनुभव उन्हें रिव्यू लिखने की याद नहीं रहता। असली खरीदारी या विज़िट के बाद आप हर ग्राहक को ईमानदार रिव्यू लिखने की विनम्र याद दिला सकते हैं। निमंत्रण इस बात पर निर्भर नहीं होना चाहिए कि आपको ग्राहक का अनुभव अच्छा लगा या नहीं। “अगर समय हो, तो अपने अनुभव के बारे में ईमानदार रिव्यू साझा करें” जैसी छोटी बात काफ़ी है। पाँच स्टार माँगना, लिखने के लिए शब्द बताना या काउंटर पर खड़े-खड़े दबाव डालना ठीक नहीं है।

Google Business Profile से रिव्यू लिंक या QR साझा किया जा सकता है। अपने प्रोफ़ाइल में रिव्यू वाला भाग खोलें और ज़्यादा रिव्यू पाने का विकल्प चुनकर लिंक कॉपी करें। Google के मेनू के नाम समय के साथ बदल सकते हैं, इसलिए विकल्प अलग दिखे तो मौजूदा सहायता पेज देखें। लिंक धन्यवाद संदेश, रसीद या काउंटर के पास लगे QR पर दें। QR सीधे आपके असली Google प्रोफ़ाइल पर खुले, पहले यह न पूछे कि ग्राहक कितना खुश था।

## ग्राहक के लिए अगला कदम आसान करें

निमंत्रण उसी समय के आसपास भेजें जब सेवा या खरीद पूरी हुई हो। किराना दुकान में खरीदारी के बाद धन्यवाद संदेश, सैलून में अपॉइंटमेंट के बाद विनम्र संदेश और रेस्तराँ में रसीद के साथ लिंक उपयुक्त हो सकता है। क्लिनिक में रिव्यू अनुरोध को इलाज के निर्णय से अलग रखें। मेहमान खाना खा रहा हो तो उससे वहीं रिव्यू लिखवाने की ज़िद करने के बजाय बाद में लिंक देना कम दखल देने वाला है।

WhatsApp पर सीधा और समझ में आने वाला लिंक भेजें। एक पंक्ति में बताएँ कि लिंक किसलिए है। ग्राहक से इस तरह के संदेश पाने की अनुमति और अपनी संचार प्रक्रिया का ध्यान रखें। QR छापने पर Android और iPhone कैमरे से जाँचें, सही दुकान का प्रोफ़ाइल खुलना चाहिए और प्रिंट फटा या फीका न हो। स्कैन न होने पर दुकान का नाम और पता खोजने का दूसरा तरीका भी दें।

## हर ग्राहक को समान विकल्प दें

रेटिंग पूछकर यह तय न करें कि Google लिंक किसे दिखेगा। केवल चार या पाँच स्टार चुनने वालों को Google भेजना और कम रेटिंग वालों को निजी फ़ॉर्म पर भेजना रिव्यू गेटिंग है। Google चुनिंदा सकारात्मक रिव्यू माँगने और नकारात्मक रिव्यू हतोत्साहित करने की अनुमति नहीं देता। निजी फ़ीडबैक फ़ॉर्म अतिरिक्त विकल्प हो सकता है, पर सार्वजनिक रिव्यू का रास्ता हर ग्राहक के लिए उपलब्ध रहे। ग्राहक तय करे कि वह सार्वजनिक लिखना चाहता है, निजी संदेश देना चाहता है या कुछ नहीं करना चाहता।

Google रिव्यू के बदले नकद, छूट, मुफ़्त सामान, लॉयल्टी पॉइंट, लकी ड्रॉ में मौका या बेहतर सेवा न दें। नकारात्मक रिव्यू बदलने या हटाने के बदले भी कोई लाभ न दें। कर्मचारियों के लिए रिव्यू की संख्या का लक्ष्य न रखें और उनसे ग्राहक को खास शब्द या कर्मचारी का नाम लिखवाने को न कहें। रिव्यू ग्राहक के असली अनुभव और अपने शब्दों में होना चाहिए।

## जवाब दें और निजता का ध्यान रखें

रिव्यू का जवाब शांत और स्पष्ट भाषा में दें। लिखने के लिए धन्यवाद कहें। समस्या बताई गई हो तो सार्वजनिक बहस के बजाय उसे स्वीकार करें और निजी संपर्क का रास्ता दें। जवाब में ऑर्डर नंबर, फ़ोन, स्वास्थ्य जानकारी या निजी विवरण न लिखें। अच्छी प्रतिक्रिया भी आपके काम की हो सकती है और आलोचना भी। भविष्य के ग्राहक यह देख सकते हैं कि दुकान शिकायत पर कैसे जवाब देती है।

अगर कोई रिव्यू Google के नियम तोड़ता दिखे तो Google के रिपोर्ट विकल्प का उपयोग करें और तथ्य दें। किसी लाभ के बदले रिव्यू हटाने को न कहें। रिव्यू नियम तोड़ता है या नहीं, यह Google तय करता है; रिपोर्ट करने से हटने की गारंटी नहीं होती।

## रेटिंग के बजाय काम की प्रक्रिया देखें

टीम के लिए आसान दिनचर्या रखें: लिंक सही हो, QR साफ़ दिखे और हर ग्राहक को एक जैसा निष्पक्ष निमंत्रण मिले। लिंक खुलने की संख्या देखें यदि उससे QR की जगह या लिंक की खराबी समझने में मदद मिले, लेकिन कर्मचारी पर रिव्यू का दबाव न डालें। हफ़्ते में नए रिव्यू पढ़ें और बार-बार दिखने वाली बातों पर ध्यान दें, जैसे सामान उपलब्धता, इंतज़ार, बिल की स्पष्टता या दुकान का समय। इन बातों से सेवा सुधारें, शिकायत छिपाएँ नहीं।

Google रिव्यू दिखने में समय लग सकता है और Google कुछ योगदानों को फ़िल्टर कर सकता है। अचानक बहुत सारे रिव्यू पाना लक्ष्य नहीं है। कोई QR सेवा रिव्यू प्रकाशित होने या खोज में रैंक बढ़ने की गारंटी नहीं दे सकती। ईमानदार निमंत्रण और उपयोगी ग्राहक अनुभव लंबे समय में बेहतर तरीका है।

## दुकान के लिए एक आसान साप्ताहिक तरीका

रिव्यू लिंक को बिल, पैकेट या काउंटर पर रखें, लेकिन ग्राहक को रोककर लिखवाने की कोशिश न करें। QR के पास साफ़ शब्द लिखें कि वह Google पर दुकान का पेज खोलता है। लिंक को किसी दूसरे फ़ोन से खोलकर देखें और पुष्टि करें कि सही शाखा सामने आती है। अगर दुकान के कई पते हैं, तो हर शाखा का अलग लिंक और प्रिंट रखें। छोटे व्यवसाय में एक व्यक्ति को लिंक और प्रिंट की जाँच सौंपना पर्याप्त हो सकता है।

हर सप्ताह रिव्यू में आए विषयों को नोट करें। उदाहरण के लिए ग्राहक को दुकान ढूँढ़ने में कठिनाई हुई, भुगतान का तरीका स्पष्ट नहीं था या लोकप्रिय सामान उपलब्ध नहीं था। किसी व्यक्ति की निजी जानकारी अपनी टीम की साझा सूची में न लिखें। समस्या सुधारने के बाद परिणाम देखें, पर किसी ग्राहक से अपना रिव्यू बदलने की मांग न करें। सार्वजनिक जवाब में अपनी बात शांत और संक्षिप्त रखें। यदि मामला बिल या ऑर्डर का है, तो ग्राहक को निजी संपर्क दें और व्यक्तिगत विवरण सार्वजनिक रूप से न पूछें। इस तरह रिव्यू सीखने का साधन बनते हैं और ग्राहक पर सकारात्मक बात लिखने का दबाव नहीं पड़ता।`
  },
  {
    slug: "restaurant-whatsapp-ordering-bina-commission",
    locale: "hi",
    title: "बिना कमीशन के रेस्तराँ के लिए WhatsApp ऑर्डरिंग कैसे सेट करें",
    description: "भारत में रेस्तराँ का सीधा WhatsApp ऑर्डर तरीका बनाएँ: सही मेनू, डिलीवरी सीमा, पुष्टि और साफ़ लागत के साथ।",
    translationKey: "whatsapp-ordering-restaurants",
    tags: ["WhatsApp", "रेस्तराँ", "ऑर्डर"],
    bodyMarkdown: String.raw`## पहले तय करें कि ऑर्डर कैसे चलेगा

WhatsApp ऑर्डर के सरल तरीके में ग्राहक मेनू देखता है और आइटम की सूची रेस्तराँ को भेजता है। संदेश में आइटम का नाम, मात्रा, विकल्प और पिकअप या डिलीवरी की जानकारी हो सकती है। उपलब्धता, अंतिम राशि, तैयारी का समय और भुगतान की पुष्टि आपकी टीम करती है। बटन दबाकर संदेश भेजना यह नहीं बताता कि रसोई ने ऑर्डर स्वीकार कर लिया है; ग्राहक को साफ़ बताएं कि पुष्टि का इंतज़ार करें।

लिख लें कि आपकी टीम कौन-से ऑर्डर संभाल सकती है। तय करें कि लिंक टेकअवे, डाइन-इन, स्थानीय डिलीवरी या इन सभी के लिए है। सेवा समय, डिलीवरी का क्षेत्र, न्यूनतम ऑर्डर और संपर्क नंबर स्पष्ट रखें। व्यस्त समय में ऑर्डर बंद हों तो ग्राहक को बताएं कि जवाब कब मिलेगा। जितना आप संभाल सकें उतना ही वादा करें।

## ऐसा मेनू तैयार करें जिसे फ़ोन पर पढ़ना आसान हो

पहले वे आइटम जोड़ें जो ग्राहक अक्सर माँगते हैं। हर आइटम का जाना-पहचाना नाम, मौजूदा कीमत और छोटा विवरण दें। साइज़ या विकल्प से कीमत बदलती हो तो उन्हें अलग चुनने दें। शाकाहारी और मांसाहारी लेबल लगातार एक जैसे रखें और रसोई से जाँचें। एलर्जी के बारे में सही जानकारी दें; सामग्री पक्की न हो तो अनुमान लगाकर जवाब न दें।

फ़ोटो ग्राहक को व्यंजन पहचानने में मदद करे और असली परोसे जाने वाले आइटम जैसी हो। बड़ी फ़ोटो कम करें ताकि मोबाइल डेटा पर मेनू जल्दी खुले। जो आइटम अब नहीं बनते उन्हें हटाएँ और कुछ समय के लिए खत्म हों तो उपलब्धता अपडेट करें। भारत में बिल और मेनू की कीमत में अंतर ग्राहक को चौंका सकता है, इसलिए बताएं कि कीमत में टैक्स शामिल हैं या कोई अन्य शुल्क लग सकता है।

## WhatsApp और ऑर्डर की पुष्टि सेट करें

ऐसा नंबर रखें जिसे टीम आपके बताए समय में देखती हो। किसी दूसरे फ़ोन से ऑर्डर लिंक खोलकर जाँचें कि WhatsApp खुलता है, रेस्तराँ का नाम साफ़ है और आइटम सूची पढ़ी जा सकती है। कैटलॉग या QR पेज में विकल्प, डिलीवरी पता, लैंडमार्क और भुगतान का तरीका तभी पूछें जब उसकी ज़रूरत हो।

टीम के लिए एक पुष्टि संदेश बनाएं। स्टाफ़ स्टॉक, अंतिम राशि, अनुमानित तैयारी समय, पिकअप जगह या डिलीवरी शुल्क और भुगतान तरीका बता सकता है। कोई आइटम न हो तो विकल्प देने से पहले ग्राहक से पूछें। अंतिम राशि ग्राहक को बताए और उसकी सहमति के बाद ही भुगतान लिंक भेजें। UPI भुगतान को लेन-देन रिकॉर्ड से जाँचें; स्क्रीनशॉट अकेले यह साबित नहीं करता कि रकम खाते में पहुँची।

## “कमीशन नहीं” का मतलब समझें

अपने कारोबार से सीधे आया ऑर्डर किसी मार्केटप्लेस के प्रति ऑर्डर कमीशन से बच सकता है। इसका मतलब यह नहीं कि काम बिना खर्च के होगा। QR या मेनू सेवा का प्लान, प्रिंटेड स्टैंड, भुगतान सेवा, डिलीवरी पार्टनर, इंटरनेट या संदेश सेवा अलग शुल्क ले सकती है। हर सेवा की मौजूदा शर्तें पढ़ें। पूरी लागत की तुलना उस ग्राहक पहुँच और डिलीवरी मदद से करें जो मार्केटप्लेस देता है।

सीधे ऑर्डर का समझौता नए ग्राहक खोजने का नहीं है। काउंटर के पास, नियमित मेहमानों और आपके रेस्तराँ को पहले से जानने वालों के लिए QR उपयोगी है। इससे आप अपने आप मार्केटप्लेस खोज में नहीं जुड़ते। कुछ रेस्तराँ नए ग्राहक पाने के लिए मार्केटप्लेस रखते हैं और नियमित ग्राहकों या पिकअप के लिए सीधे WhatsApp का तरीका देते हैं। जिन चैनलों का उपयोग करते हैं उनमें कीमत और उपलब्धता मिलती-जुलती रखें।

## ग्राहक की जानकारी सुरक्षित रखें

ऑर्डर पूरा करने के लिए जितनी जानकारी चाहिए उतनी ही माँगें। अगर फ़ोन या पता डिलीवरी रिकॉर्ड के लिए रखा जाएगा तो ग्राहक को बताएं और अपनी निजता ज़िम्मेदारियों का पालन करें। हर संदेश भेजने वाले को बिना अनुमति प्रचार सूची में न जोड़ें। साझा फ़ोन तक पहुँच उन्हीं स्टाफ़ को दें जिन्हें उसकी ज़रूरत है और शिफ़्ट बदलने पर अधूरे ऑर्डर की ज़िम्मेदारी तय रखें।

शिफ़्ट के अंत में ऑर्डर देखें। छूटे हुए जवाब, अधूरे पते, बार-बार बदले गए आइटम और भ्रमित करने वाले मेनू विवरण नोट करें। स्वीकार और पूरे हुए ऑर्डर को पूछताछ से अलग गिनें, क्योंकि WhatsApp खुलना बिक्री नहीं है। मेनू या नंबर बदलने के बाद QR स्कैन करके पूरी प्रक्रिया जाँचें।

## भुगतान और डिलीवरी की सीमा साफ़ रखें

WhatsApp पर बातचीत शुरू होना अपने आप में भुगतान या ऑर्डर की पुष्टि नहीं है। ग्राहक को बताएं कि भुगतान किस तरीके से होगा, किस नाम पर पैसा भेजना है और भुगतान की पुष्टि कौन करेगा। UPI का स्क्रीनशॉट आने पर अपने खाते में राशि जाँचें; केवल संदेश देखकर ऑर्डर तैयार न करें। कैश ऑन डिलीवरी, पिकअप और होम डिलीवरी की उपलब्धता अलग-अलग लिखें। जहाँ डिलीवरी पार्टनर इस्तेमाल होता है, वहाँ उसका शुल्क और ग्राहक को मिलने वाला अनुमान स्पष्ट करें।

छोटा मेनू पहले से तैयार रखें जिसमें लोकप्रिय आइटम, सही मात्रा और उपलब्ध विकल्प हों। किसी आइटम की जगह दूसरा आइटम देना हो तो पहले ग्राहक से पूछें। ऑर्डर बंद होने पर ग्राहक को कुल राशि और अनुमानित समय दोबारा भेजें। व्यस्त समय में जवाब देर से आएगा तो स्वचालित स्वागत संदेश में संचालन के घंटे बता दें। ऐसा संदेश न लिखें जिससे लगे कि तुरंत जवाब या डिलीवरी की गारंटी है। एक सप्ताह के ऑर्डर देखकर समझें कि कौन से समय पर अतिरिक्त स्टाफ़ या अलग पिकअप व्यवस्था चाहिए।`
  },
  {
    slug: "nfc-vs-qr-stand-hindi",
    locale: "hi",
    title: "NFC बनाम QR कोड स्टैंड: कौन सा इस्तेमाल करें?",
    description: "भारतीय दुकानों और रेस्तराँ के लिए NFC टैप और QR कोड की तुलना: फ़ोन सपोर्ट, जगह, लागत और रखरखाव सहित।",
    translationKey: "nfc-vs-qr-stands",
    tags: ["NFC", "QR Code", "कारोबार सेटअप"],
    bodyMarkdown: String.raw`## वही तरीका चुनें जिसे ग्राहक खोल सके

QR कोड ऐसा पैटर्न है जिसे फ़ोन कैमरे से स्कैन किया जाता है। NFC एक छोटा वायरलेस टैग है जिसे संगत फ़ोन पास लाने पर पढ़ता है। दोनों एक ही वेब पेज, रिव्यू लिंक या मेनू खोल सकते हैं। QR ज़्यादातर आधुनिक फ़ोन कैमरों पर बिना खास सेटिंग के चलता है। NFC टैप जल्दी हो सकता है, लेकिन फ़ोन और टैग की जगह के अनुसार अनुभव बदल सकता है। भारतीय दुकान के काउंटर पर दोनों विकल्प वाला स्टैंड कई ग्राहकों के लिए सुविधाजनक है।

पहले तय करें कि पेज में क्या खुलेगा: डिजिटल मेनू, बिज़नेस पेज, Google रिव्यू लिंक या WhatsApp संपर्क। पेज आपका हो और अपडेट किया जा सके। छपा QR किसी ऐसे लिंक पर न हो जिसका मालिकाना किसी और का हो या जो सेवा बंद होने पर काम न करे।

## QR कहाँ अच्छा काम करता है

जहाँ बोर्ड साफ़ दिखे और फ़ोन स्थिर रखा जा सके, वहाँ QR उपयोगी है: रेस्तराँ की टेबल, दुकान का काउंटर, पैकेजिंग, बिल, अपॉइंटमेंट कार्ड और पोस्टर। QR में अच्छा कंट्रास्ट और चारों ओर खाली जगह रखें। उसे चमकदार सतह, गोल बोतल, गहरे शीशे या भीड़भाड़ वाले बैकग्राउंड पर न रखें। कोड बहुत छोटा हो या कैमरा फोकस न कर पाए तो ग्राहक कोशिश छोड़ सकता है।

ऐसा QR जनरेटर लें जो पढ़ने योग्य कोड बनाए। लोगो को इतना बड़ा न रखें कि कोड ढक जाए। अंतिम आकार पर प्रिंट निकालकर कई फ़ोन और अलग दूरी से जाँचें। कोड के पास लिखा लिंक या दुकान का नाम बैकअप हो सकता है। पेज समय के साथ बदलता हो तो सुनिश्चित करें कि छपाई के बाद भी आप उस पेज को संपादित कर पाएँ।

## NFC कब मदद करता है

काउंटर या टेबल पर जल्दी टैप के लिए NFC सुविधाजनक हो सकता है। NFC चालू संगत फ़ोन टैग के करीब लाने पर उसका वेब पता खोलता है। टैग इंटरनेट नहीं देता; पेज लोड करने के लिए फ़ोन में डेटा या वाई-फ़ाई चाहिए। कुछ फ़ोन में स्क्रीन चालू करनी पड़ सकती है और रीडर की जगह अलग हो सकती है। ग्राहक को टैप की जगह न पता हो तो “यहाँ फ़ोन टैप करें” का छोटा संकेत दें।

टैग के प्रकार पर निर्भर करता है कि उसे दोबारा लिखा जा सकता है या लॉक करना होगा। भरोसेमंद सप्लायर से टैग लें, प्रोग्राम करने के बाद URL जाँचें और संवेदनशील जानकारी खुले टैग पर न रखें। QR और NFC वाले स्टैंड में दोनों एक ही पेज खोलने चाहिए। गलत टैग ग्राहक को बिना बताए दूसरी जगह भेज सकता है।

## लागत और रखरखाव की तुलना करें

QR छापना सस्ता है और उसमें चिप नहीं लगती, लेकिन प्रिंट खराब हो तो बदलना होगा। NFC में टैग और उसे सेट करने का खर्च है, और हर ग्राहक की फ़ोन सेटिंग या आदत अलग हो सकती है। दोनों वाला स्टैंड कागज़ी साइन से महँगा है, पर ग्राहक को दोनों विकल्प देता है। केवल टैग की कीमत नहीं; डिज़ाइन, डिलीवरी और बदलने का खर्च भी जोड़ें।

डायनामिक QR से बिना नया प्रिंट छपवाए लिंक बदल सकते हैं, पर यह सेवा के चालू रहने पर निर्भर करता है। पूछें कि लिंक आपका रहेगा या नहीं और सेवा बंद करने पर क्या होगा। स्टैटिक QR में सीधा URL होता है जिसे छपाई के बाद बदला नहीं जा सकता। तय करें कि पेज कितनी बार बदल सकता है और आपको कितना नियंत्रण चाहिए।

## छोटे स्तर पर शुरू करें

पहले एक काउंटर या टेबल पर स्टैंड रखें। छोटा बैच छापें, साफ़ भाषा में उसका काम लिखें और रोज़ खुलने पर टीम से जाँच करवाएँ। ग्राहक को समीक्षा लिखने का दबाव दिए बिना देखें कि जगह, चमक या निर्देश में कोई बाधा तो नहीं। जहाँ संभव हो QR और NFC दोनों दें। स्कैन या पेज विज़िट से पता करें कि जगह सही है या नहीं। पेज अपडेट रखें और उन ग्राहकों के लिए फ़ोन या सीधे संपर्क का तरीका भी दें जो स्कैन नहीं करना चाहते।

## किसे चुनें: एक सरल निर्णय

यदि आपके ग्राहक अक्सर फोन कैमरा इस्तेमाल करते हैं और कोड को साफ़ जगह पर लगा सकते हैं, तो QR से शुरुआत करें। इसे बनाना और कई जगह छापना आसान है। यदि काउंटर पर तेज़ टैप उपयोगी है, तो QR के साथ NFC जोड़ें। इससे किसी एक तरीके पर निर्भरता नहीं रहती। महंगे स्टैंड खरीदने से पहले एक नमूना लगाकर कुछ दिन उपयोग करें और देखें कि ग्राहक बिना मदद के पेज खोल पाते हैं या नहीं।

स्टाफ़ को हर ग्राहक को तरीका बताना चाहिए, पर किसी ग्राहक से रिव्यू लिखने का आग्रह बार-बार नहीं करना चाहिए। संकेत ऐसा हो सकता है: “मेनू या जानकारी के लिए स्कैन करें; चाहें तो फोन टैप करें।” यदि पेज पर Google रिव्यू लिंक है, तो उसे सभी ग्राहकों के लिए समान रूप से उपलब्ध रखें और निजी फ़ीडबैक को एक अतिरिक्त विकल्प की तरह दिखाएँ। कम रेटिंग के कारण किसी व्यक्ति से सार्वजनिक विकल्प न छिपाएँ।

ट्रैफ़िक और पहुंच भी निर्णय में शामिल करें। बेसमेंट, ग्रामीण इलाक़े या कमजोर मोबाइल नेटवर्क वाली जगह में ऑफ़लाइन मेनू, छपा कार्ड या स्टाफ़ से पूछने का विकल्प उपयोगी रहता है। टैप या स्कैन के लिए इंटरनेट चाहिए, इसलिए संकेत में अकेला डिजिटल रास्ता न छोड़ें। हर महीने साफ़ करें कि प्रिंट पढ़ने योग्य है, टैग सही पेज खोलता है और पेज का संपर्क नंबर वर्तमान है।`
  },
  {
    slug: "qr-code-digital-menu-hindi-guide",
    locale: "hi",
    title: "QR Code वाला डिजिटल मेनू: पूरी गाइड",
    description: "भारतीय रेस्तराँ और कैफ़े के लिए मोबाइल पर पढ़ने योग्य QR मेनू बनाएँ: सही कीमत, साफ़ जानकारी और आसान अपडेट के साथ।",
    translationKey: "digital-menu-qr-guide",
    tags: ["डिजिटल मेनू", "QR मेनू", "रेस्तराँ"],
    bodyMarkdown: String.raw`## मेनू को ग्राहक की विज़िट के हिसाब से सजाएँ

डिजिटल मेनू तब उपयोगी है जब ग्राहक आइटम ढूँढ़ सके, कीमत समझ सके और आगे क्या करना है यह जान सके। मेनू को परिचित हिस्सों में रखें जैसे नाश्ता, स्नैक्स, भोजन, पेय या मिठाई। जो आइटम ज़्यादा ऑर्डर होते हैं उन्हें ऊपर रखें। परिचित नाम लिखें और क्षेत्रीय नाम, साइज़ या कीमत बदलने वाले विकल्प के बारे में छोटी जानकारी दें।

तय करें कि QR पढ़ने के लिए मेनू, कार्ट, WhatsApp ऑर्डर या टेबल ऑर्डर खोलेगा। अगला कदम पहले से बताएँ। अगर स्टाफ़ ऑर्डर की पुष्टि करेगा तो यह साफ़ लिखें। डिजिटल मेनू अपने आप यह नहीं बता सकता कि कोई व्यंजन उपलब्ध है या नहीं, इसलिए दिन में बिक चुके आइटम को बदलने का आसान तरीका रखें।

## कीमत और आइटम का विवरण ध्यान से भरें

प्रकाशित करने से पहले हर आइटम को मौजूदा छपे मेनू या बिलिंग सिस्टम से मिलाएँ। साइज़, मात्रा, ऐड-ऑन और वेरिएंट से कीमत बदलती हो तो साफ़ दिखाएँ। “बाज़ार भाव” जैसे अस्पष्ट शब्द तभी लिखें जब ग्राहक को बताएँ कि कीमत कैसे पूछनी है। टैक्स, पैकेजिंग या डिलीवरी शुल्क की जानकारी अपने बिलिंग तरीके से मेल खाते हुए दें। ऑफ़र लिखते समय उसकी शर्तें और आख़िरी तारीख भी दें ताकि पुराना ऑफ़र ग्राहक को भ्रमित न करे।

भारत में खानपान की अलग-अलग पसंद को ध्यान में रखते हुए शाकाहारी और मांसाहारी संकेत लगातार सही रखें। अगर किसी व्यंजन में नट्स, दूध, ग्लूटेन या अन्य सामग्री लिखते हैं तो रसोई और सप्लायर से जाँचें। एलर्जी वाले ग्राहक के लिए सुरक्षित होने का दावा तब तक न करें जब तक सामग्री और क्रॉस-कॉन्टैक्ट पर भरोसे से नियंत्रण न हो। शक हो तो ग्राहक को ऑर्डर से पहले स्टाफ़ से पूछने को कहें।

## फ़ोन पर पढ़ने लायक बनाएँ

अधिकतर ग्राहक टेबल या काउंटर पर मोबाइल डेटा से QR स्कैन करते हैं। पेज को संकरा और पढ़ने योग्य रखें और हर आइटम को बड़ी फ़ोटो पर निर्भर न बनाएं। फ़ोटो का आकार कम करें और स्थिर इंटरनेट सेवा चुनें। जहाँ संभव हो तस्वीर का विवरण दें। आइटम या उपलब्धता को केवल रंग से अलग न दिखाएँ। मेनू स्क्रीन रीडर, कीबोर्ड और ज़ूम के साथ भी इस्तेमाल किया जा सके।

आइटम का विवरण आसान भाषा में लिखें। ग्राहक हिंदी, कन्नड़, तमिल, मराठी या किसी और स्थानीय भाषा में पूछते हों तो मेनू में वे परिचित नाम भी रखें। आइटम के नाम उस नाम से मिलें जो स्टाफ़ बोलता है। QR के पास “मेनू देखें” या “आज का मेनू स्कैन करें” लिखें। कोड स्कैन न हो तो रेस्तराँ का नाम या छोटा लिंक दें।

## ऑर्डर का तरीका चुनें

WhatsApp के लिए ग्राहक को दिखाएँ कि कौन-से आइटम और जानकारी संदेश में जाएँगे। पता या टेबल नंबर तभी पूछें जब ज़रूरत हो। डाइन-इन में बताएं कि ग्राहक काउंटर पर ऑर्डर करेगा, स्टाफ़ से या टेबल से। QR पेज से यह न लगे कि रेस्तराँ ने पुष्टि से पहले ही ऑर्डर स्वीकार कर लिया है।

अगर मार्केटप्लेस भी इस्तेमाल करते हैं तो किसी कर्मचारी को कीमत और स्टॉक मिलाने की ज़िम्मेदारी दें। सीधे WhatsApp ऑर्डर मार्केटप्लेस कमीशन से बचा सकते हैं, पर मेनू प्लान, डिलीवरी, भुगतान या संदेश सेवा का अलग शुल्क हो सकता है। मार्केटप्लेस नए ग्राहक या डिलीवरी सेवा दे सकता है। “मुफ़्त” शब्द के बजाय असली लागत और आपकी क्षमता से चैनल चुनें।

## मेनू को मौजूदा रखें

एक व्यक्ति को मेनू बदलाव की ज़िम्मेदारी दें। नई कीमत लागू होने से पहले उसे बदलें, बंद आइटम हटाएँ और कुछ समय के लिए स्टॉक खत्म हो तो उपलब्धता जल्दी अपडेट करें। QR बदलने के बाद उसे स्कैन करके जाँचें। महीने में एक बार मेनू की कीमतें बिल से मिलाएँ, लिंक खोलकर देखें और कम कीमत वाले Android फ़ोन पर पेज चलाएँ। स्टाफ़ से पूछें कि ग्राहक कहाँ अटकते हैं, फिर वही कदम सुधारें। अच्छा मेनू वह है जिसे टीम नियमित रूप से अपडेट कर सके और ग्राहक बिना उलझन इस्तेमाल करें।

## बदलाव के बाद जाँच करें

मेनू में कीमत, डिलीवरी क्षेत्र या ऑर्डर का तरीका बदलने पर पेज और WhatsApp संदेश दोनों जाँचें। किसी ऐसे कर्मचारी से टेस्ट कराएँ जिसने पेज नहीं बनाया है: क्या वह लोकप्रिय आइटम ढूँढ़ सकता है, कीमत समझ सकता है और ऑर्डर का अगला कदम बता सकता है? अगर नहीं, तो श्रेणी का नाम या निर्देश सरल करें। लिंक केवल रेस्तराँ के वाई-फ़ाई पर नहीं, मोबाइल डेटा पर भी खोलें। QR को पानी, तेल और सीधी चमक से दूर रखें।

पहले सप्ताह कुछ बिलों को ऑनलाइन मेनू से मिलाएँ। गलत कीमत दिखे तो उसे जल्दी ठीक करें और टीम को बदलाव बताएँ। ग्राहक के सवालों से पता चल सकता है कि पोर्शन, मसाला स्तर, समय या उपलब्धता के बारे में अधिक विवरण चाहिए। हर सवाल को लंबा विवरण बनाकर न जोड़ें; जो जानकारी निर्णय में मदद करती है उसी को शामिल करें। पेज पर फ़ोन या स्टाफ़ से पूछने का तरीका रखें ताकि विशेष अनुरोध या एलर्जी की जानकारी पर ग्राहक को सही मदद मिले।`
  },
  {
    slug: "google-ke-niyam-ke-andar-review-kaise-mange",
    locale: "hi",
    title: "Google के नियम तोड़े बिना ग्राहकों से रिव्यू कैसे माँगें",
    description: "बिना इनाम, दबाव या रेटिंग के आधार पर रास्ता बदले Google रिव्यू का निमंत्रण दें। भारतीय कारोबार के लिए सुरक्षित संदेश का नमूना।",
    translationKey: "ask-for-reviews-google-policy",
    tags: ["Google नीति", "रिव्यू", "ग्राहक सेवा"],
    bodyMarkdown: String.raw`## असली अनुभव के बारे में ईमानदार बात माँगें

Google रिव्यू कारोबार के साथ असली अनुभव पर आधारित होना चाहिए। आप ग्राहक को Google लिंक या QR से रिव्यू लिखने की याद दिला सकते हैं। निमंत्रण निष्पक्ष रखें: “अगर समय हो, तो अपनी विज़िट के बारे में ईमानदार रिव्यू साझा करें। इससे हमें समझने में मदद मिलती है कि क्या अच्छा रहा और क्या सुधारें।” सकारात्मक रिव्यू, खास स्टार रेटिंग या किसी तय वाक्य की माँग न करें।

ग्राहक को विकल्प दें। रिव्यू उसकी मर्ज़ी से लिखा जाना चाहिए और वह न लिखने का निर्णय भी ले सकता है। ग्राहक लिख रहा हो तो उसके ऊपर खड़े न रहें, मना करने के बाद बार-बार न कहें और सेवा को रिव्यू से न जोड़ें। कर्मचारियों के लिए रिव्यू की संख्या का लक्ष्य न रखें। हर ग्राहक को मिलने वाला एक जैसा विनम्र निमंत्रण समझाना आसान और निष्पक्ष है।

## रिव्यू के बदले कोई इनाम न दें

Google रिव्यू लिखने, बदलने या हटाने के बदले छूट, मुफ़्त सामान, नकद, लॉयल्टी पॉइंट, प्रतियोगिता में मौका, अपग्रेड या कोई अन्य लाभ न दें। इसमें नकारात्मक रिव्यू को इनाम के बदले बदलने का कहना भी शामिल है। खरीद, विज़िट या रेफ़रल पर लॉयल्टी प्रोग्राम चल सकता है, लेकिन उसे रिव्यू लिखने या उसकी बात से न जोड़ें। ग्राहक को “वैकल्पिक” कहने पर भी रिव्यू से जुड़ा लाभ उसकी राय को प्रभावित कर सकता है।

केवल उन ग्राहकों को सार्वजनिक रिव्यू लिखने के लिए न कहें जिन्हें आप खुश समझते हैं। सेवा सुधारने के लिए छोटा सर्वे किया जा सकता है, पर उससे यह तय नहीं होना चाहिए कि ग्राहक को सार्वजनिक लिंक मिलेगा या नहीं। कम रेटिंग को निजी फ़ीडबैक में भेजना और अधिक रेटिंग को Google भेजना रिव्यू गेटिंग है। निजी फ़ीडबैक सभी के लिए अतिरिक्त विकल्प हो सकता है, पर रेटिंग या भाव के आधार पर सार्वजनिक रास्ता न रोकें।

## अलग-अलग तरीकों से सरल अनुरोध करें

दुकान में बाहर निकलने के पास या रसीद पर “ईमानदार रिव्यू साझा करें” वाला QR रखें। रेस्तराँ रसीद या सामान्य धन्यवाद संदेश में लिंक दे सकता है। सैलून अपॉइंटमेंट के बाद एक विनम्र संदेश भेज सकता है। क्लिनिक में रिव्यू अनुरोध को इलाज से अलग रखें और मरीज़ की जानकारी सार्वजनिक न करें। WhatsApp संदेश अपनी ग्राहक-संपर्क प्रक्रिया के अनुसार भेजें। ऑर्डर पूरा करने से ग्राहक को प्रचार संदेश भेजने की अनुमति अपने आप नहीं मिलती।

उपयोग से पहले लिंक कर्मचारी के फ़ोन से जाँचें। सही Google Business Profile खुलना चाहिए और नाम व शाखा समझ में आनी चाहिए। कई शाखाएँ हों तो उसी शाखा का लिंक दें। QR अपने छपे आकार पर पढ़ा जा सके। ग्राहक को बताएँ कि लिंक कहाँ खुलेगा और स्कैन न कर पाने वालों के लिए फ़ोन या पता खोजने का तरीका रखें।

## फ़ीडबैक का सावधानी से जवाब दें

आलोचनात्मक प्रतिक्रिया पढ़कर रिव्यू लिखने वाले को पहचानने या सज़ा देने की कोशिश न करें। सार्वजनिक जवाब छोटा, सम्मानजनक और अगले कदम पर केंद्रित रखें। ग्राहक को धन्यवाद दें, चिंता स्वीकार करें और निजी संपर्क दें। जवाब में फ़ोन नंबर, बिल, इलाज या किसी व्यक्ति का निजी विवरण न लिखें। अगर रिव्यू Google की नीति तोड़ता दिखे तो Google के आधिकारिक विकल्प से रिपोर्ट करें और तथ्य दें। हटाने का फ़ैसला Google करता है।

कर्मचारियों को कतार, अस्पष्ट कीमत, स्टॉक खत्म या सेवा में देरी जैसी बार-बार होने वाली दिक्कतें नोट करने को कहें। ग्राहक से सकारात्मक शब्द लिखवाने की ट्रेनिंग न दें। ग्राहक के नाम से पोस्ट करने के लिए तैयार रिव्यू टेक्स्ट न दें। अगर ग्राहक को फ़ॉर्म ढूँढ़ने में मदद चाहिए तो बताएं कहाँ क्लिक करना है; लिखना उसके अपने शब्दों में रहे।

## इस्तेमाल के लिए सुरक्षित संदेश

“[दुकान का नाम] आने के लिए धन्यवाद। अगर समय हो तो यहाँ ईमानदार रिव्यू साझा कर सकते हैं: [Google लिंक]। यह पूरी तरह आपकी मर्ज़ी है। आप चाहें तो हमें निजी तौर पर [संपर्क] पर भी बता सकते हैं।” जिसे भी संदेश मिलता है उसे सार्वजनिक लिंक दें और निजी संपर्क का विकल्प सबके लिए खुला रखें। “पाँच स्टार दें” या इनाम का ज़िक्र न जोड़ें।

दबाव बनाए बिना प्रक्रिया देखें। लिंक सही है या नहीं, टीम समय पर जवाब देती है या नहीं और ग्राहक बार-बार किस समस्या का ज़िक्र करते हैं, यह जाँचें। रेटिंग बढ़ने या तय संख्या में रिव्यू की गारंटी न दें। Google कुछ रिव्यू फ़िल्टर कर सकता है और नियम बदल सकते हैं, इसलिए आधिकारिक Business Profile सहायता जानकारी समय-समय पर देखें।

## संदेश और जगह का चयन

दुकान के लिए बिल या काउंटर पर QR उपयोगी हो सकता है। रेस्तराँ में बिल के साथ छोटा संकेत दें। सैलून में अपॉइंटमेंट के बाद एक विनम्र संदेश भेजा जा सकता है। क्लिनिक में मरीज की देखभाल और रिव्यू निमंत्रण को अलग रखें; किसी बीमारी, उपचार या मरीज की पहचान का संकेत सार्वजनिक उत्तर में न दें। WhatsApp का उपयोग करते समय ग्राहक की अपेक्षा और संचार संबंधी ज़िम्मेदारियों का ध्यान रखें। एक समीक्षा संदेश को प्रचार सूची में जोड़ने की अनुमति न मानें।

संदेश में ब्रांड की भाषा हो, पर उसमें ग्राहक को तैयार वाक्य कॉपी करके पोस्ट करने को न कहें। उदाहरण: “आज आने के लिए धन्यवाद। यदि आप चाहें, तो यहाँ अपने अनुभव के बारे में ईमानदार रिव्यू साझा कर सकते हैं: [लिंक]। आप हमें निजी तौर पर [संपर्क] पर भी बता सकते हैं।” अगर ग्राहक मना करे तो वहीं रुकें। स्टाफ़ को यह भी सिखाएँ कि वे ग्राहक का फोन पकड़कर समीक्षा न लिखें और न ही यह पूछें कि उसने कितने सितारे दिए।

रिव्यू की संख्या से अधिक उपयोगी संकेत यह है कि दुकान समय पर जवाब देती है और दोहराई गई समस्याओं को ठीक करती है। शिकायत का समाधान करने के बाद ग्राहक को रिव्यू संपादित करने के लिए न कहें। सार्वजनिक जवाब में धन्यवाद, समस्या की संक्षिप्त स्वीकृति और सहायता का निजी रास्ता पर्याप्त है। इससे प्रक्रिया सरल और निष्पक्ष रहती है।`
  }
];

export async function addStarterGuides(client: Pick<PrismaClient, "blogPost">): Promise<number> {
  const result = await client.blogPost.createMany({
    data: drafts.map((draft) => ({ ...draft, status: "DRAFT" as const, authorName: "QR24x7" })),
    skipDuplicates: true
  });
  return result.count;
}