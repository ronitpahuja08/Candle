import React from "react";
import { Platform, ViewStyle } from "react-native";
import {
  KeyboardAvoidingView as KCAvoidingView,
  KeyboardStickyView as KCStickyView,
  KeyboardAwareScrollView as KCAwareScrollView,
} from "react-native-keyboard-controller";

// Thin wrappers with the platform-correct defaults from the keyboard skill.
export function KeyboardAvoidingView({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <KCAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={16}
      style={style}
    >
      {children}
    </KCAvoidingView>
  );
}

export function KeyboardStickyView({
  children,
  offset,
}: {
  children: React.ReactNode;
  offset?: number;
}) {
  return (
    <KCStickyView offset={{ closed: 0, opened: offset ?? 16 }}>
      {children}
    </KCStickyView>
  );
}

export const KeyboardAwareScrollView = KCAwareScrollView;
