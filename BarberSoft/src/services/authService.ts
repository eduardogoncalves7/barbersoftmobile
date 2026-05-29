// src/services/authService.ts
//
// Serviço de autenticação — isola as chamadas de login/cadastro
// do contexto global. Uma função = uma responsabilidade.

import { api, setToken, LoginResposta, UsuarioApi } from "./api";

export const authService = {

  // POST /auth/login
  login: async (email: string, senha: string): Promise<LoginResposta> => {
    const resposta = await api.post<LoginResposta>("/auth/login", { email, senha });
    setToken(resposta.token);
    return resposta;
  },

  // POST /auth/cadastrar  →  cria cliente e já faz login
  cadastrar: async (nome: string, email: string, senha: string): Promise<LoginResposta> => {
    const resposta = await api.post<LoginResposta>("/auth/cadastrar", { nome, email, senha });
    setToken(resposta.token);
    return resposta;
  },

  logout: (): void => setToken(null),
};
