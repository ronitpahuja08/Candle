import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, MONO } from "@/src/theme";

export default function Pill({
  label,
  flame,
  testID,
}: {
  label: string;
  flame?: boolean;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.pill}>
      {flame ? (
        <Ionicons name="flame" size={14} color={T.ember} style={{ marginRight: 5 }} />
      ) : null}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.raised,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.line,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    color: T.text,
    fontSize: 12,
    fontFamily: MONO,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
