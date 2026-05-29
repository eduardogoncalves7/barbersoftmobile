// src/server.ts
//
// Ponto de entrada da API BarberSoft.
//
// Responsabilidades deste arquivo:
//   1. Inicializar a conexao com o banco de dados (AppDataSource)
//   2. Configurar o Express com middlewares globais (JSON, CORS)
//   3. Registrar todas as rotas com seus prefixos
//   4. Iniciar o servidor HTTP na porta definida no .env
//
// Ordem de inicializacao importa:
//   Banco primeiro → Express depois.
//   Se o banco falhar, o servidor nao sobe — evita receber requests
//   que nao poderiam ser processados.

import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { AppDataSource } from "./database/dataSource";

import authRoutes        from "./routes/auth.routes";
import usuariosRoutes    from "./routes/usuarios.routes";
import servicosRoutes    from "./routes/servicos.routes";
import agendamentosRoutes from "./routes/agendamentos.routes";
import financeiroRoutes  from "./routes/financeiro.routes";

const app = express();

// ── Middlewares globais ───────────────────────────────────────────────────

// Parseia o body das requisicoes como JSON.
// Sem isso, req.body seria undefined em todos os handlers.
app.use(express.json());

// CORS: permite que o app React Native (rodando no emulador ou dispositivo)
// acesse a API. Em producao, restringir a lista de origens permitidas.
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rotas ────────────────────────────────────────────────────────────────

// Rota de health check — util para confirmar que a API esta no ar
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas publicas (sem autenticacao)
app.use("/auth",     authRoutes);
app.use("/servicos", servicosRoutes); // GET /servicos e publico

// Rotas privadas (requerem JWT — middleware aplicado dentro de cada router)
app.use("/usuarios",      usuariosRoutes);
app.use("/agendamentos",  agendamentosRoutes);
app.use("/financeiro",    financeiroRoutes);

// Handler de rotas nao encontradas
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota nao encontrada." });
});

// ── Inicializacao ─────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3333;

AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado (SQLite).");

    app.listen(PORT, () => {
      console.log(`\nAPI BarberSoft rodando em http://localhost:${PORT}`);
      console.log("\nRotas disponiveis:");
      console.log("  GET    /health");
      console.log("  POST   /auth/cadastrar");
      console.log("  POST   /auth/login");
      console.log("  GET    /servicos");
      console.log("  POST   /servicos              (admin)");
      console.log("  PUT    /servicos/:id          (admin)");
      console.log("  DELETE /servicos/:id          (admin)");
      console.log("  GET    /usuarios              (admin)");
      console.log("  GET    /usuarios/barbeiros    (autenticado)");
      console.log("  POST   /usuarios/barbeiro     (admin)");
      console.log("  PUT    /usuarios/:id          (admin)");
      console.log("  DELETE /usuarios/:id          (admin)");
      console.log("  GET    /agendamentos          (admin/barbeiro)");
      console.log("  GET    /agendamentos/meus     (cliente/admin)");
      console.log("  POST   /agendamentos          (cliente/admin)");
      console.log("  PUT    /agendamentos/:id/status");
      console.log("  POST   /agendamentos/:id/concluir (admin/barbeiro)");
      console.log("  GET    /financeiro/resumo     (admin)");
      console.log("  GET    /financeiro/transacoes (admin)");
    });
  })
  .catch((err) => {
    console.error("Falha ao conectar ao banco de dados:", err);
    process.exit(1);
  });
