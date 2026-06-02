import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  fetchMessages,
  markMessagesRead,
  sendMessage,
} from "@/services/conversations";
import { useAuthStore } from "@/store/authStore";
import { Message } from "@/types";

export function useMessages(conversationId: string) {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    const data = await fetchMessages(conversationId);
    setMessages(data);
    setLoading(false);
    if (user) await markMessagesRead(conversationId, user.id);
  };

  useEffect(() => {
    if (!conversationId || !user) return;
    load();

    channelRef.current = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === user.id) return;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();
          
          const sender = profile ? (profile as Message["sender"]) : undefined;

          setMessages((prev) => [{ ...newMsg, sender }, ...prev]);
          await markMessagesRead(conversationId, user.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, isTyping } = payload.payload as {
          userId: string;
          isTyping: boolean;
        };
        if (userId === user.id) return;
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) next.add(userId);
          else next.delete(userId);
          return next;
        });
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [conversationId, user?.id]);

  const send = async (content: string) => {
    if (!user || !content.trim()) return;
    const optimisticId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const optimistic: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      type: "text",
      status: "sending",
      created_at: new Date().toISOString(),
      is_optimistic: true,
    };
    setMessages((prev) => [optimistic, ...prev]);

    const sent = await sendMessage(conversationId, user.id, content.trim());
    if (sent) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...sent, status: "sent" } : m))
      );
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  };

  const broadcastTyping = (isTyping: boolean) => {
    if (!user) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, isTyping },
    });
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000);
    }
  };

  return { messages, loading, typingUsers, send, broadcastTyping };
}
