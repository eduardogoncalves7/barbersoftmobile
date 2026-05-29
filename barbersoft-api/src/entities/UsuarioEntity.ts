// src/entities/UsuarioEntity.ts
//
// Entidade Usuario — mapeia para a tabela "usuarios" no SQLite.
//
// Cada decorador do TypeORM instrui o ORM a gerar o SQL correspondente:
//   @Entity     → CREATE TABLE
//   @Column     → ADD COLUMN
//   @PrimaryGeneratedColumn → INTEGER PRIMARY KEY AUTOINCREMENT (SQLite)
//   @OneToMany  → nao cria coluna, mas permite navegar pelos relacionamentos

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { AgendamentoEntity } from "./AgendamentoEntity";

// Os roles possiveis para um usuario do sistema.
// "admin"    — acesso total, pode gerenciar tudo
// "barbeiro" — ve sua propria agenda, valida atendimentos
// "cliente"  — agenda servicos e visualiza seu historico
export type RoleUsuario = "admin" | "barbeiro" | "cliente";

@Entity("usuarios")
export class UsuarioEntity {
  // UUID gerado pelo banco — mais seguro que IDs sequenciais para expor em APIs
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150 })
  nome!: string;

  // unique: true garante que nao haverá dois usuarios com o mesmo email
  @Column({ type: "varchar", length: 200, unique: true })
  email!: string;

  // A senha NUNCA sera armazenada em texto puro.
  // O campo recebe o hash gerado pelo bcrypt (ver rota de cadastro).
  @Column({ type: "varchar" })
  senhaHash!: string;

  @Column({
    type: "varchar",
    default: "cliente",
  })
  role!: RoleUsuario;

  @CreateDateColumn()
  criadoEm!: Date;

  // Um usuario pode ter muitos agendamentos como cliente
  @OneToMany(() => AgendamentoEntity, (ag) => ag.cliente)
  agendamentosComoCliente!: AgendamentoEntity[];

  // Um barbeiro pode ter muitos agendamentos na sua agenda
  @OneToMany(() => AgendamentoEntity, (ag) => ag.barbeiro)
  agendamentosComoBarbeiro!: AgendamentoEntity[];
}
