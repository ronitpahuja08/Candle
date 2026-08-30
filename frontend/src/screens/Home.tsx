import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { T, SERIF, MONO } from "@/src/theme";
import { Card, GAMES } from "@/src/cards";
import { CardState, Plan } from "@/src/screens/types";

function countdown(dateIso: string, now: number): string {
  const target = new Date(dateIso).getTime();
  let diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  diff -= d * 86400000;
  const h = Math.floor(diff / 3600000);
  diff -= h * 3600000;
  const m = Math.floor(diff / 60000);
  diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  return `in ${d}d ${h}h ${m}m ${s}s`;
}

export default function Home({
  streak,
  partnerName,
  connected,
  code,
  dailyCard,
  dailyState,
  nextTrip,
  onOpenCard,
  onOpenGame,
  onOpenPlans,
  onKiss,
  onEnterCode,
  onShare,
  topInset,
  bottomInset,
}: {
  streak: number;
  partnerName: string;
  connected: boolean;
  code: string;
  dailyCard: Card;
  dailyState?: CardState;
  nextTrip?: Plan | null;
  onOpenCard: (card: Card) => void;
  onOpenGame: (key: string) => void;
  onOpenPlans: () => void;
  onKiss: () => void;
  onEnterCode: () => void;
  onShare: () => void;
  topInset: number;
  bottomInset: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const dailyBadge = !dailyState
    ? "Your move"
    : dailyState.state === "revealed"
    ? "Opened"
    : dailyState.state === "their_turn"
    ? "Your move"
    : "Waiting";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Connect</Text>
          <View style={styles.flamePill}>
            <Text style={styles.flameNum}>{streak}</Text>
            <Ionicons name="flame" size={22} color="#FFB020" />
          </View>
        </View>

        {/* Connect banner (until partner joins) */}
        {!connected && (
          <LinearGradient colors={["#E8792B", "#B45309"]} style={styles.connectCard}>
            <Text style={styles.connectKicker}>WAITING FOR THEM</Text>
            <Text style={styles.connectCode} onPress={async () => await Clipboard.setStringAsync(code)}>
              {code}
            </Text>
            <Text style={styles.connectHint}>Share this code, or enter theirs.</Text>
            <View style={styles.connectBtns}>
              <Pressable testID="home-share-code" onPress={onShare} style={styles.connectBtn}>
                <Ionicons name="share-outline" size={16} color="#1A1207" />
                <Text style={styles.connectBtnText}>Send code</Text>
              </Pressable>
              <Pressable testID="home-enter-code" onPress={onEnterCode} style={styles.connectBtnAlt}>
                <Text style={styles.connectBtnAltText}>Enter their code</Text>
              </Pressable>
            </View>
          </LinearGradient>
        )}

        {/* Fun & Light */}
        <Text style={styles.section}>Fun & Light</Text>
        <View style={styles.row}>
          <Pressable
            testID="home-daily-card"
            onPress={() => onOpenCard(dailyCard)}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={[dailyCard.accent, dailyCard.accent2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featCard}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{dailyBadge}</Text>
              </View>
              <Text style={styles.featText} numberOfLines={4}>
                {dailyCard.text}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable testID="home-trip-card" onPress={onOpenPlans} style={{ flex: 1 }}>
            <LinearGradient colors={["#1E3A5F", "#0B1D30"]} style={styles.featCard}>
              <View style={styles.viewAll}>
                <Text style={styles.viewAllText}>View all</Text>
              </View>
              {nextTrip && nextTrip.date ? (
                <>
                  <Text style={styles.tripCountdown}>{countdown(nextTrip.date, now)}</Text>
                  <Text style={styles.tripTitle} numberOfLines={2}>
                    {nextTrip.title}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="airplane" size={26} color="#7FB2E5" />
                  <Text style={styles.tripTitle}>Plan something together</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Arcade */}
        <Text style={styles.section}>Arcade</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: T.pad, gap: 14 }}
        >
          {GAMES.map((g) => (
            <Pressable
              key={g.key}
              testID={`home-game-${g.key}`}
              onPress={() => onOpenGame(g.key)}
            >
              <LinearGradient colors={[g.accent, g.accent2]} style={styles.gameCard}>
                <View style={styles.gameTop}>
                  {!g.playable ? (
                    <View style={styles.newBadge}>
                      <Text style={styles.newText}>Soon</Text>
                    </View>
                  ) : (
                    <View style={{ width: 1 }} />
                  )}
                  <View style={styles.playPill}>
                    <Ionicons name="game-controller" size={12} color="#1A1207" />
                    <Text style={styles.playText}>Play</Text>
                  </View>
                </View>
                <Ionicons name={g.icon as any} size={26} color="rgba(255,255,255,0.9)" />
                <Text style={styles.gameLabel}>{g.label}</Text>
                <Text style={styles.gameTitle}>{g.title}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        {/* Thumb Kiss */}
        <Text style={styles.section}>Thumb Kiss</Text>
        <View style={styles.kissPanel}>
          <View style={styles.kissHeader}>
            <View style={styles.kissChip}>
              <Ionicons name="heart" size={12} color={T.ember} />
              <Text style={styles.kissChipText}>{partnerName || "them"}</Text>
            </View>
          </View>
          <Pressable testID="home-thumb-kiss" onPress={onKiss} style={styles.fingerprintWrap}>
            <Ionicons name="finger-print" size={96} color={T.ember} />
            <Text style={styles.kissHint}>Press to buzz {partnerName || "them"}</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    marginBottom: 10,
  },
  brand: { color: T.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  flamePill: { flexDirection: "row", alignItems: "center", gap: 6 },
  flameNum: { color: T.text, fontSize: 26, fontWeight: "800" },
  connectCard: { marginHorizontal: T.pad, borderRadius: 18, padding: 20, marginBottom: 8 },
  connectKicker: { color: "rgba(26,18,7,0.7)", fontSize: 11, letterSpacing: 2, fontWeight: "800" },
  connectCode: {
    color: "#1A1207",
    fontFamily: MONO,
    fontSize: 46,
    letterSpacing: 8,
    fontWeight: "800",
    marginVertical: 6,
  },
  connectHint: { color: "rgba(26,18,7,0.8)", fontSize: 13, marginBottom: 14 },
  connectBtns: { flexDirection: "row", gap: 10 },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1A1207",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  connectBtnText: { color: "#F5F0EA", fontSize: 14, fontWeight: "600" },
  connectBtnAlt: {
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(26,18,7,0.5)",
  },
  connectBtnAltText: { color: "#1A1207", fontSize: 14, fontWeight: "600" },
  section: {
    color: T.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 14,
    paddingHorizontal: T.pad,
  },
  row: { flexDirection: "row", gap: 14, paddingHorizontal: T.pad },
  featCard: { borderRadius: 18, padding: 16, height: 190, justifyContent: "space-between" },
  badge: { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  featText: { color: "#fff", fontFamily: SERIF, fontSize: 22, lineHeight: 26 },
  viewAll: { alignSelf: "flex-end", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  viewAllText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tripCountdown: { color: "#CFE3F5", fontSize: 13, fontWeight: "600" },
  tripTitle: { color: "#fff", fontFamily: SERIF, fontSize: 22, lineHeight: 26, marginTop: 4 },
  gameCard: { width: 230, height: 180, borderRadius: 18, padding: 16, justifyContent: "space-between" },
  gameTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  newBadge: { backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  newText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  playPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  playText: { color: "#1A1207", fontSize: 12, fontWeight: "700" },
  gameLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" },
  gameTitle: { color: "#fff", fontFamily: SERIF, fontSize: 22, lineHeight: 26 },
  kissPanel: {
    marginHorizontal: T.pad,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 18,
    padding: 18,
  },
  kissHeader: { flexDirection: "row", justifyContent: "space-between" },
  kissChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: T.raised, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  kissChipText: { color: T.text, fontSize: 13, fontWeight: "600" },
  fingerprintWrap: { alignItems: "center", paddingVertical: 18, gap: 10 },
  kissHint: { color: T.muted, fontSize: 14 },
});
