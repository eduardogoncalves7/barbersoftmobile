// src/screens/auth/CadastroScreen.tsx
//
// Tela de cadastro de novos clientes.
//
// Apenas clientes podem se cadastrar por aqui — barbeiros e admins
// sao criados pelo administrador dentro do app (ConfiguracoesScreen).
//
// Apos o cadastro bem-sucedido, o usuario ja fica logado e o
// RootNavigator redireciona automaticamente para ClientTabs,
// sem precisar de nenhuma navegacao explicita nesta tela.

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";
import { RootStackParamList } from "../../types";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Cadastro">;
};

export const CadastroScreen: React.FC<Props> = ({ navigation }) => {
  const { cadastrar } = useApp();

  const [nome,             setNome]             = useState("");
  const [email,            setEmail]            = useState("");
  const [senha,            setSenha]            = useState("");
  const [confirmarSenha,   setConfirmarSenha]   = useState("");
  const [mostrarSenha,     setMostrarSenha]     = useState(false);
  const [error,            setError]            = useState("");
  const [loading,          setLoading]          = useState(false);

  // Refs para navegar entre campos com o teclado
  const emailRef          = useRef<TextInput>(null);
  const senhaRef          = useRef<TextInput>(null);
  const confirmarSenhaRef = useRef<TextInput>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleCadastrar = async () => {
    // Validacoes feitas aqui antes de chamar o contexto para dar
    // feedback imediato sem precisar de ida e volta ao estado global.
    if (!nome.trim() || nome.trim().length < 2) {
      setError("Informe seu nome completo.");
      shake();
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Informe um e-mail valido.");
      shake();
      return;
    }
    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      shake();
      return;
    }
    if (senha !== confirmarSenha) {
      setError("As senhas nao conferem.");
      shake();
      return;
    }

    setLoading(true);
    setError("");
    try {
      await cadastrar(nome.trim(), email.trim(), senha);
      // Cadastro bem-sucedido: RootNavigator detecta usuarioLogado e redireciona.
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao cadastrar.";
      setError(msg);
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand — mesmo padrao visual da tela de login */}
          <View style={styles.brand}>
            <View style={styles.logoRing}>
              <Text style={styles.logoLetter}>B</Text>
            </View>
            <Text style={styles.brandName}>BARBERSOFT</Text>
            <Text style={styles.brandTag}>Criar conta</Text>
            <View style={styles.goldLine} />
          </View>

          {/* Formulario de cadastro */}
          <Animated.View
            style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Text style={styles.cardTitle}>Criar sua conta</Text>
            <Text style={styles.cardSub}>
              Preencha os dados abaixo para se cadastrar como cliente.
            </Text>

            {/* Nome */}
            <Text style={styles.inputLabel}>NOME COMPLETO</Text>
            <TextInput
              style={[styles.input, !!error && !nome.trim() && styles.inputError]}
              value={nome}
              onChangeText={(t) => { setNome(t); setError(""); }}
              placeholder="Seu nome completo"
              placeholderTextColor={theme.colors.textHint}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            {/* E-mail */}
            <Text style={styles.inputLabel}>E-MAIL</Text>
            <TextInput
              ref={emailRef}
              style={[styles.input, !!error && !email.trim() && styles.inputError]}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              placeholder="seu@email.com"
              placeholderTextColor={theme.colors.textHint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => senhaRef.current?.focus()}
            />

            {/* Senha */}
            <Text style={styles.inputLabel}>SENHA</Text>
            <View style={styles.inputSenhaWrap}>
              <TextInput
                ref={senhaRef}
                style={styles.inputSenha}
                value={senha}
                onChangeText={(t) => { setSenha(t); setError(""); }}
                placeholder="Minimo 6 caracteres"
                placeholderTextColor={theme.colors.textHint}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => confirmarSenhaRef.current?.focus()}
              />
              <TouchableOpacity
                style={styles.olhoBtn}
                onPress={() => setMostrarSenha((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.olhoIcon}>{mostrarSenha ? "ocultar" : "ver"}</Text>
              </TouchableOpacity>
            </View>

            {/* Confirmar senha */}
            <Text style={styles.inputLabel}>CONFIRMAR SENHA</Text>
            <TextInput
              ref={confirmarSenhaRef}
              style={[
                styles.input,
                confirmarSenha.length > 0 && senha !== confirmarSenha && styles.inputError,
                confirmarSenha.length > 0 && senha === confirmarSenha && styles.inputOk,
              ]}
              value={confirmarSenha}
              onChangeText={(t) => { setConfirmarSenha(t); setError(""); }}
              placeholder="Digite a senha novamente"
              placeholderTextColor={theme.colors.textHint}
              secureTextEntry={!mostrarSenha}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleCadastrar}
            />

            {/* Indicador visual de senha conferindo */}
            {confirmarSenha.length > 0 && (
              <Text style={[
                styles.senhaMatch,
                { color: senha === confirmarSenha ? theme.colors.success : theme.colors.danger },
              ]}>
                {senha === confirmarSenha ? "Senhas conferem" : "Senhas nao conferem"}
              </Text>
            )}

            {/* Mensagem de erro */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Botao principal de cadastro */}
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleCadastrar}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? "Criando conta..." : "Criar conta"}
              </Text>
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>ja tem conta?</Text>
              <View style={styles.divLine} />
            </View>

            {/* Voltar para o login */}
            <TouchableOpacity
              style={styles.btnVoltar}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.7}
            >
              <Text style={styles.btnVoltarText}>Fazer login</Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footer}>BarberSoft v1.0 · Projeto Academico ESW</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  kav:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    paddingVertical: theme.spacing.xxxl,
  },

  brand: { alignItems: "center", marginBottom: 28, width: "100%" },
  logoRing: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: theme.colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoLetter: { fontSize: 34, fontWeight: "500", color: "#000" },
  brandName:  { fontSize: 22, fontWeight: "500", letterSpacing: 3, color: theme.colors.text },
  brandTag:   { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, letterSpacing: 1 },
  goldLine:   { width: 36, height: 2, backgroundColor: theme.colors.gold, borderRadius: 2, marginTop: 12 },

  card: {
    width: "100%",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: 22,
  },
  cardTitle: { fontSize: 17, fontWeight: "500", color: theme.colors.text, marginBottom: 4 },
  cardSub:   { fontSize: 12, color: theme.colors.textMuted, marginBottom: 20, lineHeight: 18 },

  inputLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1.5,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: theme.radius.sm,
    color: theme.colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  inputError: { borderColor: theme.colors.danger },
  inputOk:    { borderColor: theme.colors.success },

  inputSenhaWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: theme.radius.sm,
    marginBottom: 14,
    overflow: "hidden",
  },
  inputSenha: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  olhoBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  olhoIcon: { fontSize: 11, color: theme.colors.textMuted },

  senhaMatch: { fontSize: 11, marginTop: -8, marginBottom: 12 },

  errorBox: {
    backgroundColor: theme.colors.dangerBg,
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.25)",
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: theme.colors.danger, lineHeight: 18 },

  btnPrimary: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled:    { opacity: 0.6 },
  btnPrimaryText: { fontSize: 15, fontWeight: "500", color: "#000", letterSpacing: 0.5 },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 16,
  },
  divLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  divText: { fontSize: 12, color: theme.colors.textHint },

  btnVoltar: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnVoltarText: { fontSize: 14, color: theme.colors.gold },

  footer: { marginTop: 24, fontSize: 11, color: "#444", textAlign: "center" },
});
