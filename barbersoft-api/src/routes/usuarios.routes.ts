// src/routes/usuarios.routes.ts
//
// Rotas de gerenciamento de usuarios — exclusivas para admin.
//
// GET    /usuarios              — lista todos (admin)
// GET    /usuarios/barbeiros    — lista so barbeiros (admin + barbeiro)
// POST   /usuarios/barbeiro     — cria novo barbeiro (admin)
// PUT    /usuarios/:id          — edita nome/email de qualquer usuario (admin)
// DELETE /usuarios/:id          — remove usuario (admin, com guards)

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../database/dataSource";
import { UsuarioEntity } from "../entities/UsuarioEntity";
import { AgendamentoEntity } from "../entities/AgendamentoEntity";
import { autenticar, exigirRole } from "../middleware/auth";

const router = Router();

// Todas as rotas deste arquivo exigem autenticacao
router.use(autenticar);

// ---------------------------------------------------------------------------
// GET /usuarios
// Lista todos os usuarios. Retorna sem o senhaHash por seguranca.
// ---------------------------------------------------------------------------
router.get("/", exigirRole("admin"), async (_req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(UsuarioEntity);
  const usuarios = await repo.find({ order: { criadoEm: "ASC" } });

  res.json(
    usuarios.map((u) => ({
      id:       u.id,
      nome:     u.nome,
      email:    u.email,
      role:     u.role,
      criadoEm: u.criadoEm,
    }))
  );
});

// ---------------------------------------------------------------------------
// GET /usuarios/barbeiros
// Lista apenas os barbeiros — usada pela tela de agendamento do cliente.
// ---------------------------------------------------------------------------
router.get("/barbeiros", exigirRole("admin", "barbeiro", "cliente"), async (_req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(UsuarioEntity);
  const barbeiros = await repo.find({
    where: { role: "barbeiro" },
    order: { nome: "ASC" },
  });

  res.json(
    barbeiros.map((b) => ({
      id:    b.id,
      nome:  b.nome,
      email: b.email,
      role:  b.role,
    }))
  );
});

// ---------------------------------------------------------------------------
// POST /usuarios/barbeiro
// Cria um novo barbeiro. Role fixada em "barbeiro".
// ---------------------------------------------------------------------------
router.post("/barbeiro", exigirRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const { nome, email, senha } = req.body as {
    nome?: string;
    email?: string;
    senha?: string;
  };

  if (!nome?.trim() || !email || !senha) {
    res.status(400).json({ erro: "Nome, email e senha sao obrigatorios." });
    return;
  }

  const repo = AppDataSource.getRepository(UsuarioEntity);

  const existe = await repo.findOne({ where: { email: email.toLowerCase() } });
  if (existe) {
    res.status(409).json({ erro: "E-mail ja cadastrado." });
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const novo = repo.create({
    nome: nome.trim(),
    email: email.toLowerCase().trim(),
    senhaHash,
    role: "barbeiro",
  });
  await repo.save(novo);

  res.status(201).json({
    id:    novo.id,
    nome:  novo.nome,
    email: novo.email,
    role:  novo.role,
  });
});

// ---------------------------------------------------------------------------
// PUT /usuarios/:id
// Edita nome e/ou email. Senha so pode ser alterada pelo proprio usuario
// (por simplicidade academica, o admin tambem pode aqui).
// ---------------------------------------------------------------------------
router.put("/:id", exigirRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const repo = AppDataSource.getRepository(UsuarioEntity);
  const usuario = await repo.findOne({ where: { id: req.params.id } });

  if (!usuario) {
    res.status(404).json({ erro: "Usuario nao encontrado." });
    return;
  }

  const { nome, email, senha } = req.body as {
    nome?: string;
    email?: string;
    senha?: string;
  };

  if (nome)  usuario.nome  = nome.trim();
  if (email) usuario.email = email.toLowerCase().trim();
  if (senha && senha.length >= 6) {
    usuario.senhaHash = await bcrypt.hash(senha, 10);
  }

  await repo.save(usuario);
  res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role });
});

// ---------------------------------------------------------------------------
// DELETE /usuarios/:id
// Remove o usuario se nao houver agendamentos ativos vinculados a ele.
// ---------------------------------------------------------------------------
router.delete("/:id", exigirRole("admin"), async (req: Request, res: Response): Promise<void> => {
  const usuarioRepo    = AppDataSource.getRepository(UsuarioEntity);
  const agendamentoRepo = AppDataSource.getRepository(AgendamentoEntity);

  const usuario = await usuarioRepo.findOne({ where: { id: req.params.id } });
  if (!usuario) {
    res.status(404).json({ erro: "Usuario nao encontrado." });
    return;
  }

  // Guard: nao permite excluir se houver agendamentos ativos
  const agendamentosAtivos = await agendamentoRepo
    .createQueryBuilder("ag")
    .where(
      "(ag.clienteId = :id OR ag.barbeiroId = :id) AND ag.status NOT IN (:...status)",
      { id: req.params.id, status: ["Cancelado", "Concluido"] }
    )
    .getCount();

  if (agendamentosAtivos > 0) {
    res.status(409).json({
      erro: "Este usuario possui agendamentos ativos. Cancele-os antes de excluir.",
    });
    return;
  }

  await usuarioRepo.remove(usuario);
  res.status(204).send();
});

export default router;
