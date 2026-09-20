import { Column, Entity, PrimaryColumn } from "typeorm";
import { UserEntity } from "./user.entity";

export type HistoricalUserRole = {
  id?: number;
  name: string;
  display_name?: string | null;
};

/**
 * Immutable directory entry used by business records after an account is
 * permanently removed. It deliberately contains no credentials or sessions.
 */
@Entity({ name: "user_identities" })
export class UserIdentityEntity {
  @PrimaryColumn({ type: "int", unsigned: true })
  id: number;

  @Column()
  email: string;

  @Column({ nullable: true })
  first_name?: string | null;

  @Column({ nullable: true })
  last_name?: string | null;

  @Column({ nullable: true })
  phone?: string | null;

  @Column({ nullable: true })
  job_title?: string | null;

  @Column({ type: "json", nullable: true })
  roles_snapshot?: HistoricalUserRole[] | null;

  @Column({ type: "timestamp", nullable: true })
  account_created_at?: Date | null;

  @Column({ type: "timestamp", nullable: true })
  permanently_deleted_at?: Date | null;

  @Column({ type: "int", unsigned: true, nullable: true })
  deleted_by_user_id?: number | null;

  @Column({ nullable: true })
  deleted_by_email?: string | null;

  toHistoricalUser(): UserEntity {
    const roles = this.roles_snapshot || [];
    return {
      id: this.id,
      email: this.email,
      is_activated: false,
      email_confirmed: false,
      deleted_at: this.permanently_deleted_at,
      user_info: {
        user_id: this.id,
        first_name: this.first_name || "",
        last_name: this.last_name || "",
        phone: this.phone || null,
        job_title: this.job_title || null,
      },
      role: roles[0] || null,
      user_roles: roles.map((role) => ({ role })),
      roles,
    } as unknown as UserEntity;
  }
}
