import { supabase } from "@/lib/supabase";
import { Conversation, Message, Profile } from "@/types";

type ConversationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  conversation_participants: {
    user_id: string;
    last_read_at: string | null;
    profiles: Profile;
  }[];
  messages: Message[];
};

export async function fetchConversations(
  userId: string
): Promise<Conversation[]> {
  const { data: participantRows, error: pErr } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (pErr || !participantRows?.length) return [];

  const conversationIds = participantRows.map((r) => r.conversation_id);

  const { data: conversations, error: cErr } = await supabase
    .from("conversations")
    .select(
      `id, created_at, updated_at,
       conversation_participants(user_id, last_read_at, profiles(id, display_name, avatar_url, is_online, last_seen, status_message, email)),
       messages(id, content, created_at, sender_id, status, type)`
    )
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (cErr || !conversations) return [];

  return (conversations as unknown as ConversationRow[]).map((c) => {
    const otherParticipant = c.conversation_participants?.find(
      (p) => p.user_id !== userId
    );
    const sortedMessages = (c.messages ?? []).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastMessage = sortedMessages[0] ?? null;
    const myParticipant = c.conversation_participants?.find(
      (p) => p.user_id === userId
    );
    const lastReadAt = myParticipant?.last_read_at
      ? new Date(myParticipant.last_read_at).getTime()
      : 0;
    const unreadCount = (c.messages ?? []).filter(
      (m) =>
        m.sender_id !== userId &&
        new Date(m.created_at).getTime() > lastReadAt
    ).length;

    return {
      id: c.id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      other_user: otherParticipant?.profiles ?? null,
      last_message: lastMessage,
      unread_count: unreadCount,
    } as Conversation;
  });
}

type MessageRow = Message & { profiles: Profile };

export async function fetchMessages(
  conversationId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, content, type, status, created_at, profiles(id, display_name, avatar_url)"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return (data as unknown as MessageRow[]).map((m) => ({
    ...m,
    sender: m.profiles,
  })) as Message[];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: "text" | "voice" = "text"
): Promise<Message | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      type,
      status: "sent",
    })
    .select()
    .single();

  if (error || !data) return null;

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as Message;
}

export async function markMessagesRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  await supabase
    .from("messages")
    .update({ status: "read" })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .neq("status", "read");
}

export async function findOrCreateConversation(
  userId: string,
  otherUserId: string
): Promise<string | null> {
  try {
    const { data: participants, error: pErr } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (pErr) throw pErr;

    if (participants && participants.length > 0) {
      const myConvIds = participants.map((p) => p.conversation_id);

      const { data: existing, error: eErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", myConvIds)
        .single();

      if (existing) return existing.conversation_id;
    }

    const { data: conv, error: cErr } = await supabase
      .from("conversations")
      .insert({ updated_at: new Date().toISOString() })
      .select()
      .single();

    if (cErr) throw cErr;
    if (!conv) return null;

    const { error: iErr } = await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: userId },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);

    if (iErr) throw iErr;

    return conv.id;
  } catch (err) {
    console.error("Error in findOrCreateConversation:", err);
    throw err;
  }
}

export async function fetchAllUsers(
  currentUserId: string
): Promise<import("@/types").Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", currentUserId)
    .order("display_name");
  if (error || !data) return [];
  return data;
}