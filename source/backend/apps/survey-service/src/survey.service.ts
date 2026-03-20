import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { Survey, SurveyQuestion, SurveyResponse } from '@app/database';
import { PaginatedResponseDto, EVENTS } from '@app/common';
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

  // ─── Create ───

  async create(data: {
    userId: number;
    title: string;
    description?: string;
    isAnonymous?: boolean;
    startsAt: string;
    endsAt: string;
    questions: Array<{
      questionText: string;
      questionType: string;
      options?: string[];
      isRequired?: boolean;
      sortOrder: number;
    }>;
  }) {
    const survey = this.surveyRepo.create({
      userId: data.userId,
      title: data.title,
      description: data.description,
      isAnonymous: data.isAnonymous ?? false,
      isActive: true,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      createdBy: data.userId,
    });
    const savedSurvey = await this.surveyRepo.save(survey);

    // Create questions
    const questions = data.questions.map((q) =>
      this.questionRepo.create({
        surveyId: savedSurvey.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options ? JSON.stringify(q.options) : undefined,
        isRequired: q.isRequired ?? true,
        sortOrder: q.sortOrder,
        createdBy: data.userId,
      }),
    );
    await this.questionRepo.save(questions);

    // Publish event
    await this.events.publish(EVENTS.SURVEY_CREATED, {
      surveyId: savedSurvey.id,
      title: savedSurvey.title,
      authorId: data.userId,
    });

    return this.findByIdInternal(savedSurvey.id);
  }

  // ─── Find All (paginated) ───

  async findAll(data: {
    page?: number;
    limit?: number;
    userId?: number;
    isActive?: boolean;
  }) {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;

    const qb = this.surveyRepo
      .createQueryBuilder('s')
      .where('s.is_deleted = :isDel', { isDel: false });

    if (data.isActive !== undefined) {
      qb.andWhere('s.is_active = :isActive', { isActive: data.isActive });
    }

    // If userId is provided, exclude surveys the user has already responded to
    if (data.userId) {
      qb.andWhere((qb2) => {
        const subQuery = qb2
          .subQuery()
          .select('1')
          .from(SurveyResponse, 'sr')
          .where('sr.survey_id = s.id')
          .andWhere('sr.user_id = :respUserId')
          .andWhere('sr.is_deleted = :srDel')
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      });
      qb.setParameter('respUserId', data.userId);
      qb.setParameter('srDel', false);
    }

    qb.orderBy('s.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Attach response count for each survey
    const processedItems = await Promise.all(
      items.map(async (survey) => {
        const responseCount = await this.getUniqueRespondentCount(survey.id);
        return { ...survey, responseCount };
      }),
    );

    return PaginatedResponseDto.from(processedItems, total, page, limit);
  }

  // ─── Find By ID ───

  async findById(data: { id: string; userId?: number }) {
    const survey = await this.findByIdInternal(data.id);

    let hasResponded = false;
    if (data.userId) {
      const result = await this.hasResponded({ surveyId: data.id, userId: data.userId });
      hasResponded = result.responded;
    }

    const responseCount = await this.getUniqueRespondentCount(data.id);

    return { ...survey, hasResponded, responseCount };
  }

  // ─── Update ───

  async update(data: {
    id: string;
    userId: number;
    title?: string;
    description?: string;
    isActive?: boolean;
    startsAt?: string;
    endsAt?: string;
  }) {
    const survey = await this.surveyRepo.findOne({
      where: { id: data.id, isDeleted: false },
    });
    if (!survey) {
      throw new RpcException({ statusCode: 404, message: 'アンケートが見つかりません' });
    }

    // Check if there are already responses — if so, only allow limited updates
    const hasResponses = await this.responseRepo
      .createQueryBuilder('r')
      .where('r.survey_id = :surveyId', { surveyId: data.id })
      .andWhere('r.is_deleted = :isDel', { isDel: false })
      .getCount();

    if (hasResponses > 0 && (data.startsAt || data.endsAt)) {
      // Still allow title/description/isActive updates
    }

    if (data.title !== undefined) survey.title = data.title;
    if (data.description !== undefined) survey.description = data.description;
    if (data.isActive !== undefined) survey.isActive = data.isActive;
    if (data.startsAt !== undefined) survey.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) survey.endsAt = new Date(data.endsAt);

    await this.surveyRepo.save(survey);

    return this.findByIdInternal(data.id);
  }

  // ─── Delete (soft) ───

  async delete(data: { id: string; userId: number }) {
    const survey = await this.surveyRepo.findOne({
      where: { id: data.id, isDeleted: false },
    });
    if (!survey) {
      throw new RpcException({ statusCode: 404, message: 'アンケートが見つかりません' });
    }

    survey.isDeleted = true;
    await this.surveyRepo.save(survey);

    return { deleted: true };
  }

  // ─── Submit Response ───

  async submitResponse(data: {
    surveyId: string;
    userId: number;
    answers: Array<{ questionId: string; answer: string }>;
  }) {
    const survey = await this.surveyRepo.findOne({
      where: { id: data.surveyId, isDeleted: false },
      relations: ['questions'],
    });
    if (!survey) {
      throw new RpcException({ statusCode: 404, message: 'アンケートが見つかりません' });
    }

    if (!survey.isActive) {
      throw new RpcException({ statusCode: 422, message: 'このアンケートは受付終了しています' });
    }

    // Check deadline
    const now = new Date();
    if (survey.endsAt && now > survey.endsAt) {
      throw new RpcException({ statusCode: 422, message: 'アンケートの回答期限が過ぎています' });
    }
    if (survey.startsAt && now < survey.startsAt) {
      throw new RpcException({ statusCode: 422, message: 'アンケートの回答期間前です' });
    }

    // Check if already responded
    const existing = await this.responseRepo
      .createQueryBuilder('r')
      .where('r.survey_id = :surveyId', { surveyId: data.surveyId })
      .andWhere('r.user_id = :userId', { userId: data.userId })
      .andWhere('r.is_deleted = :isDel', { isDel: false })
      .getCount();

    if (existing > 0) {
      throw new RpcException({ statusCode: 409, message: '既にこのアンケートに回答済みです' });
    }

    // Validate required questions
    const questionMap = new Map(survey.questions.map((q) => [q.id, q]));
    const answerMap = new Map(data.answers.map((a) => [a.questionId, a.answer]));

    for (const question of survey.questions) {
      if (question.isRequired && !answerMap.has(question.id)) {
        throw new RpcException({
          statusCode: 400,
          message: `必須質問「${question.questionText}」への回答が必要です`,
        });
      }
    }

    // Validate answers
    for (const ans of data.answers) {
      const question = questionMap.get(ans.questionId);
      if (!question) {
        throw new RpcException({
          statusCode: 400,
          message: `無効な質問ID: ${ans.questionId}`,
        });
      }

      if (question.questionType === 'multiple_choice' && question.options) {
        const options: string[] = JSON.parse(question.options);
        if (!options.includes(ans.answer)) {
          throw new RpcException({
            statusCode: 400,
            message: `質問「${question.questionText}」の回答は選択肢に含まれていません`,
          });
        }
      }

      if (question.questionType === 'rating') {
        const rating = parseInt(ans.answer, 10);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          throw new RpcException({
            statusCode: 400,
            message: `質問「${question.questionText}」の評価は1〜5の整数で入力してください`,
          });
        }
      }
    }

    // Save responses
    const responses = data.answers.map((a) =>
      this.responseRepo.create({
        surveyId: data.surveyId,
        questionId: a.questionId,
        userId: data.userId,
        answer: a.answer,
        createdBy: data.userId,
      }),
    );

    try {
      await this.responseRepo.save(responses);
    } catch (err: any) {
      if (err?.number === 2627 || err?.code === 'ER_DUP_ENTRY') {
        throw new RpcException({ statusCode: 409, message: '既にこのアンケートに回答済みです' });
      }
      throw err;
    }

    return { submitted: true, respondedAt: new Date().toISOString() };
  }

  // ─── Has Responded ───

  async hasResponded(data: { surveyId: string; userId: number }): Promise<{ responded: boolean }> {
    const count = await this.responseRepo
      .createQueryBuilder('r')
      .where('r.survey_id = :surveyId', { surveyId: data.surveyId })
      .andWhere('r.user_id = :userId', { userId: data.userId })
      .andWhere('r.is_deleted = :isDel', { isDel: false })
      .getCount();

    return { responded: count > 0 };
  }

  // ─── Get Results (aggregated) ───

  async getResults(data: { surveyId: string }) {
    const survey = await this.findByIdInternal(data.surveyId);
    const sortedQuestions = [...survey.questions].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    const totalResponders = await this.getUniqueRespondentCount(data.surveyId);

    const results = await Promise.all(
      sortedQuestions.map(async (q) => {
        const responses = await this.responseRepo.find({
          where: { questionId: q.id, isDeleted: false },
        });

        const totalResponses = responses.length;
        let aggregation: any = {};

        if (q.questionType === 'multiple_choice' && q.options) {
          const options: string[] = JSON.parse(q.options);
          const counts: Record<string, number> = {};
          for (const opt of options) {
            counts[opt] = 0;
          }
          for (const r of responses) {
            counts[r.answer] = (counts[r.answer] ?? 0) + 1;
          }
          aggregation = {
            optionCounts: options.map((opt) => ({
              option: opt,
              count: counts[opt],
              percentage: totalResponses > 0
                ? Math.round((counts[opt] / totalResponses) * 1000) / 10
                : 0,
            })),
          };
        } else if (q.questionType === 'rating') {
          const ratings = responses.map((r) => parseFloat(r.answer));
          const avg = ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0;
          const distribution: Record<number, number> = {};
          for (let i = 1; i <= 5; i++) {
            distribution[i] = 0;
          }
          for (const r of ratings) {
            const val = Math.round(r);
            distribution[val] = (distribution[val] ?? 0) + 1;
          }
          aggregation = {
            averageRating: Math.round(avg * 100) / 100,
            distribution,
          };
        } else {
          // text — return all answers
          aggregation = {
            answers: responses.map((r) => ({
              userId: r.userId,
              answer: r.answer,
            })),
          };
        }

        return {
          questionId: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          totalResponses,
          ...aggregation,
        };
      }),
    );

    return {
      surveyId: data.surveyId,
      title: survey.title,
      totalResponses: totalResponders,
      results,
    };
  }

  // ─── Export to Excel ───

  async exportExcel(data: { surveyId: string }) {
    const ExcelJS = await import('exceljs');

    const survey = await this.surveyRepo.findOne({
      where: { id: data.surveyId, isDeleted: false },
      relations: ['questions'],
    });
    if (!survey) {
      throw new RpcException({ statusCode: 404, message: 'アンケートが見つかりません' });
    }

    const responses = await this.responseRepo.find({
      where: { surveyId: data.surveyId, isDeleted: false },
      relations: ['question'],
      order: { createdAt: 'ASC' },
    });

    // Group responses by user
    const userResponses = new Map<number, Map<string, string>>();

    for (const r of responses) {
      if (!userResponses.has(r.userId)) {
        userResponses.set(r.userId, new Map());
      }
      userResponses.get(r.userId)!.set(r.questionId, r.answer);
    }

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Responses');

    // Header row
    const sortedQuestions = [...survey.questions].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const headers = ['社員番号', ...sortedQuestions.map((q) => q.questionText)];
    sheet.addRow(headers);

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Data rows
    for (const [userId, answersMap] of userResponses) {
      const row = [
        userId,
        ...sortedQuestions.map((q) => answersMap.get(q.id) ?? ''),
      ];
      sheet.addRow(row);
    }

    // Auto-fit column widths
    sheet.columns.forEach((col) => {
      col.width = 25;
    });

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['アンケート名', survey.title]);
    summarySheet.addRow(['回答者数', userResponses.size]);
    summarySheet.addRow(['質問数', sortedQuestions.length]);
    summarySheet.addRow([]);

    for (const q of sortedQuestions) {
      summarySheet.addRow([q.questionText, `(${q.questionType})`]);
      const qResponses = responses.filter((r) => r.questionId === q.id);

      if (q.questionType === 'multiple_choice' && q.options) {
        const options: string[] = JSON.parse(q.options);
        for (const opt of options) {
          const count = qResponses.filter((r) => r.answer === opt).length;
          summarySheet.addRow([`  ${opt}`, count]);
        }
      } else if (q.questionType === 'rating') {
        const ratings = qResponses.map((r) => parseFloat(r.answer));
        const avg = ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;
        summarySheet.addRow(['  平均', Math.round(avg * 100) / 100]);
      } else {
        summarySheet.addRow(['  回答数', qResponses.length]);
      }
      summarySheet.addRow([]);
    }

    summarySheet.columns.forEach((col) => {
      col.width = 30;
    });

    // Export to buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      buffer: base64,
      filename: `survey_${data.surveyId}_results.xlsx`,
    };
  }

  // ─── Internal Helpers ───

  private async findByIdInternal(id: string): Promise<Survey> {
    const survey = await this.surveyRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['questions'],
    });
    if (!survey) {
      throw new RpcException({ statusCode: 404, message: 'アンケートが見つかりません' });
    }
    // Sort questions
    if (survey.questions) {
      survey.questions.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return survey;
  }

  private async getUniqueRespondentCount(surveyId: string): Promise<number> {
    const result = await this.responseRepo
      .createQueryBuilder('r')
      .select('COUNT(DISTINCT r.user_id)', 'count')
      .where('r.survey_id = :surveyId', { surveyId })
      .andWhere('r.is_deleted = :isDel', { isDel: false })
      .getRawOne();

    return parseInt(result?.count ?? '0', 10);
  }
}
