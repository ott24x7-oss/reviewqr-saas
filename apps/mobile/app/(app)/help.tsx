import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { apiData } from "../../src/api/data";
import { replayAllTours } from "../../src/guide/store";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, EmptyState } from "../../src/ui/bits";
import { PrimaryButton } from "../../src/ui/buttons";
import { usePalette } from "../../src/ui/theme";
import { CircleHelp } from "lucide-react-native";

type Article = {
  id: string;
  title: string;
  body: string;
  category: string;
  videoUrl: string;
  slug: string;
};

export default function HelpScreen() {
  const { t, lang } = useI18n();
  const palette = usePalette();
  const { user } = useSession();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof params.q === "string" ? params.q : "");
  const articles = useQuery({
    queryKey: accountKey(user?.id ?? "", "help", lang, query),
    enabled: !!user,
    queryFn: () => apiData<Article[]>(`/api/v1/help?lang=${lang}&q=${encodeURIComponent(query)}`)
  });
  const rows = articles.data ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.helpCenter}</Text>
      <TextInput
        accessibilityLabel={t.helpSearch}
        value={query}
        onChangeText={setQuery}
        placeholder={t.helpSearch}
        placeholderTextColor={palette.muted}
        style={[styles.search, { color: palette.ink, backgroundColor: palette.card, borderColor: palette.line }]}
      />
      <PrimaryButton label={t.showTips} onPress={() => replayAllTours().then(() => router.back())} />
      {rows.length === 0 ? <EmptyState icon={CircleHelp} title={t.noArticles} body={t.helpSearch} /> : null}
      {rows.map((article) => (
        <Card key={article.id}>
          <Text style={[styles.cat, { color: palette.muted }]}>{article.category}</Text>
          <Text style={[styles.article, { color: palette.ink }, lang === "hi" && styles.hindi]}>{article.title}</Text>
          <Text style={[styles.body, { color: palette.muted }, lang === "hi" && styles.hindi]}>{article.body}</Text>
          {article.videoUrl ? <Text style={{ color: palette.deep, fontFamily: fonts.body }}>{article.videoUrl}</Text> : null}
        </Card>
      ))}
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={{ color: palette.deep, fontFamily: fonts.bodyStrong }}>{t.wizardBack}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  search: { minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 16 },
  cat: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  article: { fontFamily: fonts.title, fontSize: 18 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  back: { minHeight: 48, justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});
