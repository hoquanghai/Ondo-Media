import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SurveyQuestion } from './survey-question.entity';
import { SurveyResponse } from './survey-response.entity';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'nvarchar', length: 'MAX', nullable: true })
  description: string;

  @Column({ name: 'is_anonymous', type: 'bit', default: false })
  isAnonymous: boolean;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive: boolean;

  @Column({ name: 'starts_at', type: 'datetime2' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'datetime2' })
  endsAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  // No @ManyToOne to User (cross-database)

  @OneToMany(() => SurveyQuestion, (sq) => sq.survey)
  questions: SurveyQuestion[];

  @OneToMany(() => SurveyResponse, (sr) => sr.survey)
  responses: SurveyResponse[];
}
