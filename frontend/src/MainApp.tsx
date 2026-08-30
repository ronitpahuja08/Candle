import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { T, SERIF } from "@/src/theme";
import * as api from "@/src/api";
import { usePair } from "@/src/hooks/usePair";
import { CARDS, cardById, Card } from "@/src/cards";
import { Member, Memory, Plan, CardState } from "@/src/screens/types";
import Home from "@/src/screens/Home";
import Conversations from "@/src/screens/Conversations";
import Plans from "@/src/screens/Plans";
import Wall from "@/src/screens/Wall";
import CardDetail from "@/src/screens/CardDetail";
import Join from "@/src/screens/Join";
import Button from "@/src/components/Button";

type Tab = "home" | "conversations" | "memories";
type Overlay =
  | { type: "card"; card: Card }
  | { type: "plans" }
  | { type: "join" }
  | { type: "notice"; title: string; body: string }
  | null;

export default function MainApp({
  pair,
  members: initialMembers,
  partner,
  deviceId,
  onJoined,
}: {
  pair: any;
  members: Member[];
  partner: Member | null;
  deviceId: string;
  onJoined: (session: { pair: any; members: Member[]; partner: Member | null }) => void;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cardsState, setCardsState] = useState<Record<number, CardState>>({});
  const [refreshingWall, setRefreshingWall] = useState(false);
  const [refreshingPlans, setRefreshingPlans] = useState(false);
  const [refreshingConv, setRefreshingConv] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // One pair-wide realtime listener (kiss + refresh on any change).
  const hook = usePair(pair.id, 0, deviceId);

  const partnerName = useMemo(() => {
    const p = members.find((m) => m.device_id !== deviceId);
    return p?.name || partner?.name || "them";
  }, [members, partner, deviceId]);

  const connected = members.length >= 2;

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

  const loadCards = useCallback(async () => {
    try {
      const r = await api.getCardsState(pair.id, deviceId);
      const map: Record<number, CardState> = {};
      (r.cards || []).forEach((c: CardState) => (map[c.prompt_index] = c));
      setCardsState(map);
    } catch {}
  }, [pair.id, deviceId]);

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
    loadCards();
  }, [loadMemories, loadPlans, loadCards]);

  // Realtime push → refetch everything relevant.
  useEffect(() => {
    loadMemories();
    loadPlans();
    loadCards();
    loadMembers();
  }, [hook.dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMembers();
    loadCards();
  }, [hook.partnerJoined]); // eslint-disable-line react-hooks/exhaustive-deps

  const dailyCard = cardById(pair.prompt_index ?? 0);
  const dailyState = cardsState[dailyCard.id];

  const nextTrip = useMemo(() => {
    const withDate = plans.filter((p) => p.date && p.status !== "done");
    withDate.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return withDate.find((p) => p.status === "confirmed") || withDate[0] || null;
  }, [plans]);

  const shareCode = useCallback(async () => {
    try {
      await Share.share({
        message: `Join me on Candle — it's sealed until you answer too. Code: ${pair.code}`,
      });
    } catch {}
  }, [pair.code]);

  const openGame = useCallback((key: string) => {
    if (key === "perfect_pair" || key === "this_or_that") {
      const pairCards = CARDS.filter((c) => c.type === "pair");
      const fresh = pairCards.find((c) => !cardsState[c.id] || cardsState[c.id].state !== "revealed");
      setOverlay({ type: "card", card: fresh || pairCards[0] });
    } else {
      setOverlay({
        type: "notice",
        title: "Draw Duel",
        body: "This game lands in the next update. For now, try Perfect Pair or a photo card!",
      });
    }
  }, [cardsState]);

  const closeOverlay = useCallback(() => {
    setOverlay(null);
    loadCards();
    loadMemories();
  }, [loadCards, loadMemories]);

  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }}>
        {tab === "home" && (
          <Home
            streak={hook.streak}
            partnerName={partnerName}
            connected={connected}
            code={pair.code}
            dailyCard={dailyCard}
            dailyState={dailyState}
            nextTrip={nextTrip}
            topInset={insets.top}
            bottomInset={0}
            onOpenCard={(card) => setOverlay({ type: "card", card })}
            onOpenGame={openGame}
            onOpenPlans={() => setOverlay({ type: "plans" })}
            onKiss={hook.kiss}
            onEnterCode={() => {
              setJoinError(null);
              setOverlay({ type: "join" });
            }}
            onShare={shareCode}
          />
        )}
        {tab === "conversations" && (
          <Conversations
            stateByIndex={cardsState}
            topInset={insets.top}
            bottomInset={0}
            refreshing={refreshingConv}
            onRefresh={async () => {
              setRefreshingConv(true);
              await loadCards();
              setRefreshingConv(false);
            }}
            onOpenCard={(card) => setOverlay({ type: "card", card })}
          />
        )}
        {tab === "memories" && (
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

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        <TabButton label="Home" icon="flame-outline" iconOn="flame" active={tab === "home"} onPress={() => setTab("home")} testID="tab-home" />
        <TabButton label="Cards" icon="chatbubble-outline" iconOn="chatbubble" active={tab === "conversations"} onPress={() => setTab("conversations")} testID="tab-conversations" />
        <TabButton label="Memories" icon="images-outline" iconOn="images" active={tab === "memories"} onPress={() => setTab("memories")} testID="tab-memories" />
      </View>

      {/* Overlays */}
      <Modal
        visible={overlay?.type === "card"}
        animationType="slide"
        onRequestClose={closeOverlay}
      >
        {overlay?.type === "card" && (
          <CardDetail
            card={overlay.card}
            pairId={pair.id}
            deviceId={deviceId}
            members={members}
            partnerName={partnerName}
            onClose={closeOverlay}
          />
        )}
      </Modal>

      <Modal visible={overlay?.type === "plans"} animationType="slide" onRequestClose={closeOverlay}>
        <View style={{ flex: 1, backgroundColor: T.bg }}>
          <View style={[styles.overlayHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable testID="plans-close" onPress={closeOverlay} style={styles.iconBtn}>
              <Ionicons name="chevron-down" size={24} color={T.text} />
            </Pressable>
          </View>
          <Plans
            plans={plans}
            myDeviceId={deviceId}
            partnerName={partnerName}
            topInset={0}
            bottomInset={insets.bottom}
            refreshing={refreshingPlans}
            onRefresh={async () => {
              setRefreshingPlans(true);
              await loadPlans();
              setRefreshingPlans(false);
            }}
            onCreate={async (p) => {
              const me = members.find((m) => m.device_id === deviceId);
              await api.createPlan({ pair_id: pair.id, device_id: deviceId, name: me?.name, ...p });
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
        </View>
      </Modal>

      <Modal visible={overlay?.type === "join"} animationType="slide" onRequestClose={closeOverlay}>
        <Join
          loading={joining}
          error={joinError}
          onBack={closeOverlay}
          onJoin={async (code, name) => {
            setJoining(true);
            setJoinError(null);
            try {
              const r = await api.joinPair({ code, device_id: deviceId, name });
              onJoined({ pair: r.pair, members: r.members, partner: r.partner });
              setOverlay(null);
            } catch (e: any) {
              setJoinError(e?.message || "Could not join. Check the code.");
            }
            setJoining(false);
          }}
        />
      </Modal>

      <Modal visible={overlay?.type === "notice"} transparent animationType="fade" onRequestClose={closeOverlay}>
        <View style={styles.noticeBackdrop}>
          <View style={styles.noticeCard}>
            {overlay?.type === "notice" && (
              <>
                <Ionicons name="game-controller" size={30} color={T.ember} />
                <Text style={styles.noticeTitle}>{overlay.title}</Text>
                <Text style={styles.noticeBody}>{overlay.body}</Text>
                <Button testID="notice-close" label="Got it" onPress={closeOverlay} style={{ alignSelf: "stretch", marginTop: 8 }} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TabButton({ label, icon, iconOn, active, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.tabBtn}>
      <Ionicons name={active ? iconOn : icon} size={22} color={active ? T.ember : T.faint} />
      <Text style={[styles.tabLabel, { color: active ? T.text : T.faint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabBar: { flexDirection: "row", backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10 },
  tabBtn: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  overlayHeader: { paddingHorizontal: T.pad, paddingBottom: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: T.raised, borderWidth: 1, borderColor: T.line },
  noticeBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 30 },
  noticeCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, borderRadius: 18, padding: 26, alignItems: "center", gap: 12, width: "100%" },
  noticeTitle: { color: T.text, fontFamily: SERIF, fontSize: 26 },
  noticeBody: { color: T.muted, fontSize: 15, textAlign: "center", lineHeight: 22 },
});
