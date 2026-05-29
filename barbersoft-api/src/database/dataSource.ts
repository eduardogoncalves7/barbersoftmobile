// src/database/dataSource.ts
//
// Configuracao do banco de dados usando TypeORM com o driver "sqljs".
//
// O driver "sqljs" faz parte do proprio TypeORM — nao precisa de
// nenhum pacote adicional alem do "sql.js" (o WASM do SQLite).
//
// Como funciona a persistencia:
//   1. Na inicializacao, tentamos ler o arquivo .sqlite do disco.
//      Se existir, carregamos o conteudo no banco em memoria.
//   2. A cada escrita, o callback "autoSaveCallback" e chamado
//      pelo TypeORM, que grava o estado atual de volta no disco.
//   3. O resultado e um arquivo .sqlite identico ao gerado pelo
//      SQLite nativo, compativel com qualquer ferramenta de inspeção
//      (DB Browser for SQLite, DBeaver, etc.).

import "reflect-metadata";
import path from "path";
import fs from "fs-extra";
import dotenv from "dotenv";
import { DataSource } from "typeorm";

import { UsuarioEntity }             from "../entities/UsuarioEntity";
import { ServicoEntity }             from "../entities/ServicoEntity";
import { AgendamentoEntity }         from "../entities/AgendamentoEntity";
import { TransacaoFinanceiraEntity } from "../entities/TransacaoFinanceiraEntity";

dotenv.config();

const DB_PATH = path.resolve(process.env.DATABASE_PATH ?? "./barbersoft.sqlite");

// Le o arquivo .sqlite do disco e retorna como Uint8Array.
// Retorna undefined se o arquivo ainda nao existir (primeira execucao).
function carregarBancoDoDisco(): Uint8Array | undefined {
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    return new Uint8Array(buffer);
  }
  return undefined;
}

// Grava o banco em disco apos cada escrita.
// Chamado automaticamente pelo TypeORM via autoSaveCallback.
function salvarBancoNoDisco(data: Uint8Array): void {
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export const AppDataSource = new DataSource({
  // "sqljs" e o nome do driver dentro do TypeORM para o sql.js.
  // Nao precisa de nenhum pacote externo alem do "sql.js" instalado
  // como dependencia no package.json.
  type: "sqljs",

  // Carrega o banco existente do disco, ou inicia vazio se for a primeira vez.
  database: carregarBancoDoDisco(),

  // Persiste automaticamente em disco apos cada INSERT/UPDATE/DELETE.
  autoSave: true,
  autoSaveCallback: salvarBancoNoDisco,

  // synchronize: true — o TypeORM cria e atualiza as tabelas
  // automaticamente comparando as entidades com o esquema atual.
  // Adequado para desenvolvimento; em producao usar migrations.
  synchronize: true,

  // Exibe as queries SQL no console durante o desenvolvimento.
  logging: process.env.NODE_ENV !== "production",

  entities: [
    UsuarioEntity,
    ServicoEntity,
    AgendamentoEntity,
    TransacaoFinanceiraEntity,
  ],
});
