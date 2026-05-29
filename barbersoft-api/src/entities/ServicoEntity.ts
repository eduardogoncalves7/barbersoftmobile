// src/entities/ServicoEntity.ts
//
// Entidade Servico — mapeia para a tabela "servicos" no SQLite.
// Gerenciada pelo admin via rotas protegidas.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { AgendamentoEntity } from "./AgendamentoEntity";

@Entity("servicos")
export class ServicoEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  nome!: string;

  @Column({ type: "varchar", length: 300, default: "" })
  descricao!: string;

  // Preco em reais — float para suportar centavos (ex: 45.50)
  @Column({ type: "real" })
  preco!: number;

  // Duracao estimada em minutos — usada para bloquear o horario do barbeiro
  @Column({ type: "integer" })
  duracaoMin!: number;

  @CreateDateColumn()
  criadoEm!: Date;

  // Um servico pode ser referenciado em varios agendamentos
  @OneToMany(() => AgendamentoEntity, (ag) => ag.servico)
  agendamentos!: AgendamentoEntity[];
}
