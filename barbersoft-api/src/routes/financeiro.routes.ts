// src/routes/financeiro.routes.ts
//
// Rotas financeiras — exclusivas para admin.
//
// GET /financeiro/resumo     — totais para os cards do dashboard
// GET /financeiro/transacoes — historico completo de transacoes

import { Router, Request, Response } from "express";
import { AppDataSource } from "../database/dataSource";
import { TransacaoFinanceiraEntity } from "../entities/TransacaoFinanceiraEntity";
import { AgendamentoEntity } from "../entities/AgendamentoEntity";
import { UsuarioEntity } from "../entities/UsuarioEntity";
import { autenticar, exigirRole } from "../middleware/auth";

const router = Router();
router.use(autenticar, exigirRole("admin"));

// ---------------------------------------------------------------------------
// GET /financeiro/resumo
// Retorna os dados para os cards do Dashboard:
//   - faturamentoTotal
//   - faturamentoPorDia (ultimos 7 dias)
//   - totalAgendamentosHoje
//   - totalClientesUnicos
// ---------------------------------------------------------------------------
router.get("/resumo", async (_req: Request, res: Response): Promise<void> => {
  const transacaoRepo    = AppDataSource.getRepository(TransacaoFinanceiraEntity);
  const agendamentoRepo  = AppDataSource.getRepository(AgendamentoEntity);
  const usuarioRepo      = AppDataSource.getRepository(UsuarioEntity);

  const hoje = new Date().toISOString().split("T")[0];

  // Soma total de todas as transacoes
  const { total } = await transacaoRepo
    .createQueryBuilder("t")
    .select("COALESCE(SUM(t.valor), 0)", "total")
    .getRawOne();

  // Faturamento dos ultimos 7 dias agrupado por dia
  const faturamentoPorDia = await transacaoRepo
    .createQueryBuilder("t")
    .select("t.data", "data")
    .addSelect("SUM(t.valor)", "valor")
    .groupBy("t.data")
    .orderBy("t.data", "ASC")
    .getRawMany();

  // Total de agendamentos ativos hoje
  const agendamentosHoje = await agendamentoRepo
    .createQueryBuilder("ag")
    .where("ag.data = :hoje", { hoje })
    .andWhere("ag.status != :status", { status: "Cancelado" })
    .getCount();

  // Total de clientes unicos que ja agendaram alguma vez
  const clientesUnicos = await agendamentoRepo
    .createQueryBuilder("ag")
    .select("COUNT(DISTINCT ag.clienteId)", "total")
    .getRawOne();

  res.json({
    faturamentoTotal:    parseFloat(total) || 0,
    faturamentoPorDia:   faturamentoPorDia.map((r) => ({
      data:  r.data,
      valor: parseFloat(r.valor) || 0,
    })),
    agendamentosHoje,
    totalClientesUnicos: parseInt(clientesUnicos.total) || 0,
  });
});

// ---------------------------------------------------------------------------
// GET /financeiro/transacoes
// Historico completo de transacoes com dados do servico e cliente.
// ---------------------------------------------------------------------------
router.get("/transacoes", async (_req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(TransacaoFinanceiraEntity);

  const transacoes = await repo
    .createQueryBuilder("t")
    .leftJoin("t.agendamento",         "ag")
    .leftJoin("ag.cliente",            "cliente")
    .leftJoin("ag.servico",            "servico")
    .select([
      "t.id", "t.valor", "t.data", "t.descricao", "t.criadoEm",
      "ag.id", "ag.data", "ag.hora",
      "cliente.id", "cliente.nome",
      "servico.id", "servico.nome",
    ])
    .orderBy("t.criadoEm", "DESC")
    .getMany();

  res.json(transacoes);
});

export default router;
