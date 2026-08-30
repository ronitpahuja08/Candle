import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, SERIF, MONO } from "@/src/theme";
import { CARDS, Card } from "@/src/cards";
import { CardState } from "@/src/screens/types";

const FILTERS = ["Today", "All", "Your move"] as const;
type Filter = (typeof FILTERS)[number];

function typeIcon(t: string): any {
  return t === "photo" ? "camera" : t === "pair" ? "git-compare" : "chatbubble-ellipses";
}

export default function Conversations({
  stateByIndex,
  onOpenCard,
  topInset,
  bottomInset,
  refreshing,
  onRefresh,
}: {
  stateByIndex: Record<number, CardState>;
  onOpenCard: (card: Card) => void;
  topInset: number;
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("Today");

  const visible = CARDS.filter((c) => {
    const s = stateByIndex[c.id];
    if (filter === "Today") return c.id < 6; // today's set
    if (filter === "Your move") return s?.state === "their_turn";
    return true;
  });

  const statusLabel = (c: Card): { text: string; color: string } => {
    const s = stateByIndex[c.id];
    if (!s) return { text: "Answer", color: c.accent };
    if (s.state === "revealed") return { text: "Opened", color: T.muted };
    if (s.state === "their_turn") return { text: "Your move", color: c.accent };
    return { text: "Sealed", color: T.faint };
  };

  return (
    <View style={styles.container}>
      {/* Sticky header + filter chips */}
      <View style={{ paddingTop: topInset + 8 }}>
        <Text style={styles.title}>Conversations</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <Pressable
                key={f}
                testID={`conv-filter-${f.replace(/\s/g, "-")}`}
                onPress={() => setFilter(f)}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
              >
                <Text style={[styles.chipText, { color: on ? "#0A0A0A" : T.muted }]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomInset + 24, paddingHorizontal: T.pad }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.ember} />
        }
      >
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={30} color={T.faint} />
            <Text style={styles.emptyText}>Nothing waiting on you right now.</Text>
          </View>
        ) : (
          visible.map((c) => {
            const st = statusLabel(c);
            return (
              <Pressable
                key={c.id}
                testID={`conv-card-${c.id}`}
                onPress={() => onOpenCard(c)}
                style={styles.item}
              >
                <View style={[styles.stripe, { backgroundColor: c.accent }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTop}>
                    <View style={styles.catRow}>
                      <Ionicons name={typeIcon(c.type)} size={13} color={c.accent} />
                      <Text style={[styles.cat, { color: c.accent }]}>{c.category}</Text>
                    </View>
                    <View style={[styles.status, { borderColor: st.color }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemText} numberOfLines={3}>
                    {c.text}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  title: { color: T.text, fontSize: 30, fontWeight: "800", paddingHorizontal: T.pad, marginBottom: 14 },
  chipRow: { gap: 10, paddingHorizontal: T.pad, paddingBottom: 12 },
  chip: { height: 36, paddingHorizontal: 18, borderRadius: 999, justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  chipOn: { backgroundColor: T.text, borderColor: T.text },
  chipOff: { backgroundColor: T.surface, borderColor: T.line },
  chipText: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 70, gap: 12 },
  emptyText: { color: T.muted, fontSize: 15 },
  item: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    overflow: "hidden",
  },
  stripe: { width: 4, borderRadius: 2, alignSelf: "stretch" },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cat: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  status: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  itemText: { color: T.text, fontFamily: SERIF, fontSize: 21, lineHeight: 26 },
});
