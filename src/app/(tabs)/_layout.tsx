import React, { memo } from "react";
import { Tabs } from "expo-router";
import { Pressable, View, type PressableProps, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function FabButton({ onPress }: { onPress?: PressableProps["onPress"] }) {
  return (
    // Fill the full tab slot so we can center inside it
    <View style={styles.fabWrap}>
      <Pressable
        onPress={onPress}
        className="w-[58px] h-[58px] rounded-full bg-accent-purple items-center justify-center active:opacity-75"
        style={styles.fab}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -5 }],
  },
  fab: {
    borderWidth: 3,
    borderColor: "#0d1225",
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  tabIconFocused: {
    backgroundColor: "rgba(168,85,247,0.12)",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});

const TabIcon = memo(function TabIcon({
  name,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
}) {
  return (
    <View style={focused ? styles.tabIconFocused : undefined}>
      <Ionicons name={name} size={22} color={focused ? "#a855f7" : "#4b5563"} />
    </View>
  );
});

export default function TabsLayout() {
  return (
    <Tabs
      // Hardware back returns through the tabs you actually visited (and only
      // exits from Home), instead of closing the app from any tab. (#2)
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        lazy: false,
        animation: "none",
        tabBarStyle: {
          backgroundColor: "#0d1225",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 10,
          paddingTop: 6,
          overflow: "visible", // lets FAB render above the tab bar edge
        },
        tabBarActiveTintColor: "#a855f7",
        tabBarInactiveTintColor: "#4b5563",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "receipt" : "receipt-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <FabButton onPress={props.onPress ?? undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Cards",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "card" : "card-outline"}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
