// src/screens/admin/ValidacaoCameraScreen.tsx
//
// Tela de escaneamento de QR Code — usada pelo admin ou barbeiro
// para validar a presenca do cliente e concluir o atendimento.
//
// Fluxo de uso:
//   1. Operador toca em "Ativar camera"
//   2. Aponta para o QR Code exibido na tela do cliente
//   3. O app le o conteudo (string Base64), valida o token via AppContext
//      (que por sua vez chama validarTokenQR em qrToken.ts)
//   4. Se valido: atendimento marcado como Concluido, valor entra no financeiro,
//      vibração curta e mensagem de sucesso por 3 segundos
//   5. Se invalido: mensagem de erro especifica (expirado, adulterado, etc.),
//      vibração dupla, scanner reativa automaticamente
//
// Por que o cooldown de 3 segundos?
//   A CameraView dispara onBarcodeScanned varias vezes por segundo enquanto
//   o QR Code esta na mira. Sem cooldown, a funcao seria chamada dezenas de
//   vezes para o mesmo codigo. O ref cooldownRef (em vez de state) evita
//   re-renders desnecessarios durante o periodo de espera.

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useApp } from "../../context/AppContext";
import { theme } from "../../theme";
import { BackHeader } from "../../components/BackHeader";

// Estados possiveis do scanner durante uma sessao de uso.
type ScanState = "idle" | "scanning" | "success" | "error";

// Duracao em ms do periodo de cooldown apos cada leitura.
const COOLDOWN_MS = 3000;

export const ValidacaoCameraScreen: React.FC = () => {
  const { concluirAgendamentoPorQR } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [mensagem,  setMensagem]  = useState("");
  const [ativo,     setAtivo]     = useState(false);

  // Ref (nao state) para o flag de cooldown — evita re-renders desnecessarios
  // e garante que o valor mais recente esteja disponivel dentro do callback
  // da camera sem depender do closure do React.
  const cooldownRef = useRef(false);

  // Reativa o scanner automaticamente apos COOLDOWN_MS.
  // O efeito so roda quando scanState muda para success ou error.
  useEffect(() => {
    if (scanState === "success" || scanState === "error") {
      const timer = setTimeout(() => {
        setScanState("scanning");
        cooldownRef.current = false;
      }, COOLDOWN_MS);

      // Limpa o timer se o componente desmontar ou scanState mudar antes
      return () => clearTimeout(timer);
    }
  }, [scanState]);
// Callback chamado pela CameraView cada vez que detecta um barcode.
  // O parametro data e a string contida no QR Code (nosso token Base64).
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Ignora chamadas repetidas durante o cooldown.
    if (cooldownRef.current) return;
    cooldownRef.current = true;

    // Delega toda a logica de validacao e atualizacao de estado ao contexto.
    // O contexto chama validarTokenQR internamente e retorna uma resposta
    // estruturada — a tela apenas exibe o resultado.
    const resultado = await concluirAgendamentoPorQR(data);

    if (resultado.sucesso) {
      setScanState("success");
      setMensagem(resultado.mensagem);
      // Vibracao unica curta — sinal de confirmacao positiva
      Vibration.vibrate(200);
    } else {
      setScanState("error");
      setMensagem(resultado.mensagem);
      // Vibracao dupla — padrao de erro em aplicativos de pagamento/acesso
      Vibration.vibrate([0, 120, 80, 120]);
    }
  };

  // Ativa ou desativa a camera. Ao ativar, ja entra em modo scanning.
  const toggleCamera = () => {
    const novoEstado = !ativo;
    setAtivo(novoEstado);
    setScanState(novoEstado ? "scanning" : "idle");
    setMensagem("");
    cooldownRef.current = false;
  };

  // Tela de carregamento enquanto o sistema verifica as permissoes.
  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centralizador}>
          <Text style={styles.textoAguarde}>Verificando permissoes da camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Tela de solicitacao de permissao caso o usuario ainda nao tenha concedido.
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centralizador}>
          <Text style={styles.permTitulo}>Acesso a camera necessario</Text>
          <Text style={styles.permDescricao}>
            A camera e utilizada para ler o QR Code do cliente e registrar
            o atendimento automaticamente.
          </Text>
          <TouchableOpacity style={styles.btnPermissao} onPress={requestPermission}>
            <Text style={styles.btnPermissaoText}>Conceder permissao</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Cor das quinas do visor muda conforme o resultado da ultima leitura.
  const corQuina =
    scanState === "success" ? theme.colors.success :
    scanState === "error"   ? theme.colors.danger  :
                              theme.colors.gold;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.card} />

      <BackHeader
        titulo="Validar atendimento"
        subtitulo="Aponte para o QR Code do cliente"
        destino="Dashboard"
      />

      {/* Area da camera — ocupa o espaco central da tela */}
      <View style={styles.cameraContainer}>
        {ativo ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              // Passa undefined quando nao esta em modo scanning para pausar
              // a deteccao sem desmontar o componente (evita flash na tela).
              scanState === "scanning" ? handleBarCodeScanned : undefined
            }
          />
        ) : (
          // Placeholder exibido quando a camera esta desligada
          <View style={styles.cameraOff}>
            <Text style={styles.cameraOffTitulo}>Camera desativada</Text>
            <Text style={styles.cameraOffSub}>
              Toque no botao abaixo para iniciar o scanner.
            </Text>
          </View>
        )}

        {/* Overlay com o visor (quatro cantos) — so aparece com camera ativa */}
        {ativo && (
          <View style={styles.overlay}>
            {/*
             * Visor formado por quatro cantos independentes.
             * Esta abordagem (4 Views) e mais leve que um SVG e funciona
             * corretamente em todos os tamanhos de tela sem calculo de posicao.
             */}
            <View style={styles.visorContainer}>
              <View style={[styles.quina, styles.quinaTL, { borderColor: corQuina }]} />
              <View style={[styles.quina, styles.quinaTR, { borderColor: corQuina }]} />
              <View style={[styles.quina, styles.quinaBL, { borderColor: corQuina }]} />
              <View style={[styles.quina, styles.quinaBR, { borderColor: corQuina }]} />
            </View>

            {/* Instrucao textual abaixo do visor */}
            {scanState === "scanning" && (
              <Text style={styles.instrucao}>
                Posicione o QR Code dentro da area
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Painel de resultado — aparece apos cada leitura */}
      {(scanState === "success" || scanState === "error") && (
        <View style={[
          styles.resultado,
          scanState === "success" ? styles.resultadoSucesso : styles.resultadoErro,
        ]}>
          <Text style={styles.resultadoTitulo}>
            {scanState === "success" ? "Atendimento concluido" : "Leitura recusada"}
          </Text>
          <Text style={styles.resultadoMensagem}>{mensagem}</Text>
          <Text style={styles.resultadoContagem}>
            Scanner reativa em {COOLDOWN_MS / 1000} segundos...
          </Text>
        </View>
      )}

      {/* Controles inferiores */}
      <View style={styles.controles}>
        <TouchableOpacity
          style={[styles.btnCamera, ativo && styles.btnCameraAtivo]}
          onPress={toggleCamera}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnCameraTexto, ativo && styles.btnCameraTextoAtivo]}>
            {ativo ? "Desativar camera" : "Ativar camera"}
          </Text>
        </TouchableOpacity>

        {/*
         * Nota tecnica para quem estiver lendo o codigo:
         * Em producao esta tela nao precisaria do aviso abaixo — o QR seria
         * sempre gerado pelo app do cliente. Para o prototipo, mantemos a
         * instrucao para facilitar os testes com geradores externos.
         */}
        <Text style={styles.notaTecnica}>
          O QR Code e gerado automaticamente na tela "Meus Agendamentos" do cliente.
          O conteudo e um token Base64 assinado — nao um ID em texto puro.
        </Text>
      </View>
    </SafeAreaView>
  );
};

// Tamanho de cada canto do visor
const QUINA = 24;
const BORDA = 3;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  centralizador: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  textoAguarde: { fontSize: 14, color: theme.colors.textMuted },

  // Permissao
  permTitulo: {
    fontSize: 18,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  permDescricao: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
    maxWidth: 280,
  },
  btnPermissao: {
    backgroundColor: theme.colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  btnPermissaoText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },

  // Camera
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  cameraOff: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cameraOffTitulo: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  cameraOffSub: {
    fontSize: 13,
    color: theme.colors.textHint,
    textAlign: "center",
    maxWidth: 220,
  },

  // Overlay e visor
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  visorContainer: {
    width: 220,
    height: 220,
    position: "relative",
  },
  quina: {
    position: "absolute",
    width: QUINA,
    height: QUINA,
    borderWidth: BORDA,
  },
  quinaTL: { top: 0,    left: 0,    borderRightWidth: 0, borderBottomWidth: 0 },
  quinaTR: { top: 0,    right: 0,   borderLeftWidth: 0,  borderBottomWidth: 0 },
  quinaBL: { bottom: 0, left: 0,    borderRightWidth: 0, borderTopWidth: 0    },
  quinaBR: { bottom: 0, right: 0,   borderLeftWidth: 0,  borderTopWidth: 0    },
  instrucao: {
    marginTop: 20,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },

  // Resultado
  resultado: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  resultadoSucesso: {
    backgroundColor: theme.colors.successBg,
    borderColor: theme.colors.success,
  },
  resultadoErro: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.danger,
  },
  resultadoTitulo: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  resultadoMensagem: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  resultadoContagem: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },

  // Controles
  controles: {
    padding: 16,
    paddingBottom: 12,
    gap: 12,
  },
  btnCamera: {
    borderWidth: 1,
    borderColor: theme.colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnCameraAtivo: {
    backgroundColor: theme.colors.gold,
  },
  btnCameraTexto: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.gold,
  },
  btnCameraTextoAtivo: {
    color: "#000",
  },
  notaTecnica: {
    fontSize: 11,
    color: theme.colors.textHint,
    textAlign: "center",
    lineHeight: 16,
  },
});
