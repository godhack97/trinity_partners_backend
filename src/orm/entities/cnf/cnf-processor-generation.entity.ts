import { Column, Entity } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";

@Entity({ name: "cnf_processor_generation" })
export class CnfProcessorGeneration extends BasisUUIDEntity {
  @Column()
  name: string;
}
