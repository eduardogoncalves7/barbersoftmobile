// src/navigation/RootNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useApp } from "../context/AppContext";
import { RootStackParamList } from "../types";
import { LoginScreen }       from "../screens/auth/LoginScreen";
import { CadastroScreen }    from "../screens/auth/CadastroScreen";
import { AdminNavigator }    from "./AdminNavigator";
import { ClientNavigator }   from "./ClientNavigator";
import { BarbeiroNavigator } from "./BarbeiroNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { usuarioLogado } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!usuarioLogado ? (
          // Grupo de telas publicas — acessiveis sem estar logado.
          // Login e Cadastro ficam no mesmo Stack para que a transicao
          // entre elas seja fluida (slide horizontal padrao).
          <>
            <Stack.Screen name="Login"   component={LoginScreen}   />
            <Stack.Screen name="Cadastro" component={CadastroScreen} />
          </>
        ) : usuarioLogado.role === "admin" ? (
          <Stack.Screen name="AdminTabs"    component={AdminNavigator}   />
        ) : usuarioLogado.role === "barbeiro" ? (
          <Stack.Screen name="BarbeiroTabs" component={BarbeiroNavigator} />
        ) : (
          <Stack.Screen name="ClientTabs"   component={ClientNavigator}  />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
