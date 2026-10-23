import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../../src/i18n";
import { markIntroSeen } from "../../src/onboarding/seen";
import { fonts } from "../../src/theme";
import { PrimaryButton, TextButton } from "../../src/ui/buttons";
import { BLURHASH } from "../../src/ui/tokens";
import { useTheme } from "../../src/ui/theme";

const SLIDES = [
  {
    key: "reviews",
    image: require("../../assets/onboarding/cafe.webp"),
    title: "introReviews" as const,
    body: "introReviewsBody" as const
  },
  {
    key: "menu",
    image: require("../../assets/onboarding/menu-live.webp"),
    title: "introMenu" as const,
    body: "introMenuBody" as const
  },
  {
    key: "orders",
    image: require("../../assets/onboarding/scan-live.webp"),
    title: "introOrders" as const,
    body: "introOrdersBody" as const
  }
];

export default function IntroScreen() {
  const { t, lang, choose } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const frame = Math.min(width, 480);
  const [page, setPage] = useState(0);
  const scrollX = useSharedValue(0);
  const titleY = useSharedValue(reduceMotion ? 0 : 12);
  const titleOp = useSharedValue(reduceMotion ? 1 : 0);
  const bodyOp = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      titleY.value = 0;
      titleOp.value = 1;
      bodyOp.value = 1;
      return;
    }
    titleY.value = 12;
    titleOp.value = 0;
    bodyOp.value = 0;
    titleY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
    titleOp.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    bodyOp.value = withDelay(60, withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) }));
  }, [bodyOp, page, reduceMotion, titleOp, titleY]);
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOp.value,
    transform: [{ translateY: titleY.value }]
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOp.value,
    transform: [{ translateY: titleY.value }]
  }));
  const list = useRef<Animated.ScrollView>(null);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    }
  });

  async function leave(href: "/(auth)/signup" | "/(auth)/login") {
    await markIntroSeen();
    router.replace(href);
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper }]} testID="intro-screen">
      <Animated.ScrollView
        ref={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ height: 420 }}
        contentContainerStyle={{ width: frame * SLIDES.length }}
        onScroll={reduceMotion ? undefined : onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / frame);
          setPage(Math.max(0, Math.min(SLIDES.length - 1, next)));
        }}
      >
        {SLIDES.map((slide, index) => (
          <Slide key={slide.key} slide={slide} index={index} frame={frame} scrollX={scrollX} page={page} />
        ))}
      </Animated.ScrollView>
      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <View style={styles.langs}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.english} accessibilityState={{ selected: lang === "en" }} onPress={() => choose("en")} style={[styles.lang, lang === "en" && { backgroundColor: palette.ink }]}>
            <Text style={[styles.langText, { color: lang === "en" ? palette.paper : palette.ink }]}>{t.english}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t.hindi} accessibilityState={{ selected: lang === "hi" }} onPress={() => choose("hi")} style={[styles.lang, lang === "hi" && { backgroundColor: palette.ink }]}>
            <Text style={[styles.langText, styles.hindi, { color: lang === "hi" ? palette.paper : palette.ink }]}>{t.hindi}</Text>
          </Pressable>
        </View>
        <Animated.Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi, titleStyle]}>{t[SLIDES[page].title]}</Animated.Text>
        <Animated.Text style={[styles.body, { color: palette.muted }, lang === "hi" && styles.hindiBody, bodyStyle]}>{t[SLIDES[page].body]}</Animated.Text>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <Dot key={slide.key} on={index === page} color={index === page ? palette.primary : palette.line} reduceMotion={reduceMotion} />
          ))}
        </View>
        <PrimaryButton label={t.introStart} onPress={() => leave("/(auth)/signup")} />
        <TextButton label={t.introSkip} onPress={() => leave("/(auth)/login")} />
        <TextButton label={t.alreadyAccount} onPress={() => leave("/(auth)/login")} />
      </SafeAreaView>
    </View>
  );
}

function Dot({ on, color, reduceMotion }: { on: boolean; color: string; reduceMotion: boolean }) {
  const scale = useSharedValue(on ? 2.6 : 1);
  useEffect(() => {
    const next = on ? 2.6 : 1;
    scale.value = reduceMotion ? next : withTiming(next, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [on, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: scale.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

function Slide({
  slide,
  index,
  frame,
  scrollX,
  page
}: {
  slide: (typeof SLIDES)[number];
  index: number;
  frame: number;
  scrollX: { value: number };
  page: number;
}) {
  const photo = useAnimatedStyle(() => ({
    transform: [{ translateX: (scrollX.value - index * frame) * 0.3 }]
  }));
  const text = useAnimatedStyle(() => ({
    opacity: page === index ? 1 : 0.4
  }));
  return (
    <View style={{ width: frame, height: 420, overflow: "hidden", flexGrow: 0, flexShrink: 0 }} testID={`intro-${slide.key}`}>
      <Animated.View style={[styles.photo, photo, { width: frame * 1.3, marginLeft: -frame * 0.15 }]}>
        <Image source={slide.image} style={styles.image} contentFit="cover" placeholder={{ blurhash: BLURHASH }} transition={200} />
      </Animated.View>
      <Animated.View style={text} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  photo: { height: 420 },
  image: { width: "100%", height: "100%" },
  sheet: { marginTop: -36, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 8, gap: 8 },
  langs: { minHeight: 48, flexDirection: "row", gap: 8, alignSelf: "flex-end", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 999, padding: 4 },
  lang: { minHeight: 48, minWidth: 64, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  langText: { fontFamily: fonts.bodyStrong, fontSize: 14 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  dots: { flexDirection: "row", gap: 6, marginVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { width: 22 },
  hindi: { fontFamily: fonts.hindiStrong },
  hindiBody: { fontFamily: fonts.hindi }
});
