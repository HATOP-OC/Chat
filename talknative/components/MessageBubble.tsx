import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
        <Text style={[styles.text, { color: textColor }]}>
          {message.content}
        </Text>
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
});
