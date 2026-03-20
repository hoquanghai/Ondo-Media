import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SurveyService } from './survey.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_CREATE)
  async create(@Payload() data: any) {
    return this.surveyService.create(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_FIND_ALL)
  async findAll(@Payload() data: any) {
    return this.surveyService.findAll(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_FIND_BY_ID)
  async findById(@Payload() data: any) {
    return this.surveyService.findById(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_UPDATE)
  async update(@Payload() data: any) {
    return this.surveyService.update(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_DELETE)
  async delete(@Payload() data: any) {
    return this.surveyService.delete(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_SUBMIT_RESPONSE)
  async submitResponse(@Payload() data: any) {
    return this.surveyService.submitResponse(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_HAS_RESPONDED)
  async hasResponded(@Payload() data: any) {
    return this.surveyService.hasResponded(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_GET_RESULTS)
  async getResults(@Payload() data: any) {
    return this.surveyService.getResults(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.SURVEY_EXPORT_EXCEL)
  async exportExcel(@Payload() data: any) {
    return this.surveyService.exportExcel(data);
  }
}
