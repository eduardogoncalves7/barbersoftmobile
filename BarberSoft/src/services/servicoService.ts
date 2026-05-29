// src/services/servicoService.ts
//
// Serviço de serviços do catálogo.

import { api, ServicoApi } from "./api";

export const servicoService = {

  // GET /servicos  →  público
  listar: (): Promise<ServicoApi[]> =>
    api.get<ServicoApi[]>("/servicos"),

  // POST /servicos  (admin)
  criar: (dados: Omit<ServicoApi, "id">): Promise<ServicoApi> =>
    api.post<ServicoApi>("/servicos", dados),

  // PUT /servicos/:id  (admin)
  editar: (id: string, dados: Partial<Omit<ServicoApi, "id">>): Promise<ServicoApi> =>
    api.put<ServicoApi>(`/servicos/${id}`, dados),

  // DELETE /servicos/:id  (admin)
  excluir: (id: string): Promise<void> =>
    api.delete<void>(`/servicos/${id}`),
};
