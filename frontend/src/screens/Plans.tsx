import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView, KeyboardStickyView } from "@/src/keyboard";
import { T, SERIF, MONO } from "@/src/theme";
import { Plan } from "@/src/screens/types";
import { PLAN_IDEAS, PlanIdea, ideaImageFor } from "@/src/media";
import Button from "@/src/components/Button";

export const CATEGORIES = [
  { v: "movie", l: "Movie", icon: "film-outline" },
  { v: "trip", l: "Trip", icon: "airplane-outline" },
  { v: "dinner", l: "Dinner", icon: "restaurant-outline" },
  { v: "outing", l: "Outing", icon: "walk-outline" },
  { v: "surprise", l: "Surprise", icon: "gift-outline" },
  { v: "other", l: "Other", icon: "sparkles-outline" },
] as const;

const DATE_CHIPS = [
  { l: "This weekend", days: "weekend" },
  { l: "In a week", days: 7 },
  { l: "In a month", days: 30 },
  { l: "No date", days: null },
] as const;

function isoFor(chip: (typeof DATE_CHIPS)[number]): string | null {
  if (chip.days === null) return null;
  const d = new Date();
  if (chip.days === "weekend") {
    const day = d.getDay();
    const add = (6 - day + 7) % 7 || 7; // next Saturday
    d.setDate(d.getDate() + add);
  } else {
    d.setDate(d.getDate() + (chip.days as number));
  }
  d.setHours(19, 0, 0, 0);
  return d.toISOString();
}

function catIcon(v: string): any {
  return CATEGORIES.find((c) => c.v === v)?.icon || "sparkles-outline";
}

function StatusChip({ status }: { status: Plan["status"] }) {
  const map: Record<string, { l: string; c: string }> = {
    proposed: { l: "PROPOSED", c: T.muted },
    confirmed: { l: "CONFIRMED", c: T.ember },
    done: { l: "DONE", c: "#7BA05B" },
  };
  const s = map[status] || map.proposed;
  return (
    <View style={[styles.statusChip, { borderColor: s.c }]}>
      <Text style={[styles.statusText, { color: s.c }]}>{s.l}</Text>
    </View>
  );
}

export default function Plans({
  plans,
  myDeviceId,
  partnerName,
  onCreate,
  onAccept,
  onComplete,
  onDelete,
  topInset,
  bottomInset,
  refreshing,
  onRefresh,
}: {
  plans: Plan[];
  myDeviceId: string;
  partnerName: string;
  onCreate: (p: {
    title: string;
    category: string;
    notes: string;
    when: string;
    date: string | null;
    image_url: string | null;
  }) => void;
  onAccept: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  topInset: number;
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("dinner");
  const [notes, setNotes] = useState("");
  const [dateIdx, setDateIdx] = useState(0);
  const [image, setImage] = useState<string | null>(null);

  const openBlank = () => {
    setTitle("");
    setNotes("");
    setCategory("dinner");
    setDateIdx(0);
    setImage(null);
    setComposing(true);
  };

  const openFromIdea = (idea: PlanIdea) => {
    setTitle(idea.title);
    setCategory(idea.category);
    setNotes(idea.blurb);
    setDateIdx(0);
    setImage(idea.image);
    setComposing(true);
  };

  const submit = () => {
    if (!title.trim()) return;
    const chip = DATE_CHIPS[dateIdx];
    onCreate({
      title: title.trim(),
      category,
      notes: notes.trim(),
      when: chip.days === null ? "" : chip.l,
      date: isoFor(chip),
      image_url: image || ideaImageFor(category),
    });
    setComposing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: bottomInset + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.ember} />
        }
      >
        <Text style={styles.header}>Plans</Text>
        <Text style={styles.sub}>Dates, cafés, trips — decided together.</Text>

        {/* Ideas rail */}
        <Text style={styles.railTitle}>Ideas to steal</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: T.pad, gap: 14, paddingBottom: 4 }}
        >
          {PLAN_IDEAS.map((idea) => (
            <Pressable
              key={idea.key}
              testID={`plan-idea-${idea.key}`}
              onPress={() => openFromIdea(idea)}
              style={styles.ideaCard}
            >
              <Image source={{ uri: idea.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFill} />
              <View style={styles.ideaBody}>
                <Text style={styles.ideaTitle}>{idea.title}</Text>
                <Text style={styles.ideaBlurb}>{idea.blurb}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.railTitle, { marginTop: 24 }]}>Your plans</Text>
        <View style={{ paddingHorizontal: T.pad }}>
          {plans.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={30} color={T.faint} />
              <Text style={styles.emptyText}>Tap an idea above, or the + button, to propose something.</Text>
            </View>
          ) : (
            plans.map((p) => {
              const mine = p.proposed_by === myDeviceId;
              const iAccepted = p.accepted_by?.includes(myDeviceId);
              return (
                <View key={p.id} testID={`plan-${p.id}`} style={styles.card}>
                  {p.image_url ? (
                    <Image source={{ uri: p.image_url }} style={styles.cardImage} contentFit="cover" transition={200} />
                  ) : null}
                  <View style={styles.cardTop}>
                    <View style={styles.catBadge}>
                      <Ionicons name={catIcon(p.category)} size={18} color={T.ember} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planTitle}>{p.title}</Text>
                      <Text style={styles.planMeta}>
                        {mine ? "You" : p.proposer_name || partnerName || "They"} proposed
                        {p.when ? ` · ${p.when}` : ""}
                      </Text>
                    </View>
                    <StatusChip status={p.status} />
                  </View>

                  {p.notes ? <Text style={styles.planNotes}>{p.notes}</Text> : null}

                  <View style={styles.actions}>
                    {p.status === "proposed" && !iAccepted && (
                      <Button testID={`plan-accept-${p.id}`} label="I'm in" onPress={() => onAccept(p.id)} style={{ flex: 1, height: 44 }} />
                    )}
                    {p.status === "proposed" && iAccepted && (
                      <Text style={styles.waiting}>Waiting for {partnerName || "them"} to say yes…</Text>
                    )}
                    {p.status === "confirmed" && (
                      <Button testID={`plan-complete-${p.id}`} label="Mark done" onPress={() => onComplete(p.id)} style={{ flex: 1, height: 44 }} />
                    )}
                    {p.status === "done" && <Text style={styles.doneNote}>Saved to your wall ✓</Text>}
                    {mine && p.status !== "done" && (
                      <Pressable testID={`plan-delete-${p.id}`} onPress={() => onDelete(p.id)} style={styles.trash}>
                        <Ionicons name="trash-outline" size={18} color={T.faint} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Pressable testID="plans-add-fab" onPress={openBlank} style={[styles.fab, { bottom: bottomInset + 16 }]}>
        <Ionicons name="add" size={30} color="#1A1207" />
      </Pressable>

      <Modal visible={composing} animationType="slide" transparent onRequestClose={() => setComposing(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { paddingBottom: bottomInset + 16 }]}>
            <View style={styles.sheetHandle} />
            <KeyboardAwareScrollView bottomOffset={80} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.sheetTitle}>Propose a plan</Text>

              {image ? (
                <Image source={{ uri: image }} style={styles.sheetImage} contentFit="cover" transition={200} />
              ) : null}

              <Text style={styles.label}>What is it?</Text>
              <TextInput
                testID="plan-title-input"
                style={styles.input}
                placeholder="Dinner at the rooftop place"
                placeholderTextColor={T.faint}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CATEGORIES.map((c) => {
                  const on = category === c.v;
                  return (
                    <Pressable key={c.v} testID={`plan-cat-${c.v}`} onPress={() => setCategory(c.v)} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                      <Ionicons name={c.icon as any} size={14} color={on ? "#1A1207" : T.muted} />
                      <Text style={[styles.chipText, { color: on ? "#1A1207" : T.muted }]}>{c.l}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>When</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {DATE_CHIPS.map((c, i) => {
                  const on = dateIdx === i;
                  return (
                    <Pressable key={c.l} testID={`plan-date-${i}`} onPress={() => setDateIdx(i)} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                      <Text style={[styles.chipText, { color: on ? "#1A1207" : T.muted }]}>{c.l}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                testID="plan-notes-input"
                style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
                placeholder="Anything they should know…"
                placeholderTextColor={T.faint}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </KeyboardAwareScrollView>

            <KeyboardStickyView offset={16}>
              <View style={{ gap: 10, marginTop: 8 }}>
                <Button testID="plan-submit" label="Propose it" onPress={submit} disabled={!title.trim()} />
                <Button testID="plan-cancel" label="Cancel" variant="ghost" onPress={() => setComposing(false)} />
              </View>
            </KeyboardStickyView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { color: T.text, fontSize: 32, fontWeight: "800", paddingHorizontal: T.pad },
  sub: { color: T.muted, fontSize: 14, marginTop: 6, marginBottom: 18, paddingHorizontal: T.pad },
  railTitle: { color: T.text, fontSize: 16, fontWeight: "700", marginBottom: 12, paddingHorizontal: T.pad },
  ideaCard: { width: 180, height: 220, borderRadius: 16, overflow: "hidden", justifyContent: "flex-end" },
  ideaBody: { padding: 14 },
  ideaTitle: { color: "#fff", fontFamily: SERIF, fontSize: 20, lineHeight: 23 },
  ideaBlurb: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20, gap: 14 },
  emptyText: { color: T.muted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, borderRadius: T.radius, padding: 16, marginBottom: 14, overflow: "hidden" },
  cardImage: { width: "100%", height: 130, borderRadius: 10, marginBottom: 14, backgroundColor: T.raised },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  catBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.raised, borderWidth: 1, borderColor: T.emberDim, alignItems: "center", justifyContent: "center" },
  planTitle: { color: T.text, fontSize: 18, fontWeight: "600" },
  planMeta: { color: T.faint, fontSize: 12, marginTop: 3 },
  planNotes: { color: T.muted, fontSize: 14, marginTop: 12, lineHeight: 20 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  waiting: { color: T.muted, fontSize: 13, flex: 1, fontStyle: "italic" },
  doneNote: { color: "#7BA05B", fontSize: 13, flex: 1 },
  trash: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: T.raised, borderWidth: 1, borderColor: T.line },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontFamily: MONO, fontSize: 9, letterSpacing: 1 },
  fab: { position: "absolute", right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: T.ember, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: T.line, paddingHorizontal: T.pad, paddingTop: 12, maxHeight: "88%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.line, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: T.text, fontFamily: SERIF, fontSize: 28, marginBottom: 12 },
  sheetImage: { width: "100%", height: 120, borderRadius: 12, marginBottom: 4, backgroundColor: T.raised },
  label: { color: T.muted, fontSize: 13, marginTop: 16, marginBottom: 8, letterSpacing: 0.3 },
  input: { backgroundColor: T.raised, borderWidth: 1, borderColor: T.line, borderRadius: T.radius, color: T.text, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, flexShrink: 0 },
  chipOn: { backgroundColor: T.ember, borderColor: T.ember },
  chipOff: { backgroundColor: T.raised, borderColor: T.line },
  chipText: { fontSize: 13, fontWeight: "600" },
});
