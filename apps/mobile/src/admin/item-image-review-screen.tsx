import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { adminApi, ADMIN_QUERY_PREFIX } from "./api";
import { AdminCard } from "./components";
import { AdminAction, AdminFrame, AdminLoadState } from "./screen-kit";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

export function AdminItemImageReviewScreen() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [...ADMIN_QUERY_PREFIX, "item-image-jobs", businessId || "all"],
    queryFn: () => adminApi.itemImageJobs(businessId)
  });
  const jobs = query.data?.jobs ?? [];
  async function decide(action: "approve" | "reject", id: string) {
    await adminApi.itemImageDecision({ action, jobIds: [id] });
    await client.invalidateQueries({ queryKey: [...ADMIN_QUERY_PREFIX, "item-image-jobs"] });
  }
  return (
    <AdminFrame title={lang === "hi" ? "AI आइटम फ़ोटो" : "AI item photos"} subtitle={lang === "hi" ? "तैयार फ़ोटो को मंज़ूर या अस्वीकार करें।" : "Approve or reject ready product photos."} refreshing={query.isRefetching} onRefresh={() => query.refetch()} back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && jobs.length === 0}>
        {jobs.map((job) => <AdminCard key={job.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{job.item.name}</Text>
          <Text style={[styles.caption, { color: palette.muted }]}>{job.business.name}</Text>
          {job.candidateUrl ? <Image source={{ uri: job.candidateUrl }} contentFit="cover" accessibilityLabel={lang === "hi" ? `${job.item.name} की सुझाई गई फ़ोटो` : `Suggested photo for ${job.item.name}`} style={[styles.photo, { backgroundColor: palette.paper }]} /> : null}
          <View style={styles.actions}>
            <AdminAction label={lang === "hi" ? "मंज़ूर करें" : "Approve"} onPress={() => decide("approve", job.id).catch(() => undefined)} />
            <AdminAction label={lang === "hi" ? "अस्वीकार करें" : "Reject"} tone="outline" onPress={() => decide("reject", job.id).catch(() => undefined)} />
          </View>
        </AdminCard>)}
      </AdminLoadState>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  caption: { fontFamily: fonts.body, fontSize: 12 },
  photo: { width: "100%", height: 220, borderRadius: 16 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
});
