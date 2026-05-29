// src/services/agendamentoService.ts
//
// Serviço de agendamentos — todas as operações de CRUD e fluxo de status.

import { api, AgendamentoApi } from "./api";

export type StatusAgendamento = "Pendente" | "Confirmado" | "Concluido" | "Cancelado";

export interface CriarAgendamentoDto {
  barbeiroId: string;
  servicoId:  string;
  data:       string;   // "YYYY-MM-DD"
  hora:       string;   // "HH:mm"
  clienteId?: string;   // admin pode passar; cliente usa o próprio id
}

export const agendamentoService = {

  // GET /agendamentos  →  admin/barbeiro veem todos (com filtros opcionais)
  listar: (filtros?: { data?: string; status?: StatusAgendamento }): Promise<AgendamentoApi[]> => {
    const params = new URLSearchParams();
    if (filtros?.data)   params.set("data",   filtros.data);
    if (filtros?.status) params.set("status", filtros.status);
    const query = params.toString() ? `?${params}` : "";
    return api.get<AgendamentoApi[]>(`/agendamentos${query}`);
  },

  // GET /agendamentos/meus  →  cliente vê os seus
  meus: (): Promise<AgendamentoApi[]> =>
    api.get<AgendamentoApi[]>("/agendamentos/meus"),

  // POST /agendamentos  →  cliente ou admin cria
  criar: (dados: CriarAgendamentoDto): Promise<AgendamentoApi> =>
    api.post<AgendamentoApi>("/agendamentos", dados),

  // PUT /agendamentos/:id/status  →  confirma ou cancela
  atualizarStatus: (id: string, status: StatusAgendamento): Promise<AgendamentoApi> =>
    api.put<AgendamentoApi>(`/agendamentos/${id}/status`, { status }),

  // POST /agendamentos/:id/concluir  →  conclui e gera transação financeira
  concluir: (id: string): Promise<{ agendamento: AgendamentoApi; mensagem: string }> =>
    api.post(`/agendamentos/${id}/concluir`),
};
