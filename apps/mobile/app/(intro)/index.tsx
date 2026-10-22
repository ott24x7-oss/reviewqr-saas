import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../../src/i18n";
import { markIntroSeen } from "../../src/onboarding/seen";
import { colors, fonts } from "../../src/theme";
import { PillButton } from "../../src/ui/controls";

const SLIDES = [
  {
    key: "reviews",
    image: require("../../assets/onboarding/reviews.jpg"),
    title: "introReviews",
    body: "introReviewsBody"
  },
  {
    key: "menu",
    image: require("../../assets/onboarding/menu.jpg"),
    title: "introMenu",
    body: "introMenuBody"
  },
  {
    key: "orders",
    image: require("../../assets/onboarding/orders.jpg"),
    title: "introOrders",
    body: "introOrdersBody"
  }
] as const;

export default function IntroScreen() {
  const { t, lang, choose } = useI18n();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const frame = Math.min(width, 480);

  async function leave(href: "/(auth)/signup" | "/(auth)/login") {
    await markIntroSeen();
    router.replace(href);
  }

  return (
    <SafeAreaView style={styles.screen} testID="intro-screen">
      <ScrollView
        horizontal
        pagingEnabled
        style={styles.pager}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / frame);
          setPage(Math.max(0, Math.min(SLIDES.length - 1, next)));
        }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width: frame }]} testID={`intro-${slide.key}`}>
            {page === 0 && slide.key === "reviews" ? (
              <View style={styles.langs}>
                <Pressable onPress={() => choose("en")} style={[styles.lang, lang === "en" && styles.langOn]}>
                  <Text style={styles.langText}>{t.english}</Text>
                </Pressable>
                <Pressable onPress={() => choose("hi")} style={[styles.lang, lang === "hi" && styles.langOn]}>
                  <Text style={[styles.langText, styles.hindi]}>{t.hindi}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.langs} />
            )}
            <Image source={slide.image} style={styles.art} resizeMode="cover" />
            <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t[slide.title]}</Text>
            <Text style={[styles.body, lang === "hi" && styles.hindi]}>{t[slide.body]}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((slide, index) => (
          <View key={slide.key} style={[styles.dot, index === page && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.actions}>
        <PillButton label={t.introSkip} tone="ghost" onPress={() => leave("/(auth)/login")} />
        <PillButton label={t.introStart} onPress={() => leave("/(auth)/signup")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  pager: { flex: 1 },
  slide: { paddingHorizontal: 24, paddingTop: 8, gap: 12 },
  langs: { minHeight: 44, flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  lang: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  langOn: { backgroundColor: colors.cyan },
  langText: { color: colors.white, fontFamily: fonts.bodyStrong },
  art: { width: "100%", height: 280, borderRadius: 28, backgroundColor: colors.paper },
  title: { color: colors.cyanSoft, fontFamily: fonts.display, fontSize: 32 },
  body: { color: colors.white, fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.cyan, width: 22 },
  actions: { padding: 20, gap: 10 },
  hindi: { fontFamily: fonts.hindi }
});
