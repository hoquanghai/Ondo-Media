# Phase 06 — Survey

## Objectives

- Create the `survey-service` microservice (port 3005, NestJS TCP transport).
- Implement Survey CRUD with support for question types: `multiple_choice`, `text`, `rating`.
- Handle response submission with one-per-user-per-question unique constraint.
- Provide an endpoint to check if a user has already responded (to hide completed surveys from the timeline).
- Aggregate results for admin users.
- Export survey results to Excel using ExcelJS.
- Publish `survey.created` event via Redis Pub/Sub.

---

## Prerequisites

- Phases 01-03 complete.
- Surveys, survey_questions, and survey_responses tables migrated.
- Redis running for Pub/Sub.

### Additional Packages

```bash
pnpm add exceljs
pnpm add -D @types/exceljs
```

---

## Tasks

### 1. Scaffold the Survey Service

```bash
nest generate app survey-service
```

#### `apps/survey-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SurveyServiceModule } from './survey-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    SurveyServiceModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3005 },
    },
  );
  await app.listen();
  console.log('Survey service listening on TCP port 3005');
}
bootstrap();
```

### 2. Survey Entities

**File**: `libs/database/src/entities/survey.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 200 })
  title: string;

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  description: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'datetime', nullable: true })
  deadline: Date;

  @OneToMany(() => SurveyQuestion, (q) => q.survey, {
    cascade: true,
    eager: true,
  })
  questions: SurveyQuestion[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

**File**: `libs/database/src/entities/survey-question.entity.ts`

```typescript
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Survey } from './survey.entity';
import { SurveyResponse } from './survey-response.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TEXT = 'text',
  RATING = 'rating',
}

@Entity('survey_questions')
export class SurveyQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Survey, (s) => s.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;

  @Column({ type: 'nvarchar', length: 500 })
  question_text: string;

  @Column({ type: 'varchar', length: 50 })
  question_type: QuestionType;

  @Column({ type: 'simple-json', nullable: true })
  options: string[]; // For multiple_choice: ["Option A", "Option B", ...]

  @Column({ nullable: true })
  min_rating: number; // For rating type

  @Column({ nullable: true })
  max_rating: number; // For rating type

  @Column({ default: 0 })
  sort_order: number;

  @Column({ default: true })
  is_required: boolean;

  @OneToMany(() => SurveyResponse, (r) => r.question)
  responses: SurveyResponse[];
}
```

**File**: `libs/database/src/entities/survey-response.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity('survey_responses')
@Unique(['user', 'question']) // One response per user per question
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SurveyQuestion, (q) => q.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: SurveyQuestion;

  @Column({ type: 'nvarchar', length: 2000 })
  answer: string; // Text answer, selected option, or rating as string

  @CreateDateColumn()
  submitted_at: Date;
}
```

### 3. Survey Service Module

**File**: `apps/survey-service/src/survey-service.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { Survey } from '@app/database/entities/survey.entity';
import { SurveyQuestion } from '@app/database/entities/survey-question.entity';
import { SurveyResponse } from '@app/database/entities/survey-response.entity';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';
import { SurveyExportService } from './survey-export.service';
import { EventPublisher } from './event-publisher.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Survey, SurveyQuestion, SurveyResponse]),
  ],
  controllers: [SurveyController],
  providers: [SurveyService, SurveyExportService, EventPublisher],
})
export class SurveyServiceModule {}
```

### 4. Survey Service Controller (TCP)

**File**: `apps/survey-service/src/survey.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SurveyService } from './survey.service';
import { SurveyExportService } from './survey-export.service';

@Controller()
export class SurveyController {
  constructor(
    private readonly service: SurveyService,
    private readonly exportService: SurveyExportService,
  ) {}

  @MessagePattern('survey.create')
  async create(@Payload() data: {
    title: string;
    description?: string;
    authorId: string;
    deadline?: string;
    questions: Array<{
      questionText: string;
      questionType: string;
      options?: string[];
      minRating?: number;
      maxRating?: number;
      sortOrder: number;
      isRequired?: boolean;
    }>;
  }) {
    return this.service.create(data);
  }

  @MessagePattern('survey.update')
  async update(@Payload() data: { id: string; updates: any }) {
    return this.service.update(data.id, data.updates);
  }

  @MessagePattern('survey.delete')
  async delete(@Payload() data: { id: string }) {
    return this.service.delete(data.id);
  }

  @MessagePattern('survey.findAll')
  async findAll(@Payload() data: { page: number; limit: number }) {
    return this.service.findAll(data);
  }

  @MessagePattern('survey.findById')
  async findById(@Payload() data: { id: string }) {
    return this.service.findById(data.id);
  }

  @MessagePattern('survey.submitResponse')
  async submitResponse(@Payload() data: {
    surveyId: string;
    userId: string;
    answers: Array<{ questionId: string; answer: string }>;
  }) {
    return this.service.submitResponse(data);
  }

  @MessagePattern('survey.hasResponded')
  async hasResponded(@Payload() data: { surveyId: string; userId: string }) {
    return this.service.hasResponded(data.surveyId, data.userId);
  }

  @MessagePattern('survey.getResults')
  async getResults(@Payload() data: { surveyId: string }) {
    return this.service.getResults(data.surveyId);
  }

  @MessagePattern('survey.exportExcel')
  async exportExcel(@Payload() data: { surveyId: string }) {
    return this.exportService.exportToExcel(data.surveyId);
  }
}
```

### 5. Survey Service Logic

**File**: `apps/survey-service/src/survey.service.ts`

```typescript
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from '@app/database/entities/survey.entity';
import { SurveyQuestion } from '@app/database/entities/survey-question.entity';
import { SurveyResponse } from '@app/database/entities/survey-response.entity';
import { PaginatedResponseDto } from '@app/common';
import { EventPublisher } from './event-publisher.service';

@Injectable()
export class SurveyService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepo: Repository<Survey>,
    @InjectRepository(SurveyQuestion)
    private readonly questionRepo: Repository<SurveyQuestion>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepo: Repository<SurveyResponse>,
    private readonly events: EventPublisher,
  ) {}

  async create(data: {
    title: string;
    description?: string;
    authorId: string;
    deadline?: string;
    questions: Array<{
      questionText: string;
      questionType: string;
      options?: string[];
      minRating?: number;
      maxRating?: number;
      sortOrder: number;
      isRequired?: boolean;
    }>;
  }) {
    const survey = this.surveyRepo.create({
      title: data.title,
      description: data.description,
      author: { id: data.authorId } as any,
      deadline: data.deadline ? new Date(data.deadline) : null,
      questions: data.questions.map((q) =>
        this.questionRepo.create({
          question_text: q.questionText,
          question_type: q.questionType as any,
          options: q.options,
          min_rating: q.minRating,
          max_rating: q.maxRating,
          sort_order: q.sortOrder,
          is_required: q.isRequired ?? true,
        }),
      ),
    });

    const saved = await this.surveyRepo.save(survey);

    await this.events.publish('survey.created', {
      surveyId: saved.id,
      title: saved.title,
      authorId: data.authorId,
    });

    return saved;
  }

  async update(id: string, updates: Partial<Survey>) {
    await this.surveyRepo.update(id, updates);
    return this.findById(id);
  }

  async delete(id: string) {
    const result = await this.surveyRepo.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('Survey not found');
    return { deleted: true };
  }

  async findAll(params: { page: number; limit: number }) {
    const { page = 1, limit = 20 } = params;
    const [items, total] = await this.surveyRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
      relations: ['questions'],
    });
    return PaginatedResponseDto.from(items, total, page, limit);
  }

  async findById(id: string) {
    const survey = await this.surveyRepo.findOne({
      where: { id },
      relations: ['questions', 'author'],
    });
    if (!survey) throw new NotFoundException('Survey not found');
    return survey;
  }

  async submitResponse(data: {
    surveyId: string;
    userId: string;
    answers: Array<{ questionId: string; answer: string }>;
  }) {
    // Check if already responded
    const existing = await this.responseRepo.findOne({
      where: {
        user: { id: data.userId },
        question: { survey: { id: data.surveyId } },
      },
    });
    if (existing) {
      throw new ConflictException('You have already responded to this survey');
    }

    const responses = data.answers.map((a) =>
      this.responseRepo.create({
        user: { id: data.userId } as any,
        question: { id: a.questionId } as any,
        answer: a.answer,
      }),
    );

    await this.responseRepo.save(responses);
    return { submitted: true };
  }

  async hasResponded(surveyId: string, userId: string): Promise<{ responded: boolean }> {
    const count = await this.responseRepo
      .createQueryBuilder('r')
      .innerJoin('r.question', 'q')
      .where('q.survey_id = :surveyId', { surveyId })
      .andWhere('r.user_id = :userId', { userId })
      .getCount();

    return { responded: count > 0 };
  }

  async getResults(surveyId: string) {
    const survey = await this.findById(surveyId);

    const results = await Promise.all(
      survey.questions.map(async (q) => {
        const responses = await this.responseRepo.find({
          where: { question: { id: q.id } },
          relations: ['user'],
        });

        const totalResponses = responses.length;

        // Aggregate based on question type
        let aggregation: any = {};

        if (q.question_type === 'multiple_choice') {
          const counts: Record<string, number> = {};
          for (const opt of q.options ?? []) {
            counts[opt] = 0;
          }
          for (const r of responses) {
            counts[r.answer] = (counts[r.answer] ?? 0) + 1;
          }
          aggregation = { optionCounts: counts };
        } else if (q.question_type === 'rating') {
          const ratings = responses.map((r) => parseFloat(r.answer));
          const avg = ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0;
          aggregation = {
            averageRating: Math.round(avg * 100) / 100,
            distribution: this.buildRatingDistribution(
              ratings,
              q.min_rating,
              q.max_rating,
            ),
          };
        } else {
          // text — return all answers
          aggregation = {
            answers: responses.map((r) => ({
              userId: r.user.id,
              displayName: r.user.display_name,
              answer: r.answer,
            })),
          };
        }

        return {
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          totalResponses,
          ...aggregation,
        };
      }),
    );

    return { surveyId, title: survey.title, results };
  }

  private buildRatingDistribution(
    ratings: number[],
    min: number,
    max: number,
  ): Record<number, number> {
    const dist: Record<number, number> = {};
    for (let i = min; i <= max; i++) {
      dist[i] = 0;
    }
    for (const r of ratings) {
      dist[r] = (dist[r] ?? 0) + 1;
    }
    return dist;
  }
}
```

### 6. Excel Export Service

**File**: `apps/survey-service/src/survey-export.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Survey } from '@app/database/entities/survey.entity';
import { SurveyResponse } from '@app/database/entities/survey-response.entity';

@Injectable()
export class SurveyExportService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepo: Repository<Survey>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepo: Repository<SurveyResponse>,
  ) {}

  async exportToExcel(surveyId: string): Promise<{ buffer: string; filename: string }> {
    const survey = await this.surveyRepo.findOne({
      where: { id: surveyId },
      relations: ['questions'],
    });
    if (!survey) throw new NotFoundException('Survey not found');

    const responses = await this.responseRepo.find({
      where: { question: { survey: { id: surveyId } } },
      relations: ['user', 'question'],
      order: { submitted_at: 'ASC' },
    });

    // Group responses by user
    const userResponses = new Map<string, Map<string, string>>();
    const userNames = new Map<string, string>();

    for (const r of responses) {
      if (!userResponses.has(r.user.id)) {
        userResponses.set(r.user.id, new Map());
        userNames.set(r.user.id, r.user.display_name);
      }
      userResponses.get(r.user.id)!.set(r.question.id, r.answer);
    }

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Responses');

    // Header row
    const sortedQuestions = [...survey.questions].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const headers = ['User', ...sortedQuestions.map((q) => q.question_text)];
    sheet.addRow(headers);

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Data rows
    for (const [userId, answersMap] of userResponses) {
      const row = [
        userNames.get(userId),
        ...sortedQuestions.map((q) => answersMap.get(q.id) ?? ''),
      ];
      sheet.addRow(row);
    }

    // Auto-fit column widths
    sheet.columns.forEach((col) => {
      col.width = 25;
    });

    // Export to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return {
      buffer: base64,
      filename: `survey_${surveyId}_results.xlsx`,
    };
  }
}
```

### 7. Event Publisher

**File**: `apps/survey-service/src/event-publisher.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class EventPublisher implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get('REDIS_PORT', 6379),
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async publish(channel: string, data: any) {
    await this.redis.publish(channel, JSON.stringify(data));
  }
}
```

### 8. API Gateway Survey Controllers

**File**: `apps/api-gateway/src/surveys/surveys.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  SERVICE_TOKENS,
} from '@app/common';

@ApiTags('Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/surveys')
export class SurveysController {
  constructor(
    @Inject(SERVICE_TOKENS.SURVEY_SERVICE)
    private readonly client: ClientProxy,
  ) {}

  @Post()
  @RequirePermissions('survey.create')
  async create(
    @CurrentUser('sub') userId: string,
    @Body() body: any,
  ) {
    return firstValueFrom(
      this.client.send('survey.create', { ...body, authorId: userId }),
    );
  }

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return firstValueFrom(
      this.client.send('survey.findAll', { page, limit }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return firstValueFrom(
      this.client.send('survey.findById', { id }),
    );
  }

  @Get(':id/has-responded')
  async hasResponded(
    @Param('id') surveyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.client.send('survey.hasResponded', { surveyId, userId }),
    );
  }

  @Post(':id/respond')
  async submitResponse(
    @Param('id') surveyId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { answers: Array<{ questionId: string; answer: string }> },
  ) {
    return firstValueFrom(
      this.client.send('survey.submitResponse', {
        surveyId,
        userId,
        answers: body.answers,
      }),
    );
  }

  @Get(':id/results')
  @RequirePermissions('survey.view_results')
  async getResults(@Param('id') surveyId: string) {
    return firstValueFrom(
      this.client.send('survey.getResults', { surveyId }),
    );
  }

  @Get(':id/export')
  @RequirePermissions('survey.export')
  async exportExcel(
    @Param('id') surveyId: string,
    @Res() res: Response,
  ) {
    const result = await firstValueFrom(
      this.client.send('survey.exportExcel', { surveyId }),
    );

    const buffer = Buffer.from(result.buffer, 'base64');
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Patch(':id')
  @RequirePermissions('survey.create')
  async update(@Param('id') id: string, @Body() updates: any) {
    return firstValueFrom(
      this.client.send('survey.update', { id, updates }),
    );
  }

  @Delete(':id')
  @RequirePermissions('survey.create')
  async delete(@Param('id') id: string) {
    return firstValueFrom(
      this.client.send('survey.delete', { id }),
    );
  }
}
```

---

## Verification Checklist

- [ ] `survey-service` starts and listens on TCP port 3005.
- [ ] `POST /api/surveys` creates a survey with questions (requires `survey.create` permission).
- [ ] `GET /api/surveys` returns paginated survey list.
- [ ] `GET /api/surveys/:id` returns survey with questions.
- [ ] `POST /api/surveys/:id/respond` submits answers (one per user — second attempt returns 409).
- [ ] `GET /api/surveys/:id/has-responded` returns `{ responded: true/false }`.
- [ ] `GET /api/surveys/:id/results` returns aggregated results (requires `survey.view_results` permission).
- [ ] Multiple choice results include option counts.
- [ ] Rating results include average and distribution.
- [ ] Text results include all answers.
- [ ] `GET /api/surveys/:id/export` downloads a valid `.xlsx` file.
- [ ] `survey.created` event is published to Redis Pub/Sub.
- [ ] Unique constraint prevents duplicate responses per user per question.

---

## Files Created / Modified

| File | Purpose |
|------|---------|
| `apps/survey-service/src/main.ts` | Survey service bootstrap (TCP port 3005) |
| `apps/survey-service/src/survey-service.module.ts` | Module with entities |
| `apps/survey-service/src/survey.controller.ts` | TCP message pattern handlers |
| `apps/survey-service/src/survey.service.ts` | CRUD, responses, aggregation |
| `apps/survey-service/src/survey-export.service.ts` | Excel export with ExcelJS |
| `apps/survey-service/src/event-publisher.service.ts` | Redis Pub/Sub publisher |
| `libs/database/src/entities/survey.entity.ts` | Survey entity |
| `libs/database/src/entities/survey-question.entity.ts` | Question entity with types |
| `libs/database/src/entities/survey-response.entity.ts` | Response entity (unique constraint) |
| `apps/api-gateway/src/surveys/surveys.controller.ts` | Gateway survey endpoints |
