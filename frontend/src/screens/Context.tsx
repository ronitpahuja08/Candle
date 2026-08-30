import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "@/src/keyboard";
import { T, SERIF } from "@/src/theme";
import Button from "@/src/components/Button";

type Answers = {
  proximity?: string;
  intent?: string;
  pace?: number;
  name?: string;
};

const STEPS = [
  {
    key: "proximity",
    q: "How often do you see them?",
    options: [
      { v: "together", l: "Live together" },
      { v: "weekly", l: "Weekly" },
      { v: "monthly", l: "Monthly" },
      { v: "rarely", l: "Rarely" },
      { v: "different_cities", l: "Different cities" },
    ],
  },
  {
    key: "intent",
    q: "What do you want more of?",
    options: [
      { v: "deeper", l: "Deeper talks" },
      { v: "fun", l: "More fun" },
      { v: "fewer_misunderstandings", l: "Fewer misunderstandings" },
      { v: "staying_in_touch", l: "Just staying in touch" },
    ],
  },
  {
    key: "pace",
    q: "How long a day?",
    options: [
      { v: 3, l: "3 min" },
      { v: 5, l: "5 min" },
      { v: 10, l: "10 min" },
    ],
  },
];

export default function Context({
  onDone,
  loading,
}: {
  onDone: (a: Required<Answers>) => void;
  loading?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ pace: 5 });
  const total = STEPS.length + 1; // + name step

  const pick = (key: string, v: any) => {
    const next = { ...answers, [key]: v };
    setAnswers(next);
    setTimeout(() => setStep((s) => s + 1), 160);
  };

  const isNameStep = step === STEPS.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i <= step ? styles.dotOn : styles.dotOff]}
          />
        ))}
      </View>

      {!isNameStep ? (
        <View style={styles.body}>
          <Text testID="context-question" style={styles.q}>
            {STEPS[step].q}
          </Text>
          <View style={{ marginTop: 26 }}>
            {STEPS[step].options.map((o: any) => (
              <Pressable
                key={String(o.v)}
                testID={`context-opt-${o.v}`}
                onPress={() => pick(STEPS[step].key, o.v)}
                style={({ pressed }) => [
                  styles.opt,
                  pressed && { borderColor: T.ember },
                ]}
              >
                <Text style={styles.optLabel}>{o.l}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.body}>
          <View style={{ flex: 1 }}>
            <Text style={styles.q}>What should they call you?</Text>
            <Text style={styles.hint}>First name only.</Text>
            <TextInput
              testID="context-name-input"
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={T.faint}
              value={answers.name || ""}
              onChangeText={(name) => setAnswers({ ...answers, name })}
              autoFocus
              returnKeyType="done"
            />
          </View>
          <Button
            testID="context-finish"
            label="Begin"
            loading={loading}
            disabled={!answers.name?.trim()}
            onPress={() =>
              onDone({
                proximity: answers.proximity || "weekly",
                intent: answers.intent || "deeper",
                pace: answers.pace || 5,
                name: (answers.name || "").trim(),
              })
            }
            style={{ marginBottom: insets.bottom + 12 }}
          />
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, paddingHorizontal: T.pad },
  dots: { flexDirection: "row", gap: 8, marginBottom: 36 },
  dot: { height: 4, flex: 1, borderRadius: 2 },
  dotOn: { backgroundColor: T.ember },
  dotOff: { backgroundColor: T.line },
  body: { flex: 1 },
  q: { color: T.text, fontFamily: SERIF, fontSize: 34, lineHeight: 38 },
  hint: { color: T.muted, fontSize: 14, marginTop: 8 },
  opt: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  optLabel: { color: T.text, fontSize: 18, fontWeight: "500" },
  input: {
    marginTop: 24,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: T.radius,
    paddingHorizontal: 18,
    paddingVertical: 18,
    color: T.text,
    fontSize: 20,
  },
});
