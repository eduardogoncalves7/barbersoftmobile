// src/utils/qrToken.ts
//
// Utilitário responsável por criar e validar os tokens que ficam
// dentro dos QR Codes gerados pelo app.
//
// Por que um token em vez do ID puro?
// ------------------------------------
// Se o QR Code contivesse apenas o ID do agendamento (ex: "a_1234"),
// qualquer pessoa que visse ou fotografasse o código de outra pessoa
// poderia gerar um QR falso com aquele ID e tentar marcar o
// atendimento como concluído — ou simplesmente adivinhar IDs sequenciais.
//
// O token resolve isso em duas camadas:
//   1. HMAC: uma assinatura calculada com uma chave secreta. Sem a chave,
//      não é possível fabricar um token válido mesmo conhecendo o ID.
//   2. Expiração: o token carrega um timestamp "exp". Após o prazo
//      (padrão: 24 horas), o scanner rejeita o código mesmo que a
//      assinatura seja correta. Isso limita a janela de uso indevido
//      caso alguém fotografe o QR de outro cliente.
//
// Limitação deste protótipo:
// --------------------------
// A chave secreta está hardcoded no cliente. Em produção ela viria de
// um servidor — o servidor assinaria o token e o cliente só verificaria.
// Aqui assinamos e verificamos no próprio app por simplicidade acadêmica.

import { QrToken } from "../types";

// Chave compartilhada usada na assinatura HMAC.
// Em produção: variável de ambiente do servidor, nunca exposta no cliente.
const SECRET_KEY = "barbersoft_secret_2025";

// Validade padrão do token em milissegundos (24 horas).
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Função de assinatura (HMAC simplificado para ambiente sem Node.js/crypto)
// ---------------------------------------------------------------------------
// Uma implementação real de HMAC usa SHA-256 com uma chave secreta.
// Em React Native (sem acesso ao módulo crypto do Node) usamos uma
// função de hash determinística baseada em soma de char codes com
// multiplicação polinomial — suficiente para um protótipo acadêmico.
// Para produção: use a biblioteca "crypto-js" ou faça a assinatura no servidor.
function assinar(mensagem: string, chave: string): string {
  let hash = 0;
  const entrada = mensagem + "|" + chave;

  for (let i = 0; i < entrada.length; i++) {
    // Deslocamento de bits à esquerda equivale a multiplicar por 32,
    // subtraindo hash cria um padrão não linear que reduz colisões simples.
    hash = (hash << 5) - hash + entrada.charCodeAt(i);
    // Força o resultado a caber em 32 bits (comportamento de inteiro C).
    hash |= 0;
  }

  // Converte para hexadecimal sem sinal para facilitar comparação de strings.
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// gerarTokenQR
// ---------------------------------------------------------------------------
// Cria um objeto QrToken, calcula a assinatura sobre os campos críticos
// e serializa tudo como JSON → Base64, que é o conteúdo do QR Code.
//
// Parâmetros:
//   agendamentoId  — ID do agendamento que este QR representa
//   clienteId      — ID do cliente dono do agendamento (reforça a assinatura)
//   ttlMs          — Duração de validade em ms (padrão: TOKEN_TTL_MS)
//
// Retorno:
//   String Base64 pronta para ser passada ao componente QRCode como "value".
export function gerarTokenQR(
  agendamentoId: string,
  clienteId: string,
  ttlMs: number = TOKEN_TTL_MS
): string {
  const exp = Date.now() + ttlMs;

  // A mensagem assinada inclui os três campos que não devem ser alterados.
  // Se alguém modificar o agendamentoId ou o exp no payload,
  // o hmac calculado na verificação será diferente e o token será rejeitado.
  const mensagemParaAssinar = `${agendamentoId}:${clienteId}:${exp}`;
  const hmac = assinar(mensagemParaAssinar, SECRET_KEY);

  const token: QrToken = { agendamentoId, clienteId, exp, hmac };

  // JSON.stringify → btoa (Base64) para que o payload caiba num QR Code
  // sem caracteres especiais que possam complicar a leitura pela câmera.
  return btoa(JSON.stringify(token));
}

// ---------------------------------------------------------------------------
// validarTokenQR
// ---------------------------------------------------------------------------
// Recebe o conteúdo lido pela câmera, tenta decodificar e valida:
//   1. Se é um JSON válido com os campos esperados (rejeita QRs externos)
//   2. Se o token ainda está dentro do prazo de validade
//   3. Se a assinatura bate com o payload (rejeita tokens adulterados)
//
// Retorno:
//   { valido: true, token }  — pode prosseguir com a conclusão
//   { valido: false, erro }  — deve exibir mensagem de erro ao operador
export function validarTokenQR(
  conteudoQR: string
): { valido: true; token: QrToken } | { valido: false; erro: string } {

  // Passo 1: decodifica Base64 e faz parse do JSON.
  let token: QrToken;
  try {
    const json = atob(conteudoQR.trim());
    token = JSON.parse(json) as QrToken;
  } catch {
    // O conteúdo não é um token BarberSoft — pode ser outro QR Code qualquer.
    return { valido: false, erro: "QR Code inválido. Este código não foi gerado pelo BarberSoft." };
  }

  // Passo 2: confere presença dos campos obrigatórios.
  if (!token.agendamentoId || !token.clienteId || !token.exp || !token.hmac) {
    return { valido: false, erro: "Formato de token incompleto." };
  }

  // Passo 3: verifica expiração.
  if (Date.now() > token.exp) {
    const expiradoHa = Math.round((Date.now() - token.exp) / 60000);
    return {
      valido: false,
      erro: `QR Code expirado há ${expiradoHa} minuto(s). Peça ao cliente que gere um novo.`,
    };
  }

  // Passo 4: recalcula o HMAC e compara com o que está no token.
  const mensagemEsperada = `${token.agendamentoId}:${token.clienteId}:${token.exp}`;
  const hmacEsperado = assinar(mensagemEsperada, SECRET_KEY);

  if (hmacEsperado !== token.hmac) {
    return { valido: false, erro: "Assinatura inválida. O QR Code pode ter sido adulterado." };
  }

  return { valido: true, token };
}
