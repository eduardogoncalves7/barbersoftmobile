// src/screens/client/HomeClienteScreen.tsx
import React from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";
import { ClientTabParamList } from "../../types";

type NavProp = BottomTabNavigationProp<ClientTabParamList, "Home">;

export const HomeClienteScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { usuarioLogado, servicos, getBarbeiros, logout, getAgendamentosCliente } = useApp();

  const barbeiros = getBarbeiros();
  const meusAgendamentos = usuarioLogado
    ? getAgendamentosCliente(usuarioLogado.id).slice(0, 1)
    : [];

  const iniciais = (nome: string) =>
    nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  const getProximoStatus = (status: string) => {
    switch (status) {
      case "Concluido":  return { bg: theme.colors.successBg, text: theme.colors.success };
      case "Confirmado": return { bg: theme.colors.infoBg,    text: theme.colors.info    };
      default:           return { bg: theme.colors.goldDim,   text: theme.colors.gold    };
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}><Text style={styles.logoText}>B</Text></View>
          <View>
            <Text style={styles.greeting}>Olá, {usuarioLogado?.nome.split(" ")[0]} 👋</Text>
            <Text style={styles.headerSub}>O que vamos fazer hoje?</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.avatarContainer} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.avatarText}>{iniciais(usuarioLogado?.nome ?? "CL")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Banner de ação */}
        <TouchableOpacity
          style={styles.banner}
          onPress={() => navigation.navigate("Agendar")}
          activeOpacity={0.85}
        >
          <View style={styles.bannerAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Agendar novo horário</Text>
            <Text style={styles.bannerSub}>Escolha o serviço e o barbeiro ideal para você</Text>
          </View>
          <Text style={styles.bannerArrow}>→</Text>
        </TouchableOpacity>

        {/* Próximo agendamento */}
        {meusAgendamentos.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Próximo agendamento</Text>
            {meusAgendamentos.map((ag) => {
              const ss = getProximoStatus(ag.status);
              return (
                <View key={ag.id} style={styles.proximoCard}>
                  <View style={[styles.proximoAccent, { backgroundColor: ss.text }]} />
                  <View style={styles.proximoRow}>
                    <Text style={styles.proximoServico}>
                      {servicos.find((s) => s.id === ag.servicoId)?.nome ?? "—"}
                    </Text>
                    <View style={[styles.pill, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.pillText, { color: ss.text }]}>{ag.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.proximoMeta}>
                    📅 {ag.data}  🕐 {ag.hora}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {/* Serviços */}
        <Text style={styles.sectionLabel}>Nossos serviços</Text>
        <View style={styles.servicosGrid}>
          {servicos.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.svcCard}
              onPress={() => navigation.navigate("Agendar")}
              activeOpacity={0.8}
            >
              <Text style={styles.svcNome}>{s.nome}</Text>
              <Text style={styles.svcDur}>{s.duracaoMin} min</Text>
              <Text style={styles.svcPreco}>R$ {s.preco.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Barbeiros */}
        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Nossa equipe</Text>
        <View style={styles.barbeirosRow}>
          {barbeiros.map((b) => (
            <View key={b.id} style={styles.barbeiroCard}>
              <View style={styles.barbeiroAvatar}>
                <Text style={styles.barbeiroIniciais}>{iniciais(b.nome)}</Text>
              </View>
              <Text style={styles.barbeiroNome}>{b.nome.split(" ")[0]}</Text>
              <Text style={styles.barberoCargo}>Barbeiro</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 40 },

  header: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 10 },
  logo:          { width: 34, height: 34, borderRadius: 8, backgroundColor: theme.colors.gold, alignItems: "center", justifyContent: "center" },
  logoText:      { fontSize: 18, fontWeight: "500", color: "#000" },
  greeting:      { fontSize: 16, fontWeight: "500", color: theme.colors.text },
  headerSub:     { fontSize: 12, color: theme.colors.textMuted },
  avatarContainer: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.goldDim,
    borderWidth: 1.5, borderColor: theme.colors.gold,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "500", color: theme.colors.gold },

  sectionLabel: {
    fontSize: 10, fontWeight: "500", letterSpacing: 1.5,
    color: theme.colors.textMuted, textTransform: "uppercase",
    marginBottom: 10, marginTop: 22,
  },

  banner: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
    overflow: "hidden", marginTop: 8,
  },
  bannerAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: theme.colors.gold },
  bannerTitle:  { fontSize: 15, fontWeight: "500", color: theme.colors.text, marginBottom: 4 },
  bannerSub:    { fontSize: 12, color: theme.colors.textMuted },
  bannerArrow:  { fontSize: 20, color: theme.colors.gold },

  proximoCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 12, padding: 14, overflow: "hidden",
  },
  proximoAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  proximoRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  proximoServico:{ fontSize: 14, fontWeight: "500", color: theme.colors.text },
  proximoMeta:   { fontSize: 12, color: theme.colors.textMuted },
  pill:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pillText:      { fontSize: 11 },

  servicosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  svcCard: {
    width: "47%",
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 12, padding: 14,
  },
  svcNome:  { fontSize: 13, fontWeight: "500", color: theme.colors.text, marginBottom: 4 },
  svcDur:   { fontSize: 11, color: theme.colors.textMuted, marginBottom: 6 },
  svcPreco: { fontSize: 15, fontWeight: "500", color: theme.colors.gold },

  barbeirosRow: { flexDirection: "row", gap: 12 },
  barbeiroCard: { alignItems: "center", gap: 6 },
  barbeiroAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.goldDim,
    borderWidth: 2, borderColor: theme.colors.gold,
    alignItems: "center", justifyContent: "center",
  },
  barbeiroIniciais: { fontSize: 16, fontWeight: "500", color: theme.colors.gold },
  barbeiroNome:     { fontSize: 13, fontWeight: "500", color: theme.colors.text },
  barberoCargo:     { fontSize: 11, color: theme.colors.textMuted },
});
