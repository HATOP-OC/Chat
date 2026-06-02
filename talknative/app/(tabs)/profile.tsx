import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy"; // Використовуємо legacy API
import { decode } from "base64-arraybuffer";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { profile, updateProfile, signOut } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [editName, setEditName] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [status, setStatus] = useState(profile?.status_message ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (profile) {
      if (!editName) setName(profile.display_name ?? "");
      if (!editStatus) setStatus(profile.status_message ?? "");
    }
  }, [profile, editName, editStatus]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const saveField = async (field: "display_name" | "status_message", value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateProfile({ [field]: trimmed });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditName(false);
      setEditStatus(false);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("Network request failed")) {
        Alert.alert("Connection Error", "Please check your internet connection and Supabase URL.");
      } else {
        Alert.alert("Error", e?.message ?? "Failed to save. Did you run the Supabase schema?");
      }
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to set your avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64', 
      });

      const fileName = asset.uri.split("/").pop() || "avatar.jpg";
      const ext = fileName.split(".").pop() || "jpg";
      const path = `${profile?.id || "user"}_${Date.now()}.${ext}`;

      const { data: uploadData, error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, decode(base64), {
          contentType: asset.mimeType || "image/jpeg",
          upsert: true,
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({ avatar_url: data.publicUrl });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("Detailed Upload Error:", e);
      Alert.alert("Upload Error", e.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth/login");
        },
      },
    ]);
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
          Profile
        </Text>
        {saving && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.display_name}
              size={92}
            />
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text style={[styles.emailText, { color: colors.mutedForeground }]}>
            {profile?.email}
          </Text>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Display Name
            </Text>
            {editName ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.editInput, { color: colors.foreground }]}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  onSubmitEditing={() => saveField("display_name", name)}
                />
                <Pressable onPress={() => saveField("display_name", name)} hitSlop={8}>
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditName(false);
                    setName(profile?.display_name ?? "");
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color={colors.destructive} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setEditName(true)} style={styles.fieldRow}>
                <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                  {profile?.display_name ?? "Set your name"}
                </Text>
                <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Status
            </Text>
            {editStatus ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.editInput, { color: colors.foreground }]}
                  value={status}
                  onChangeText={setStatus}
                  autoFocus
                  placeholder="What's your status?"
                  placeholderTextColor={colors.mutedForeground}
                  onSubmitEditing={() => saveField("status_message", status)}
                />
                <Pressable onPress={() => saveField("status_message", status)} hitSlop={8}>
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditStatus(false);
                    setStatus(profile?.status_message ?? "");
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color={colors.destructive} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setEditStatus(true)} style={styles.fieldRow}>
                <Text
                  style={[
                    styles.fieldValue,
                    {
                      color: profile?.status_message
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {profile?.status_message ?? "Available"}
                </Text>
                <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggle}
              trackColor={{
                false: colors.border,
                true: colors.primary,
              }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>
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
  scroll: { paddingHorizontal: 16, paddingTop: 24, gap: 12 },
  avatarSection: { alignItems: "center", marginBottom: 12, gap: 10 },
  avatarWrapper: { position: "relative" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emailText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldValue: { fontSize: 16, fontFamily: "Inter_400Regular", flex: 1 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontSize: 16, fontFamily: "Inter_400Regular" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    marginTop: 8,
  },
  signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});