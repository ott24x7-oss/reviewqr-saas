import { useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { router } from "expo-router";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { QrCode, UsersRound } from "lucide-react-native";
import { agentRequests, useAgentTeam } from "./api";
import { AgentPage, AgentStatusChip } from "./components";
import { formatRupees } from "./format";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../ui/bits";
import { Field, PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";
import { accountKey } from "../query/keys";
import { useSession } from "../state/session";

function AgentTeamContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const team = useAgentTeam();
  const client = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [createdLink, setCreatedLink] = useState("");
  const [inviteError, setInviteError] = useState(false);
  const inviteLink = createdLink || team.data?.inviteLink || "";

  async function shareInvite() {
    if (!inviteLink) return;
    await Share.share({ message: inviteLink });
  }

  async function shareWhatsapp() {
    if (!inviteLink) return;
    const url = `whatsapp://send?text=${encodeURIComponent(inviteLink)}`;
    try {
      await Linking.openURL(url);
    } catch {
      await Share.share({ message: inviteLink });
    }
  }

  async function inviteByPhone() {
    if (phone.replace(/\D/g, "").length < 10) return;
    setInviteError(false);
    try {
      const invite = await agentRequests.invite(phone.trim());
      setCreatedLink(invite.inviteLink);
      setInviteOpen(false);
      setPhone("");
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent", "team") });
    } catch {
      setInviteError(true);
    }
  }

  return (
    <Screen>
      <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={12}>
        <AgentPage title={t.agentTeamTab} subtitle={t.agentInviteBody}>
          {team.isLoading ? <><Skeleton height={272} /><Skeleton height={100} /><Skeleton height={100} /></> : null}
          {team.isError ? <LoadErrorCard onRetry={() => team.refetch().catch(() => undefined)} /> : null}
          {team.data && !team.data.canRecruit ? <EmptyState icon={UsersRound} title={t.agentTeamTab} body={t.agentRecruitUnavailable} /> : null}
          {team.data?.canRecruit ? (
            <>
              <Card style={styles.inviteCard}>
                <View style={styles.inviteHeading}>
                  <View style={[styles.inviteIcon, { backgroundColor: palette.accentSoft }]}><QrCode color={palette.deep} size={23} /></View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.cardTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.agentInviteTitle}</Text>
                    <Text style={[styles.cardHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.agentInviteBody}</Text>
                  </View>
                </View>
                {inviteLink ? (
                  <View style={styles.qrBlock}>
                    <View style={[styles.qrWrap, { backgroundColor: palette.white }]}>
                      <QRCode value={inviteLink} size={148} color={palette.header} backgroundColor={palette.white} quietZone={8} />
                    </View>
                    <Text style={[styles.qrHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.agentInviteQr}</Text>
                    <Text selectable style={[styles.inviteUrl, { color: palette.deep }]} numberOfLines={2}>{inviteLink}</Text>
                  </View>
                ) : null}
                <View style={styles.inviteActions}>
                  <PillButton label={t.shareLink} tone="dark" disabled={!inviteLink} onPress={() => shareInvite().catch(() => undefined)} />
                  <PillButton label={t.shareWhatsapp} tone="outline" disabled={!inviteLink} onPress={() => shareWhatsapp().catch(() => undefined)} />
                </View>
                {inviteOpen ? (
                  <View style={styles.phoneForm}>
                    <Field label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="done" />
                    {inviteError ? <LoadErrorCard onRetry={() => inviteByPhone().catch(() => undefined)} /> : null}
                    <PillButton label={t.agentInviteSend} tone="dark" disabled={phone.replace(/\D/g, "").length < 10} onPress={inviteByPhone} />
                  </View>
                ) : (
                  <PillButton label={t.agentInviteByPhone} tone="outline" onPress={() => setInviteOpen(true)} />
                )}
              </Card>

              <View style={styles.memberSection}>
                <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.agentTeamMembers}</Text>
                {!team.data.members.length ? <EmptyState icon={UsersRound} title={t.agentTeamMembers} body={t.agentNoTeamMembers} action={t.agentInviteByPhone} onAction={() => setInviteOpen(true)} /> : null}
                {team.data.members.map((member) => (
                  <Pressable key={member.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/(app)/agent-member", params: { id: member.id } })} style={[styles.memberCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
                    <View style={styles.memberTop}>
                      <View style={[styles.memberIcon, { backgroundColor: palette.accentSoft }]}><UsersRound color={palette.deep} size={20} /></View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.memberName, { color: palette.ink }]}>{member.name}</Text>
                        <Text style={[styles.memberPhone, { color: palette.muted }]}>{member.phoneMasked}</Text>
                      </View>
                      <AgentStatusChip status={member.status} />
                    </View>
                    <View style={[styles.memberStats, { borderTopColor: palette.line }]}>
                      <Stat label={t.agentSharePercent} value={member.sharePercent == null ? "—" : `${member.sharePercent}%`} palette={palette} />
                      <Stat label={t.agentMonthSales} value={formatRupees(member.monthSalesPaise, lang)} palette={palette} />
                      <Stat label={t.agentMyOverride} value={formatRupees(member.monthOverridePaise, lang)} palette={palette} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </AgentPage>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

function Stat({ label, value, palette }: { label: string; value: string; palette: ReturnType<typeof useTheme>["palette"] }) {
  return <View style={{ flex: 1, gap: 3 }}><Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text><Text style={[styles.statValue, { color: palette.ink }]} numberOfLines={1}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  inviteCard: { gap: 14, padding: 15 },
  inviteHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  inviteIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.bodyStrong, fontSize: 17 },
  cardHint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19 },
  qrBlock: { alignItems: "center", gap: 8, paddingVertical: 5 },
  qrWrap: { width: 164, height: 164, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qrHint: { fontFamily: fonts.body, fontSize: 13 },
  inviteUrl: { fontFamily: fonts.bodyStrong, fontSize: 14, textAlign: "center" },
  inviteActions: { gap: 8 },
  phoneForm: { gap: 10 },
  memberSection: { gap: 10 },
  sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 18 },
  memberCard: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 13 },
  memberTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  memberName: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  memberPhone: { fontFamily: fonts.body, fontSize: 13 },
  memberStats: { flexDirection: "row", gap: 8, borderTopWidth: 1, paddingTop: 11 },
  statLabel: { fontFamily: fonts.body, fontSize: 11 },
  statValue: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

export function AgentTeamScreen() {
  return <AgentTeamContent />;
}
