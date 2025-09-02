import { Entity, Column, JoinColumn, OneToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";

@Entity({
  name: "users_info",
})
export class UserInfoEntity extends BasisEntity {
  @Column()
  user_id: number;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.user_info)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  company_name: string;

  @Column({ nullable: true })
  job_title: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    nullable: true,
  })
  photo_url?: string;
}