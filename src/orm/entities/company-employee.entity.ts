import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BasisEntity } from './basis.entity';
import { UserEntity } from './user.entity';
import { CompanyEntity } from "./company.entity";

export enum CompanyEmployeeStatus {
  Pending = 'pending',
  Accept = 'accept',
  Reject = 'reject',
  Deleted = 'deleted'
}
@Entity({
  name: 'company_employees',
})
export class CompanyEmployeeEntity extends BasisEntity {
  @Column()
  company_id: number;

  @OneToOne(() => CompanyEntity, (company: CompanyEntity) => company.id)
  @JoinColumn({ name: 'company_id' })
  company: UserEntity;

  @Column()
  employee_id: number;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: 'employee_id' })
  employee: UserEntity;

  @Column({
    type: "enum",
    enum: CompanyEmployeeStatus,
    default: CompanyEmployeeStatus.Pending
  })
  status: CompanyEmployeeStatus;
}
