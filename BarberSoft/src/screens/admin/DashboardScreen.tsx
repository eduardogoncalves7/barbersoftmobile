// src/screens/admin/DashboardScreen.tsx
//
// Dashboard do administrador.
// Os dados de faturamento vem de resumoFinanceiro (API /financeiro/resumo).
// Os agendamentos de hoje vem da lista local filtrada por data.
// Os objetos aninhados (cliente, servico) chegam no payload da API.

import React, { useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, StatusBar, SafeAreaView,
} from "react-native";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

// ── StatCard ──────────────────────────────────────
interface StatCardProps {
  value: string;
  label: string;
  badge?: string;
  accentColor?: string;
  fullWidth?: boolean;
}
const StatCard: React.FC<StatCardProps> = ({
  value, label, badge, accentColor = theme.colors.gold, fullWidth,
}) => (
  <View style={[styles.statCard, fullWidth && styles.statCardFull]}>
    <View style={[styles.statAccent, { backgroundColor: accentColor }]} />
    <Text style={[styles.statValue, { color: accentColor }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {badge && (
      <View style={[styles.badge, { backgroundColor: theme.colors.successBg }]}>
        <Text style={[styles.badgeText, { color: theme.colors.success }]}>{badge}</Text>
      </View>
    )}
  </View>
);

// ── Grafico de barras manual ──────────────────────
const BarChart: React.FC<{ data: { day: string; val: number }[] }> = ({ data }) => {
  const maxVal = Math.max(...data.map((d) => d.val), 1);
  return (
    <View style={styles.barChart}>
      {data.map((item, i) => {
        const isToday = i === data.length - 1;
        const heightPct = (item.val / maxVal) * 100;
        return (
          <View key={item.day} style={styles.barColumn}>
            <Text style={styles.barValue}>{item.val > 0 ? String(item.val) : ""}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(heightPct, 4)}%` as any },
                  isToday && styles.barToday,
                ]}
              />
            </View>
            <Text style={[styles.barLabel, isToday && { color: theme.colors.gold }]}>
              {item.day}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Tela principal ────────────────────────────────
export const DashboardScreen: React.FC = () => {
  const {
    faturamentoTotal,
    faturamentoPorDia,
    getAgendamentosHoje,
    getClientesUnicos,
    usuarioLogado,
    logout,
  } = useApp();

  // ✅ FIX: getAgendamentosHoje() agora retorna agendamentos já enriquecidos
  // com os objetos cliente/barbeiro/servico populados (via AppContext).
  // Antes retornava só IDs → UI mostrava "u3", "s2·u1", "R$ 0".
  const agendamentosHoje = getAgendamentosHoje();
  const totalClientes    = getClientesUnicos();

  // Monta os dados do grafico a partir do faturamentoPorDia retornado pela API
  const chartData = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split("T")[0];
      return {
        day: i === 6 ? "Hoje" : DIAS_SEMANA[d.getDay()],
        val: Math.round(faturamentoPorDia[key] ?? 0),
      };
    });
  }, [faturamentoPorDia]);

  // Agendamentos já chegam enriquecidos de getAgendamentosHoje()
  const agendamentosDetalhados = useMemo(
    () =>
      agendamentosHoje.map((ag) => ({
        ...ag,
        clienteNome:  ag.cliente?.nome  ?? ag.clienteId,
        barbeiroNome: ag.barbeiro?.nome ?? ag.barbeiroId,
        servicoNome:  ag.servico?.nome  ?? ag.servicoId,
        preco:        ag.servico?.preco ?? 0,
      })),
    [agendamentosHoje]
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Concluido":  return { bg: theme.colors.successBg,  text: theme.colors.success };
      case "Confirmado": return { bg: theme.colors.infoBg,     text: theme.colors.info    };
      case "Cancelado":  return { bg: theme.colors.dangerBg,   text: theme.colors.danger  };
      default:           return { bg: theme.colors.goldDim,    text: theme.colors.gold    };
    }
  };

  const iniciais = (nome: string) =>
    nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  const semanaTotal = Object.values(faturamentoPorDia).reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>BarberSoft</Text>
            <Text style={styles.headerSub}>Painel do Administrador</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.avatarContainer} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.avatarText}>{iniciais(usuarioLogado?.nome ?? "AD")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.sectionLabel}>Resumo</Text>
        <View style={styles.statsGrid}>
          <StatCard value={String(totalClientes)} label="Clientes unicos" />
          <StatCard
            value={String(agendamentosHoje.length)}
            label="Agendamentos hoje"
            accentColor={theme.colors.success}
          />
          <StatCard
            value={`R$ ${faturamentoTotal.toFixed(2)}`}
            label="Faturamento total"
            accentColor={theme.colors.gold}
            fullWidth
          />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Faturamento semanal</Text>
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Receita por dia</Text>
              <Text style={styles.chartSub}>Ultimos 7 dias</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.chartTotal}>R$ {semanaTotal.toFixed(2)}</Text>
              <Text style={styles.chartSub}>Total da semana</Text>
            </View>
          </View>
          <BarChart data={chartData} />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Agendamentos de hoje</Text>
        <View style={styles.listCard}>
          {agendamentosDetalhados.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum agendamento para hoje.</Text>
          ) : (
            agendamentosDetalhados.map((ag, idx) => {
              const ss = getStatusStyle(ag.status);
              return (
                <View
                  key={ag.id}
                  style={[
                    styles.listItem,
                    idx === agendamentosDetalhados.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.listAvatar, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.listAvatarText, { color: ss.text }]}>
                      {iniciais(ag.clienteNome)}
                    </Text>
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{ag.clienteNome}</Text>
                    <Text style={styles.listSub}>{ag.servicoNome} - {ag.barbeiroNome}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.listAmount, { color: ss.text }]}>R$ {ag.preco.toFixed(2)}</Text>
                    <Text style={styles.listTime}>{ag.hora}</Text>
                    <View style={[styles.pill, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.pillText, { color: ss.text }]}>{ag.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },

  header: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 8, backgroundColor: theme.colors.gold, alignItems: "center", justifyContent: "center" },
  logoText:    { fontSize: 18, fontWeight: "500", color: "#000" },
  headerTitle: { fontSize: 16, fontWeight: "500", color: theme.colors.text },
  headerSub:   { fontSize: 12, color: theme.colors.textMuted },
  avatarContainer: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.goldDim,
    borderWidth: 1.5, borderColor: theme.colors.gold,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "500", color: theme.colors.gold },

  sectionLabel: {
    fontSize: 10, fontWeight: "500", letterSpacing: 1.5,
    color: theme.colors.textMuted, textTransform: "uppercase", marginBottom: 10,
  },
  statsGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, padding: 14,
    width: "47%", overflow: "hidden",
  },
  statCardFull: { width: "100%" },
  statAccent:   { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  statValue:    { fontSize: 22, fontWeight: "500", lineHeight: 26 },
  statLabel:    { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  badge: { alignSelf: "flex-start", borderRadius: theme.radius.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 8 },
  badgeText: { fontSize: 10 },

  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, padding: 16,
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  chartTitle: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  chartSub:   { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  chartTotal: { fontSize: 18, fontWeight: "500", color: theme.colors.gold },

  barChart:  { flexDirection: "row", alignItems: "flex-end", height: 120, gap: 6 },
  barColumn: { flex: 1, alignItems: "center", gap: 4 },
  barTrack:  { width: "80%", height: 90, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4, backgroundColor: "rgba(212,175,55,0.45)" },
  barToday: { backgroundColor: theme.colors.gold },
  barValue: { fontSize: 9, color: theme.colors.textMuted },
  barLabel: { fontSize: 10, color: theme.colors.textMuted },

  listCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, overflow: "hidden",
  },
  listItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle,
  },
  listAvatar:     { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  listAvatarText: { fontSize: 13, fontWeight: "500" },
  listInfo:       { flex: 1 },
  listName:       { fontSize: 13, fontWeight: "500", color: theme.colors.text },
  listSub:        { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  listAmount:     { fontSize: 13, fontWeight: "500" },
  listTime:       { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  pill:           { borderRadius: theme.radius.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  pillText:       { fontSize: 10 },
  emptyText:      { textAlign: "center", color: theme.colors.textMuted, padding: 24 },
});
