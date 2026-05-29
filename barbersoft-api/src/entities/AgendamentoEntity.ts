// src/entities/AgendamentoEntity.ts
//
// Entidade Agendamento — tabela central do sistema.
// Relaciona um cliente, um barbeiro e um servico em uma data/hora especifica.
//
// Relacionamentos:
//   cliente  (ManyToOne → UsuarioEntity) — quem agendou
//   barbeiro (ManyToOne → UsuarioEntity) — quem vai atender
//   servico  (ManyToOne → ServicoEntity) — o que sera feito
//
// O campo status percorre o ciclo:
//   Pendente → Confirmado → Concluido
//                        ↘ Cancelado

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { UsuarioEntity } from "./UsuarioEntity";
import { ServicoEntity } from "./ServicoEntity";
import { TransacaoFinanceiraEntity } from "./TransacaoFinanceiraEntity";

export type StatusAgendamento = "Pendente" | "Confirmado" | "Concluido" | "Cancelado";

@Entity("agendamentos")
export class AgendamentoEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // Data no formato ISO "YYYY-MM-DD" — armazenada como string para simplicidade
  @Column({ type: "varchar", length: 10 })
  data!: string;

  // Hora no formato "HH:MM"
  @Column({ type: "varchar", length: 5 })
  hora!: string;

  @Column({ type: "varchar", default: "Pendente" })
  status!: StatusAgendamento;

  @CreateDateColumn()
  criadoEm!: Date;

  // Relacionamento com o cliente — eager: false significa que o TypeORM
  // nao carrega o objeto cliente automaticamente em toda query.
  // Precisamos fazer JOIN explicitamente quando quisermos os dados do cliente.
  @ManyToOne(() => UsuarioEntity, (u) => u.agendamentosComoCliente, { eager: false })
  @JoinColumn({ name: "clienteId" })
  cliente!: UsuarioEntity;

  // Coluna de chave estrangeira gerada pelo JoinColumn acima
  @Column({ type: "varchar" })
  clienteId!: string;

  @ManyToOne(() => UsuarioEntity, (u) => u.agendamentosComoBarbeiro, { eager: false })
  @JoinColumn({ name: "barbeiroId" })
  barbeiro!: UsuarioEntity;

  @Column({ type: "varchar" })
  barbeiroId!: string;

  @ManyToOne(() => ServicoEntity, (s) => s.agendamentos, { eager: false })
  @JoinColumn({ name: "servicoId" })
  servico!: ServicoEntity;

  @Column({ type: "varchar" })
  servicoId!: string;

  // Quando o agendamento e concluido, uma transacao financeira e gerada.
  // O relacionamento OneToOne aqui permite navegar do agendamento para a transacao.
  @OneToOne(() => TransacaoFinanceiraEntity, (t) => t.agendamento)
  transacao!: TransacaoFinanceiraEntity | null;
}
