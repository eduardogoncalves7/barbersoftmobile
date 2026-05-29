// src/routes/agendamentos.routes.ts
//
// Rotas de agendamentos:
//   GET  /agendamentos             — lista todos (admin/barbeiro filtra por data)
//   GET  /agendamentos/meus        — agendamentos do cliente logado
//   GET  /agendamentos/barbeiro    — agenda do barbeiro logado
//   POST /agendamentos             — cria agendamento (cliente/admin)
//   PUT  /agendamentos/:id/status  — atualiza status (admin/barbeiro)
//   POST /agendamentos/:id/concluir — conclui via QR e gera transacao (admin/barbeiro)

import { Router, Request, Response } from "express";
import { AppDataSource } from "../database/dataSource";
import { AgendamentoEntity, StatusAgendamento } from "../entities/AgendamentoEntity";
import { TransacaoFinanceiraEntity } from "../entities/TransacaoFinanceiraEntity";
import { ServicoEntity } from "../entities/ServicoEntity";
import { UsuarioEntity } from "../entities/UsuarioEntity";
import { autenticar, exigirRole } from "../middleware/auth";

const router = Router();
router.use(autenticar);

// ---------------------------------------------------------------------------
// GET /agendamentos
// Admin ve todos. Barbeiro ve os seus. Cliente nao deve usar esta rota.
// Filtros opcionais via query: ?data=2025-01-20 ?barbeiroId=xxx ?status=Pendente
// ---------------------------------------------------------------------------
router.get("/", exigirRole("admin", "barbeiro"), async (req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(AgendamentoEntity);

  let qb = repo.createQueryBuilder("ag")
    .leftJoin("ag.cliente",  "cliente")
    .leftJoin("ag.barbeiro", "barbeiro")
    .leftJoin("ag.servico",  "servico")
    .select([
      "ag.id", "ag.data", "ag.hora", "ag.status", "ag.criadoEm",
      "ag.clienteId", "ag.barbeiroId", "ag.servicoId",
      "cliente.id",   "cliente.nome",   "cliente.email",
      "barbeiro.id",  "barbeiro.nome",
      "servico.id",   "servico.nome",   "servico.preco", "servico.duracaoMin",
    ]);

  // Barbeiro so ve os proprios agendamentos — nao tem acesso a agenda dos colegas
  if (req.usuario!.role === "barbeiro") {
    qb = qb.where("ag.barbeiroId = :id", { id: req.usuario!.id });
  }

  if (req.query.data) {
    qb = qb.andWhere("ag.data = :data", { data: req.query.data });
  }
  if (req.query.barbeiroId && req.usuario!.role === "admin") {
    qb = qb.andWhere("ag.barbeiroId = :bid", { bid: req.query.barbeiroId });
  }
  if (req.query.status) {
    qb = qb.andWhere("ag.status = :status", { status: req.query.status });
  }

  const agendamentos = await qb.orderBy("ag.data", "ASC").addOrderBy("ag.hora", "ASC").getMany();
  res.json(agendamentos);
});

// ---------------------------------------------------------------------------
// GET /agendamentos/meus
// Retorna os agendamentos do cliente autenticado, ordenados por data desc.
// ---------------------------------------------------------------------------
router.get("/meus", exigirRole("cliente", "admin"), async (req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(AgendamentoEntity);

  const agendamentos = await repo
    .createQueryBuilder("ag")
    .leftJoin("ag.barbeiro", "barbeiro")
    .leftJoin("ag.servico",  "servico")
    .select([
      "ag.id", "ag.data", "ag.hora", "ag.status", "ag.criadoEm",
      "ag.clienteId", "ag.barbeiroId", "ag.servicoId",
      "barbeiro.id",  "barbeiro.nome",
      "servico.id",   "servico.nome", "servico.preco", "servico.duracaoMin",
    ])
    .where("ag.clienteId = :id", { id: req.usuario!.id })
    .orderBy("ag.criadoEm", "DESC")
    .getMany();

  res.json(agendamentos);
});

// ---------------------------------------------------------------------------
// POST /agendamentos
// Regras:
//   1. Horario entre 08:00 e 19:00
//   2. Nao pode haver outro agendamento ativo para o mesmo barbeiro na mesma data/hora
// ---------------------------------------------------------------------------
router.post("/", exigirRole("cliente", "admin"), async (req: Request, res: Response): Promise<void> => {
  const { barbeiroId, servicoId, data, hora } = req.body as {
    barbeiroId?: string;
    servicoId?:  string;
    data?:       string;
    hora?:       string;
  };

  if (!barbeiroId || !servicoId || !data || !hora) {
    res.status(400).json({ erro: "barbeiroId, servicoId, data e hora sao obrigatorios." });
    return;
  }

  // Validacao 1: faixa de horario
  const [hh, mm] = hora.split(":").map(Number);
  const totalMin = hh * 60 + mm;
  if (totalMin < 480 || totalMin >= 1140) {
    res.status(422).json({ erro: "Horario fora do expediente. Atendemos das 08:00 as 19:00." });
    return;
  }

  const repo = AppDataSource.getRepository(AgendamentoEntity);

  // Validacao 2: conflito de horario para o barbeiro
  const conflito = await repo
    .createQueryBuilder("ag")
    .where("ag.barbeiroId = :barbeiroId", { barbeiroId })
    .andWhere("ag.data = :data", { data })
    .andWhere("ag.hora = :hora", { hora })
    .andWhere("ag.status NOT IN (:...cancelados)", { cancelados: ["Cancelado"] })
    .getOne();

  if (conflito) {
    res.status(409).json({
      erro: `Barbeiro indisponivel em ${data} as ${hora}. Escolha outro horario.`,
    });
    return;
  }

  // O cliente que cria o agendamento e sempre o usuario autenticado.
  // O admin pode criar em nome de um cliente passando clienteId no body.
  const clienteId =
    req.usuario!.role === "admin" && req.body.clienteId
      ? req.body.clienteId
      : req.usuario!.id;

  const novo = repo.create({ clienteId, barbeiroId, servicoId, data, hora, status: "Pendente" });
  await repo.save(novo);

  res.status(201).json(novo);
});

// ---------------------------------------------------------------------------
// PUT /agendamentos/:id/status
// Permite confirmar ou cancelar um agendamento.
// ---------------------------------------------------------------------------
router.put("/:id/status", exigirRole("admin", "barbeiro", "cliente"), async (req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(AgendamentoEntity);
  const ag   = await repo.findOne({ where: { id: req.params.id } });

  if (!ag) {
    res.status(404).json({ erro: "Agendamento nao encontrado." });
    return;
  }

  // Cliente so pode cancelar seus proprios agendamentos
  if (req.usuario!.role === "cliente" && ag.clienteId !== req.usuario!.id) {
    res.status(403).json({ erro: "Voce so pode alterar seus proprios agendamentos." });
    return;
  }

  const { status } = req.body as { status?: StatusAgendamento };
  const statusPermitidos: StatusAgendamento[] = ["Confirmado", "Cancelado", "Pendente"];

  if (!status || !statusPermitidos.includes(status)) {
    res.status(400).json({ erro: `Status invalido. Use: ${statusPermitidos.join(", ")}` });
    return;
  }

  ag.status = status;
  await repo.save(ag);
  res.json(ag);
});

// ---------------------------------------------------------------------------
// POST /agendamentos/:id/concluir
// Conclui o agendamento e registra a transacao financeira.
// Chamado apos a validacao do QR Code na tela do admin/barbeiro.
// ---------------------------------------------------------------------------
router.post("/:id/concluir", exigirRole("admin", "barbeiro"), async (req: Request, res: Response): Promise<void> => {
  const agRepo       = AppDataSource.getRepository(AgendamentoEntity);
  const transacaoRepo = AppDataSource.getRepository(TransacaoFinanceiraEntity);
  const servicoRepo  = AppDataSource.getRepository(ServicoEntity);
  const usuarioRepo  = AppDataSource.getRepository(UsuarioEntity);

  const ag = await agRepo.findOne({ where: { id: req.params.id } });

  if (!ag) {
    res.status(404).json({ erro: "Agendamento nao encontrado." });
    return;
  }
  if (ag.status === "Concluido") {
    res.status(409).json({ erro: "Atendimento ja foi concluido." });
    return;
  }
  if (ag.status === "Cancelado") {
    res.status(409).json({ erro: "Nao e possivel concluir um agendamento cancelado." });
    return;
  }

  const servico = await servicoRepo.findOne({ where: { id: ag.servicoId } });
  const cliente = await usuarioRepo.findOne({ where: { id: ag.clienteId } });

  // Atualiza o status do agendamento
  ag.status = "Concluido";
  await agRepo.save(ag);

  // Registra a transacao financeira
  const transacao = transacaoRepo.create({
    agendamentoId: ag.id,
    valor:         servico?.preco ?? 0,
    data:          new Date().toISOString().split("T")[0],
    descricao:     `${servico?.nome ?? "Servico"} - ${cliente?.nome ?? "Cliente"}`,
  });
  await transacaoRepo.save(transacao);

  res.json({
    agendamento: ag,
    transacao,
    mensagem: `Atendimento concluido. R$ ${(servico?.preco ?? 0).toFixed(2)} registrado.`,
  });
});

export default router;
