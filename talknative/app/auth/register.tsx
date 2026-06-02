import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuthStore } from "@/store/authStore";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp, loading } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError(null);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
      router.replace("/(tabs)/chats");
    } catch (e: any) {
      setError(e.message ?? "Registration failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="chatbubbles" size={40} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Join TalkNative today
          </Text>
        </View>

        <View style={styles.form}>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Display Name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password (min 6 chars)"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPass((p) => !p)} hitSlop={8}>
              <Ionicons
                name={showPass ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          {error && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {error}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || loading ? 0.8 : 1,
              },
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={styles.link}
          >
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                Sign in
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 44 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular" },
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  error: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  btnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  link: { alignItems: "center", paddingTop: 8 },
  linkText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
