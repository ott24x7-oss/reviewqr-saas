import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react-native";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { HelpButton } from "../../src/guide/help-sheet";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { hasModule, useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, Chip, EmptyState } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { LockedModuleCard } from "../../src/ui/locked-module";
import { useTheme } from "../../src/ui/theme";

type FeedbackRow = {
  id: string;
  message: string;
  status: string;
  internalNote: string | null;
  tags: { tag: { name: string } }[];
  review: { rating: number; customerName: string | null; customerPhone: string | null };
};

function SwipeResolve({ hint, onResolve, children }: { hint: string; onResolve: () => void; children: React.ReactNode }) {
  const { palette, reduceMotion } = useTheme();
  const x = useSharedValue(0);
  const width = useSharedValue(1);
  const pan = Gesture.Pan()
    .activeOffsetX(16)
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      x.value = Math.max(0, event.translationX);
    })
    .onEnd(() => {
      const pass = x.value > width.value * 0.4;
      x.value = reduceMotion ? 0 : withSpring(0, { damping: 18 });
      if (pass) runOnJS(onResolve)();
    });
  const card = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <GestureDetector gesture={pan}>
      <View onLayout={(event) => { width.value = event.nativeEvent.layout.width; }}>
        <View style={[styles.reveal, { backgroundColor: palette.deep }]}>
          <Text style={styles.revealText}>{hint}</Text>
        </View>
        <Animated.View style={card}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

export default function FeedbackTab() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const entitlement = useEntitlement();
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [tagText, setTagText] = useState("");
  const modules = entitlement.data?.modules;
  const id = business?.id;
  const locked = !!(modules && !hasModule(modules, "REVIEWS"));
  const rows = useQuery({
    queryKey: accountKey(user?.id ?? "", "feedback", id),
    enabled: !!user && !locked,
    queryFn: () => apiData<{ items: FeedbackRow[] }>(`/api/v1/feedback?limit=30${id ? `&businessId=${id}` : ""}`)
  });

  async function draftReply(row: FeedbackRow) {
    setError(null);
    setReply(null);
    try {
      const data = await apiData<{ publicReply: string; whatsappReply: string }>(`/api/v1/feedback/${row.id}/reply-draft`, {
        method: "POST"
      });
      setReply(data.publicReply);
      const phone = (row.review.customerPhone || "").replace(/\D/g, "");
      if (phone.length >= 8) await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(data.whatsappReply)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "A reply draft isn't available right now.");
    }
  }

  async function saveDetail(row: FeedbackRow, status = row.status) {
    setError(null);
    try {
      const tags = tagText.split(",").map((part) => part.trim()).filter(Boolean);
      await apiData(`/api/v1/feedback/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, internalNote: note, tags })
      });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "feedback", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function resolve(row: FeedbackRow) {
    setError(null);
    try {
      await apiData(`/api/v1/feedback/${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "RESOLVED" }) });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "feedback", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper }]}>
      <FlashList
        data={locked ? [] : (rows.data?.items ?? [])}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.pad}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.feedbackTab}</Text>
              <HelpButton title={t.feedbackTab} body={t.emptyFeedbackBody} />
            </View>
            {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
            {locked ? <LockedModuleCard moduleId="REVIEWS" /> : null}
          </View>
        }
        ListEmptyComponent={
          locked || rows.isLoading ? null : <EmptyState icon={MessageSquare} title={t.emptyFeedbackTitle} body={t.emptyFeedbackBody} />
        }
        renderItem={({ item }) => (
          <SwipeResolve hint={t.resolved} onResolve={() => resolve(item)}>
            <Card style={styles.card}>
              <Text
                style={[styles.name, { color: palette.ink }, lang === "hi" && styles.hindi]}
                onPress={() => {
                  setOpenId(item.id);
                  setNote(item.internalNote || "");
                  setTagText((item.tags || []).map((tag) => tag.tag.name).join(", "));
                }}
              >
                {item.review.customerName || t.feedback} · {item.review.rating}
              </Text>
              {openId === item.id ? (
                <View style={styles.row}>
                  {(["NEW", "IN_PROGRESS", "RESOLVED", "IGNORED"] as const).map((status) => (
                    <Chip key={status} label={status} onPress={() => saveDetail(item, status)} />
                  ))}
                  <Field label={t.internalNote} tone="paper" value={note} onChangeText={setNote} />
                  <Field label={t.tags} tone="paper" value={tagText} onChangeText={setTagText} />
                  <PillButton label={t.save} tone="dark" onPress={() => saveDetail(item)} />
                </View>
              ) : null}
              <Text style={[styles.note, { color: palette.muted }]}>{item.message}</Text>
              <Text style={[styles.note, { color: palette.inkSoft }]}>{item.status}</Text>
              {reply ? <Text style={[styles.note, { color: palette.ink }]}>{reply}</Text> : null}
              <View style={styles.row}>
                <Chip label={t.replyThanks} onPress={() => draftReply(item)} />
                <Chip label={t.replySorry} onPress={() => draftReply(item)} />
                <Chip label={t.replyOnIt} onPress={() => draftReply(item)} />
              </View>
              <PillButton label={t.reply} onPress={() => draftReply(item)} tone="dark" />
              <PillButton label={t.resolved} tone="outline" onPress={() => resolve(item)} />
            </Card>
          </SwipeResolve>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { padding: 16, paddingBottom: 120 },
  header: { gap: 12, marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.title, fontSize: 17 },
  note: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  hindi: { fontFamily: fonts.hindi },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { marginBottom: 12, gap: 8 },
  reveal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 12,
    borderRadius: 20,
    justifyContent: "center",
    paddingLeft: 16
  },
  revealText: { color: "#FFFFFF", fontFamily: fonts.bodyStrong }
});
