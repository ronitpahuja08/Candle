import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { T, SERIF } from "@/src/theme";
import { getDeviceId } from "@/src/device";
import * as api from "@/src/api";
import { Member } from "@/src/screens/types";
import Welcome from "@/src/screens/Welcome";
import Context from "@/src/screens/Context";
import FirstCard from "@/src/screens/FirstCard";
import Join from "@/src/screens/Join";
import MainApp from "@/src/MainApp";

type Route = "loading" | "welcome" | "context" | "firstcard" | "join" | "main";
type Session = { pair: any; members: Member[]; partner: Member | null };

export default function Index() {
  const [route, setRoute] = useState<Route>("loading");
  const [deviceId, setDeviceId] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

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
          try {
            await api.submitResponse({
              pair_id: session.pair.id,
              prompt_index: session.pair.prompt_index ?? 0,
              device_id: deviceId,
              body,
            });
          } catch {}
        }}
        onContinue={() => setRoute("main")}
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
        onJoined={(s) => setSession(s)}
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
