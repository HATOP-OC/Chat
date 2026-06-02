import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuthStore } from "@/store/authStore";

export default function Index() {
  const { initialized, initialize, session } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initialize().then(() => setLoading(false));
  }, []);

  if (loading || !initialized) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#00b894" />
      </View>
    );
  }

  if (!session) return <Redirect href="/auth/login" />;
  return <Redirect href="/(tabs)/chats" />;
}
