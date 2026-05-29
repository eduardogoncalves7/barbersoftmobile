// src/routes/auth.routes.ts
//
// Rotas de autenticacao:
//   POST /auth/cadastrar  — cria um novo usuario com role "cliente"
//   POST /auth/login      — valida credenciais e retorna um JWT
//
// Estas sao as unicas rotas completamente publicas do sistema.
// O JWT retornado pelo login deve ser armazenado pelo app e enviado
// no header Authorization de todas as requisicoes privadas.

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../database/dataSource";
import { UsuarioEntity } from "../entities/UsuarioEntity";

const router = Router();

// ---------------------------------------------------------------------------
// POST /auth/cadastrar
// ---------------------------------------------------------------------------
// Corpo esperado:
//   { "nome": "Ana Costa", "email": "ana@email.com", "senha": "senha123" }
//
// Resposta de sucesso (201):
//   { "usuario": { "id", "nome", "email", "role" }, "token": "..." }
//
// Regras de negocio:
//   - Email deve ser unico
//   - Senha precisa ter ao menos 6 caracteres
//   - Role fixada em "cliente" — admin e barbeiros sao criados pelo admin
router.post("/cadastrar", async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, email, senha } = req.body as {
      nome?: string;
      email?: string;
      senha?: string;
    };

    // Validacoes basicas
    if (!nome || nome.trim().length < 2) {
      res.status(400).json({ erro: "Informe o nome completo (minimo 2 caracteres)." });
      return;
    }
    if (!email || !email.includes("@")) {
      res.status(400).json({ erro: "Informe um e-mail valido." });
      return;
    }
    if (!senha || senha.length < 6) {
      res.status(400).json({ erro: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }

    const repo = AppDataSource.getRepository(UsuarioEntity);

    // Verifica unicidade do email (case-insensitive)
    const existe = await repo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (existe) {
      res.status(409).json({ erro: "Este e-mail ja esta em uso." });
      return;
    }

    // Hash da senha com bcrypt — custo 10 e o padrao recomendado.
    // Cada hash e unico mesmo para senhas iguais (salt automatico do bcrypt).
    const senhaHash = await bcrypt.hash(senha, 10);

    const novoUsuario = repo.create({
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      senhaHash,
      role: "cliente",
    });
    await repo.save(novoUsuario);

    // Gera o token JWT ja na resposta do cadastro — o app pode logar
    // o usuario direto sem precisar fazer um segundo request de login.
    const token = gerarToken(novoUsuario);

    res.status(201).json({
      usuario: {
        id:    novoUsuario.id,
        nome:  novoUsuario.nome,
        email: novoUsuario.email,
        role:  novoUsuario.role,
      },
      token,
    });
  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
// Corpo esperado:
//   { "email": "admin@barber.com", "senha": "admin123" }
//
// Resposta de sucesso (200):
//   { "usuario": { "id", "nome", "email", "role" }, "token": "..." }
//
// Erros possiveis:
//   401 — email nao encontrado ou senha incorreta
//         (propositalmente generica para nao revelar qual dado esta errado)
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, senha } = req.body as { email?: string; senha?: string };

    if (!email || !senha) {
      res.status(400).json({ erro: "E-mail e senha sao obrigatorios." });
      return;
    }

    const repo = AppDataSource.getRepository(UsuarioEntity);
    const usuario = await repo.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    // Usa a mesma mensagem de erro para email inexistente e senha errada.
    // Isso impede que um atacante descubra quais emails estao cadastrados
    // tentando fazer login.
    if (!usuario) {
      res.status(401).json({ erro: "E-mail ou senha incorretos." });
      return;
    }

    // bcrypt.compare compara a senha em texto puro com o hash armazenado.
    // O salt esta embutido no hash, entao nao precisa ser armazenado separadamente.
    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaCorreta) {
      res.status(401).json({ erro: "E-mail ou senha incorretos." });
      return;
    }

    const token = gerarToken(usuario);

    res.json({
      usuario: {
        id:    usuario.id,
        nome:  usuario.nome,
        email: usuario.email,
        role:  usuario.role,
      },
      token,
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

// ---------------------------------------------------------------------------
// Funcao auxiliar para gerar o JWT
// ---------------------------------------------------------------------------
// O payload inclui id, email e role para que o middleware de autenticacao
// possa verificar permissoes sem consultar o banco em toda requisicao.
function gerarToken(usuario: UsuarioEntity): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

  return jwt.sign(
    {
      id:    usuario.id,
      email: usuario.email,
      role:  usuario.role,
    } as object,
    secret,
    { expiresIn } as jwt.SignOptions
  );
}

export default router;
