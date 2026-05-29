// src/entities/TransacaoFinanceiraEntity.ts
//
// Entidade TransacaoFinanceira — registrada automaticamente quando
// um agendamento e marcado como Concluido (via QR Code ou manualmente).
//
// E um registro imutavel por design — uma vez criado, nao deve ser editado.
// Para corrigir um erro, o fluxo seria cancelar o agendamento e criar um novo.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { AgendamentoEntity } from "./AgendamentoEntity";

@Entity("transacoes_financeiras")
export class TransacaoFinanceiraEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // Valor snapshot — capturado no momento da conclusao do atendimento.
  // Mesmo que o preco do servico mude depois, o historico financeiro
  // permanece correto.
  @Column({ type: "real" })
  valor!: number;

  // Descricao gerada automaticamente: "Corte Classico - Ana Costa"
  @Column({ type: "varchar", length: 300 })
  descricao!: string;

  // Data da transacao no formato "YYYY-MM-DD"
  @Column({ type: "varchar", length: 10 })
  data!: string;

  @CreateDateColumn()
  criadoEm!: Date;

  // Relacionamento OneToOne com o agendamento que gerou esta transacao.
  // JoinColumn cria a coluna "agendamentoId" nesta tabela (chave estrangeira).
  @OneToOne(() => AgendamentoEntity, (ag) => ag.transacao)
  @JoinColumn({ name: "agendamentoId" })
  agendamento!: AgendamentoEntity;

  @Column({ type: "varchar" })
  agendamentoId!: string;
}
