"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  Survey,
  SurveyResponseAnswer,
} from "@/types/survey";
import type { PaginatedResponse } from "@/types/api";

export interface SurveyResultsData {
  surveyId: string;
  title: string;
  totalResponses: number;
  questions: SurveyQuestionResult[];
}

export interface SurveyQuestionResult {
  questionId: string;
  text: string;
  type: "single_choice" | "multiple_choice" | "free_text" | "rating";
  results: MultipleChoiceResult | TextResult | RatingResult;
}

export interface MultipleChoiceResult {
  type: "multiple_choice";
  options: { label: string; count: number; percentage: number }[];
}

export interface TextResult {
  type: "free_text";
  responses: string[];
}

export interface RatingResult {
  type: "rating";
  average: number;
  distribution: { rating: number; count: number }[];
}

interface SurveyState {
  surveys: Survey[];
  currentSurvey: Survey | null;
  results: SurveyResultsData | null;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

interface SurveyActions {
  fetchSurveys: (page?: number) => Promise<void>;
  fetchSurvey: (id: string) => Promise<void>;
  createSurvey: (data: Partial<Survey>) => Promise<Survey>;
  submitResponse: (
    surveyId: string,
    answers: SurveyResponseAnswer[]
  ) => Promise<void>;
  fetchResults: (id: string) => Promise<void>;
  removeSurveyFromList: (id: string) => void;
}

export const useSurveyStore = create<SurveyState & SurveyActions>(
  (set, get) => ({
    surveys: [],
    currentSurvey: null,
    results: null,
    isLoading: false,
    hasMore: true,
    page: 1,

    fetchSurveys: async (page = 1) => {
      set({ isLoading: true });
      try {
        const data = await api.get<PaginatedResponse<Survey>>("/surveys", {
          page: String(page),
          limit: "20",
          filter: "unanswered",
        });
        set({
          surveys:
            page === 1 ? data.items : [...get().surveys, ...data.items],
          isLoading: false,
          hasMore: page < (data.meta?.totalPages ?? 0),
          page,
        });
      } catch {
        set({ isLoading: false });
      }
    },

    fetchSurvey: async (id) => {
      set({ isLoading: true, currentSurvey: null });
      try {
        const survey = await api.get<Survey>(`/surveys/${id}`);
        set({ currentSurvey: survey, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    createSurvey: async (data) => {
      const survey = await api.post<Survey>("/surveys", data);
      return survey;
    },

    submitResponse: async (surveyId, answers) => {
      await api.post(`/surveys/${surveyId}/respond`, { answers });
      get().removeSurveyFromList(surveyId);
    },

    fetchResults: async (id) => {
      set({ isLoading: true, results: null });
      try {
        const results = await api.get<SurveyResultsData>(
          `/surveys/${id}/results`
        );
        set({ results, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    removeSurveyFromList: (id) => {
      set((state) => ({
        surveys: state.surveys.filter((s) => s.id !== id),
      }));
    },
  })
);
