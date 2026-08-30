import React from "react";
import { View, Text, Pressable, StyleSheet, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { T, SERIF, MONO } from "@/src/theme";
import Button from "@/src/components/Button";

export default function Invite({
  code,
  onCopied,
  onHaveCode,
}: {
  code: string;
  onCopied?: () => void;
  onHaveCode?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const pulse = useSharedValue(0.4);

  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
  }, [pulse]);

  const codeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    scale.value = withSequence(withTiming(1.06, { duration: 120 }), withTiming(1, { duration: 120 }));
    onCopied?.();
  };

  const share = async () => {
    try {
      await Share.share({
        message: `I answered something about you on Candle. It's sealed until you answer too. Code: ${code}`,
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <Text style={styles.kicker}>SHARE YOUR CODE</Text>
        <Text style={styles.title}>One code. One person.</Text>
      </View>

      <Pressable testID="invite-code" onPress={copy} style={styles.codeWrap}>
        <Animated.Text style={[styles.code, codeStyle]}>{code}</Animated.Text>
        <View style={styles.copyRow}>
          <Ionicons name="copy-outline" size={14} color={T.muted} />
          <Text style={styles.copyHint}>tap to copy</Text>
        </View>
      </Pressable>

      <View style={{ gap: 14 }}>
        <Button testID="invite-share" label="Send invite" onPress={share} />
        <View style={styles.waitRow}>
          <Animated.View style={[styles.waitDot, dotStyle]} />
          <Text testID="invite-waiting" style={styles.waitText}>
            Waiting for them to join…
          </Text>
        </View>
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>
        <Button
          testID="invite-have-code"
          label="They already sent me a code"
          variant="ghost"
          onPress={() => onHaveCode?.()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
    paddingHorizontal: T.pad,
    justifyContent: "space-between",
  },
  top: { alignItems: "center" },
  kicker: { color: T.ember, fontSize: 12, letterSpacing: 3, fontWeight: "700" },
  title: { color: T.text, fontFamily: SERIF, fontSize: 30, marginTop: 12, textAlign: "center" },
  codeWrap: { alignItems: "center" },
  code: {
    color: T.text,
    fontFamily: MONO,
    fontSize: 76,
    letterSpacing: 10,
    fontWeight: "700",
  },
  copyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  copyHint: { color: T.muted, fontSize: 13, fontFamily: MONO, letterSpacing: 1 },
  waitRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  waitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.ember },
  waitText: { color: T.muted, fontSize: 15 },
  orRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  orLine: { flex: 1, height: 1, backgroundColor: T.line },
  orText: { color: T.faint, fontSize: 12, fontFamily: MONO, letterSpacing: 2 },
});
