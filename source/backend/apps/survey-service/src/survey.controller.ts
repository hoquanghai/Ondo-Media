import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { SurveyService } from './survey.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_CREATE)
  async create(data: any) {
    return this.surveyService.create(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_FIND_ALL)
  async findAll(data: any) {
    return this.surveyService.findAll(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_FIND_BY_ID)
  async findById(data: any) {
    return this.surveyService.findById(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_UPDATE)
  async update(data: any) {
    return this.surveyService.update(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_DELETE)
  async delete(data: any) {
    return this.surveyService.delete(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_SUBMIT_RESPONSE)
  async submitResponse(data: any) {
    return this.surveyService.submitResponse(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_HAS_RESPONDED)
  async hasResponded(data: any) {
    return this.surveyService.hasResponded(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_GET_RESULTS)
  async getResults(data: any) {
    return this.surveyService.getResults(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_EXPORT_EXCEL)
  async exportExcel(data: any) {
    return this.surveyService.exportExcel(data);
  }
}
