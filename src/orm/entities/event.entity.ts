import { Column, DeleteDateColumn, Entity } from "typeorm";
import { BasisEntity } from "./basis.entity";

@Entity({
  name: "events",
  orderBy: {
    date: "ASC",
  },
})
export class EventEntity extends BasisEntity {
  @Column({ length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "datetime" })
  date: Date;

  @Column({ type: "datetime", nullable: true })
  end_date: Date;

  @Column({ length: 500, nullable: true })
  link: string;

  @Column({
    type: "enum",
    enum: ["webinar", "conference", "training", "other"],
    default: "webinar",
  })
  type: "webinar" | "conference" | "training" | "other";

  @Column({ length: 500, nullable: true })
  image: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "datetime", nullable: true })
  notification_sent_at: Date | null;

  @Column({ type: "datetime", nullable: true })
  reminder_3_days_sent_at: Date | null;

  @Column({ type: "datetime", nullable: true })
  reminder_1_day_sent_at: Date | null;

  @DeleteDateColumn({ name: "deleted_at" })
  deleted_at: Date;
}
