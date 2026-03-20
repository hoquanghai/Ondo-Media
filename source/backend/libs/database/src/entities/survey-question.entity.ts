import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Survey } from './survey.entity';
import { SurveyResponse } from './survey-response.entity';

@Entity('survey_questions')
export class SurveyQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'survey_id', type: 'uniqueidentifier' })
  surveyId: string;

  @Column({ name: 'question_text', type: 'nvarchar', length: 500 })
  questionText: string;

  @Column({ name: 'question_type', type: 'nvarchar', length: 20 })
  questionType: string;

  @Column({ name: 'options', type: 'nvarchar', length: 'MAX', nullable: true })
  options: string;

  @Column({ name: 'is_required', type: 'bit', default: true })
  isRequired: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @ManyToOne(() => Survey, (survey) => survey.questions)
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;

  @OneToMany(() => SurveyResponse, (sr) => sr.question)
  responses: SurveyResponse[];
}
