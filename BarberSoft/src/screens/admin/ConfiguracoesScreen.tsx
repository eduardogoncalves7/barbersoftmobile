// src/screens/admin/ConfiguracoesScreen.tsx
//
// CRUD de Servicos e Barbeiros para o admin.
//
// CORREÇÕES v2.1:
//  1. `barbeiros` agora vem direto do contexto (era `undefined` antes —
//     o contexto não expunha essa propriedade, causando o crash
//     "Cannot read property 'length' of undefined").
//  2. `adicionarBarbeiro` agora trata o retorno { sucesso, mensagem }
//     que o contexto corrigido passou a retornar.
//  3. Removidas as variáveis intermediárias `servicosSafe`/`barbeirosSafe`
//     (agora desnecessárias pois o contexto sempre fornece arrays).

import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";
import { Servico, Usuario } from "../../types";

type AbaInterna = "servicos" | "barbeiros";

interface ModalFormProps {
  visivel: boolean;
  titulo: string;
  onFechar: () => void;
  onSalvar: () => void;
  children: React.ReactNode;
}
const ModalForm: React.FC<ModalFormProps> = ({ visivel, titulo, onFechar, onSalvar, children }) => (
  <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onFechar} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitulo}>{titulo}</Text>
          <TouchableOpacity onPress={onFechar} style={styles.modalBtnFechar}>
            <Text style={styles.modalBtnFecharText}>x</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {children}
        </ScrollView>
        <TouchableOpacity style={styles.btnSalvar} onPress={onSalvar} activeOpacity={0.85}>
          <Text style={styles.btnSalvarText}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

interface CampoProps {
  label: string;
  valor: string;
  onMudar: (v: string) => void;
  placeholder?: string;
  teclado?: "default" | "numeric" | "email-address";
  multiline?: boolean;
}
const Campo: React.FC<CampoProps> = ({ label, valor, onMudar, placeholder, teclado = "default", multiline }) => (
  <View style={styles.campo}>
    <Text style={styles.campoLabel}>{label}</Text>
    <TextInput
      style={[styles.campoInput, multiline && styles.campoInputMulti]}
      value={valor}
      onChangeText={onMudar}
      placeholder={placeholder ?? label}
      placeholderTextColor={theme.colors.textHint}
      keyboardType={teclado}
      autoCapitalize="none"
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
  </View>
);

const FORM_SERVICO_VAZIO = { nome: "", descricao: "", preco: "", duracaoMin: "" };
const FORM_BARBEIRO_VAZIO = { nome: "", email: "", senha: "admin123" };

export const ConfiguracoesScreen: React.FC = () => {
  const {
    servicos,
    adicionarServico, editarServico, excluirServico,
    // ✅ FIX: `barbeiros` agora existe no contexto e nunca é undefined
    barbeiros,
    adicionarBarbeiro, editarBarbeiro, excluirBarbeiro,
    usuarioLogado, logout,
  } = useApp();

  const [aba, setAba] = useState<AbaInterna>("servicos");
  const [modalServico,     setModalServico]     = useState(false);
  const [editandoServico,  setEditandoServico]  = useState<Servico | null>(null);
  const [formServico,      setFormServico]      = useState(FORM_SERVICO_VAZIO);
  const [modalBarbeiro,    setModalBarbeiro]    = useState(false);
  const [editandoBarbeiro, setEditandoBarbeiro] = useState<Usuario | null>(null);
  const [formBarbeiro,     setFormBarbeiro]     = useState(FORM_BARBEIRO_VAZIO);

  const iniciais = (nome: string) =>
    nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  // ── Handlers Servico ──────────────────────────
  const abrirNovoServico = () => {
    setEditandoServico(null);
    setFormServico(FORM_SERVICO_VAZIO);
    setModalServico(true);
  };
  const abrirEditarServico = (s: Servico) => {
    setEditandoServico(s);
    setFormServico({ nome: s.nome, descricao: s.descricao, preco: String(s.preco), duracaoMin: String(s.duracaoMin) });
    setModalServico(true);
  };
  const salvarServico = async () => {
    const { nome, descricao, preco, duracaoMin } = formServico;
    if (!nome.trim()) { Alert.alert("Campo obrigatorio", "Informe o nome do servico."); return; }
    const precoNum = parseFloat(preco.replace(",", "."));
    const durNum   = parseInt(duracaoMin, 10);
    if (isNaN(precoNum) || precoNum <= 0) { Alert.alert("Valor invalido", "Informe um preco valido."); return; }
    if (isNaN(durNum) || durNum <= 0) { Alert.alert("Duracao invalida", "Informe a duracao em minutos."); return; }
    const dados = { nome: nome.trim(), descricao: descricao.trim(), preco: precoNum, duracaoMin: durNum };
    try {
      if (editandoServico) {
        await editarServico(editandoServico.id, dados);
        Alert.alert("Sucesso", "Servico atualizado!");
      } else {
        await adicionarServico(dados);
        Alert.alert("Sucesso", `"${nome.trim()}" adicionado!`);
      }
      setModalServico(false);
    } catch {
      Alert.alert("Erro", "Nao foi possivel salvar o servico.");
    }
  };
  const confirmarExcluirServico = (s: Servico) => {
    Alert.alert("Excluir servico", `Deseja excluir "${s.nome}"?`, [
      { text: "Excluir", style: "destructive", onPress: async () => {
        const res = await excluirServico(s.id);
        if (!res.sucesso) Alert.alert("Nao foi possivel excluir", res.mensagem);
      }},
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  // ── Handlers Barbeiro ─────────────────────────
  const abrirNovoBarbeiro = () => {
    setEditandoBarbeiro(null);
    setFormBarbeiro(FORM_BARBEIRO_VAZIO);
    setModalBarbeiro(true);
  };
  const abrirEditarBarbeiro = (b: Usuario) => {
    setEditandoBarbeiro(b);
    setFormBarbeiro({ nome: b.nome, email: b.email, senha: "" });
    setModalBarbeiro(true);
  };
  const salvarBarbeiro = async () => {
    const { nome, email, senha } = formBarbeiro;
    if (!nome.trim()) { Alert.alert("Campo obrigatorio", "Informe o nome."); return; }
    if (!email.trim() || !email.includes("@")) { Alert.alert("E-mail invalido", "Informe um e-mail valido."); return; }
    try {
      if (editandoBarbeiro) {
        await editarBarbeiro(editandoBarbeiro.id, { nome: nome.trim(), email: email.trim() });
        Alert.alert("Sucesso", "Barbeiro atualizado!");
      } else {
        if (!senha || senha.length < 6) { Alert.alert("Senha invalida", "A senha deve ter pelo menos 6 caracteres."); return; }
        // ✅ FIX: adicionarBarbeiro agora retorna { sucesso, mensagem }
        const res = await adicionarBarbeiro({ nome: nome.trim(), email: email.trim(), senha });
        if (!res.sucesso) { Alert.alert("Erro", res.mensagem); return; }
        Alert.alert("Sucesso", `"${nome.trim()}" adicionado a equipe!`);
      }
      setModalBarbeiro(false);
    } catch {
      Alert.alert("Erro", "Nao foi possivel salvar o barbeiro.");
    }
  };
  const confirmarExcluirBarbeiro = (b: Usuario) => {
    Alert.alert("Excluir barbeiro", `Deseja remover "${b.nome}"?`, [
      { text: "Excluir", style: "destructive", onPress: async () => {
        const res = await excluirBarbeiro(b.id);
        if (!res.sucesso) Alert.alert("Nao foi possivel excluir", res.mensagem);
      }},
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}><Text style={styles.logoText}>B</Text></View>
          <View>
            <Text style={styles.headerTitle}>Configuracoes</Text>
            <Text style={styles.headerSub}>Gerencie servicos e equipe</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.avatarContainer} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.avatarText}>{iniciais(usuarioLogado?.nome ?? "AD")}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Abas ── servicos.length e barbeiros.length agora sempre funcionam */}
      <View style={styles.abasRow}>
        {(["servicos", "barbeiros"] as AbaInterna[]).map((a) => (
          <TouchableOpacity key={a} style={[styles.abaBtn, aba === a && styles.abaBtnAtiva]} onPress={() => setAba(a)} activeOpacity={0.8}>
            <Text style={[styles.abaText, aba === a && styles.abaTextAtiva]}>
              {a === "servicos"
                ? `Servicos (${servicos.length})`
                : `Barbeiros (${barbeiros.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {aba === "servicos" && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.btnAdicionar} onPress={abrirNovoServico} activeOpacity={0.85}>
            <Text style={styles.btnAdicionarText}>+ Adicionar servico</Text>
          </TouchableOpacity>
          {servicos.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardAccent} />
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNome}>{s.nome}</Text>
                  <Text style={styles.cardDesc}>{s.descricao}</Text>
                </View>
                <View style={styles.cardPrecoBox}>
                  <Text style={styles.cardPreco}>R$ {s.preco.toFixed(2)}</Text>
                  <Text style={styles.cardDur}>{s.duracaoMin} min</Text>
                </View>
              </View>
              <View style={styles.cardAcoes}>
                <TouchableOpacity style={[styles.btnAcao, styles.btnEditar]} onPress={() => abrirEditarServico(s)} activeOpacity={0.75}>
                  <Text style={styles.btnAcaoText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAcao, styles.btnExcluir]} onPress={() => confirmarExcluirServico(s)} activeOpacity={0.75}>
                  <Text style={[styles.btnAcaoText, { color: theme.colors.danger }]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {aba === "barbeiros" && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.btnAdicionar} onPress={abrirNovoBarbeiro} activeOpacity={0.85}>
            <Text style={styles.btnAdicionarText}>+ Adicionar barbeiro</Text>
          </TouchableOpacity>
          {barbeiros.map((b) => (
            <View key={b.id} style={styles.card}>
              <View style={[styles.cardAccent, { backgroundColor: theme.colors.success }]} />
              <View style={styles.cardTop}>
                <View style={styles.barbeiroAvatarBox}>
                  <Text style={styles.barbeiroIniciais}>{iniciais(b.nome)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardNome}>{b.nome}</Text>
                  <Text style={styles.cardDesc}>{b.email}</Text>
                </View>
              </View>
              <View style={styles.cardAcoes}>
                <TouchableOpacity style={[styles.btnAcao, styles.btnEditar]} onPress={() => abrirEditarBarbeiro(b)} activeOpacity={0.75}>
                  <Text style={styles.btnAcaoText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAcao, styles.btnExcluir]} onPress={() => confirmarExcluirBarbeiro(b)} activeOpacity={0.75}>
                  <Text style={[styles.btnAcaoText, { color: theme.colors.danger }]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <ModalForm visivel={modalServico} titulo={editandoServico ? "Editar servico" : "Novo servico"} onFechar={() => setModalServico(false)} onSalvar={salvarServico}>
        <Campo label="NOME" valor={formServico.nome} onMudar={(v) => setFormServico((p) => ({ ...p, nome: v }))} placeholder="Corte Classico" />
        <Campo label="DESCRICAO" valor={formServico.descricao} onMudar={(v) => setFormServico((p) => ({ ...p, descricao: v }))} multiline />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}><Campo label="PRECO (R$)" valor={formServico.preco} onMudar={(v) => setFormServico((p) => ({ ...p, preco: v }))} teclado="numeric" placeholder="45.00" /></View>
          <View style={{ flex: 1 }}><Campo label="DURACAO (min)" valor={formServico.duracaoMin} onMudar={(v) => setFormServico((p) => ({ ...p, duracaoMin: v }))} teclado="numeric" placeholder="30" /></View>
        </View>
      </ModalForm>

      <ModalForm visivel={modalBarbeiro} titulo={editandoBarbeiro ? "Editar barbeiro" : "Novo barbeiro"} onFechar={() => setModalBarbeiro(false)} onSalvar={salvarBarbeiro}>
        <Campo label="NOME" valor={formBarbeiro.nome} onMudar={(v) => setFormBarbeiro((p) => ({ ...p, nome: v }))} placeholder="Carlos Silva" />
        <Campo label="E-MAIL" valor={formBarbeiro.email} onMudar={(v) => setFormBarbeiro((p) => ({ ...p, email: v }))} teclado="email-address" placeholder="carlos@barbearia.com" />
        {!editandoBarbeiro && (
          <Campo label="SENHA" valor={formBarbeiro.senha} onMudar={(v) => setFormBarbeiro((p) => ({ ...p, senha: v }))} placeholder="Minimo 6 caracteres" />
        )}
      </ModalForm>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 8, backgroundColor: theme.colors.gold, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 18, fontWeight: "500", color: "#000" },
  headerTitle: { fontSize: 16, fontWeight: "500", color: theme.colors.text },
  headerSub: { fontSize: 12, color: theme.colors.textMuted },
  avatarContainer: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.goldDim, borderWidth: 1.5, borderColor: theme.colors.gold, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "500", color: theme.colors.gold },
  abasRow: { flexDirection: "row", backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  abaBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  abaBtnAtiva: { backgroundColor: "rgba(212,175,55,0.1)", borderColor: theme.colors.gold },
  abaText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: "500" },
  abaTextAtiva: { color: theme.colors.gold },
  btnAdicionar: { backgroundColor: theme.colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 16 },
  btnAdicionarText: { fontSize: 14, fontWeight: "500", color: "#000" },
  card: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14, marginBottom: 10, overflow: "hidden" },
  cardAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: theme.colors.gold },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  cardNome: { fontSize: 14, fontWeight: "500", color: theme.colors.text, marginBottom: 3 },
  cardDesc: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },
  cardPrecoBox: { alignItems: "flex-end" },
  cardPreco: { fontSize: 16, fontWeight: "500", color: theme.colors.gold },
  cardDur: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  cardAcoes: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle, paddingTop: 10 },
  btnAcao: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", borderWidth: 1 },
  btnEditar: { borderColor: "rgba(212,175,55,0.3)", backgroundColor: "rgba(212,175,55,0.05)" },
  btnExcluir: { borderColor: "rgba(239,83,80,0.25)", backgroundColor: "rgba(239,83,80,0.05)" },
  btnAcaoText: { fontSize: 13, color: theme.colors.gold },
  barbeiroAvatarBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.goldDim, borderWidth: 1.5, borderColor: theme.colors.gold, alignItems: "center", justifyContent: "center" },
  barbeiroIniciais: { fontSize: 16, fontWeight: "500", color: theme.colors.gold },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20, maxHeight: "85%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitulo: { fontSize: 17, fontWeight: "500", color: theme.colors.text },
  modalBtnFechar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  modalBtnFecharText: { fontSize: 13, color: theme.colors.textMuted },
  btnSalvar: { backgroundColor: theme.colors.gold, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  btnSalvarText: { fontSize: 15, fontWeight: "500", color: "#000" },
  campo: { marginBottom: 14 },
  campoLabel: { fontSize: 10, fontWeight: "500", letterSpacing: 1.4, color: theme.colors.textMuted, marginBottom: 6 },
  campoInput: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)", borderRadius: 10, color: theme.colors.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 },
  campoInputMulti: { height: 76, textAlignVertical: "top" },
});
