import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { Ionicons } from "@expo/vector-icons";

export default function NewChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (!user) return;
    fetchAllUsers(user.id).then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, [user?.id]);

  const filtered = search.trim()
    ? users.filter((u) =>
        u.display_name.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const startChat = async (contact: Profile) => {
    if (!user) return;
    setOpeningId(contact.id);
    const convId = await findOrCreateConversation(user.id, contact.id);
    setOpeningId(null);
    if (convId) {
      router.replace({
        pathname: "/chat/[id]",
        params: { id: convId, name: contact.display_name },
      });
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
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          New Message
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.searchBg, marginHorizontal: 16, marginVertical: 10 },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search people"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? colors.muted : "transparent" },
              ]}
              onPress={() => startChat(item)}
            >
              <Avatar uri={item.avatar_url} name={item.display_name} size={46} isOnline={item.is_online} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.display_name}</Text>
                <Text style={[styles.email, { color: colors.mutedForeground }]}>{item.email}</Text>
              </View>
              {openingId === item.id && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </Pressable>
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 74 }]} />
          )}
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
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: "Inter_500Medium" },
  email: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sep: { height: StyleSheet.hairlineWidth },
});
