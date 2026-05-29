// src/services/api.ts
//
// Camada HTTP centralizada. Todos os requests passam por aqui.
//
// Emulador Android  → http://10.0.2.2:3333
// Dispositivo físico / Expo Go → troque pelo IP da sua máquina
//   ex: http://192.168.1.100:3333

export const BASE_URL = "http://192.168.1.5:3333";
// Para dispositivo físico na mesma rede, descomente e ajuste:
// export const BASE_URL = "http://192.168.1.100:3333";

// ── Token em memória ───────────────────────────────────────────────────────
let _token: string | null = null;
export const setToken  = (t: string | null) => { _token = t; };
export const getToken  = ()                  => _token;

// ── Erro tipado ────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Request base ───────────────────────────────────────────────────────────
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const msg = (data as { erro?: string })?.erro ?? `Erro ${res.status}`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

// ── Métodos públicos ───────────────────────────────────────────────────────
export const api = {
  get:    <T>(path: string)                 => request<T>("GET",    path),
  post:   <T>(path: string, body?: unknown) => request<T>("POST",   path, body),
  put:    <T>(path: string, body?: unknown) => request<T>("PUT",    path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>("PATCH",  path, body),
  delete: <T>(path: string)                 => request<T>("DELETE", path),
};

// ── Tipos espelho das respostas da API ─────────────────────────────────────
export interface UsuarioApi {
  id: string; nome: string; email: string;
  role: "admin" | "barbeiro" | "cliente";
}

export interface LoginResposta {
  usuario: UsuarioApi;
  token:   string;
}

export interface ServicoApi {
  id: string; nome: string; descricao: string;
  preco: number; duracaoMin: number;
}

export interface AgendamentoApi {
  id: string; data: string; hora: string; criadoEm: string;
  status: "Pendente" | "Confirmado" | "Concluido" | "Cancelado";
  clienteId: string; barbeiroId: string; servicoId: string;
  barbeiro?: { id: string; nome: string };
  cliente?:  { id: string; nome: string; email: string };
  servico?:  { id: string; nome: string; preco: number; duracaoMin: number };
}

export interface ResumoFinanceiroApi {
  faturamentoTotal:    number;
  faturamentoPorDia:   Array<{ data: string; valor: number }>;
  agendamentosHoje:    number;
  totalClientesUnicos: number;
}
