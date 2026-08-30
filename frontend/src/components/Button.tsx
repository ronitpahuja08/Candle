import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { T } from "@/src/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  testID,
  style,
}: Props) {
  const isGhost = variant === "ghost";
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isGhost ? styles.ghost : styles.primary,
        (disabled || loading) && styles.disabled,
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? T.muted : "#1A1207"} />
      ) : (
        <Text style={[styles.label, isGhost ? styles.ghostLabel : styles.primaryLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: T.radius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  primary: { backgroundColor: T.ember },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.4 },
  label: { fontSize: 16, fontWeight: "600", letterSpacing: 0.2 },
  primaryLabel: { color: "#1A1207" },
  ghostLabel: { color: T.muted },
});
