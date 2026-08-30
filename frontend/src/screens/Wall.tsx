import React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { T, SERIF, SERIF_ITALIC, MONO } from "@/src/theme";
import { Memory } from "@/src/screens/types";

const GRADIENTS: [string, string][] = [
  ["#3A2A1C", "#1C1917"],
  ["#2A2436", "#161320"],
  ["#1F2E2A", "#141C1A"],
  ["#3A1F22", "#1E1214"],
  ["#2E2A18", "#1A1810"],
  ["#24303A", "#12181E"],
];

function grad(seed: string, offset = 0): [string, string] {
  let h = offset;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[h];
}

function stamp(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d
    .toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

function Ph({ colors, style }: { colors: [string, string]; style?: any }) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.ph, style]}
    />
  );
}

function MemoryCard({ m }: { m: Memory }) {
  if (m.kind === "two_views") {
    return (
      <View testID={`memory-${m.id}`} style={styles.card}>
        <View style={styles.twoRow}>
          <Ph colors={grad(m.id, 0)} style={{ flex: 1, height: 130 }} />
          <Ph colors={grad(m.id, 3)} style={{ flex: 1, height: 130 }} />
        </View>
        <Text style={styles.date}>{stamp(m.occurred_on)}</Text>
        <Text style={styles.title}>{m.title}</Text>
        {m.subtitle ? <Text style={styles.caption}>{m.subtitle}</Text> : null}
      </View>
    );
  }

  if (m.kind === "month") {
    return (
      <View testID={`memory-${m.id}`} style={styles.card}>
        <View style={styles.gridWrap}>
          <View style={styles.gridRow}>
            <Ph colors={grad(m.id, 0)} style={styles.gridCell} />
            <Ph colors={grad(m.id, 1)} style={styles.gridCell} />
          </View>
          <View style={styles.gridRow}>
            <Ph colors={grad(m.id, 2)} style={styles.gridCell} />
            <Ph colors={grad(m.id, 3)} style={styles.gridCell} />
          </View>
        </View>
        <Text style={styles.title}>{m.title}</Text>
        {m.subtitle ? <Text style={styles.stat}>{m.subtitle}</Text> : null}
      </View>
    );
  }

  // occasion
  return (
    <View testID={`memory-${m.id}`} style={styles.card}>
      <Ph colors={grad(m.id, 1)} style={{ height: 170 }} />
      <Text style={styles.date}>{stamp(m.occurred_on)}</Text>
      <Text style={styles.title}>{m.title}</Text>
      {m.body ? <Text style={styles.note}>“{m.body}”</Text> : null}
    </View>
  );
}

export default function Wall({
  memories,
  topInset,
  bottomInset,
  refreshing,
  onRefresh,
}: {
  memories: Memory[];
  topInset: number;
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + 14,
          paddingBottom: bottomInset + 24,
          paddingHorizontal: T.pad,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.ember} />
        }
      >
        <Text style={styles.header}>The wall</Text>
        <Text style={styles.sub}>Everything the two of you kept.</Text>
        {memories.map((m) => (
          <MemoryCard key={m.id} m={m} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { color: T.text, fontFamily: SERIF, fontSize: 34 },
  sub: { color: T.muted, fontSize: 14, marginTop: 6, marginBottom: 22 },
  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: 14,
    marginBottom: 16,
  },
  ph: { borderRadius: 10, overflow: "hidden" },
  twoRow: { flexDirection: "row", gap: 8 },
  gridWrap: { gap: 8 },
  gridRow: { flexDirection: "row", gap: 8 },
  gridCell: { flex: 1, height: 84 },
  date: {
    color: T.faint,
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 14,
  },
  title: { color: T.text, fontFamily: SERIF, fontSize: 24, marginTop: 4, lineHeight: 28 },
  caption: { color: T.muted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  stat: { color: T.ember, fontFamily: MONO, fontSize: 12, letterSpacing: 0.5, marginTop: 8 },
  note: { color: T.muted, fontFamily: SERIF_ITALIC, fontSize: 17, marginTop: 8, lineHeight: 24 },
});
