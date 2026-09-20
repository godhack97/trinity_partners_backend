import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";
import { CompanyEntity } from "./company.entity";
import { UserIdentityEntity } from "./user-identity.entity";

export enum CompanyEmployeeStatus {
  Invited = "invited",
  Pending = "pending",
  TrinityPending = "trinity_pending",
  InviteTrinityPending = "invite_trinity_pending",
  CompanyPending = "company_pending",
  Accept = "accept",
  Reject = "reject",
  Blocked = "blocked",
  Deleted = "deleted",
}
@Entity({
  name: "company_employees",
})
export class CompanyEmployeeEntity extends BasisEntity {
  @Column()
  company_id: number;

  @OneToOne(() => CompanyEntity, (company: CompanyEntity) => company.id)
  @JoinColumn({ name: "company_id" })
  company: CompanyEntity;

  @Column()
  employee_id: number;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: "employee_id" })
  employee: UserEntity;

  @ManyToOne(() => UserIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "employee_id", referencedColumnName: "id" })
  employee_identity?: UserIdentityEntity;

  @Column({
    type: "enum",
    enum: CompanyEmployeeStatus,
    default: CompanyEmployeeStatus.Pending,
  })
  status: CompanyEmployeeStatus;

  @AfterLoad()
  useHistoricalEmployee() {
    if (!this.employee && this.employee_identity) {
      this.employee = this.employee_identity.toHistoricalUser();
    }
  }
}
