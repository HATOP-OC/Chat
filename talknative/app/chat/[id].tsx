import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/Avatar";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { VoiceRecordButton } from "@/components/VoiceRecordButton";
import { useColors } from "@/hooks/useColors";
import { useMessages } from "@/hooks/useMessages";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Profile } from "@/types";

function useOtherUserProfile(conversationId: string, currentUserId: string) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  React.useEffect(() => {
    supabase
      .from("conversation_participants")
      .select("user_id, profiles(*)")
      .eq("conversation_id", conversationId)
      .neq("user_id", currentUserId)
      .single()
      .then(({ data }) => {
        if (data) setProfile((data as any).profiles as Profile);
      });
  }, [conversationId, currentUserId]);
  return profile;
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuthStore();
  const { messages, loading, typingUsers, send, broadcastTyping } = useMessages(id!);
  const otherUser = useOtherUserProfile(id!, user?.id ?? "");

  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const isTypingRef = useRef(false);

  const isTyping = typingUsers.size > 0;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    broadcastTyping(false);
    isTypingRef.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await send(content);
    inputRef.current?.focus();
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (val.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      broadcastTyping(true);
    } else if (val.length === 0 && isTypingRef.current) {
      isTypingRef.current = false;
      broadcastTyping(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 10,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Avatar
          uri={otherUser?.avatar_url}
          name={otherUser?.display_name ?? (name as string)}
          size={38}
          isOnline={otherUser?.is_online}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
            {otherUser?.display_name ?? name}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {isTyping
              ? "typing…"
              : otherUser?.is_online
              ? "online"
              : otherUser?.last_seen
              ? `last seen ${new Date(otherUser.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "offline"}
          </Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={item.sender_id === user?.id}
          />
        )}
        ListHeaderComponent={
          <TypingIndicator
            visible={isTyping}
            name={otherUser?.display_name}
          />
        }
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!messages.length}
      />

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.headerBg,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 8,
          },
        ]}
      >
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.searchBg,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Message"
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={handleTyping}
            multiline
            maxLength={2000}
            returnKeyType="default"
            blurOnSubmit={false}
            testID="message-input"
          />
        </View>

        {text.trim().length > 0 ? (
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            testID="send-btn"
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        ) : (
          <VoiceRecordButton
            onRecordComplete={(ms) => {
              const secs = Math.round(ms / 1000);
              send(`🎤 Voice message (${secs}s)`);
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messagesList: {
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 22,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
