import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  onRecordComplete?: (durationMs: number) => void;
}

export function VoiceRecordButton({ onRecordComplete }: Props) {
  const colors = useColors();
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  const startTime = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRecording(true);
    setDuration(0);
    startTime.current = Date.now();
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    Animated.spring(scale, {
      toValue: 1.3,
      useNativeDriver: true,
    }).start();
  };

  const stopRecording = () => {
    if (!recording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Date.now() - startTime.current;
    setRecording(false);
    setDuration(0);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onRecordComplete?.(elapsed);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: startRecording,
    onPanResponderRelease: stopRecording,
    onPanResponderTerminate: stopRecording,
  });

  return (
    <View style={styles.wrapper}>
      {recording && (
        <View style={styles.indicator}>
          <View
            style={[styles.recDot, { backgroundColor: colors.destructive }]}
          />
          <Text style={[styles.recText, { color: colors.foreground }]}>
            {duration}s
          </Text>
        </View>
      )}
      <Animated.View
        style={{ transform: [{ scale }] }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.button,
            {
              backgroundColor: recording ? colors.destructive : colors.primary,
            },
          ]}
        >
          <Ionicons
            name={recording ? "square" : "mic"}
            size={22}
            color="#fff"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: "row", alignItems: "center", gap: 8 },
  indicator: { flexDirection: "row", alignItems: "center", gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
