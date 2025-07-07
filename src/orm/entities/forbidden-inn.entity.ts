import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('forbidden_inns')
export class ForbiddenInn {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 12, unique: true })
	inn: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	reason: string;

	@CreateDateColumn()
	created_at: Date;
}