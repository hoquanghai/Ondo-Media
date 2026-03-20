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
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  RequirePermissions,
  SERVICE_TOKENS,
} from '@app/common';
import { PermissionsGuard } from '@app/common';

@Controller('surveys')
export class SurveyGatewayController {
  constructor(
    @Inject(SERVICE_TOKENS.SURVEY_SERVICE)
    private readonly surveyClient: ClientProxy,
  ) {}

  // ─── List (paginated, exclude answered) ───

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
  ) {
    return firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_FIND_ALL, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        userId: user?.shainBangou,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      }),
    );
  }

  // ─── Single Survey ───

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_FIND_BY_ID, {
        id,
        userId: user?.shainBangou,
      }),
    );
  }

  // ─── Create ───

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('survey.create')
  async create(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_CREATE, {
        ...body,
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Update ───

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('survey.create')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_UPDATE, {
        id,
        userId: user.shainBangou,
        ...body,
      }),
    );
  }

  // ─── Delete ───

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('survey.create')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_DELETE, {
        id,
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Submit Response ───

  @Post(':id/respond')
  async submitResponse(
    @Param('id') surveyId: string,
    @CurrentUser() user: any,
    @Body() body: { answers: Array<{ questionId: string; answer: string }> },
  ) {
    return firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_SUBMIT_RESPONSE, {
        surveyId,
        userId: user.shainBangou,
        answers: body.answers,
      }),
    );
  }

  // ─── Has Responded ───

  @Get(':id/has-responded')
  async hasResponded(
    @Param('id') surveyId: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_HAS_RESPONDED, {
        surveyId,
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Results (admin) ───

  @Get(':id/results')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('survey.view_results')
  async getResults(@Param('id') surveyId: string) {
    return firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_GET_RESULTS, {
        surveyId,
      }),
    );
  }

  // ─── Export Excel (admin) ───

  @Get(':id/export')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('survey.view_results')
  async exportExcel(
    @Param('id') surveyId: string,
    @Res() res: Response,
  ) {
    const result = await firstValueFrom(
      this.surveyClient.send(MESSAGE_PATTERNS.SURVEY_EXPORT_EXCEL, {
        surveyId,
      }),
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
}
