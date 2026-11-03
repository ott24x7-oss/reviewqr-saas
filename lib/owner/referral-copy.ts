function bonusDayQuantity(days: number, lang: "en" | "hi") {
  if (lang === "hi") return `${days} बोनस दिन`;
  return `${days} bonus ${days === 1 ? "day" : "days"}`;
}

function freeMonthQuantity(months: number, lang: "en" | "hi") {
  if (lang === "hi") return `${months} मुफ़्त ${months === 1 ? "महीना" : "महीने"}`;
  return `${months} free ${months === 1 ? "month" : "months"}`;
}

export function buildOwnerReferralShareText(
  link: string,
  bonusDaysForFriend: number,
  monthsPerReferral: number
) {
  const friendDays = Number.isFinite(bonusDaysForFriend) ? Math.max(0, Math.floor(bonusDaysForFriend)) : 0;
  const ownerMonths = Number.isFinite(monthsPerReferral) ? Math.max(0, Math.floor(monthsPerReferral)) : 0;

  const englishRewards = [
    friendDays > 0 ? `you get ${bonusDayQuantity(friendDays, "en")}` : "",
    ownerMonths > 0 ? `I get up to ${freeMonthQuantity(ownerMonths, "en")}` : ""
  ].filter(Boolean);
  const hindiRewards = [
    friendDays > 0 ? `उस बिज़नेस को ${bonusDayQuantity(friendDays, "hi")} ${friendDays === 1 ? "मिलेगा" : "मिलेंगे"}` : "",
    ownerMonths > 0 ? `मुझे अधिकतम ${freeMonthQuantity(ownerMonths, "hi")} ${ownerMonths === 1 ? "मिलेगा" : "मिलेंगे"}` : ""
  ].filter(Boolean);

  const englishOffer = englishRewards.length
    ? ` When your business buys a plan, ${englishRewards.join(" and ")}.`
    : "";
  const hindiOffer = hindiRewards.length
    ? ` आपका बिज़नेस प्लान लेने पर ${hindiRewards.join(" और ")}।`
    : "";

  return {
    en: `Join QR24x7 with my link.${englishOffer}${link ? `\n${link}` : ""}`,
    hi: `मेरे लिंक से QR24x7 से जुड़ें।${hindiOffer}${link ? `\n${link}` : ""}`
  };
}
