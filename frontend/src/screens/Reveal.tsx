import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { T, SERIF } from "@/src/theme";
import { NEXT_TEASE } from "@/src/prompts";
import { ResponseRow, Member } from "@/src/screens/types";
import Button from "@/src/components/Button";

export default function Reveal({
  promptText,
  responses,
  members,
  myDeviceId,
  streak,
  saved,
  onSaveToWall,
  onClose,
}: {
  promptText: string;
  responses: ResponseRow[];
  members: Member[];
  myDeviceId: string;
  streak: number;
  saved: boolean;
  onSaveToWall: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const nameFor = (deviceId: string) => {
    if (deviceId === myDeviceId) return "You";
    const m = members.find((x) => x.device_id === deviceId);
    return m?.name || "Them";
  };

  // Partner's answer first, then yours.
  const ordered = [...responses].sort((a, b) => {
    const aMine = a.device_id === myDeviceId ? 1 : 0;
    const bMine = b.device_id === myDeviceId ? 1 : 0;
    return aMine - bMine;
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1E140C", T.bg]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 30,
          paddingBottom: insets.bottom + 30,
          paddingHorizontal: T.pad,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center", marginBottom: 24 }}>
          <Ionicons name="sparkles" size={26} color={T.ember} />
          <Text style={styles.title}>Both answered.</Text>
          <Text style={styles.prompt}>{promptText}</Text>
        </Animated.View>

        {ordered.map((r, i) => (
          <Animated.View
            key={r.id}
            entering={FadeInUp.springify().damping(16).delay(i * 130)}
            style={styles.answerCard}
          >
            <Text style={styles.answerName}>{nameFor(r.device_id)}</Text>
            <Text style={styles.answerBody}>{r.body}</Text>
          </Animated.View>
        ))}

        <Animated.View entering={FadeIn.delay(400)} style={styles.streakRow}>
          <Ionicons name="flame" size={18} color={T.ember} />
          <Text style={styles.streakText}>{streak} day streak</Text>
        </Animated.View>

        <Text style={styles.tease}>{NEXT_TEASE}</Text>

        <View style={{ gap: 12, marginTop: 24 }}>
          <Button
            testID="reveal-save"
            label={saved ? "Saved to wall ✓" : "Save to wall"}
            onPress={onSaveToWall}
            disabled={saved}
          />
          <Button testID="reveal-close" label="Close" variant="ghost" onPress={onClose} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  title: { color: T.text, fontFamily: SERIF, fontSize: 34, marginTop: 8 },
  prompt: { color: T.muted, fontSize: 15, textAlign: "center", marginTop: 10, lineHeight: 21 },
  answerCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: T.pad,
    marginBottom: 14,
  },
  answerName: {
    color: T.ember,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  answerBody: { color: T.text, fontSize: 18, lineHeight: 26 },
  streakRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 22 },
  streakText: { color: T.text, fontSize: 16, fontWeight: "600" },
  tease: { color: T.faint, fontSize: 14, textAlign: "center", marginTop: 14, fontStyle: "italic" },
});
