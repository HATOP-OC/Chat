import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConversationItem } from "@/components/ConversationItem";
import { NetworkBanner } from "@/components/NetworkBanner";
import { useColors } from "@/hooks/useColors";
import { useConversations } from "@/hooks/useConversations";
import { useAuthStore } from "@/store/authStore";
import { Conversation } from "@/types";

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, loading, refetch } = useConversations();
  const { profile } = useAuthStore();
  const [search, setSearch] = useState("");

  const topPad =
    Platform.OS === "web" ? 67 : insets.top;

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.other_user?.display_name
          ?.toLowerCase()
          .includes(search.toLowerCase())
      )
    : conversations;

  const renderItem = ({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      onPress={() =>
        router.push({
          pathname: "/chat/[id]",
          params: { id: item.id, name: item.other_user?.display_name ?? "" },
        })
      }
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NetworkBanner />

      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Chats
        </Text>
        <Pressable
          onPress={() => router.push("/contacts/new")}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.searchBg,
            marginHorizontal: 16,
            marginVertical: 10,
          },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search chats"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={
            filtered.length === 0 ? styles.emptyContainer : undefined
          }
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border, marginLeft: 80 },
              ]}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="chatbubbles-outline"
                size={52}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search ? "No chats found" : "No conversations yet"}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
              >
                {search
                  ? "Try a different name"
                  : "Tap the pencil icon to start a new chat"}
              </Text>
            </View>
          }
          scrollEnabled={!!filtered.length}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  separator: { height: StyleSheet.hairlineWidth },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 80 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
