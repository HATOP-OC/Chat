import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setProfile: (profile) => set({ profile }),

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const user = session?.user ?? null;
      set({ session, user });

      if (user) {
        let { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if ((profileError && profileError.code === 'PGRST116') || (profileData && !profileData.email)) {
          const { data: upsertData, error: upsertError } = await supabase
            .from("profiles")
            .upsert({
              id: user.id,
              email: user.email,
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
              is_online: true,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!upsertError) profileData = upsertData;
        }
        set({ profile: profileData });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        const user = session?.user ?? null;
        set({ session, user });
        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          set({ profile: profileData });
        } else {
          set({ profile: null });
        }
      });
    } catch (e) {
      console.error("Initialization error:", e);
    } finally {
      set({ initialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, displayName) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName }
        }
      });
      if (error) throw error;
      if (data.user) {
        const { error: upsertError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          display_name: displayName,
          is_online: true,
          created_at: new Date().toISOString()
        });
        if (upsertError) {
          if (upsertError.code === '42P01') {
            throw new Error("Database table 'profiles' not found. Please run the SQL schema in Supabase Dashboard.");
          }
          throw upsertError;
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    const userId = get().user?.id;
    if (userId) {
      await supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("id", userId);
    }
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  updateProfile: async (updates) => {
    let userId = get().user?.id;
    let userEmail = get().user?.email;

    if (!userId || !userEmail) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        userId = data.session.user.id;
        userEmail = data.session.user.email;
        set({ session: data.session, user: data.session.user });
      }
    }

    if (!userId) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email: userEmail,
        ...updates
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        throw new Error("Database tables not found. Please run the SQL schema in Supabase Dashboard.");
      }
      throw error;
    }
    if (data) set({ profile: data });
  },
}));
