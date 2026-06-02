-- ====================================================
-- TalkNative — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ====================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text not null default 'User',
  avatar_url    text,
  status_message text,
  is_online     boolean not null default false,
  last_seen     timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 2. CONVERSATIONS
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Participants can view conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (auth.role() = 'authenticated');

create policy "Participants can update conversations"
  on public.conversations for update
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  );

-- 3. CONVERSATION PARTICIPANTS
create table if not exists public.conversation_participants (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  last_read_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique(conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create policy "Users can view their own participations"
  on public.conversation_participants for select
  using (user_id = auth.uid() or
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_participants.conversation_id
        and cp2.user_id = auth.uid()
    )
  );

create policy "Authenticated users can insert participants"
  on public.conversation_participants for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own participation"
  on public.conversation_participants for update
  using (user_id = auth.uid());

-- 4. MESSAGES
create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  sender_id         uuid not null references public.profiles(id) on delete cascade,
  content           text not null,
  type              text not null default 'text' check (type in ('text', 'voice')),
  status            text not null default 'sent' check (status in ('sending', 'sent', 'delivered', 'read')),
  created_at        timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy "Participants can insert messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy "Participants can update message status"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

-- 5. INDEXES for performance
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at desc);
create index if not exists idx_participants_user on public.conversation_participants(user_id);
create index if not exists idx_participants_conversation on public.conversation_participants(conversation_id);
create index if not exists idx_conversations_updated on public.conversations(updated_at desc);

-- 6. TRIGGER: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.profiles(id, email, display_name, is_online)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. STORAGE bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Users can update their own avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- 8. Enable realtime for all tables
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.profiles;
