import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { T } from "@/src/theme";

export default function Card({
  children,
  style,
  raised,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  raised?: boolean;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[styles.card, raised ? styles.raised : styles.surface, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: T.radius,
    borderWidth: 1,
    borderColor: T.line,
    padding: T.pad,
  },
  surface: { backgroundColor: T.surface },
  raised: { backgroundColor: T.raised },
});
