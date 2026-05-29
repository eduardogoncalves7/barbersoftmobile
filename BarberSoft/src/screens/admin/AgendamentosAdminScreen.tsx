// src/screens/admin/AgendamentosAdminScreen.tsx
//
// Listagem e gerenciamento de agendamentos para o admin.
// Os dados vem do contexto, que por sua vez busca na API.
// Os objetos aninhados (cliente, barbeiro, servico) ja chegam
// no payload da API — nao precisamos mais de lookup local.

import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, SafeAreaView, StatusBar, Alert,
} from "react-native";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";
import { StatusAgendamento } from "../../types";
import { BackHeader } from "../../components/BackHeader";

const FILTROS: StatusAgendamento[] = ["Pendente", "Confirmado", "Concluido", "Cancelado"];

export const AgendamentosAdminScreen: React.FC = () => {
  const { agendamentosEnriquecidos, atualizarStatusAgendamento, cancelarAgendamento } = useApp();

  const [filtro, setFiltro] = useState<StatusAgendamento | "Todos">("Todos");

  const lista = useMemo(() => {
    // ✅ FIX: usa agendamentosEnriquecidos — campos cliente/barbeiro/servico
    // já estão populados. Antes usava `agendamentos` (IDs brutos) e
    // ag.cliente?.nome era sempre undefined → mostrava IDs na UI.
    const base = filtro === "Todos"
      ? agendamentosEnriquecidos
      : agendamentosEnriquecidos.filter((a) => a.status === filtro);

    return base
      .map((ag) => ({
        ...ag,
        clienteNome:  ag.cliente?.nome  ?? ag.clienteId,
        barbeiroNome: ag.barbeiro?.nome ?? ag.barbeiroId,
        servicoNome:  ag.servico?.nome  ?? ag.servicoId,
        preco:        ag.servico?.preco ?? 0,
      }))
      .sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`));
  }, [agendamentosEnriquecidos, filtro]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Concluido":  return { bg: theme.colors.successBg, text: theme.colors.success };
      case "Confirmado": return { bg: theme.colors.infoBg,    text: theme.colors.info    };
      case "Cancelado":  return { bg: theme.colors.dangerBg,  text: theme.colors.danger  };
      default:           return { bg: theme.colors.goldDim,   text: theme.colors.gold    };
    }
  };

  const handleAcao = (id: string, statusAtual: StatusAgendamento) => {
    if (statusAtual === "Cancelado" || statusAtual === "Concluido") return;
    Alert.alert("Gerenciar agendamento", "O que deseja fazer?", [
      statusAtual === "Pendente"
        ? { text: "Confirmar", onPress: async () => { await atualizarStatusAgendamento(id, "Confirmado"); } }
        : { text: "Cancelar",  onPress: async () => { await cancelarAgendamento(id); }, style: "destructive" },
      { text: "Fechar", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} />

      <BackHeader
        titulo="Agendamentos"
        subtitulo={`${lista.length} registros`}
        destino="Dashboard"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {(["Todos", ...FILTROS] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroBtnAtivo]}
            onPress={() => setFiltro(f as StatusAgendamento | "Todos")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filtroText, filtro === f && styles.filtroTextAtivo]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {lista.length === 0 ? (
          <Text style={styles.empty}>Nenhum agendamento encontrado.</Text>
        ) : (
          lista.map((ag) => {
            const ss = getStatusStyle(ag.status);
            const tocavel = ag.status !== "Cancelado" && ag.status !== "Concluido";
            return (
              <TouchableOpacity
                key={ag.id}
                style={styles.card}
                onPress={() => handleAcao(ag.id, ag.status)}
                activeOpacity={tocavel ? 0.75 : 1}
              >
                <View style={[styles.cardAccent, { backgroundColor: ss.text }]} />
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardCliente}>{ag.clienteNome}</Text>
                    <Text style={styles.cardServico}>{ag.servicoNome}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.pillText, { color: ss.text }]}>{ag.status}</Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardMeta}>{ag.barbeiroNome}</Text>
                  <Text style={styles.cardMeta}>{ag.data}</Text>
                  <Text style={styles.cardMeta}>{ag.hora}</Text>
                  <Text style={[styles.cardPreco, { color: ss.text }]}>R$ {ag.preco.toFixed(2)}</Text>
                </View>
                {tocavel && (
                  <Text style={styles.cardDica}>Toque para gerenciar</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 40 },

  filtrosScroll: {
    maxHeight: 52,
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filtroBtn:       { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border },
  filtroBtnAtivo:  { backgroundColor: theme.colors.gold, borderColor: theme.colors.gold },
  filtroText:      { fontSize: 12, color: theme.colors.textMuted },
  filtroTextAtivo: { color: "#000", fontWeight: "500" },

  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 12, padding: 14, marginBottom: 10, overflow: "hidden",
  },
  cardAccent:  { position: "absolute", top: 0, left: 0, bottom: 0, width: 3 },
  cardTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardCliente: { fontSize: 14, fontWeight: "500", color: theme.colors.text },
  cardServico: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  cardBottom:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cardMeta:    { fontSize: 12, color: theme.colors.textMuted },
  cardPreco:   { fontSize: 13, fontWeight: "500", alignSelf: "flex-end", flex: 1, textAlign: "right" },
  cardDica:    { fontSize: 11, color: theme.colors.textHint, marginTop: 8, textAlign: "right" },
  pill:        { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pillText:    { fontSize: 11 },
  empty:       { textAlign: "center", color: theme.colors.textMuted, marginTop: 60, fontSize: 14 },
});
