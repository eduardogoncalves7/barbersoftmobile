// src/screens/client/MeusAgendamentosScreen.tsx
//
// Tela de histórico de agendamentos do cliente.
//
// A principal adição nesta versão é o QR Code integrado:
// cada agendamento ativo (Pendente ou Confirmado) exibe um botão
// "Mostrar QR Code". Ao tocar, um modal abre com o QR gerado pelo
// utilitário qrToken.ts — o cliente apresenta a tela para o barbeiro
// escanear, sem precisar de papel ou código externo.
//
// O QR Code NÃO é exibido para agendamentos Concluídos ou Cancelados,
// pois o token seria rejeitado pelo scanner de qualquer forma.

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";
import { BackHeader } from "../../components/BackHeader";

// Largura do QR Code no modal — ocupa 70% da tela para facilitar a leitura
// pela câmera mesmo em condições de luz variada.
const QR_SIZE = Dimensions.get("window").width * 0.65;

export const MeusAgendamentosScreen: React.FC = () => {
  const {
    usuarioLogado,
    getAgendamentosCliente,
    cancelarAgendamento,
    gerarQrDoAgendamento,
  } = useApp();

  // ID do agendamento cujo QR Code está sendo exibido no modal.
  // null significa que o modal está fechado.
  const [qrAberto, setQrAberto] = useState<string | null>(null);

  // Conteúdo Base64 do token — calculado uma única vez ao abrir o modal
  // para evitar que o QR mude enquanto o barbeiro está tentando escanear.
  const [qrConteudo, setQrConteudo] = useState<string>("");

  // ✅ FIX: getAgendamentosCliente() já retorna agendamentos enriquecidos
  // (via AppContext). Removidas as buscas manuais com servicos.find() e
  // usuarios.find() que dependiam dessas variáveis serem passadas no contexto.
  const lista = useMemo(() => {
    if (!usuarioLogado) return [];
    return getAgendamentosCliente(usuarioLogado.id).map((ag) => ({
      ...ag,
      servicoNome:  ag.servico?.nome        ?? "-",
      barbeiroNome: ag.barbeiro?.nome        ?? "-",
      preco:        ag.servico?.preco        ?? 0,
      duracaoMin:   ag.servico?.duracaoMin   ?? 0,
    }));
  }, [usuarioLogado, getAgendamentosCliente]);

  // Retorna as cores de fundo e texto de acordo com o status do agendamento.
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Concluido":  return { bg: theme.colors.successBg, text: theme.colors.success };
      case "Confirmado": return { bg: theme.colors.infoBg,    text: theme.colors.info    };
      case "Cancelado":  return { bg: theme.colors.dangerBg,  text: theme.colors.danger  };
      default:           return { bg: theme.colors.goldDim,   text: theme.colors.gold    };
    }
  };

  // Abre o modal de QR Code para um agendamento específico.
  // Gera o token no momento da abertura — se o agendamento não for elegível
  // (cancelado, concluído, ou ID inválido), gerarQrDoAgendamento retorna null.
  const abrirQR = (agendamentoId: string) => {
    const token = gerarQrDoAgendamento(agendamentoId);
    if (!token) {
      Alert.alert(
        "QR Code indisponivel",
        "Nao e possivel gerar um QR Code para este agendamento."
      );
      return;
    }
    setQrConteudo(token);
    setQrAberto(agendamentoId);
  };

  const fecharQR = () => {
    setQrAberto(null);
    setQrConteudo("");
  };

  const handleCancelar = (id: string) => {
    Alert.alert(
      "Cancelar agendamento",
      "Tem certeza que deseja cancelar? Esta acao nao pode ser desfeita.",
      [
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: async () => { await cancelarAgendamento(id); },
        },
        { text: "Nao", style: "cancel" },
      ]
    );
  };

  // Informacoes do agendamento que esta com o QR aberto, usadas no modal.
  const agendamentoQRAberto = lista.find((ag) => ag.id === qrAberto);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} />

      <BackHeader
        titulo="Meus agendamentos"
        subtitulo={`${lista.length} no total`}
        destino="Home"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {lista.length === 0 ? (
          // Estado vazio — nenhum agendamento criado ainda.
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Nenhum agendamento</Text>
            <Text style={styles.emptySub}>
              Voce ainda nao possui agendamentos. Que tal marcar um horario?
            </Text>
          </View>
        ) : (
          lista.map((ag) => {
            const ss       = getStatusStyle(ag.status);
            const ativo    = ag.status === "Pendente" || ag.status === "Confirmado";
            const concluido = ag.status === "Concluido";

            return (
              <View key={ag.id} style={styles.card}>
                {/* Barra lateral colorida indicando o status */}
                <View style={[styles.cardAccent, { backgroundColor: ss.text }]} />

                {/* Cabecalho do card: nome do servico e pílula de status */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardServico}>{ag.servicoNome}</Text>
                    <Text style={styles.cardBarbeiro}>{ag.barbeiroNome}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.pillText, { color: ss.text }]}>
                      {ag.status}
                    </Text>
                  </View>
                </View>

                {/* Metadados: data, hora e valor */}
                <View style={styles.cardMetas}>
                  <Text style={styles.cardMeta}>{ag.data}</Text>
                  <View style={styles.metaSep} />
                  <Text style={styles.cardMeta}>{ag.hora}</Text>
                  <View style={styles.metaSep} />
                  <Text style={styles.cardMeta}>{ag.duracaoMin} min</Text>
                  <Text style={[styles.cardPreco, { color: ss.text }]}>
                    R$ {ag.preco.toFixed(2)}
                  </Text>
                </View>

                {/* Acoes disponiveis dependendo do status */}
                {ativo && (
                  <View style={styles.cardAcoes}>
                    {/*
                     * Botao principal: abre o QR Code.
                     * So aparece para agendamentos Pendente ou Confirmado
                     * porque sao os unicos que o scanner vai aceitar.
                     */}
                    <TouchableOpacity
                      style={styles.btnQR}
                      onPress={() => abrirQR(ag.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnQRText}>Mostrar QR Code</Text>
                    </TouchableOpacity>

                    {/* Cancelamento — separado visualmente por ser acao destrutiva */}
                    <TouchableOpacity
                      style={styles.btnCancelar}
                      onPress={() => handleCancelar(ag.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.btnCancelarText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Para agendamentos concluidos, exibe um label informativo no lugar dos botoes */}
                {concluido && (
                  <View style={styles.concluidoLabel}>
                    <Text style={styles.concluidoText}>
                      Atendimento realizado. Obrigado pela visita.
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ================================================================
          Modal de QR Code
          ================================================================
          Abre em tela cheia com fundo escuro para maximizar o contraste
          do QR Code e facilitar a leitura pelo scanner da barbearia.

          O token exibido aqui foi gerado por gerarTokenQR() e contém:
            - ID do agendamento
            - ID do cliente (para validacao cruzada)
            - Timestamp de expiracao (24h)
            - Assinatura HMAC (para detectar adulteracao)

          O scanner (ValidacaoCameraScreen) usa validarTokenQR() para
          verificar todos esses campos antes de concluir o atendimento.
      ================================================================ */}
      <Modal
        visible={!!qrAberto}
        transparent
        animationType="fade"
        onRequestClose={fecharQR}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            {/* Cabecalho do modal com informacoes do agendamento */}
            <Text style={styles.modalTitulo}>QR Code do Atendimento</Text>

            {agendamentoQRAberto && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalServico}>
                  {agendamentoQRAberto.servicoNome}
                </Text>
                <Text style={styles.modalMeta}>
                  {agendamentoQRAberto.data}  {agendamentoQRAberto.hora}
                </Text>
                <Text style={styles.modalMeta}>
                  {agendamentoQRAberto.barbeiroNome}
                </Text>
              </View>
            )}

            {/* Quadro branco ao redor do QR para garantir contraste
                independente do tema escuro da tela */}
            <View style={styles.qrFrame}>
              {qrConteudo ? (
                <QRCode
                  value={qrConteudo}
                  size={QR_SIZE}
                  // Cor preta classica no fundo branco — maxima legibilidade
                  color="#000000"
                  backgroundColor="#FFFFFF"
                  // Nivel de correcao de erros H (High): suporta ate 30% de dano
                  // no codigo e ainda consegue ser lido. Util em telas com brilho
                  // variado ou reflexos.
                  ecl="H"
                />
              ) : (
                <View style={[{ width: QR_SIZE, height: QR_SIZE }, styles.qrPlaceholder]}>
                  <Text style={styles.qrPlaceholderText}>Gerando...</Text>
                </View>
              )}
            </View>

            {/* Instrucao ao usuario — texto simples, sem emojis */}
            <Text style={styles.modalInstrucao}>
              Apresente esta tela ao barbeiro no momento do atendimento.
              O codigo expira em 24 horas.
            </Text>

            <TouchableOpacity
              style={styles.btnFechar}
              onPress={fecharQR}
              activeOpacity={0.85}
            >
              <Text style={styles.btnFecharText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 40 },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },

  // Card de agendamento
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingLeft: 8,
  },
  cardServico: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 3,
  },
  cardBarbeiro: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  cardMetas: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    marginBottom: 12,
  },
  cardMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.textMuted,
  },
  cardPreco: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },

  pill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontSize: 11 },

  // Acoes do card
  cardAcoes: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 10,
  },
  btnQR: {
    flex: 1,
    backgroundColor: theme.colors.gold,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  btnQRText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#000",
  },
  btnCancelar: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.3)",
    alignItems: "center",
  },
  btnCancelarText: {
    fontSize: 13,
    color: theme.colors.danger,
  },

  concluidoLabel: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 10,
  },
  concluidoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },

  // Modal de QR Code
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 12,
  },
  modalInfo: {
    alignItems: "center",
    marginBottom: 20,
    gap: 4,
  },
  modalServico: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.gold,
  },
  modalMeta: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  // O frame branco garante que o QR Code nunca fique sobre fundo escuro,
  // o que reduziria significativamente a taxa de leitura pelo scanner.
  qrFrame: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: "#999",
  },

  modalInstrucao: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 280,
  },
  btnFechar: {
    backgroundColor: theme.colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  btnFecharText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
});
