import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";

import { useColors } from "@/hooks/useColors";
import { Message } from "@/types";

interface Props {
  message: Message;
  isMine: boolean;
  showAvatar?: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({
  status,
  color,
}: {
  status: Message["status"];
  color: string;
}) {
  if (status === "sending") {
    return <Ionicons name="time-outline" size={12} color={color} />;
  }
  if (status === "sent") {
    return <Ionicons name="checkmark-outline" size={13} color={color} />;
  }
  if (status === "delivered") {
    return <Ionicons name="checkmark-done-outline" size={13} color={color} />;
  }
  if (status === "read") {
    return <Ionicons name="checkmark-done-outline" size={13} color="#00b894" />;
  }
  return null;
}

function VoicePlayer({ content, color }: { content: string; color: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Robust parsing: D:5|url OR url|5 OR url
  let url = content;
  let durationSecs = "";

  if (content.startsWith("D:")) {
    const parts = content.substring(2).split("|");
    durationSecs = parts[0];
    url = parts[1] || "";
  } else if (content.includes("|")) {
    const parts = content.split("|");
    url = parts[0];
    durationSecs = parts[1];
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const togglePlay = async () => {
    if (!url || !url.startsWith("http")) return;

    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    setLoading(true);
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newSound.setPositionAsync(0);
        }
      });
    } catch (e) {
      console.error("Failed to play sound", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable onPress={togglePlay} style={styles.voiceRow}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={color} />
      )}
      <Text style={[styles.text, { color, marginLeft: 8 }]}>
        Voice message{durationSecs ? ` (${durationSecs}s)` : ""}
      </Text>
    </Pressable>
  );
}

export function MessageBubble({ message, isMine }: Props) {
  const colors = useColors();

  const bubbleBg = isMine
    ? colors.bubble.sent
    : colors.bubble.received;
  const textColor = isMine
    ? colors.bubble.sentText
    : colors.bubble.receivedText;
  const metaColor = isMine
    ? "rgba(255,255,255,0.7)"
    : colors.mutedForeground;

  // More flexible check for voice messages
  const isVoice =
    message.type === "voice" ||
    message.content.includes(".m4a") ||
    message.content.includes("voice-messages");

  return (
    <View
      style={[
        styles.wrapper,
        isMine ? styles.wrapperRight : styles.wrapperLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: bubbleBg,
            borderBottomRightRadius: isMine ? 4 : 16,
            borderBottomLeftRadius: isMine ? 16 : 4,
          },
        ]}
      >
        {isVoice ? (
          <VoicePlayer content={message.content} color={textColor} />
        ) : (
          <Text style={[styles.text, { color: textColor }]}>
            {message.content}
          </Text>
        )}
        <View style={styles.meta}>
          <Text style={[styles.time, { color: metaColor }]}>
            {formatTime(message.created_at)}
          </Text>
          {isMine && (
            <StatusIcon
              status={message.status}
              color={metaColor}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 2,
    marginHorizontal: 12,
    maxWidth: "78%",
  },
  wrapperLeft: { alignSelf: "flex-start" },
  wrapperRight: { alignSelf: "flex-end" },
  bubble: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 120,
    paddingVertical: 4,
  },
});