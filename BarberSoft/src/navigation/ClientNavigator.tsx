// src/navigation/ClientNavigator.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { ClientTabParamList } from "../types";
import { theme } from "../theme";
import { HomeClienteScreen }         from "../screens/client/HomeClienteScreen";
import { AgendarScreen }             from "../screens/client/AgendarScreen";
import { MeusAgendamentosScreen }    from "../screens/client/MeusAgendamentosScreen";

const Tab = createBottomTabNavigator<ClientTabParamList>();

const TabIcon = ({
  label, focused, icon,
}: { label: string; focused: boolean; icon: string }) => (
  <View style={styles.tabItem}>
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
  </View>
);

export const ClientNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeClienteScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon label="Início" focused={focused} icon="🏠" />
        ),
      }}
    />
    <Tab.Screen
      name="Agendar"
      component={AgendarScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon label="Agendar" focused={focused} icon="✂️" />
        ),
      }}
    />
    <Tab.Screen
      name="MeusAgendamentos"
      component={MeusAgendamentosScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon label="Histórico" focused={focused} icon="📋" />
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
  tabItem: { alignItems: "center", gap: 3 },
  tabIcon: { fontSize: 20 },
  tabIconActive: {},
  tabLabel: { fontSize: 10, color: theme.colors.textMuted },
  tabLabelActive: { color: theme.colors.gold },
});
