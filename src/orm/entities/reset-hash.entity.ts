import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { UserEntity } from "./user.entity";
import { BasisEntity } from "./basis.entity";

@Entity({
  name: "reset_hashs",
})
export class ResetHashEntity extends BasisEntity {
  @Column()
  user_id: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column()
  hash: string;

  @Column()
  email: string;

  @Column()
  expire_date?: Date;
}
