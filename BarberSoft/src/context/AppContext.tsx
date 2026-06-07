// src/context/AppContext.tsx
//
// Contexto global do BarberSoft — integrado com a API REST.
//
// Arquitetura:
//   - Cada operação chama o service correspondente (authService, usuarioService…)
//   - O estado local reflete o banco de dados após cada operação
//   - Erros da API (ApiError) são relançados para os screens tratarem via Alert
//
// Fluxo de dados:
//   Screen → useApp() → service → API REST → SQLite → response → setState

import React, {
  createContext, useContext, useState, useCallback,
  useMemo, useEffect, ReactNode,
} from "react";

import { authService }        from "../services/authService";
import { usuarioService }     from "../services/usuarioService";
import { servicoService }     from "../services/servicoService";
import { agendamentoService } from "../services/agendamentoService";
import { financeiroService }  from "../services/financeiroService";
import { ApiError }           from "../services/api";

import {
  Usuario, Servico, Agendamento,
  StatusAgendamento,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de mapeamento  API → tipo local
// ─────────────────────────────────────────────────────────────────────────────
import { UsuarioApi, ServicoApi, AgendamentoApi } from "../services/api";

const toUsuario = (u: UsuarioApi, roleDefault?: "admin" | "barbeiro" | "cliente"): Usuario => ({
  id:    u.id,
  nome:  u.nome,
  email: u.email,
  role:  u.role ?? roleDefault ?? "cliente",
});

const toServico  = (s: ServicoApi): Servico => ({
  id: s.id, nome: s.nome, descricao: s.descricao,
  preco: s.preco, duracaoMin: s.duracaoMin,
});

const toAgendamento = (ag: AgendamentoApi): Agendamento => ({
  id: ag.id, data: ag.data, hora: ag.hora,
  status: ag.status as StatusAgendamento,
  clienteId:  ag.clienteId,
  barbeiroId: ag.barbeiroId,
  servicoId:  ag.servicoId,
  criadoEm:   ag.criadoEm,
  cliente:  ag.cliente,
  barbeiro: ag.barbeiro,
  servico:  ag.servico  ? {
    id: ag.servico.id, nome: ag.servico.nome,
    descricao: "", preco: ag.servico.preco,
    duracaoMin: ag.servico.duracaoMin,
  } : undefined,
});

// ─────────────────────────────────────────────────────────────────────────────
// Interface do contexto
// ─────────────────────────────────────────────────────────────────────────────
interface AppContextData {
  // Estado
  usuarioLogado:            Usuario | null;
  usuarios:                 Usuario[];
  barbeiros:                Usuario[];
  servicos:                 Servico[];
  agendamentos:             Agendamento[];
  agendamentosEnriquecidos: Agendamento[];
  carregando:               boolean;

  // Auth
  login:     (email: string, senha: string)                          => Promise<void>;
  logout:    ()                                                       => void;
  cadastrar: (nome: string, email: string, senha: string)            => Promise<void>;

  // Agendamentos
  carregarAgendamentos:       () => Promise<void>;
  adicionarAgendamento:       (dados: { barbeiroId: string; servicoId: string; data: string; hora: string }) => Promise<{ sucesso: boolean; mensagem: string }>;
  atualizarStatusAgendamento: (id: string, status: StatusAgendamento) => Promise<void>;
  cancelarAgendamento:        (id: string)                             => Promise<void>;
  concluirAgendamentoPorQR:   (conteudoQR: string)                    => Promise<{ sucesso: boolean; mensagem: string }>;
  gerarQrDoAgendamento:       (agendamentoId: string)                  => string | null;

  // Serviços
  carregarServicos:  () => Promise<void>;
  adicionarServico:  (dados: Omit<Servico, "id">)             => Promise<void>;
  editarServico:     (id: string, dados: Omit<Servico, "id">) => Promise<void>;
  excluirServico:    (id: string)                              => Promise<{ sucesso: boolean; mensagem: string }>;

  // Barbeiros/Usuários
  adicionarBarbeiro: (dados: { nome: string; email: string; senha: string }) => Promise<{ sucesso: boolean; mensagem: string }>;
  editarBarbeiro:    (id: string, dados: { nome: string; email: string })    => Promise<void>;
  excluirBarbeiro:   (id: string)                                             => Promise<{ sucesso: boolean; mensagem: string }>;

  // Getters derivados
  getAgendamentosHoje:    () => Agendamento[];
  getAgendamentosCliente: (clienteId: string) => Agendamento[];
  getBarbeiros:           () => Usuario[];
  getClientesUnicos:      () => number;
  faturamentoTotal:       number;
  faturamentoPorDia:      Record<string, number>;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);
  const [usuarios,      setUsuarios]      = useState<Usuario[]>([]);
  const [servicos,      setServicos]      = useState<Servico[]>([]);
  const [agendamentos,  setAgendamentos]  = useState<Agendamento[]>([]);
  const [carregando,    setCarregando]    = useState(false);

  // ── Derivados ────────────────────────────────────────────────────────────
  const barbeiros = useMemo(
    () => usuarios.filter((u) => u.role === "barbeiro"),
    [usuarios]
  );

  // Agendamentos já vêm enriquecidos da API (com joins)
  const agendamentosEnriquecidos = agendamentos;

  const faturamentoTotal = useMemo(
    () => agendamentos
      .filter((a) => a.status === "Concluido")
      .reduce((acc, a) => acc + (a.servico?.preco ?? 0), 0),
    [agendamentos]
  );

  const faturamentoPorDia = useMemo(
    () => agendamentos
      .filter((a) => a.status === "Concluido")
      .reduce((acc, a) => ({
        ...acc,
        [a.data]: (acc[a.data] ?? 0) + (a.servico?.preco ?? 0),
      }), {} as Record<string, number>),
    [agendamentos]
  );

  // ── Carregamento inicial ─────────────────────────────────────────────────
  const carregarServicos = useCallback(async () => {
    try {
      const lista = await servicoService.listar();
      setServicos(lista.map(toServico));
    } catch (e) {
      console.warn("Falha ao carregar serviços:", e);
    }
  }, []);

  const carregarBarbeiros = useCallback(async () => {
  try {
    const lista = await usuarioService.listarBarbeiros();
    setUsuarios((prev) => {
      const semBarbeiros = prev.filter((u) => u.role !== "barbeiro");
      return [...semBarbeiros, ...lista.map((u) => toUsuario(u, "barbeiro"))];
    });
  } catch (e) {
    console.warn("Falha ao carregar barbeiros:", e);
  }
}, []);

  const carregarAgendamentos = useCallback(async () => {
    if (!usuarioLogado) return;
    try {
      let lista: AgendamentoApi[] = [];
      if (usuarioLogado.role === "cliente") {
        lista = await agendamentoService.meus();
      } else {
        lista = await agendamentoService.listar();
      }
      setAgendamentos(lista.map(toAgendamento));
    } catch (e) {
      console.warn("Falha ao carregar agendamentos:", e);
    }
  }, [usuarioLogado]);

  // Carrega serviços e barbeiros ao iniciar (público, sem precisar de login)
  useEffect(() => {
    carregarServicos();
  }, [carregarServicos]);

  // Carrega dados protegidos após login
  useEffect(() => {
    if (usuarioLogado) {
      carregarBarbeiros();
      carregarAgendamentos();
    }
  }, [usuarioLogado, carregarBarbeiros, carregarAgendamentos]);

  // ── AUTH ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, senha: string) => {
    setCarregando(true);
    try {
      const { usuario } = await authService.login(email, senha);
      setUsuarioLogado(toUsuario(usuario));
    } finally {
      setCarregando(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUsuarioLogado(null);
    setAgendamentos([]);
    setUsuarios([]);
  }, []);

  const cadastrar = useCallback(async (nome: string, email: string, senha: string) => {
    setCarregando(true);
    try {
      const { usuario } = await authService.cadastrar(nome, email, senha);
      setUsuarioLogado(toUsuario(usuario));
    } finally {
      setCarregando(false);
    }
  }, []);

  // ── AGENDAMENTOS ─────────────────────────────────────────────────────────
  const adicionarAgendamento = useCallback(
    async (dados: { barbeiroId: string; servicoId: string; data: string; hora: string })
      : Promise<{ sucesso: boolean; mensagem: string }> => {
      try {
        const novo = await agendamentoService.criar(dados);
        setAgendamentos((prev) => [toAgendamento(novo), ...prev]);
        return { sucesso: true, mensagem: "Agendamento criado com sucesso!" };
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Erro ao criar agendamento.";
        return { sucesso: false, mensagem: msg };
      }
    }, []
  );

  const atualizarStatusAgendamento = useCallback(
    async (id: string, status: StatusAgendamento) => {
      const atualizado = await agendamentoService.atualizarStatus(id, status);
      setAgendamentos((prev) =>
        prev.map((a) => a.id === id ? toAgendamento(atualizado) : a)
      );
    }, []
  );

  const cancelarAgendamento = useCallback(async (id: string) => {
    await atualizarStatusAgendamento(id, "Cancelado");
  }, [atualizarStatusAgendamento]);

  const gerarQrDoAgendamento = useCallback((agendamentoId: string): string | null => {
    const ag = agendamentos.find((a) => a.id === agendamentoId);
    if (!ag || ag.status === "Cancelado" || ag.status === "Concluido") return null;
    // Token simples: "agId|clienteId|timestamp"
    return `${ag.id}|${ag.clienteId}|${Date.now()}`;
  }, [agendamentos]);

  const concluirAgendamentoPorQR = useCallback(
    async (conteudoQR: string): Promise<{ sucesso: boolean; mensagem: string }> => {
      try {
        const partes = conteudoQR.split("|");
        if (partes.length < 2) return { sucesso: false, mensagem: "QR Code inválido." };
        const agendamentoId = partes[0];
        const { mensagem } = await agendamentoService.concluir(agendamentoId);
        setAgendamentos((prev) =>
          prev.map((a) => a.id === agendamentoId ? { ...a, status: "Concluido" } : a)
        );
        return { sucesso: true, mensagem };
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Erro ao concluir agendamento.";
        return { sucesso: false, mensagem: msg };
      }
    }, []
  );

  // ── SERVIÇOS ─────────────────────────────────────────────────────────────
  const adicionarServico = useCallback(async (dados: Omit<Servico, "id">) => {
    const novo = await servicoService.criar(dados);
    setServicos((prev) => [...prev, toServico(novo)]);
  }, []);

  const editarServico = useCallback(async (id: string, dados: Omit<Servico, "id">) => {
    const atualizado = await servicoService.editar(id, dados);
    setServicos((prev) => prev.map((s) => s.id === id ? toServico(atualizado) : s));
  }, []);

  const excluirServico = useCallback(
    async (id: string): Promise<{ sucesso: boolean; mensagem: string }> => {
      try {
        await servicoService.excluir(id);
        setServicos((prev) => prev.filter((s) => s.id !== id));
        return { sucesso: true, mensagem: "Serviço excluído." };
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Erro ao excluir serviço.";
        return { sucesso: false, mensagem: msg };
      }
    }, []
  );

  // ── BARBEIROS ────────────────────────────────────────────────────────────
  const adicionarBarbeiro = useCallback(
    async (dados: { nome: string; email: string; senha: string })
      : Promise<{ sucesso: boolean; mensagem: string }> => {
      try {
        const novo = await usuarioService.criarBarbeiro(dados);
        setUsuarios((prev) => [...prev, toUsuario(novo)]);
        return { sucesso: true, mensagem: "Barbeiro adicionado!" };
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Erro ao adicionar barbeiro.";
        return { sucesso: false, mensagem: msg };
      }
    }, []
  );

  const editarBarbeiro = useCallback(async (id: string, dados: { nome: string; email: string }) => {
    const atualizado = await usuarioService.editar(id, dados);
    setUsuarios((prev) => prev.map((u) => u.id === id ? toUsuario(atualizado) : u));
  }, []);

  const excluirBarbeiro = useCallback(
    async (id: string): Promise<{ sucesso: boolean; mensagem: string }> => {
      try {
        await usuarioService.excluir(id);
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        return { sucesso: true, mensagem: "Barbeiro excluído." };
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Erro ao excluir barbeiro.";
        return { sucesso: false, mensagem: msg };
      }
    }, []
  );

  // ── Getters ──────────────────────────────────────────────────────────────
  const getAgendamentosHoje = useCallback(() => {
    const hoje = new Date().toISOString().split("T")[0];
    return agendamentos.filter((a) => a.data === hoje && a.status !== "Cancelado");
  }, [agendamentos]);

  const getAgendamentosCliente = useCallback(
    (clienteId: string) =>
      agendamentos
        .filter((a) => a.clienteId === clienteId)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [agendamentos]
  );

  const getBarbeiros     = useCallback(() => barbeiros, [barbeiros]);
  const getClientesUnicos = useCallback(
    () => new Set(agendamentos.map((a) => a.clienteId)).size,
    [agendamentos]
  );

  return (
    <AppContext.Provider value={{
      usuarioLogado, usuarios, barbeiros,
      servicos, agendamentos, agendamentosEnriquecidos,
      carregando,
      login, logout, cadastrar,
      carregarAgendamentos, carregarServicos,
      adicionarAgendamento, atualizarStatusAgendamento,
      cancelarAgendamento, concluirAgendamentoPorQR, gerarQrDoAgendamento,
      adicionarServico, editarServico, excluirServico,
      adicionarBarbeiro, editarBarbeiro, excluirBarbeiro,
      getAgendamentosHoje, getAgendamentosCliente,
      getBarbeiros, getClientesUnicos,
      faturamentoTotal, faturamentoPorDia,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextData => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
};
