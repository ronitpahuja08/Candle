import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { T, SERIF } from "@/src/theme";
import { getDeviceId } from "@/src/device";
import * as api from "@/src/api";
import { Member } from "@/src/screens/types";
import Welcome from "@/src/screens/Welcome";
import Context from "@/src/screens/Context";
import FirstCard from "@/src/screens/FirstCard";
import Invite from "@/src/screens/Invite";
import Join from "@/src/screens/Join";
import MainApp from "@/src/MainApp";

type Route = "loading" | "welcome" | "context" | "firstcard" | "invite" | "join" | "main";

type Session = { pair: any; members: Member[]; partner: Member | null };

export default function Index() {
  const [route, setRoute] = useState<Route>("loading");
  const [deviceId, setDeviceId] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bootstrap: device id + resolve any existing pair.
  useEffect(() => {
    (async () => {
      const id = await getDeviceId();
      setDeviceId(id);
      try {
        const r = await api.pairsByDevice(id);
        if (r.pairs && r.pairs.length > 0) {
          const s = r.pairs[0];
          setSession({ pair: s.pair, members: s.members, partner: s.partner });
          setRoute("main");
          return;
        }
      } catch {}
      setRoute("welcome");
    })();
  }, []);

  // Invite screen: auto-advance the instant a second member appears.
  const startPolling = useCallback(
    (pairId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.pairsByDevice(deviceId);
          const mine = r.pairs?.find((x: any) => x.pair.id === pairId);
          if (mine && mine.members.length >= 2) {
            if (pollRef.current) clearInterval(pollRef.current);
            setSession({ pair: mine.pair, members: mine.members, partner: mine.partner });
            setRoute("main");
          }
        } catch {}
      }, 2000);
    },
    [deviceId]
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (route === "loading") {
    return (
      <View style={styles.loading}>
        <Text style={styles.brand}>Candle</Text>
        <ActivityIndicator color={T.ember} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (route === "welcome") {
    return (
      <Welcome
        onPick={(t) => {
          setType(t);
          setRoute("context");
        }}
        onHaveCode={() => {
          setJoinError(null);
          setRoute("join");
        }}
      />
    );
  }

  if (route === "context") {
    return (
      <Context
        loading={busy}
        onDone={async (a) => {
          setBusy(true);
          try {
            const r = await api.createPair({
              type,
              intent: a.intent,
              proximity: a.proximity,
              pace: a.pace,
              device_id: deviceId,
              name: a.name,
            });
            setSession({ pair: r.pair, members: r.members, partner: null });
            setRoute("firstcard");
          } catch {}
          setBusy(false);
        }}
      />
    );
  }

  if (route === "firstcard" && session) {
    return (
      <FirstCard
        submitting={busy}
        onLocked={async (body) => {
          setBusy(true);
          try {
            await api.submitResponse({
              pair_id: session.pair.id,
              prompt_index: session.pair.prompt_index ?? 0,
              device_id: deviceId,
              body,
            });
          } catch {}
          setBusy(false);
          setTimeout(() => {
            startPolling(session.pair.id);
            setRoute("invite");
          }, 1400);
        }}
      />
    );
  }

  if (route === "invite" && session) {
    return (
      <Invite
        code={session.pair.code}
        onHaveCode={() => {
          if (pollRef.current) clearInterval(pollRef.current);
          setJoinError(null);
          setRoute("join");
        }}
      />
    );
  }

  if (route === "join") {
    return (
      <Join
        loading={busy}
        error={joinError}
        onBack={() => setRoute("welcome")}
        onJoin={async (code, name) => {
          setBusy(true);
          setJoinError(null);
          try {
            const r = await api.joinPair({ code, device_id: deviceId, name });
            setSession({ pair: r.pair, members: r.members, partner: r.partner });
            setRoute("main");
          } catch (e: any) {
            setJoinError(e?.message || "Could not join. Check the code.");
          }
          setBusy(false);
        }}
      />
    );
  }

  if (route === "main" && session) {
    return (
      <MainApp
        pair={session.pair}
        members={session.members}
        partner={session.partner}
        deviceId={deviceId}
      />
    );
  }

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={T.ember} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" },
  brand: { color: T.text, fontFamily: SERIF, fontSize: 44 },
});
