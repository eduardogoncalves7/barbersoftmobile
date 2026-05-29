// src/database/seed.ts
//
// Script de seed — popula o banco com dados iniciais para desenvolvimento.
//
// Como usar:
//   npm run seed
//
// O seed pode ser executado multiplas vezes com seguranca — ele verifica
// se os dados ja existem antes de inserir para nao criar duplicatas.

import "reflect-metadata";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { AppDataSource } from "./dataSource";
import { UsuarioEntity } from "../entities/UsuarioEntity";
import { ServicoEntity } from "../entities/ServicoEntity";
import { AgendamentoEntity } from "../entities/AgendamentoEntity";
import { TransacaoFinanceiraEntity } from "../entities/TransacaoFinanceiraEntity";

dotenv.config();

async function seed() {
  console.log("Conectando ao banco de dados...");
  await AppDataSource.initialize();
  console.log("Conexao estabelecida.");

  const usuarioRepo    = AppDataSource.getRepository(UsuarioEntity);
  const servicoRepo    = AppDataSource.getRepository(ServicoEntity);
  const agendRepo      = AppDataSource.getRepository(AgendamentoEntity);
  const transacaoRepo  = AppDataSource.getRepository(TransacaoFinanceiraEntity);

  // ── Usuarios ──────────────────────────────────
  const senhaHash = await bcrypt.hash("admin123", 10);

  const usuariosSeed = [
    { nome: "Administrador", email: "admin@barber.com",  role: "admin"    as const },
    { nome: "Carlos Silva",  email: "carlos@email.com",  role: "barbeiro" as const },
    { nome: "Joao Mendes",   email: "joao@email.com",    role: "barbeiro" as const },
    { nome: "Ana Costa",     email: "ana@email.com",     role: "cliente"  as const },
    { nome: "Pedro Alves",   email: "pedro@email.com",   role: "cliente"  as const },
    { nome: "Mariana Lima",  email: "mariana@email.com", role: "cliente"  as const },
  ];

  const usuariosCriados: Record<string, UsuarioEntity> = {};

  for (const dados of usuariosSeed) {
    const existente = await usuarioRepo.findOne({ where: { email: dados.email } });
    if (!existente) {
      const u = usuarioRepo.create({ ...dados, senhaHash });
      await usuarioRepo.save(u);
      usuariosCriados[dados.email] = u;
      console.log(`  Usuario criado: ${dados.email} (${dados.role})`);
    } else {
      usuariosCriados[dados.email] = existente;
      console.log(`  Usuario ja existe: ${dados.email}`);
    }
  }

  // ── Servicos ──────────────────────────────────
  const servicosSeed = [
    { nome: "Corte Classico", descricao: "Corte tradicional na tesoura", preco: 45, duracaoMin: 30 },
    { nome: "Corte + Barba",  descricao: "Combo completo com navalha",   preco: 75, duracaoMin: 60 },
    { nome: "Barba Modelada", descricao: "Alinhamento e hidratacao",     preco: 35, duracaoMin: 30 },
    { nome: "Sobrancelha",    descricao: "Design e alinhamento",         preco: 20, duracaoMin: 15 },
    { nome: "Corte Degrade",  descricao: "Fade americano ou skin fade",  preco: 55, duracaoMin: 45 },
  ];

  const servicosCriados: Record<string, ServicoEntity> = {};

  for (const dados of servicosSeed) {
    const existente = await servicoRepo.findOne({ where: { nome: dados.nome } });
    if (!existente) {
      const s = servicoRepo.create(dados);
      await servicoRepo.save(s);
      servicosCriados[dados.nome] = s;
      console.log(`  Servico criado: ${dados.nome}`);
    } else {
      servicosCriados[dados.nome] = existente;
      console.log(`  Servico ja existe: ${dados.nome}`);
    }
  }

  // ── Agendamentos ──────────────────────────────
  const hoje = new Date().toISOString().split("T")[0];

  const agendamentosSeed = [
    {
      clienteId:  usuariosCriados["ana@email.com"]?.id,
      barbeiroId: usuariosCriados["carlos@email.com"]?.id,
      servicoId:  servicosCriados["Corte + Barba"]?.id,
      data: hoje, hora: "09:00", status: "Concluido" as const,
    },
    {
      clienteId:  usuariosCriados["pedro@email.com"]?.id,
      barbeiroId: usuariosCriados["carlos@email.com"]?.id,
      servicoId:  servicosCriados["Corte Classico"]?.id,
      data: hoje, hora: "10:00", status: "Confirmado" as const,
    },
    {
      clienteId:  usuariosCriados["mariana@email.com"]?.id,
      barbeiroId: usuariosCriados["joao@email.com"]?.id,
      servicoId:  servicosCriados["Corte Degrade"]?.id,
      data: hoje, hora: "11:00", status: "Pendente" as const,
    },
    {
      clienteId:  usuariosCriados["ana@email.com"]?.id,
      barbeiroId: usuariosCriados["joao@email.com"]?.id,
      servicoId:  servicosCriados["Barba Modelada"]?.id,
      data: hoje, hora: "14:00", status: "Concluido" as const,
    },
  ];

  const agendsCriados: AgendamentoEntity[] = [];

  for (const dados of agendamentosSeed) {
    if (!dados.clienteId || !dados.barbeiroId || !dados.servicoId) continue;

    const existente = await agendRepo.findOne({
      where: { clienteId: dados.clienteId, data: dados.data, hora: dados.hora },
    });
    if (!existente) {
      const ag = agendRepo.create(dados);
      await agendRepo.save(ag);
      agendsCriados.push(ag);
      console.log(`  Agendamento criado: ${dados.hora} - ${dados.status}`);
    } else {
      agendsCriados.push(existente);
      console.log(`  Agendamento ja existe: ${dados.hora}`);
    }
  }

  // ── Transacoes (para os agendamentos Concluidos) ──
  const concluidos = agendsCriados.filter((ag) => ag.status === "Concluido");

  for (const ag of concluidos) {
    const jaExiste = await transacaoRepo.findOne({ where: { agendamentoId: ag.id } });
    if (!jaExiste) {
      const servico = await servicoRepo.findOne({ where: { id: ag.servicoId } });
      const cliente = await usuarioRepo.findOne({ where: { id: ag.clienteId } });
      const t = transacaoRepo.create({
        agendamentoId: ag.id,
        valor:         servico?.preco ?? 0,
        data:          hoje,
        descricao:     `${servico?.nome ?? "Servico"} - ${cliente?.nome ?? "Cliente"}`,
      });
      await transacaoRepo.save(t);
      console.log(`  Transacao criada: R$ ${t.valor}`);
    }
  }

  console.log("\nSeed concluido com sucesso.");
  console.log("Credenciais de acesso: senha admin123 para todos os usuarios.");
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
