import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { Conversation } from "@/types";

interface Props {
  conversation: Conversation;
  onPress: () => void;
}

function formatTimestamp(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationItem({ conversation, onPress }: Props) {
  const colors = useColors();
  const { other_user, last_message, unread_count } = conversation;
  const hasUnread = (unread_count ?? 0) > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.muted : colors.card },
      ]}
    >
      <Avatar
        uri={other_user?.avatar_url}
        name={other_user?.display_name}
        size={52}
        isOnline={other_user?.is_online}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              {
                color: colors.foreground,
                fontFamily: hasUnread
                  ? "Inter_600SemiBold"
                  : "Inter_500Medium",
              },
            ]}
            numberOfLines={1}
          >
            {other_user?.display_name ?? "Unknown"}
          </Text>
          <Text
            style={[
              styles.time,
              {
                color: hasUnread ? colors.primary : colors.mutedForeground,
                fontFamily: hasUnread
                  ? "Inter_600SemiBold"
                  : "Inter_400Regular",
              },
            ]}
          >
            {formatTimestamp(
              last_message?.created_at ?? conversation.updated_at
            )}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview,
              {
                color: hasUnread ? colors.foreground : colors.mutedForeground,
                fontFamily: hasUnread
                  ? "Inter_500Medium"
                  : "Inter_400Regular",
                flex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {last_message?.content ?? "No messages yet"}
          </Text>
          {hasUnread && (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.unread },
              ]}
            >
              <Text style={styles.badgeText}>
                {unread_count! > 99 ? "99+" : unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: { fontSize: 16, flex: 1, marginRight: 8 },
  time: { fontSize: 12 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: { fontSize: 14 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
