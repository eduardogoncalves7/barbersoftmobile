// src/middleware/auth.ts
//
// Middleware de autenticacao JWT.
//
// Como funciona o fluxo de autenticacao:
// ----------------------------------------
// 1. Cliente faz POST /auth/login com email e senha
// 2. A API valida as credenciais e retorna um JWT assinado
// 3. O app armazena o token e o envia no header de cada requisicao privada:
//      Authorization: Bearer <token>
// 4. Este middleware intercepta a requisicao, extrai o token do header,
//    valida a assinatura com a JWT_SECRET e injeta os dados do usuario
//    em req.usuario para que a rota possa usa-los
//
// Rotas publicas (nao passam por este middleware):
//   POST /auth/login
//   POST /auth/cadastrar
//   GET  /servicos  (listagem publica para clientes nao logados verem os servicos)
//
// Todas as demais rotas sao privadas e exigem o token.

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Tipo injetado em req.usuario apos validacao bem-sucedida do token.
// Disponivel em todas as rotas que usam este middleware.
export interface UsuarioToken {
  id: string;
  email: string;
  role: "admin" | "barbeiro" | "cliente";
}

// Estende a interface Request do Express para incluir req.usuario
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  // Extrai o header Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ erro: "Token nao fornecido." });
    return;
  }

  // O formato esperado e "Bearer <token>"
  const partes = authHeader.split(" ");
  if (partes.length !== 2 || partes[0] !== "Bearer") {
    res.status(401).json({ erro: "Formato de token invalido. Use: Bearer <token>" });
    return;
  }

  const token = partes[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    // Erro de configuracao do servidor — nao deve acontecer em producao
    res.status(500).json({ erro: "Configuracao de autenticacao ausente no servidor." });
    return;
  }

  try {
    // jwt.verify lanca uma excecao se:
    //   - O token estiver expirado (TokenExpiredError)
    //   - A assinatura for invalida (JsonWebTokenError)
    //   - O formato estiver corrompido
    const payload = jwt.verify(token, secret) as UsuarioToken;
    req.usuario = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ erro: "Token expirado. Faca o login novamente." });
    } else {
      res.status(401).json({ erro: "Token invalido." });
    }
  }
}

// Middleware de verificacao de role.
// Uso: router.delete("/servicos/:id", autenticar, exigirRole("admin"), handler)
export function exigirRole(...roles: Array<"admin" | "barbeiro" | "cliente">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ erro: "Nao autenticado." });
      return;
    }
    if (!roles.includes(req.usuario.role)) {
      res.status(403).json({
        erro: `Acesso negado. Esta rota exige o perfil: ${roles.join(" ou ")}.`,
      });
      return;
    }
    next();
  };
}
