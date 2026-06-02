import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text } from "react-native";

export function NetworkBanner() {
  const [offline, setOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (Platform.OS === "web") return;

    let NetInfo: any;
    try {
      NetInfo = require("@react-native-community/netinfo");
    } catch {
      return;
    }

    const unsub = NetInfo.addEventListener((state: any) => {
      setOffline(!state.isConnected);
    });
    return unsub;
  }, []);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: offline ? 0 : -60,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [offline]);

  if (!offline) return null;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
    >
      <Ionicons name="wifi-outline" size={16} color="#fff" />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#e17055",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  text: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
