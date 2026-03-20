import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserPermission } from './user-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'nvarchar', length: 100, unique: true })
  name: string;

  @Column({ name: 'description', type: 'nvarchar', length: 500, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @OneToMany(() => UserPermission, (up) => up.permission)
  userPermissions: UserPermission[];
}
