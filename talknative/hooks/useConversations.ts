import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { fetchConversations } from "@/services/conversations";
import { useAuthStore } from "@/store/authStore";
import { Conversation } from "@/types";

export function useConversations() {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      const data = await fetchConversations(user.id);
      setConversations(data);
    } catch {
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();

    channelRef.current = supabase
      .channel(`conversations:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => load()
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [user?.id]);

  return { conversations, loading, error, refetch: load };
}
