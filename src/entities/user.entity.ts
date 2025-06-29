import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Role } from '../types/roles.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ type: 'text', nullable: true })
  hashedRefreshToken?: string | null;

  @Column({ type: 'enum', enum: ['local', 'google'], default: 'local' })
  provider: 'local' | 'google';

  @Column({
    type: 'enum',
    enum: Role,
  })
  role: Role;

  @Column({ type: 'varchar', nullable: true })  // 👈 Add this
  name?: string;
}
