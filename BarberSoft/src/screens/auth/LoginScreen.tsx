// src/screens/auth/LoginScreen.tsx
import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  KeyboardAvoidingView, Platform, Animated,
  ScrollView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";
import { RootStackParamList } from "../../types";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

const QUICK_LOGINS = [
  { label: "Admin",    email: "admin@barber.com",  senha: "admin123" },
  { label: "Barbeiro", email: "carlos@email.com",  senha: "admin123" },
  { label: "Cliente",  email: "ana@email.com",     senha: "admin123" },
];

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useApp();

  const [email,        setEmail]        = useState("");
  const [senha,        setSenha]        = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const senhaRef  = useRef<TextInput>(null);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const preencherRapido = (q: typeof QUICK_LOGINS[number]) => {
    setEmail(q.email);
    setSenha(q.senha);
    setError("");
  };

  const handleLogin = async () => {
    const emailFmt = email.trim();
    if (!emailFmt || !emailFmt.includes("@")) {
      setError("Informe um e-mail válido.");
      shake();
      return;
    }
    if (!senha || senha.length < 4) {
      setError("Informe sua senha (mínimo 4 caracteres).");
      shake();
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(emailFmt, senha);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao autenticar.";
      setError(msg);
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoRing}><Text style={styles.logoLetter}>B</Text></View>
            <Text style={styles.brandName}>BARBERSOFT</Text>
            <Text style={styles.brandTag}>Sistema de Gestão</Text>
            <View style={styles.goldLine} />
          </View>

          {/* Card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.cardTitle}>Bem-vindo de volta</Text>
            <Text style={styles.cardSub}>Entre com suas credenciais para continuar</Text>

            {/* E-mail */}
            <Text style={styles.inputLabel}>E-MAIL</Text>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
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
            <View style={[styles.inputSenhaWrap, !!error && styles.inputError]}>
              <TextInput
                ref={senhaRef}
                style={styles.inputSenha}
                value={senha}
                onChangeText={(t) => { setSenha(t); setError(""); }}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textHint}
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.olhoBtn} onPress={() => setMostrarSenha((v) => !v)} activeOpacity={0.7}>
                <Text style={styles.olhoIcon}>{mostrarSenha ? "🙈" : "👁"}</Text>
              </TouchableOpacity>
            </View>

            {/* Acesso rápido */}
            <Text style={styles.hintLabel}>Acesso rápido:</Text>
            <View style={styles.chipsRow}>
              {QUICK_LOGINS.map((q) => (
                <TouchableOpacity key={q.email} style={styles.chip} onPress={() => preencherRapido(q)} activeOpacity={0.7}>
                  <Text style={styles.chipText}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dica */}
            <View style={styles.dicaBox}>
              <Text style={styles.dicaText}>
                💡 Senha padrão para todos os perfis:{" "}
                <Text style={styles.dicaSenha}>admin123</Text>
              </Text>
            </View>

            {/* Erro */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️  {error}</Text>
              </View>
            )}

            {/* Botão */}
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>{loading ? "Verificando..." : "Entrar"}</Text>
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>nao tem conta?</Text>
              <View style={styles.divLine} />
            </View>

            {/* Cadastro — apenas para clientes, conforme regra de negocio */}
            <TouchableOpacity
              style={styles.btnCadastro}
              onPress={() => navigation.navigate("Cadastro")}
              activeOpacity={0.7}
            >
              <Text style={styles.btnCadastroText}>Cadastrar-se como cliente</Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footer}>BarberSoft v1.0 · Projeto Acadêmico ESW</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.background },
  kav:    { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.xl, paddingVertical: theme.spacing.xxxl },

  brand:      { alignItems: "center", marginBottom: 32, width: "100%" },
  logoRing:   { width: 72, height: 72, borderRadius: 20, backgroundColor: theme.colors.gold, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  logoLetter: { fontSize: 38, fontWeight: "500", color: "#000" },
  brandName:  { fontSize: 24, fontWeight: "500", letterSpacing: 3, color: theme.colors.text },
  brandTag:   { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, letterSpacing: 1 },
  goldLine:   { width: 36, height: 2, backgroundColor: theme.colors.gold, borderRadius: 2, marginTop: 14 },

  card:      { width: "100%", backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: 22 },
  cardTitle: { fontSize: 17, fontWeight: "500", color: theme.colors.text, marginBottom: 4 },
  cardSub:   { fontSize: 12, color: theme.colors.textMuted, marginBottom: 20 },

  inputLabel: { fontSize: 10, fontWeight: "500", letterSpacing: 1.5, color: theme.colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1, borderColor: "rgba(212,175,55,0.25)",
    borderRadius: theme.radius.sm, color: theme.colors.text,
    fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  inputError: { borderColor: theme.colors.danger },

  inputSenhaWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 1, borderColor: "rgba(212,175,55,0.25)",
    borderRadius: theme.radius.sm, marginBottom: 16, overflow: "hidden",
  },
  inputSenha: { flex: 1, color: theme.colors.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 },
  olhoBtn:    { paddingHorizontal: 14, paddingVertical: 12 },
  olhoIcon:   { fontSize: 16 },

  hintLabel: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 8 },
  chipsRow:  { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  chip:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: "rgba(212,175,55,0.04)" },
  chipText:  { fontSize: 12, color: theme.colors.textMuted },

  dicaBox:  { backgroundColor: "rgba(212,175,55,0.06)", borderWidth: 1, borderColor: "rgba(212,175,55,0.18)", borderRadius: theme.radius.sm, padding: 10, marginBottom: 14 },
  dicaText: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },
  dicaSenha:{ color: theme.colors.gold, fontWeight: "500" },

  errorBox:  { backgroundColor: theme.colors.dangerBg, borderWidth: 1, borderColor: "rgba(239,83,80,0.25)", borderRadius: theme.radius.sm, padding: 10, marginBottom: 14 },
  errorText: { fontSize: 13, color: theme.colors.danger },

  btnPrimary:     { backgroundColor: theme.colors.gold, borderRadius: theme.radius.md, paddingVertical: 14, alignItems: "center" },
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

  btnCadastro: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnCadastroText: { fontSize: 14, color: theme.colors.gold },

  footer: { marginTop: 24, fontSize: 11, color: "#444", textAlign: "center" },
});
