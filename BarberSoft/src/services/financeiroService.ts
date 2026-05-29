// src/services/financeiroService.ts
//
// Serviço financeiro — dados do dashboard do admin.

import { api, ResumoFinanceiroApi } from "./api";

export const financeiroService = {

  // GET /financeiro/resumo
  resumo: (): Promise<ResumoFinanceiroApi> =>
    api.get<ResumoFinanceiroApi>("/financeiro/resumo"),

  // GET /financeiro/transacoes
  transacoes: (): Promise<unknown[]> =>
    api.get("/financeiro/transacoes"),
};
