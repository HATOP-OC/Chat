import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { fetchAllUsers, findOrCreateConversation } from "@/services/conversations";
import { useAuthStore } from "@/store/authStore";
import { Profile } from "@/types";

export default function ContactsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const loadUsers = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const data = await fetchAllUsers(user.id);
        setUsers(data);
      } catch (e) {
        console.error("Error loading users:", e);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [user?.id]);

  const filtered = search.trim()
    ? users.filter((u) =>
        u.display_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const startChat = async (contact: Profile) => {
    if (!user) return;
    setOpeningId(contact.id);
    try {
      const convId = await findOrCreateConversation(user.id, contact.id);
      if (convId) {
        router.push({
          pathname: "/chat/[id]",
          params: { id: convId, name: contact.display_name },
        });
      }
    } catch (e) {
      const err = e as Error;
      console.error("Failed to start chat:", err);
      Alert.alert(
        "Error",
        err.message || "Could not start chat. This is usually due to missing database permissions (RLS)."
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          Contacts
        </Text>
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
          placeholder="Search contacts"
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
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border, marginLeft: 76 },
              ]}
            />
          )}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.contactRow,
                { backgroundColor: pressed ? colors.muted : colors.card },
              ]}
              onPress={() => startChat(item)}
            >
              <Avatar
                uri={item.avatar_url}
                name={item.display_name}
                size={48}
                isOnline={item.is_online}
              />
              <View style={styles.contactInfo}>
                <Text
                  style={[styles.contactName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.display_name}
                </Text>
                {item.status_message ? (
                  <Text
                    style={[styles.contactStatus, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {item.status_message}
                  </Text>
                ) : (
                  <Text
                    style={[styles.contactStatus, { color: colors.mutedForeground }]}
                  >
                    {item.is_online ? "Online" : "Offline"}
                  </Text>
                )}
              </View>
              {openingId === item.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name="chatbubble-outline"
                  size={20}
                  color={colors.mutedForeground}
                />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="people-outline"
                size={52}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search ? "No contacts found" : "No users yet"}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
              >
                Users who sign up will appear here
              </Text>
            </View>
          }
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
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontFamily: "Inter_500Medium" },
  contactStatus: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth },
  empty: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});