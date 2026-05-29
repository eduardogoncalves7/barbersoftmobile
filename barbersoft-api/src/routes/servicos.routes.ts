// src/routes/servicos.routes.ts
//
// Rotas de servicos:
//   GET    /servicos        — lista todos (publico — clientes veem sem login)
//   POST   /servicos        — cria servico (admin)
//   PUT    /servicos/:id    — edita servico (admin)
//   DELETE /servicos/:id    — remove servico (admin, com guard)

import { Router, Request, Response } from "express";
import { AppDataSource } from "../database/dataSource";
import { ServicoEntity } from "../entities/ServicoEntity";
import { AgendamentoEntity } from "../entities/AgendamentoEntity";
import { autenticar, exigirRole } from "../middleware/auth";

const router = Router();

// ---------------------------------------------------------------------------
// GET /servicos — rota publica
// O app exibe os servicos disponiveis mesmo antes do login.
// ---------------------------------------------------------------------------
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(ServicoEntity);
  const servicos = await repo.find({ order: { nome: "ASC" } });
  res.json(servicos);
});

// As rotas abaixo exigem autenticacao e role admin
router.post("/", autenticar, exigirRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const { nome, descricao, preco, duracaoMin } = req.body as {
    nome?: string;
    descricao?: string;
    preco?: number;
    duracaoMin?: number;
  };

  if (!nome?.trim()) {
    res.status(400).json({ erro: "O nome do servico e obrigatorio." });
    return;
  }
  if (!preco || preco <= 0) {
    res.status(400).json({ erro: "Informe um preco valido." });
    return;
  }
  if (!duracaoMin || duracaoMin <= 0) {
    res.status(400).json({ erro: "Informe a duracao em minutos." });
    return;
  }

  const repo = AppDataSource.getRepository(ServicoEntity);
  const novo = repo.create({
    nome:       nome.trim(),
    descricao:  descricao?.trim() ?? "",
    preco,
    duracaoMin,
  });
  await repo.save(novo);
  res.status(201).json(novo);
});

router.put("/:id", autenticar, exigirRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(ServicoEntity);
  const servico = await repo.findOne({ where: { id: req.params.id } });

  if (!servico) {
    res.status(404).json({ erro: "Servico nao encontrado." });
    return;
  }

  const { nome, descricao, preco, duracaoMin } = req.body as Partial<ServicoEntity>;
  if (nome)       servico.nome       = nome.trim();
  if (descricao !== undefined) servico.descricao = descricao.trim();
  if (preco)      servico.preco      = preco;
  if (duracaoMin) servico.duracaoMin = duracaoMin;

  await repo.save(servico);
  res.json(servico);
});

router.delete("/:id", autenticar, exigirRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const servicoRepo     = AppDataSource.getRepository(ServicoEntity);
  const agendamentoRepo = AppDataSource.getRepository(AgendamentoEntity);

  const servico = await servicoRepo.findOne({ where: { id: req.params.id } });
  if (!servico) {
    res.status(404).json({ erro: "Servico nao encontrado." });
    return;
  }

  // Guard: impede exclusao se houver agendamentos ativos usando este servico
  const emUso = await agendamentoRepo.count({
    where: [
      { servicoId: req.params.id, status: "Pendente"   },
      { servicoId: req.params.id, status: "Confirmado" },
    ],
  });

  if (emUso > 0) {
    res.status(409).json({
      erro: "Este servico possui agendamentos ativos e nao pode ser excluido.",
    });
    return;
  }

  await servicoRepo.remove(servico);
  res.status(204).send();
});

export default router;
