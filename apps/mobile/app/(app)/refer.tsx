import { Screen } from "../../src/ui/screen";
import type { OwnerReferralHome } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { Gift, Share2 } from "lucide-react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { PrimaryButton, SecondaryButton } from "../../src/ui/buttons";
import { useTheme } from "../../src/ui/theme";
import { buildReferralShareText, formatReferralDate, projectedExpiryDisplay, stageForReward } from "../../src/referral/presentation";
import type { Palette } from "../../src/ui/tokens";

function referralStageLabel(stage: OwnerReferralHome["referrals"][number]["stage"], t: ReturnType<typeof useI18n>["t"]) {
  switch (stageForReward(stage)) {
    case "INVITED": return t.referralStageInvited;
    case "PAID": return t.referralStagePaid;
    case "REWARD_ADDED": return t.referralStageRewardAdded;
    case "REVERSED": return t.referralStageReversed;
    default: return t.referralStageSignedUp;
  }
}

function stageTone(stage: OwnerReferralHome["referrals"][number]["stage"], palette: Palette) {
  const normalized = stageForReward(stage);
  if (normalized === "REWARD_ADDED") return { backgroundColor: palette.accentSoft, color: palette.success };
  if (normalized === "REVERSED") return { backgroundColor: palette.surface2, color: palette.danger };
  if (normalized === "PAID") return { backgroundColor: palette.surface2, color: palette.warning };
  return { backgroundColor: palette.accentSoft, color: palette.deep };
}

function ReferScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { user } = useSession();
  const home = useQuery({
    queryKey: accountKey(user?.id ?? "", "refer"),
    enabled: !!user,
    queryFn: () => apiData<OwnerReferralHome>("/api/v1/refer")
  });
  const data = home.data;
  const link = data?.link || "";
  const shareText = data ? buildReferralShareText(data.shareText, lang) : "";
  const pendingCount = data?.referrals.filter((row) => row.stage === "PAID").length ?? 0;
  const capRatio = data && data.maxMonthsPerYear > 0
    ? Math.max(0, Math.min(1, data.monthsEarnedThisYear / data.maxMonthsPerYear))
    : 0;

  async function shareWhatsApp() {
    if (!shareText) return;
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    await Linking.openURL(whatsapp).catch(() => Share.share({ message: shareText }).catch(() => undefined));
  }

  async function copyLink() {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    Alert.alert(t.referralLinkCopied);
  }

  const labels = {
    INVITED: t.referralStageInvited,
    SIGNED_UP: t.referralStageSignedUp,
    PAID: t.referralStagePaid,
    REWARD_ADDED: t.referralStageRewardAdded,
    REVERSED: t.referralStageReversed
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.pageTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.referEarn}</Text>
      {home.isLoading ? <Skeleton height={100} /> : null}
      {home.isError ? <LoadErrorCard onRetry={() => home.refetch().catch(() => undefined)} /> : null}

      {data ? (
        <>
          <Card style={styles.hero} raised>
            <View style={[styles.giftMark, { backgroundColor: palette.accentSoft }]}>
              <Gift color={palette.deep} size={24} />
            </View>
            <Text accessibilityRole="header" style={[styles.heroTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>
              {t.referralHero.replace("{days}", String(data.bonusDaysForFriend)).replace("{months}", String(data.monthsPerReferral))}
            </Text>
            <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>
              {data.currentEndsAt
                ? t.referralCurrentExpiry.replace("{date}", formatReferralDate(data.currentEndsAt, lang))
                : t.referralNoCurrentExpiry}
            </Text>
            {pendingCount > 0 && data.projectedEndsAt ? (
              <Text style={[styles.projected, { color: palette.success }, lang === "hi" && styles.hindi]}>
                {projectedExpiryDisplay(data.projectedEndsAt, lang)}
              </Text>
            ) : null}
            {data.creditMonths > 0 || data.creditDays > 0 ? (
              <Text style={[styles.note, { color: palette.inkSoft }, lang === "hi" && styles.hindi]}>
                {t.referralCredit.replace("{months}", String(data.creditMonths)).replace("{days}", String(data.creditDays))}
              </Text>
            ) : null}
          </Card>

          <View style={styles.shareBlock}>
            <PrimaryButton
              label={t.referralShareWhatsapp}
              accessibilityLabel={t.referralShareWhatsapp}
              icon={Share2}
              onPress={() => void shareWhatsApp()}
            />
            <View style={styles.actionRow}>
              <SecondaryButton
                label={t.referralShareSheet}
                accessibilityLabel={t.referralShareSheet}
                onPress={() => Share.share({ message: shareText }).catch(() => undefined)}
                style={styles.actionButton}
              />
              <SecondaryButton
                label={t.referralCopyLink}
                accessibilityLabel={t.referralCopyLink}
                onPress={() => void copyLink()}
                style={styles.actionButton}
              />
            </View>
          </View>

          <Card style={styles.qrCard}>
            <View accessible accessibilityRole="image" accessibilityLabel={t.referralQr} style={styles.qrWrap}>
              {link ? <QRCode value={link} size={168} color={palette.ink} backgroundColor={palette.white} /> : null}
            </View>
            <View style={styles.codeCopy}>
              <Text style={[styles.code, { color: palette.ink }]}>{data.code}</Text>
              <Text selectable style={[styles.link, { color: palette.muted }]}>{link}</Text>
              <Text style={[styles.caption, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.referralQr}</Text>
            </View>
          </Card>

          <Card style={styles.capCard}>
            <View style={styles.capHeading}>
              <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>
                {t.referralYearlyCap.replace("{earned}", String(data.monthsEarnedThisYear)).replace("{max}", String(data.maxMonthsPerYear))}
              </Text>
            </View>
            <View accessible accessibilityLabel={t.referralYearlyCap.replace("{earned}", String(data.monthsEarnedThisYear)).replace("{max}", String(data.maxMonthsPerYear))} style={[styles.track, { backgroundColor: palette.line }]}>
              <View style={[styles.fill, { width: `${Math.round(capRatio * 100)}%`, backgroundColor: palette.primary }]} />
            </View>
          </Card>

          <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.referralProgressTitle}</Text>
          {data.referrals.length === 0 ? (
            <EmptyState
              icon={Gift}
              title={t.emptyReferralRewardsTitle}
              body={t.emptyReferralRewardsBody}
              action={t.referralShareWhatsapp}
              onAction={() => void shareWhatsApp()}
            />
          ) : data.referrals.map((row) => {
            const stage = stageForReward(row.stage);
            const tone = stageTone(stage, palette);
            return (
              <Card key={row.id} style={styles.referralRow}>
                <View style={styles.rowHeading}>
                  <Text style={[styles.name, { color: palette.ink }]} numberOfLines={1}>{row.displayName}</Text>
                  <View accessible accessibilityLabel={referralStageLabel(stage, t)} style={[styles.stage, { backgroundColor: tone.backgroundColor }]}>
                    <Text style={[styles.stageText, { color: tone.color }, lang === "hi" && styles.hindi]}>{labels[stage]}</Text>
                  </View>
                </View>
                <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{formatReferralDate(row.signedUpAt, lang)}</Text>
                {row.months > 0 ? <Text style={[styles.rewardMonths, { color: palette.deep }]}>{t.referralMonths.replace("{months}", String(row.months))}</Text> : null}
                {row.availableOn ? (
                  <Text style={[styles.note, { color: palette.inkSoft }, lang === "hi" && styles.hindi]}>
                    {t.referralAddsOn.replace("{date}", formatReferralDate(row.availableOn, lang))}
                  </Text>
                ) : null}
                {row.appliedAt ? <Text style={[styles.note, { color: palette.inkSoft }, lang === "hi" && styles.hindi]}>{formatReferralDate(row.appliedAt, lang)}</Text> : null}
              </Card>
            );
          })}

          <Card style={styles.howCard}>
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.referralHowTitle}</Text>
            {[t.referralStepOne, t.referralStepTwo, t.referralStepThree].map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepNumber, { backgroundColor: palette.accentSoft }]}>
                  <Text style={[styles.stepNumberText, { color: palette.deep }]}>{index + 1}</Text>
                </View>
                <Text style={[styles.note, styles.stepText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{step}</Text>
              </View>
            ))}
            <View style={[styles.termsDivider, { backgroundColor: palette.line }]} />
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.referralTermsTitle}</Text>
            <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>
              {t.referralHoldTerms.replace("{days}", String(data.holdDays))}
            </Text>
            <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.referralReversalTerms}</Text>
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    content: { padding: 16, paddingBottom: 120, gap: 12 },
    pageTitle: { fontFamily: fonts.display, fontSize: 28 },
    hero: { gap: 10, padding: 18 },
    giftMark: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    heroTitle: { fontFamily: fonts.title, fontSize: 23, lineHeight: 31 },
    note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
    projected: { fontFamily: fonts.bodyStrong, fontSize: 15, lineHeight: 21 },
    shareBlock: { gap: 8 },
    actionRow: { flexDirection: "row", gap: 8 },
    actionButton: { flex: 1 },
    qrCard: { flexDirection: "row", alignItems: "center", gap: 16 },
    qrWrap: { padding: 8, backgroundColor: palette.white, borderRadius: 12 },
    codeCopy: { flex: 1, gap: 6 },
    code: { fontFamily: fonts.bodyStrong, fontSize: 20 },
    link: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
    caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
    capCard: { gap: 10 },
    capHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 17 },
    track: { height: 9, borderRadius: 99, overflow: "hidden" },
    fill: { height: 9, borderRadius: 99 },
    referralRow: { gap: 6, padding: 14 },
    rowHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    name: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 16 },
    stage: { minHeight: 30, borderRadius: 999, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
    stageText: { fontFamily: fonts.bodyStrong, fontSize: 12 },
    rewardMonths: { fontFamily: fonts.bodyStrong, fontSize: 14 },
    howCard: { gap: 12, padding: 16 },
    stepRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 },
    stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    stepNumberText: { fontFamily: fonts.bodyStrong, fontSize: 15 },
    stepText: { flex: 1 },
    termsDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
    hindi: { fontFamily: fonts.hindi }
  });
}

export default function ReferScreen() {
  return <Screen topInset={true}><ReferScreenContent /></Screen>;
}
