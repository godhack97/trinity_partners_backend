import {
  Column,
  DeleteDateColumn,
  Entity,
} from "typeorm";
import { BasisEntity } from "./basis.entity";

export enum ImportantAlertSeverity {
  Critical = "critical",
  Warning = "warning",
  Info = "info",
}

@Entity({
  name: "important_alerts",
  orderBy: {
    id: "DESC",
  },
})
export class ImportantAlertEntity extends BasisEntity {
  @Column()
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({
    type: "enum",
    enum: ImportantAlertSeverity,
    default: ImportantAlertSeverity.Info,
  })
  severity: ImportantAlertSeverity;

  @Column({ default: true })
  is_active: boolean;

  @Column()
  author_id: number;

  @Column({ nullable: true })
  target_company_id?: number;

  @DeleteDateColumn()
  deleted_at: Date;
}
