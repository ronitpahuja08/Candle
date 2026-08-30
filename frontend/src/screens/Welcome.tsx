import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T, SERIF } from "@/src/theme";
import Button from "@/src/components/Button";

const TILES = [
  { key: "partner", label: "Partner", icon: "♥" },
  { key: "long_distance", label: "Long-distance partner", icon: "✈" },
  { key: "parent", label: "Parent", icon: "☂" },
  { key: "sibling", label: "Sibling", icon: "◑" },
  { key: "friend", label: "Best friend", icon: "✶" },
  { key: "drifted", label: "Someone I've drifted from", icon: "↺" },
];

export default function Welcome({
  onPick,
  onHaveCode,
}: {
  onPick: (type: string) => void;
  onHaveCode: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: T.pad,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>CANDLE</Text>
        <Text testID="welcome-headline" style={styles.headline}>
          Who do you want to feel closer to?
        </Text>

        <View style={styles.grid}>
          {TILES.map((t) => (
            <Pressable
              key={t.key}
              testID={`welcome-tile-${t.key}`}
              onPress={() => onPick(t.key)}
              style={({ pressed }) => [
                styles.tile,
                pressed && { borderColor: T.ember, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.tileIcon}>{t.icon}</Text>
              <Text style={styles.tileLabel}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 28, alignItems: "center" }}>
          <Button
            testID="welcome-have-code"
            label="I have an invite code"
            variant="ghost"
            onPress={onHaveCode}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  kicker: {
    color: T.ember,
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: "700",
    marginBottom: 18,
  },
  headline: {
    color: T.text,
    fontFamily: SERIF,
    fontSize: 40,
    lineHeight: 44,
    marginBottom: 30,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: T.surface,
    borderRadius: T.radius,
    borderWidth: 1,
    borderColor: T.line,
    padding: 18,
    marginBottom: 14,
    justifyContent: "space-between",
  },
  tileIcon: { color: T.ember, fontSize: 26 },
  tileLabel: { color: T.text, fontSize: 18, lineHeight: 22, fontWeight: "500" },
});
