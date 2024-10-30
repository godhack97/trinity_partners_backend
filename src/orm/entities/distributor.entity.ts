import { Column, Entity } from "typeorm";
import { BasisEntity } from "./basis.entity";


@Entity({
  name: "distributors"
})
export class DistributorEntity extends BasisEntity {
  @Column()
  name: string
}