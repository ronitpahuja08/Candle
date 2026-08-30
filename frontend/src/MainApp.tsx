import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/src/theme";
import * as api from "@/src/api";
import { usePair } from "@/src/hooks/usePair";
import { PROMPTS } from "@/src/prompts";
import { Member, Memory, Plan } from "@/src/screens/types";
import Today from "@/src/screens/Today";
import Plans from "@/src/screens/Plans";
import Wall from "@/src/screens/Wall";
import Reveal from "@/src/screens/Reveal";

type Tab = "today" | "plans" | "wall";

export default function MainApp({
  pair,
  members: initialMembers,
  partner,
  deviceId,
}: {
  pair: any;
  members: Member[];
  partner: Member | null;
  deviceId: string;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("today");
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [refreshingWall, setRefreshingWall] = useState(false);
  const [refreshingPlans, setRefreshingPlans] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [saved, setSaved] = useState(false);

  const promptIndex = pair.prompt_index ?? 0;
  const promptText = PROMPTS[promptIndex]?.text || PROMPTS[0].text;

  const hook = usePair(pair.id, promptIndex, deviceId);

  const partnerName = useMemo(() => {
    const p = members.find((m) => m.device_id !== deviceId);
    return p?.name || partner?.name || "them";
  }, [members, partner, deviceId]);

  const loadMemories = useCallback(async () => {
    try {
      const r = await api.getMemories(pair.id);
      setMemories(r.memories || []);
    } catch {}
  }, [pair.id]);

  const loadPlans = useCallback(async () => {
    try {
      const r = await api.getPlans(pair.id);
      setPlans(r.plans || []);
    } catch {}
  }, [pair.id]);

  const loadMembers = useCallback(async () => {
    try {
      const r = await api.pairsByDevice(deviceId);
      const mine = r.pairs?.find((x: any) => x.pair.id === pair.id);
      if (mine) setMembers(mine.members);
    } catch {}
  }, [deviceId, pair.id]);

  useEffect(() => {
    loadMemories();
    loadPlans();
  }, [loadMemories, loadPlans]);

  // Realtime data pushes → refetch.
  useEffect(() => {
    loadMemories();
    loadPlans();
    loadMembers();
  }, [hook.dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMembers();
  }, [hook.partnerJoined]); // eslint-disable-line react-hooks/exhaustive-deps

  // The reveal moment auto-opens on both phones.
  useEffect(() => {
    if (hook.reveal) {
      setSaved(false);
      setShowReveal(true);
    }
  }, [hook.reveal]);

  const onSaveToWall = useCallback(async () => {
    const others = (hook.revealed || []).find((r) => r.device_id !== deviceId);
    try {
      await api.addMemory({
        pair_id: pair.id,
        kind: "two_views",
        title: promptText.length > 42 ? promptText.slice(0, 42) + "…" : promptText,
        subtitle: `Both answered · ${partnerName} & you`,
        body: others?.body || null,
      });
      setSaved(true);
      loadMemories();
    } catch {}
  }, [hook.revealed, deviceId, pair.id, promptText, partnerName, loadMemories]);

  const revealData = hook.reveal?.responses || hook.revealed || [];

  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }}>
        {tab === "today" && (
          <Today
            promptText={promptText}
            state={hook.state}
            partnerName={partnerName}
            streak={hook.streak}
            topInset={insets.top}
            onSubmit={(b) => b && hook.submit(b)}
            onKiss={hook.kiss}
            onOpenReveal={() => setShowReveal(true)}
          />
        )}
        {tab === "plans" && (
          <Plans
            plans={plans}
            myDeviceId={deviceId}
            partnerName={partnerName}
            topInset={insets.top}
            bottomInset={0}
            refreshing={refreshingPlans}
            onRefresh={async () => {
              setRefreshingPlans(true);
              await loadPlans();
              setRefreshingPlans(false);
            }}
            onCreate={async (title, category, notes, when) => {
              const p = members.find((m) => m.device_id === deviceId);
              await api.createPlan({
                pair_id: pair.id,
                device_id: deviceId,
                name: p?.name,
                title,
                category,
                notes,
                when,
              });
              loadPlans();
            }}
            onAccept={async (id) => {
              await api.acceptPlan(id, deviceId);
              loadPlans();
            }}
            onComplete={async (id) => {
              await api.completePlan(id, deviceId);
              loadPlans();
              loadMemories();
            }}
            onDelete={async (id) => {
              await api.deletePlan(id, deviceId);
              loadPlans();
            }}
          />
        )}
        {tab === "wall" && (
          <Wall
            memories={memories}
            topInset={insets.top}
            bottomInset={0}
            refreshing={refreshingWall}
            onRefresh={async () => {
              setRefreshingWall(true);
              await loadMemories();
              setRefreshingWall(false);
            }}
          />
        )}
      </View>

      {/* Custom bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        <TabButton
          label="Today"
          icon="today-outline"
          iconOn="today"
          active={tab === "today"}
          onPress={() => setTab("today")}
          testID="tab-today"
        />
        <TabButton
          label="Plans"
          icon="calendar-outline"
          iconOn="calendar"
          active={tab === "plans"}
          onPress={() => setTab("plans")}
          testID="tab-plans"
        />
        <TabButton
          label="Wall"
          icon="images-outline"
          iconOn="images"
          active={tab === "wall"}
          onPress={() => setTab("wall")}
          testID="tab-wall"
        />
      </View>

      {/* Reveal overlay */}
      <Modal visible={showReveal} animationType="fade" onRequestClose={() => setShowReveal(false)}>
        <Reveal
          promptText={promptText}
          responses={revealData}
          members={members}
          myDeviceId={deviceId}
          streak={hook.reveal?.streak ?? hook.streak}
          saved={saved}
          onSaveToWall={onSaveToWall}
          onClose={() => {
            setShowReveal(false);
            hook.clearReveal();
          }}
        />
      </Modal>
    </View>
  );
}

function TabButton({
  label,
  icon,
  iconOn,
  active,
  onPress,
  testID,
}: {
  label: string;
  icon: any;
  iconOn: any;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.tabBtn}>
      <Ionicons name={active ? iconOn : icon} size={22} color={active ? T.ember : T.faint} />
      <Text style={[styles.tabLabel, { color: active ? T.text : T.faint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabBar: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.line,
    paddingTop: 10,
  },
  tabBtn: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
});
