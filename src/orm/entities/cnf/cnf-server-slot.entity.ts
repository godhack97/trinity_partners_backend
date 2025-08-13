import { BasisEntity } from "src/orm/entities/basis.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { CnfServerEntity } from "./cnf-server.entity";

@Entity({
  name: "cnf_server_slots",
})
export class CnfServerSlotEntity extends BasisEntity {
  @Column()
  server_id: string;

  @Column()
  slot_id: string;

  @Column()
  amount: number;

  @Column()
  on_back_panel: boolean;

  @ManyToOne(() => CnfServerEntity, (server) => server.slots)
  @JoinColumn({ name: "server_id" })
  server: CnfServerEntity;
}
