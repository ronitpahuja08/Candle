import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView, KeyboardStickyView } from "@/src/keyboard";
import { T, SERIF } from "@/src/theme";
import { Card } from "@/src/cards";
import * as api from "@/src/api";
import { usePair } from "@/src/hooks/usePair";
import { Member } from "@/src/screens/types";
import Button from "@/src/components/Button";

export default function CardDetail({
  card,
  pairId,
  deviceId,
  members,
  partnerName,
  onClose,
  onSaved,
}: {
  card: Card;
  pairId: string;
  deviceId: string;
  members: Member[];
  partnerName: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const hook = usePair(pairId, card.id, deviceId);
  const [body, setBody] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [permBlocked, setPermBlocked] = useState(false);
  const [saved, setSaved] = useState(false);

  const nameFor = (id: string) => {
    if (id === deviceId) return "You";
    return members.find((m) => m.device_id === id)?.name || partnerName || "Them";
  };

  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) setPermBlocked(true);
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) {
      setLocalImage(res.assets[0].uri);
    }
  };

  const submit = async () => {
    if (card.type === "photo") {
      if (!localImage) return;
      setUploading(true);
      try {
        const name = `photo_${Date.now()}.jpg`;
        const up = await api.uploadPhoto(localImage, name, "image/jpeg", deviceId, pairId);
        await hook.submit({ image_path: up.path, body: body.trim() });
      } catch {}
      setUploading(false);
    } else if (card.type === "pair") {
      if (!choice) return;
      await hook.submit({ body: choice });
    } else {
      if (!body.trim()) return;
      await hook.submit({ body: body.trim() });
    }
  };

  const saveToWall = async () => {
    const rows = hook.revealed || [];
    const other = rows.find((r) => r.device_id !== deviceId);
    const withPhoto = rows.find((r) => r.image_path);
    try {
      await api.addMemory({
        pair_id: pairId,
        kind: card.type === "photo" ? "occasion" : "two_views",
        title: card.text.length > 46 ? card.text.slice(0, 46) + "…" : card.text,
        subtitle: `${card.category} · you & ${partnerName}`,
        body: other?.body || null,
        image_url: withPhoto?.image_path ? api.fileUrl(withPhoto.image_path) : null,
      });
      setSaved(true);
      onSaved?.();
    } catch {}
  };

  const revealed = hook.state === "revealed";
  const canAnswer = hook.state === "open" || hook.state === "their_turn";

  // ---- REVEAL VIEW ----
  if (revealed) {
    const rows = [...(hook.revealed || [])].sort((a, b) => {
      const am = a.device_id === deviceId ? 1 : 0;
      const bm = b.device_id === deviceId ? 1 : 0;
      return am - bm;
    });
    const matched =
      card.type === "pair" &&
      rows.length === 2 &&
      rows[0].body === rows[1].body;

    return (
      <View style={styles.container}>
        <LinearGradient colors={[card.accent2, T.bg]} style={StyleSheet.absoluteFill} />
        <Header onClose={onClose} topInset={insets.top} onKiss={hook.kiss} />
        <ScrollView
          contentContainerStyle={{ padding: T.pad, paddingBottom: insets.bottom + 30 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn} style={{ alignItems: "center", marginBottom: 20 }}>
            <Ionicons name="sparkles" size={24} color={T.text} />
            <Text style={styles.revealTitle}>
              {card.type === "pair" ? (matched ? "You matched!" : "Not quite!") : "Both answered."}
            </Text>
            <Text style={styles.revealPrompt}>{card.text}</Text>
          </Animated.View>

          {rows.map((r, i) => (
            <Animated.View
              key={r.id}
              entering={FadeInUp.springify().damping(16).delay(i * 130)}
              style={styles.answerCard}
              testID={`reveal-answer-${i}`}
            >
              <Text style={[styles.answerName, { color: card.accent }]}>{nameFor(r.device_id)}</Text>
              {r.image_path ? (
                <Image
                  source={{ uri: api.fileUrl(r.image_path) }}
                  style={styles.answerImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : null}
              {r.body ? <Text style={styles.answerBody}>{r.body}</Text> : null}
            </Animated.View>
          ))}

          <View style={styles.streakRow}>
            <Ionicons name="flame" size={18} color="#FFB020" />
            <Text style={styles.streakText}>{hook.streak} day streak</Text>
          </View>

          <View style={{ gap: 12, marginTop: 20 }}>
            <Button
              testID="carddetail-save"
              label={saved ? "Saved to wall ✓" : "Save to wall"}
              onPress={saveToWall}
              disabled={saved}
            />
            <Button testID="carddetail-close" label="Done" variant="ghost" onPress={onClose} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---- ANSWER VIEW ----
  return (
    <View style={styles.container}>
      <Header onClose={onClose} topInset={insets.top} onKiss={hook.kiss} />
      <KeyboardAwareScrollView
        bottomOffset={90}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: T.pad, paddingBottom: 40 }}
      >
        {/* Hero prompt card in the category colour */}
        <LinearGradient
          colors={[card.accent, card.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroCat}>{card.category.toUpperCase()}</Text>
          <Text style={styles.heroText}>{card.text}</Text>
        </LinearGradient>

        {hook.state === "their_turn" && (
          <View style={styles.theirTurn}>
            <Ionicons name="mail-unread" size={16} color={card.accent} />
            <Text style={styles.theirTurnText}>
              {partnerName} answered. They're waiting on you.
            </Text>
          </View>
        )}

        {hook.state === "waiting" ? (
          <View testID="carddetail-waiting" style={styles.sealed}>
            <Ionicons name="lock-closed" size={26} color={card.accent} />
            <Text style={styles.sealedTitle}>Locked.</Text>
            <Text style={styles.sealedSub}>Waiting for {partnerName}…</Text>
          </View>
        ) : card.type === "pair" ? (
          <View style={{ gap: 12, marginTop: 20 }}>
            {(card.options || []).map((o) => {
              const on = choice === o;
              return (
                <Pressable
                  key={o}
                  testID={`carddetail-option-${o}`}
                  onPress={() => setChoice(o)}
                  style={[styles.option, on && { borderColor: card.accent, backgroundColor: T.raised }]}
                >
                  <Text style={[styles.optionText, on && { color: T.text }]}>{o}</Text>
                  {on && <Ionicons name="checkmark-circle" size={20} color={card.accent} />}
                </Pressable>
              );
            })}
          </View>
        ) : card.type === "photo" ? (
          <View style={{ marginTop: 20 }}>
            {localImage ? (
              <View>
                <Image source={{ uri: localImage }} style={styles.preview} contentFit="cover" />
                <Pressable
                  testID="carddetail-photo-change"
                  onPress={() => setLocalImage(null)}
                  style={styles.changeBtn}
                >
                  <Ionicons name="close" size={16} color={T.text} />
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable testID="carddetail-pick" onPress={() => pick(false)} style={styles.pickBtn}>
                  <Ionicons name="images-outline" size={22} color={card.accent} />
                  <Text style={styles.pickText}>Choose</Text>
                </Pressable>
                <Pressable testID="carddetail-camera" onPress={() => pick(true)} style={styles.pickBtn}>
                  <Ionicons name="camera-outline" size={22} color={card.accent} />
                  <Text style={styles.pickText}>Camera</Text>
                </Pressable>
              </View>
            )}
            {permBlocked && (
              <Pressable onPress={() => Linking.openSettings()} style={styles.settingsBtn}>
                <Text style={styles.settingsText}>Enable photo access in Settings</Text>
              </Pressable>
            )}
            <TextInput
              testID="carddetail-caption"
              style={styles.caption}
              placeholder="Add a caption (optional)"
              placeholderTextColor={T.faint}
              value={body}
              onChangeText={setBody}
            />
          </View>
        ) : (
          <TextInput
            testID="carddetail-input"
            style={styles.input}
            placeholder="Your answer, sealed until they answer too…"
            placeholderTextColor={T.faint}
            value={body}
            onChangeText={setBody}
            multiline
          />
        )}
      </KeyboardAwareScrollView>

      {canAnswer && (
        <KeyboardStickyView offset={insets.bottom + 12}>
          <View style={{ paddingHorizontal: T.pad, paddingBottom: insets.bottom + 12 }}>
            <Button
              testID="carddetail-lock"
              label="Lock it in"
              onPress={submit}
              loading={uploading}
              disabled={
                (card.type === "photo" && !localImage) ||
                (card.type === "pair" && !choice) ||
                (card.type === "question" && !body.trim())
              }
            />
          </View>
        </KeyboardStickyView>
      )}
    </View>
  );
}

function Header({
  onClose,
  topInset,
  onKiss,
}: {
  onClose: () => void;
  topInset: number;
  onKiss: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: topInset + 8 }]}>
      <Pressable testID="carddetail-back" onPress={onClose} style={styles.iconBtn}>
        <Ionicons name="chevron-down" size={24} color={T.text} />
      </Pressable>
      <Pressable testID="carddetail-kiss" onPress={onKiss} style={styles.iconBtn}>
        <Ionicons name="finger-print" size={20} color={T.ember} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: T.pad,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.raised,
    borderWidth: 1,
    borderColor: T.line,
  },
  hero: {
    borderRadius: 20,
    padding: 24,
    minHeight: 200,
    justifyContent: "flex-end",
  },
  heroCat: { color: "rgba(255,255,255,0.8)", fontSize: 12, letterSpacing: 2, fontWeight: "800", marginBottom: 14 },
  heroText: { color: "#fff", fontFamily: SERIF, fontSize: 30, lineHeight: 36 },
  theirTurn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.raised,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: 14,
    marginTop: 16,
  },
  theirTurnText: { color: T.text, fontSize: 14, flex: 1 },
  input: {
    marginTop: 20,
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
    marginTop: 20,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: 30,
    alignItems: "center",
    gap: 8,
  },
  sealedTitle: { color: T.text, fontFamily: SERIF, fontSize: 26, marginTop: 6 },
  sealedSub: { color: T.muted, fontSize: 15 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.line,
    borderRadius: T.radius,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  optionText: { color: T.muted, fontSize: 20, fontWeight: "600" },
  preview: { width: "100%", height: 260, borderRadius: T.radius, backgroundColor: T.raised },
  changeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtn: {
    flex: 1,
    height: 110,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickText: { color: T.text, fontSize: 15, fontWeight: "500" },
  settingsBtn: { marginTop: 12, alignItems: "center" },
  settingsText: { color: T.ember, fontSize: 14 },
  caption: {
    marginTop: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: T.text,
    fontSize: 15,
  },
  revealTitle: { color: T.text, fontFamily: SERIF, fontSize: 32, marginTop: 8 },
  revealPrompt: { color: T.muted, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  answerCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: T.pad,
    marginBottom: 14,
  },
  answerName: { fontSize: 13, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  answerBody: { color: T.text, fontSize: 18, lineHeight: 26 },
  answerImage: { width: "100%", height: 220, borderRadius: 10, marginBottom: 12, backgroundColor: T.raised },
  streakRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18 },
  streakText: { color: T.text, fontSize: 16, fontWeight: "600" },
});
