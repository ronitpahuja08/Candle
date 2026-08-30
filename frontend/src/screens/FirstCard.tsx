import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "@/src/keyboard";
import { T, SERIF } from "@/src/theme";
import { cardById } from "@/src/cards";
import Button from "@/src/components/Button";

export default function FirstCard({
  onLocked,
  onContinue,
  submitting,
}: {
  onLocked: (body: string) => void;
  onContinue: () => void;
  submitting?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState("");
  const [sealed, setSealed] = useState(false);
  const prompt = cardById(0);

  const lock = () => {
    if (!body.trim()) return;
    setSealed(true);
    onLocked(body.trim());
  };

  if (sealed) {
    return (
      <View style={[styles.sealWrap, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.sealInner}>
          <View style={styles.sealBadge}>
            <Ionicons name="lock-closed" size={30} color={T.ember} />
          </View>
          <Text testID="firstcard-locked" style={styles.sealTitle}>
            Locked.
          </Text>
          <Text style={styles.sealSub}>Only they can open this.</Text>
        </Animated.View>
        <View style={{ paddingHorizontal: T.pad, width: "100%" }}>
          <Button
            testID="firstcard-continue"
            label="Continue"
            onPress={onContinue}
            loading={submitting}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: T.pad }}>
          <Text style={styles.kicker}>ANSWER FIRST · THEN INVITE</Text>
          <Animated.Text
            entering={FadeInUp.springify().damping(18)}
            style={styles.prompt}
          >
            {prompt.text}
          </Animated.Text>
          <TextInput
            testID="firstcard-input"
            style={styles.input}
            placeholder="Write it here…"
            placeholderTextColor={T.faint}
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
          />
        </View>
        <View style={{ paddingHorizontal: T.pad, paddingBottom: insets.bottom + 12 }}>
          <Button
            testID="firstcard-lock"
            label="Lock it in"
            onPress={lock}
            loading={submitting}
            disabled={!body.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  kicker: { color: T.ember, fontSize: 12, letterSpacing: 2, fontWeight: "700" },
  prompt: {
    color: T.text,
    fontFamily: SERIF,
    fontSize: 30,
    lineHeight: 36,
    marginTop: 20,
    marginBottom: 24,
  },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: 18,
    color: T.text,
    fontSize: 17,
    minHeight: 140,
    textAlignVertical: "top",
  },
  sealWrap: { flex: 1, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" },
  sealInner: { alignItems: "center", paddingHorizontal: 40, flex: 1, justifyContent: "center" },
  sealBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: T.raised,
    borderWidth: 1,
    borderColor: T.emberDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  sealTitle: { color: T.text, fontFamily: SERIF, fontSize: 40 },
  sealSub: { color: T.muted, fontSize: 16, marginTop: 8 },
});
