import type { User } from "./user";

export type SurveyQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "free_text"
  | "rating";

export interface SurveyQuestionOption {
  id: string;
  text: string;
  order: number;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  isRequired: boolean;
  options: SurveyQuestionOption[];
  order: number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  author: User;
  status: "draft" | "active" | "closed";
  startsAt: string;
  endsAt: string;
  responseCount: number;
  hasResponded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyResponseAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  freeText?: string;
  rating?: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondent: User;
  answers: SurveyResponseAnswer[];
  createdAt: string;
}
