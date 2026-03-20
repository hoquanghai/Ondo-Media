import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Survey } from './survey.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity('survey_responses')
@Unique(['questionId', 'userId'])
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'survey_id', type: 'uniqueidentifier' })
  surveyId: string;

  @Column({ name: 'question_id', type: 'uniqueidentifier' })
  questionId: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'answer', type: 'nvarchar', length: 'MAX' })
  answer: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @ManyToOne(() => Survey, (survey) => survey.responses)
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;

  @ManyToOne(() => SurveyQuestion, (sq) => sq.responses)
  @JoinColumn({ name: 'question_id' })
  question: SurveyQuestion;

  // No @ManyToOne to User (cross-database)
}
