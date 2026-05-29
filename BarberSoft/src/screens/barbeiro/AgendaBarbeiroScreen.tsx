// src/screens/barbeiro/AgendaBarbeiroScreen.tsx
import React, { useState, useMemo, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, FlatList, Alert,
} from "react-native";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// Gera janela de 14 dias centrada em hoje
function gerarJanela(centralIdx = 0): Array<{ iso: string; dia: number; semana: string; mes: string; hoje: boolean }> {
  const base = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i - centralIdx);
    const iso = d.toISOString().split("T")[0];
    return {
      iso,
      dia: d.getDate(),
      semana: DIAS_SEMANA_CURTO[d.getDay()],
      mes: MESES[d.getMonth()],
      hoje: iso === base.toISOString().split("T")[0],
    };
  });
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Pendente:   { bg: "rgba(212,175,55,0.12)",  text: "#D4AF37", label: "Pendente"   },
  Confirmado: { bg: "rgba(66,165,245,0.12)",  text: "#42A5F5", label: "Confirmado" },
  "Concluido":{ bg: "rgba(76,175,80,0.12)",   text: "#4CAF50", label: "Concluido"  },
  Cancelado:  { bg: "rgba(239,83,80,0.12)",   text: "#EF5350", label: "Cancelado"  },
};

export const AgendaBarbeiroScreen: React.FC = () => {
  const {
    usuarioLogado, agendamentosEnriquecidos, agendamentos,
    atualizarStatusAgendamento, logout,
  } = useApp();

  const hoje = new Date().toISOString().split("T")[0];
  const [dataSel, setDataSel] = useState(hoje);
  const flatRef = useRef<FlatList>(null);

  const janela = useMemo(() => gerarJanela(0), []);

  // ✅ FIX: usa agendamentosEnriquecidos — ag.cliente e ag.servico já estão
  // populados. Antes usava `agendamentos` (só IDs) e fazia .find() local
  // para servico mas não para cliente, resultando em "u3" na UI.
  const agendamentosDodia = useMemo(() => {
    if (!usuarioLogado) return [];
    return agendamentosEnriquecidos
      .filter(
        (a) =>
          a.barbeiroId === usuarioLogado.id &&
          a.data       === dataSel &&
          a.status     !== "Cancelado"
      )
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [agendamentosEnriquecidos, dataSel, usuarioLogado]);

  // Totalizador rápido do dia
  const resumoDia = useMemo(() => {
    const total    = agendamentosDodia.length;
    const concluidos = agendamentosDodia.filter((a) => a.status === "Concluido").length;
    const receita  = agendamentosDodia
      .filter((a) => a.status === "Concluido")
      .reduce((s, a) => s + (a.servico?.preco ?? 0), 0);
    return { total, concluidos, receita };
  }, [agendamentosDodia]);

  const iniciais = (nome: string) =>
    nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  // Formata o título da data selecionada
  const tituloData = useMemo(() => {
    const d = new Date(`${dataSel}T12:00:00`);
    if (dataSel === hoje) return "Hoje";
    const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
    if (dataSel === amanha.toISOString().split("T")[0]) return "Amanhã";
    return `${DIAS_SEMANA_LONGO[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  }, [dataSel, hoje]);

  const handleAcao = (id: string, statusAtual: string) => {
    if (statusAtual === "Concluido") {
      Alert.alert("Atendimento já concluído", "Este horário já foi marcado como concluído.");
      return;
    }
    Alert.alert("Gerenciar atendimento", "O que deseja fazer?", [
      {
        text: "✅  Confirmar presença",
        onPress: async () => { await atualizarStatusAgendamento(id, "Confirmado"); },
      },
      {
        text: "✂️  Marcar como concluído",
        onPress: async () => { await atualizarStatusAgendamento(id, "Concluido"); },
      },
      { text: "Fechar", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} />

      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}><Text style={styles.logoText}>B</Text></View>
          <View>
            <Text style={styles.headerTitle}>Minha Agenda</Text>
            <Text style={styles.headerSub}>{usuarioLogado?.nome}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.avatarText}>{iniciais(usuarioLogado?.nome ?? "BB")}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Seletor de dias (carrossel) ──────────── */}
      <View style={styles.calendarContainer}>
        <FlatList
          ref={flatRef}
          data={janela}
          keyExtractor={(item) => item.iso}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarList}
          initialScrollIndex={0}
          getItemLayout={(_, i) => ({ length: 56, offset: 56 * i, index: i })}
          renderItem={({ item }) => {
            const ativo = dataSel === item.iso;
            // Conta agendamentos ativos nesse dia para o badge
            const count = agendamentos.filter(
              (a) =>
                a.barbeiroId === usuarioLogado?.id &&
                a.data === item.iso &&
                a.status !== "Cancelado"
            ).length;

            return (
              <TouchableOpacity
                style={[styles.diaBtn, ativo && styles.diaBtnAtivo, item.hoje && !ativo && styles.diaBtnHoje]}
                onPress={() => setDataSel(item.iso)}
                activeOpacity={0.75}
              >
                <Text style={[styles.diaSemana, ativo && styles.diaTextoAtivo]}>{item.semana}</Text>
                <Text style={[styles.diaNum, ativo && styles.diaTextoAtivo]}>{item.dia}</Text>
                {count > 0 && (
                  <View style={[styles.diaBadge, ativo && styles.diaBadgeAtivo]}>
                    <Text style={[styles.diaBadgeText, ativo && { color: "#000" }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Resumo do dia ───────────────────────── */}
      <View style={styles.resumoRow}>
        <Text style={styles.resumoData}>{tituloData}</Text>
        <View style={styles.resumoStats}>
          <View style={styles.resumoStat}>
            <Text style={styles.resumoStatVal}>{resumoDia.total}</Text>
            <Text style={styles.resumoStatLabel}>horários</Text>
          </View>
          <View style={styles.resumoSep} />
          <View style={styles.resumoStat}>
            <Text style={[styles.resumoStatVal, { color: theme.colors.success }]}>
              {resumoDia.concluidos}
            </Text>
            <Text style={styles.resumoStatLabel}>concluídos</Text>
          </View>
          <View style={styles.resumoSep} />
          <View style={styles.resumoStat}>
            <Text style={[styles.resumoStatVal, { color: theme.colors.gold }]}>
            R$ {resumoDia.receita.toFixed(2)}
            </Text>
            <Text style={styles.resumoStatLabel}>receita</Text>
          </View>
        </View>
      </View>

      {/* ── Lista de horários ───────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {agendamentosDodia.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>Dia livre</Text>
            <Text style={styles.emptySub}>Nenhum agendamento para {tituloData.toLowerCase()}.</Text>
          </View>
        ) : (
          agendamentosDodia.map((ag, idx) => {
            const ss = STATUS_STYLE[ag.status] ?? STATUS_STYLE["Pendente"];
            const tocavel = ag.status !== "Concluido" && ag.status !== "Cancelado";

            return (
              <TouchableOpacity
                key={ag.id}
                style={styles.card}
                onPress={() => handleAcao(ag.id, ag.status)}
                activeOpacity={tocavel ? 0.75 : 1}
              >
                {/* Linha lateral colorida */}
                <View style={[styles.cardLinha, { backgroundColor: ss.text }]} />

                {/* Horário */}
                <View style={styles.cardHoraCol}>
                  <Text style={styles.cardHora}>{ag.hora}</Text>
                  <Text style={styles.cardDur}>{ag.servico?.duracaoMin}min</Text>
                </View>

                <View style={styles.cardSep} />

                {/* Info principal */}
                <View style={styles.cardInfo}>
                  {/* Avatar + Nome do cliente */}
                  <View style={styles.cardClienteRow}>
                    <View style={[styles.clienteAvatar, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.clienteIniciais, { color: ss.text }]}>
                        {iniciais(ag.cliente?.nome ?? "?")}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clienteNome}>{ag.cliente?.nome ?? "—"}</Text>
                      <Text style={styles.clienteEmail}>{ag.cliente?.email ?? ""}</Text>
                    </View>
                  </View>

                  {/* Serviço */}
                  <View style={styles.servicoRow}>
                    <View style={styles.servicoPill}>
                      <Text style={styles.servicoPillText}>✂️  {ag.servico?.nome ?? "—"}</Text>
                    </View>
                    <Text style={styles.servicoPreco}>R$ {(ag.servico?.preco ?? 0).toFixed(2)}</Text>
                  </View>

                  {/* Status + dica de ação */}
                  <View style={styles.cardRodape}>
                    <View style={[styles.statusPill, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.statusText, { color: ss.text }]}>{ss.label}</Text>
                    </View>
                    {tocavel && (
                      <Text style={styles.acaoDica}>Toque para gerenciar →</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Padding inferior */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: theme.colors.gold,
    alignItems: "center", justifyContent: "center",
  },
  logoText:    { fontSize: 18, fontWeight: "500", color: "#000" },
  headerTitle: { fontSize: 16, fontWeight: "500", color: theme.colors.text },
  headerSub:   { fontSize: 12, color: theme.colors.textMuted },
  avatarBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.goldDim,
    borderWidth: 1.5, borderColor: theme.colors.gold,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "500", color: theme.colors.gold },

  // Calendário carrossel
  calendarContainer: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    paddingVertical: 10,
  },
  calendarList: { paddingHorizontal: 12, gap: 6 },
  diaBtn: {
    width: 48, alignItems: "center", paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
    backgroundColor: "transparent",
    position: "relative",
  },
  diaBtnAtivo: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  diaBtnHoje: {
    borderColor: theme.colors.gold,
    borderStyle: "dashed",
  },
  diaSemana:    { fontSize: 10, color: theme.colors.textMuted },
  diaNum:       { fontSize: 18, fontWeight: "500", color: theme.colors.text, marginTop: 2 },
  diaTextoAtivo:{ color: "#000" },
  diaBadge: {
    position: "absolute", top: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "rgba(212,175,55,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  diaBadgeAtivo: { backgroundColor: "rgba(0,0,0,0.25)" },
  diaBadgeText:  { fontSize: 9, color: theme.colors.gold, fontWeight: "500" },

  // Resumo do dia
  resumoRow: {
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle,
  },
  resumoData:     { fontSize: 14, fontWeight: "500", color: theme.colors.text, flex: 1 },
  resumoStats:    { flexDirection: "row", alignItems: "center", gap: 12 },
  resumoStat:     { alignItems: "center" },
  resumoStatVal:  { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  resumoStatLabel:{ fontSize: 10, color: theme.colors.textMuted },
  resumoSep:      { width: 1, height: 24, backgroundColor: theme.colors.borderSubtle },

  // Lista
  scroll: { padding: 16 },
  emptyBox: {
    alignItems: "center", justifyContent: "center",
    paddingTop: 64, gap: 10,
  },
  emptyIcon:  { fontSize: 44 },
  emptyTitle: { fontSize: 16, fontWeight: "500", color: theme.colors.text },
  emptySub:   { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" },

  // Card de agendamento
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 14, marginBottom: 10,
    flexDirection: "row", overflow: "hidden",
  },
  cardLinha: { width: 4 },
  cardHoraCol: {
    width: 56, alignItems: "center", justifyContent: "center",
    paddingVertical: 14, gap: 3,
  },
  cardHora:   { fontSize: 13, fontWeight: "500", color: theme.colors.text },
  cardDur:    { fontSize: 10, color: theme.colors.textMuted },
  cardSep:    { width: 1, backgroundColor: theme.colors.borderSubtle, marginVertical: 10 },
  cardInfo:   { flex: 1, padding: 12, gap: 8 },

  // Cliente row
  cardClienteRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  clienteAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  clienteIniciais: { fontSize: 14, fontWeight: "500" },
  clienteNome:     { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  clienteEmail:    { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },

  // Serviço row
  servicoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  servicoPill: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: theme.colors.borderSubtle,
  },
  servicoPillText: { fontSize: 12, color: theme.colors.text },
  servicoPreco: { fontSize: 13, fontWeight: "500", color: theme.colors.gold, flex: 1, textAlign: "right" },

  // Rodapé
  cardRodape: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11 },
  acaoDica:   { fontSize: 11, color: theme.colors.textHint, flex: 1, textAlign: "right" },
});
