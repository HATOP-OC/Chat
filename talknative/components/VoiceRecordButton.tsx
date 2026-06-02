import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { decode } from "base64-arraybuffer";
import React, { useRef, useState, useEffect } from "react";
import { Animated, PanResponder, StyleSheet, Text, View, Alert } from "react-native";

import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

interface Props {
  onRecordComplete?: (url: string, durationMs: number) => void;
}

export function VoiceRecordButton({ onRecordComplete }: Props) {
  const colors = useColors();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission denied", "Microphone access is required.");
        return;
      }

      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {}
        recordingRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(scale, {
        toValue: 1.3,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error("Failed to start recording", err);
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    if (!recordingRef.current || !isRecording) return;

    const recording = recordingRef.current;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    try {
      const status = await recording.getStatusAsync();
      const durationMs = status.durationMillis || 0;

      if (durationMs < 500) {
        await recording.stopAndUnloadAsync();
        recordingRef.current = null;
        return;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setDuration(0);

      if (uri) {
        uploadVoiceMessage(uri, durationMs);
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
      recordingRef.current = null;
    }
  }

  async function uploadVoiceMessage(uri: string, durationMs: number) {
    try {
      // 1. Read file as Base64 (The most stable way on Android)
      const base64 = await FileSystem.readAsStringAsync(uri, {
       encoding: 'base64',
      });

      // 2. Convert Base64 to ArrayBuffer (Supabase storage accepts this)
      const arrayBuffer = decode(base64);

      const fileName = `${Date.now()}.m4a`;
      const path = fileName;

      const { error } = await supabase.storage
        .from("voice-messages")
        .upload(path, arrayBuffer, {
          contentType: "audio/m4a",
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("voice-messages")
        .getPublicUrl(path);

      onRecordComplete?.(urlData.publicUrl, durationMs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("Detailed Upload Error:", err);
      Alert.alert("Upload Error", err.message || "Failed to send voice message.");
    }
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: startRecording,
    onPanResponderRelease: stopRecording,
    onPanResponderTerminate: stopRecording,
  });

  return (
    <View style={styles.wrapper}>
      {isRecording && (
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
              backgroundColor: isRecording ? colors.destructive : colors.primary,
            },
          ]}
        >
          <Ionicons
            name={isRecording ? "square" : "mic"}
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
