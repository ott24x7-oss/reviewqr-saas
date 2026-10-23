import { useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { PrimaryButton } from "../src/ui/buttons";
import { EmptyState, ProgressSteps } from "../src/ui/bits";
import { useTheme } from "../src/ui/theme";
import { PartyPopper } from "lucide-react-native";

/** Dev-only stage so each catalogue animation can be recorded on its own. */
export default function MotionLab() {
  const { clip } = useLocalSearchParams<{ clip?: string }>();
  const id = clip || "1";
  const { palette, reduceMotion } = useTheme();
  const x = useSharedValue(0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.9);
  useEffect(() => {
    if (reduceMotion) return;
    if (id === "2") {
      x.value = withRepeat(withTiming(40, { duration: 700 }), 2, true);
    }
    if (id === "6" || id === "14") {
      scale.value = withSpring(1, { damping: 14 });
    }
    if (id === "16") {
      x.value = withRepeat(withSequence(withTiming(-4, { duration: 1500 }), withTiming(4, { duration: 1500 })), -1);
    }
  }, [id, reduceMotion, scale, x]);
  const shift = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: scale.value }] }));
  return (
    <View style={[styles.screen, { backgroundColor: palette.paper }]} testID={`motion-${id}`}>
      <Text style={{ color: palette.ink, fontSize: 22 }}>Motion {id}</Text>
      {id === "1" ? <PrimaryButton label="Continue" onPress={() => undefined} /> : null}
      {id === "2" || id === "14" ? <Animated.View style={[styles.block, { backgroundColor: palette.deep }, shift]} /> : null}
      {id === "4" ? <ProgressSteps labels={["Business", "Look", "Link", "Menu"]} step={2} /> : null}
      {id === "6" && !reduceMotion ? (
        <View>
          <LottieView source={require("../assets/lottie/confetti.json")} autoPlay loop={false} style={styles.lottie} />
          <Animated.View style={[styles.block, { backgroundColor: palette.card }, shift]} />
        </View>
      ) : null}
      {id === "15" && !reduceMotion ? (
        <LottieView source={require("../assets/lottie/nfc.json")} autoPlay loop style={styles.lottie} />
      ) : null}
      {id === "16" ? <EmptyState icon={PartyPopper} title="Nothing here yet" body="Add something to fill this list." /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 16 },
  block: { width: 160, height: 160, borderRadius: 20 },
  lottie: { width: 200, height: 200 }
});
