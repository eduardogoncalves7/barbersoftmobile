// src/navigation/AdminNavigator.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { AdminTabParamList } from "../types";
import { theme } from "../theme";
import { DashboardScreen }         from "../screens/admin/DashboardScreen";
import { AgendamentosAdminScreen } from "../screens/admin/AgendamentosAdminScreen";
import { ValidacaoCameraScreen }   from "../screens/admin/ValidacaoCameraScreen";
import { ConfiguracoesScreen }     from "../screens/admin/ConfiguracoesScreen";

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TabIcon = ({
  label, focused, icon,
}: { label: string; focused: boolean; icon: string }) => (
  <View style={styles.tabItem}>
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
  </View>
);

export const AdminNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon label="Dashboard" focused={focused} icon="📊" />
        ),
      }}
    />
    <Tab.Screen
      name="Agendamentos"
      component={AgendamentosAdminScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon label="Agenda" focused={focused} icon="📅" />
        ),
      }}
    />
    <Tab.Screen
      name="ValidacaoCamera"
      component={ValidacaoCameraScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon label="Validar" focused={focused} icon="📷" />
        ),
      }}
    />
    <Tab.Screen
      name="Configuracoes"
      component={ConfiguracoesScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabIcon label="Config." focused={focused} icon="⚙️" />
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
