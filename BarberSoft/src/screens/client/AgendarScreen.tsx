// src/screens/client/AgendarScreen.tsx
import React, { useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";
import { ClientTabParamList } from "../../types";
import { BackHeader } from "../../components/BackHeader";

type NavProp = BottomTabNavigationProp<ClientTabParamList, "Agendar">;

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HORARIOS = [
  "08:00","09:00","10:00","11:00",
  "13:00","14:00","15:00","16:00","17:00","18:00",
];

export const AgendarScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const {
    servicos, getBarbeiros, agendamentos,
    adicionarAgendamento, usuarioLogado,
  } = useApp();

  const barbeiros = getBarbeiros();

  const [servicoId,  setServicoId]  = useState<string | null>(null);
  const [barbeiroId, setBarbeiroId] = useState<string | null>(null);
  const [dataSel,    setDataSel]    = useState<string | null>(null);
  const [horaSel,    setHoraSel]    = useState<string | null>(null);

  const diasDisponiveis = useMemo(() => {
    const hoje = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + i);
      return {
        label: i === 0 ? "Hoje" : DIAS_SEMANA[d.getDay()],
        num:   d.getDate(),
        iso:   d.toISOString().split("T")[0],
      };
    });
  }, []);

  const horariosOcupados = useMemo(() => {
    if (!barbeiroId || !dataSel) return new Set<string>();
    return new Set(
      agendamentos
        .filter((a) => a.barbeiroId === barbeiroId && a.data === dataSel && a.status !== "Cancelado")
        .map((a) => a.hora)
    );
  }, [barbeiroId, dataSel, agendamentos]);

  const servicoSelecionado  = servicos.find((s) => s.id === servicoId);
  const barbeiroSelecionado = barbeiros.find((b) => b.id === barbeiroId);
  const tudoPreenchido = !!servicoId && !!barbeiroId && !!dataSel && !!horaSel;

  const iniciais = (nome: string) =>
    nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  const handleConfirmar = async () => {
    if (!tudoPreenchido || !usuarioLogado) return;
    const resultado = await adicionarAgendamento({
      barbeiroId: barbeiroId!,
      servicoId:  servicoId!,
      data:       dataSel!,
      hora:       horaSel!,
    });

    if (resultado.sucesso) {
      Alert.alert(
        "Agendamento marcado!",
        `Seu horário foi confirmado com sucesso.\n\n${servicoSelecionado?.nome} • ${horaSel}`,
        [
          {
            text: "Ver meus agendamentos",
            onPress: () => {
              setServicoId(null); setBarbeiroId(null);
              setDataSel(null);   setHoraSel(null);
              navigation.navigate("MeusAgendamentos");
            },
          },
          {
            text: "Ir para o início",
            style: "cancel",
            onPress: () => {
              setServicoId(null); setBarbeiroId(null);
              setDataSel(null);   setHoraSel(null);
              navigation.navigate("Home");
            },
          },
        ]
      );
    } else {
      Alert.alert("Não foi possível agendar", resultado.mensagem);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} />

      <BackHeader
        titulo="Agendar horário"
        subtitulo={`Olá, ${usuarioLogado?.nome.split(" ")[0]}`}
        destino="Home"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 1. Serviços */}
        <Text style={styles.sectionLabel}>Escolha o serviço</Text>
        <View style={styles.servicosGrid}>
          {servicos.map((s) => {
            const ativo = servicoId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.svcCard, ativo && styles.svcCardAtivo]}
                onPress={() => setServicoId(s.id)}
                activeOpacity={0.8}
              >
                {ativo && <View style={styles.svcAccent} />}
                <View style={styles.svcBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.svcNome}>{s.nome}</Text>
                    <Text style={styles.svcDur}>{s.duracaoMin} min</Text>
                    <Text style={styles.svcPreco}>R$ {s.preco.toFixed(2)}</Text>
                  </View>
                  {ativo && (
                    <View style={styles.checkCircle}>
                      <Text style={{ fontSize: 10, color: "#000" }}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Barbeiros */}
        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Escolha o barbeiro</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 14, paddingHorizontal: 2 }}>
            {barbeiros.map((b) => {
              const ativo = barbeiroId === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.barbeiroBtn}
                  onPress={() => setBarbeiroId(b.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.barbeiroAvatar, ativo && styles.barbeiroAvatarAtivo]}>
                    <Text style={[styles.barbeiroIniciais, ativo && { color: theme.colors.gold }]}>
                      {iniciais(b.nome)}
                    </Text>
                  </View>
                  <Text style={[styles.barbeiroNome, ativo && { color: theme.colors.gold }]}>
                    {b.nome.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* 3. Data */}
        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Data</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 2 }}>
            {diasDisponiveis.map((d) => {
              const ativo = dataSel === d.iso;
              return (
                <TouchableOpacity
                  key={d.iso}
                  style={[styles.dataBtn, ativo && styles.dataBtnAtivo]}
                  onPress={() => { setDataSel(d.iso); setHoraSel(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dataDia, ativo && { color: theme.colors.gold }]}>{d.label}</Text>
                  <Text style={[styles.dataNum, ativo && { color: theme.colors.gold }]}>{d.num}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* 4. Horários */}
        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Horário</Text>
        <View style={styles.horariosGrid}>
          {HORARIOS.map((h) => {
            const bloqueado = horariosOcupados.has(h);
            const ativo = horaSel === h && !bloqueado;
            return (
              <TouchableOpacity
                key={h}
                style={[
                  styles.horarioBtn,
                  ativo      && styles.horarioBtnAtivo,
                  bloqueado  && styles.horarioBtnBloqueado,
                ]}
                onPress={() => !bloqueado && setHoraSel(h)}
                disabled={bloqueado}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.horarioText,
                  ativo     && { color: theme.colors.gold },
                  bloqueado && styles.horarioTextBloqueado,
                ]}>
                  {h}
                </Text>
                {bloqueado && <Text style={styles.horarioOcupado}>Ocupado</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. Resumo */}
        {tudoPreenchido && (
          <View style={styles.resumoCard}>
            <View style={styles.resumoAccent} />
            <Text style={styles.resumoTitulo}>Resumo do agendamento</Text>
            {[
              { k: "Serviço",     v: servicoSelecionado?.nome },
              { k: "Barbeiro",    v: barbeiroSelecionado?.nome },
              { k: "Data",        v: dataSel },
              { k: "Horário",     v: horaSel },
              { k: "Duração",     v: `${servicoSelecionado?.duracaoMin} min` },
            ].map((r) => (
              <View key={r.k} style={styles.resumoRow}>
                <Text style={styles.resumoKey}>{r.k}</Text>
                <Text style={styles.resumoVal}>{r.v}</Text>
              </View>
            ))}
            <View style={[styles.resumoRow, styles.resumoTotal]}>
              <Text style={styles.resumoKey}>Total</Text>
              <Text style={[styles.resumoVal, { color: theme.colors.gold, fontSize: 18 }]}>
                R$ {servicoSelecionado?.preco.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnConfirmar, !tudoPreenchido && styles.btnDisabled]}
          onPress={handleConfirmar}
          disabled={!tudoPreenchido}
          activeOpacity={0.85}
        >
          <Text style={styles.btnConfirmarText}>Confirmar agendamento</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 10, fontWeight: "500", letterSpacing: 1.5,
    color: theme.colors.textMuted, textTransform: "uppercase", marginBottom: 10,
  },

  servicosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  svcCard: {
    width: "48%",
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: "rgba(212,175,55,0.15)",
    borderRadius: 12, padding: 12, overflow: "hidden",
  },
  svcCardAtivo:  { borderColor: theme.colors.gold, backgroundColor: "rgba(212,175,55,0.07)" },
  svcAccent:     { position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: theme.colors.gold },
  svcBody:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  svcNome:       { fontSize: 13, fontWeight: "500", color: theme.colors.text, marginBottom: 3 },
  svcDur:        { fontSize: 11, color: theme.colors.textMuted, marginBottom: 6 },
  svcPreco:      { fontSize: 15, fontWeight: "500", color: theme.colors.gold },
  checkCircle:   { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.gold, alignItems: "center", justifyContent: "center" },

  barbeiroBtn:         { alignItems: "center", gap: 6, minWidth: 60 },
  barbeiroAvatar:      { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.goldDim, borderWidth: 2, borderColor: "rgba(212,175,55,0.2)", alignItems: "center", justifyContent: "center" },
  barbeiroAvatarAtivo: { borderColor: theme.colors.gold, backgroundColor: "rgba(212,175,55,0.18)" },
  barbeiroIniciais:    { fontSize: 15, fontWeight: "500", color: theme.colors.textMuted },
  barbeiroNome:        { fontSize: 11, color: theme.colors.textMuted, textAlign: "center" },

  dataBtn:      { alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)", backgroundColor: theme.colors.card },
  dataBtnAtivo: { borderColor: theme.colors.gold, backgroundColor: "rgba(212,175,55,0.1)" },
  dataDia:      { fontSize: 10, color: theme.colors.textMuted },
  dataNum:      { fontSize: 18, fontWeight: "500", color: theme.colors.text, marginTop: 2 },

  horariosGrid:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  horarioBtn:           { width: "22%", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)", backgroundColor: theme.colors.card, alignItems: "center" },
  horarioBtnAtivo:      { borderColor: theme.colors.gold, backgroundColor: "rgba(212,175,55,0.1)" },
  horarioBtnBloqueado:  { backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" },
  horarioText:          { fontSize: 12, color: theme.colors.text },
  horarioTextBloqueado: { color: "#444", textDecorationLine: "line-through" },
  horarioOcupado:       { fontSize: 9, color: "#444", marginTop: 2 },

  resumoCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 14, padding: 16, marginTop: 22, overflow: "hidden",
  },
  resumoAccent:  { position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: theme.colors.gold },
  resumoTitulo:  { fontSize: 13, fontWeight: "500", color: theme.colors.text, marginBottom: 12, marginTop: 4 },
  resumoRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  resumoTotal:   { borderBottomWidth: 0, paddingTop: 12 },
  resumoKey:     { fontSize: 12, color: theme.colors.textMuted },
  resumoVal:     { fontSize: 13, fontWeight: "500", color: theme.colors.text },

  btnConfirmar:     { backgroundColor: theme.colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  btnDisabled:      { opacity: 0.35 },
  btnConfirmarText: { fontSize: 15, fontWeight: "500", color: "#000", letterSpacing: 0.5 },
});
