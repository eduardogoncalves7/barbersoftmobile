// src/services/usuarioService.ts
//
// Serviço de usuários/barbeiros — chamadas para /usuarios/*.

import { api, UsuarioApi } from "./api";

export const usuarioService = {

  // GET /usuarios/barbeiros  → lista pública de barbeiros para tela de agendamento
  listarBarbeiros: (): Promise<UsuarioApi[]> =>
    api.get<UsuarioApi[]>("/usuarios/barbeiros"),

  // GET /usuarios  →  todos os usuários (admin)
  listarTodos: (): Promise<UsuarioApi[]> =>
    api.get<UsuarioApi[]>("/usuarios"),

  // POST /usuarios/barbeiro  →  admin cria barbeiro
  criarBarbeiro: (dados: { nome: string; email: string; senha: string }): Promise<UsuarioApi> =>
    api.post<UsuarioApi>("/usuarios/barbeiro", dados),

  // PUT /usuarios/:id  →  admin edita nome/email
  editar: (id: string, dados: { nome?: string; email?: string; senha?: string }): Promise<UsuarioApi> =>
    api.put<UsuarioApi>(`/usuarios/${id}`, dados),

  // DELETE /usuarios/:id
  excluir: (id: string): Promise<void> =>
    api.delete<void>(`/usuarios/${id}`),
};
