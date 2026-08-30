import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "@/src/keyboard";
import { T, SERIF, MONO } from "@/src/theme";
import Button from "@/src/components/Button";

export default function Join({
  onJoin,
  onBack,
  loading,
  error,
}: {
  onJoin: (code: string, name: string) => void;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const ready = code.trim().length === 4 && name.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 30 }]}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: T.pad }}>
          <Text style={styles.title}>Enter their code</Text>
          <Text style={styles.sub}>Four letters. They just sent it to you.</Text>

          <TextInput
            testID="join-code-input"
            style={styles.codeInput}
            placeholder="ABCD"
            placeholderTextColor={T.faint}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={4}
            autoFocus
          />

          <TextInput
            testID="join-name-input"
            style={styles.nameInput}
            placeholder="What should they call you?"
            placeholderTextColor={T.faint}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
          />

          {error ? (
            <Text testID="join-error" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: T.pad, paddingBottom: insets.bottom + 12, gap: 10 }}>
          <Button
            testID="join-submit"
            label="Join"
            onPress={() => onJoin(code.trim(), name.trim())}
            disabled={!ready}
            loading={loading}
          />
          <Button testID="join-back" label="Back" variant="ghost" onPress={onBack} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  title: { color: T.text, fontFamily: SERIF, fontSize: 34 },
  sub: { color: T.muted, fontSize: 15, marginTop: 8, marginBottom: 26 },
  codeInput: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    color: T.text,
    fontFamily: MONO,
    fontSize: 44,
    letterSpacing: 14,
    textAlign: "center",
    paddingVertical: 18,
  },
  nameInput: {
    marginTop: 16,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    color: T.text,
    fontSize: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  error: { color: T.ember, fontSize: 14, marginTop: 16, textAlign: "center" },
});
