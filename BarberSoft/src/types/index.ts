// src/types/index.ts
//
// Tipos compartilhados entre o app e a API.
//
// Nota importante sobre StatusAgendamento:
// A API persiste "Concluido" sem acento (SQLite nao tem problema com UTF-8,
// mas manter ASCII nos valores de enum evita bugs de comparacao em diferentes
// ambientes). O app usa esta mesma string em todos os lugares.

export type StatusAgendamento =
  | "Pendente"
  | "Confirmado"
  | "Concluido"
  | "Cancelado";

// Usuario retornado pela API — sem campo senha (nunca exposto pelo servidor)
export interface Usuario {
  id:    string;
  nome:  string;
  email: string;
  role:  "admin" | "barbeiro" | "cliente";
}

export interface Servico {
  id:         string;
  nome:       string;
  descricao:  string;
  preco:      number;
  duracaoMin: number;
}

// Agendamento retornado pela API — inclui objetos aninhados opcionais
// quando a rota faz JOIN (ex: GET /agendamentos inclui cliente e servico)
export interface Agendamento {
  id:         string;
  clienteId:  string;
  barbeiroId: string;
  servicoId:  string;
  data:       string; // "YYYY-MM-DD"
  hora:       string; // "HH:MM"
  status:     StatusAgendamento;
  criadoEm:   string;
  // Objetos aninhados presentes nas respostas de listagem
  cliente?:  { id: string; nome: string; email: string };
  barbeiro?: { id: string; nome: string };
  servico?:  { id: string; nome: string; preco: number; duracaoMin: number };
}

export interface TransacaoFinanceira {
  id:            string;
  agendamentoId: string;
  valor:         number;
  data:          string;
  descricao:     string;
}

// Payload decodificado de dentro do QR Code
export interface QrToken {
  agendamentoId: string;
  clienteId:     string;
  exp:           number;
  hmac:          string;
}

// ── Tipos de navegacao ────────────────────────────
export type RootStackParamList = {
  Login:        undefined;
  Cadastro:     undefined;
  AdminTabs:    undefined;
  ClientTabs:   undefined;
  BarbeiroTabs: undefined;
};

export type AdminTabParamList = {
  Dashboard:       undefined;
  Agendamentos:    undefined;
  ValidacaoCamera: undefined;
  Configuracoes:   undefined;
};

export type BarbeiroTabParamList = {
  AgendaBarbeiro: undefined;
};

export type ClientTabParamList = {
  Home:             undefined;
  Agendar:          undefined;
  MeusAgendamentos: undefined;
};
