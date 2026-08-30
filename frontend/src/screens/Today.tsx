import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "@/src/keyboard";
import { T, SERIF } from "@/src/theme";
import { PromptState } from "@/src/screens/types";
import Button from "@/src/components/Button";
import Pill from "@/src/components/Pill";

export default function Today({
  promptText,
  state,
  partnerName,
  streak,
  onSubmit,
  onKiss,
  onOpenReveal,
  topInset,
}: {
  promptText: string;
  state: PromptState;
  partnerName: string;
  streak: number;
  onSubmit: (body: string) => void;
  onKiss: () => void;
  onOpenReveal: () => void;
  topInset: number;
}) {
  const [body, setBody] = useState("");
  const pulse = useSharedValue(0.35);

  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const canType = state === "open" || state === "their_turn";

  return (
    <View style={[styles.container, { paddingTop: topInset + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Pill testID="today-streak" label={`${streak} day streak`} flame />
          <Text style={styles.partner}>with {partnerName || "them"}</Text>
        </View>
        <Pressable testID="thumb-kiss" onPress={onKiss} style={styles.kiss}>
          <Ionicons name="finger-print" size={22} color={T.ember} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: T.pad }}>
          <Text style={styles.kicker}>TODAY'S CARD</Text>
          <Text testID="today-prompt" style={styles.prompt}>
            {promptText}
          </Text>

          {state === "their_turn" && (
            <Animated.View entering={FadeIn} style={styles.theirTurn}>
              <Ionicons name="mail-unread" size={16} color={T.ember} />
              <Text style={styles.theirTurnText}>
                {partnerName || "They"} answered. {partnerName ? "They're" : "They're"} waiting on you.
              </Text>
            </Animated.View>
          )}

          {state === "waiting" ? (
            <View testID="today-waiting" style={styles.sealed}>
              <Ionicons name="lock-closed" size={26} color={T.ember} />
              <Text style={styles.sealedTitle}>Locked.</Text>
              <View style={styles.waitRow}>
                <Animated.View style={[styles.dot, dotStyle]} />
                <Text style={styles.sealedSub}>Waiting for {partnerName || "them"}…</Text>
              </View>
            </View>
          ) : state === "revealed" ? (
            <View style={styles.sealed}>
              <Ionicons name="sparkles" size={26} color={T.ember} />
              <Text style={styles.sealedTitle}>You both answered.</Text>
              <Button
                testID="today-open-reveal"
                label="Open the reveal"
                onPress={onOpenReveal}
                style={{ marginTop: 16, alignSelf: "stretch" }}
              />
            </View>
          ) : (
            <TextInput
              testID="today-input"
              style={styles.input}
              placeholder="Your answer, sealed until they answer too…"
              placeholderTextColor={T.faint}
              value={body}
              onChangeText={setBody}
              multiline
              editable={canType}
            />
          )}
        </View>

        {canType && (
          <View style={styles.footer}>
            <Button
              testID="today-lock"
              label="Lock it in"
              onPress={() => onSubmit(body.trim())}
              disabled={!body.trim()}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.pad,
    paddingBottom: 14,
  },
  partner: { color: T.muted, fontSize: 13, marginTop: 8, marginLeft: 2 },
  kiss: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: T.raised,
    borderWidth: 1,
    borderColor: T.emberDim,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: { color: T.faint, fontSize: 12, letterSpacing: 2, fontWeight: "700", marginTop: 8 },
  prompt: {
    color: T.text,
    fontFamily: SERIF,
    fontSize: 30,
    lineHeight: 36,
    marginTop: 16,
    marginBottom: 22,
  },
  theirTurn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.raised,
    borderWidth: 1,
    borderColor: T.emberDim,
    borderRadius: T.radius,
    padding: 14,
    marginBottom: 16,
  },
  theirTurnText: { color: T.text, fontSize: 14, flex: 1 },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: 18,
    color: T.text,
    fontSize: 17,
    minHeight: 150,
    textAlignVertical: "top",
  },
  sealed: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: 26,
    alignItems: "center",
    minHeight: 150,
    justifyContent: "center",
  },
  sealedTitle: { color: T.text, fontFamily: SERIF, fontSize: 26, marginTop: 12 },
  sealedSub: { color: T.muted, fontSize: 15 },
  waitRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.ember },
  footer: { paddingHorizontal: T.pad, paddingTop: 8 },
});
