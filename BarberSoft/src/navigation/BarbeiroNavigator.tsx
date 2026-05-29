// src/navigation/BarbeiroNavigator.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { BarbeiroTabParamList } from "../types";
import { theme } from "../theme";
import { AgendaBarbeiroScreen } from "../screens/barbeiro/AgendaBarbeiroScreen";

const Tab = createBottomTabNavigator<BarbeiroTabParamList>();

const TabIcon = ({
  label, focused, icon,
}: { label: string; focused: boolean; icon: string }) => (
  <View style={styles.tabItem}>
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
  </View>
);

export const BarbeiroNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="AgendaBarbeiro"
      component={AgendaBarbeiroScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon label="Agenda" focused={focused} icon="📅" />
        ),
      }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.card,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem:       { alignItems: "center", gap: 3 },
  tabIcon:       { fontSize: 20 },
  tabIconActive: {},
  tabLabel:      { fontSize: 10, color: theme.colors.textMuted },
  tabLabelActive:{ color: theme.colors.gold },
});
