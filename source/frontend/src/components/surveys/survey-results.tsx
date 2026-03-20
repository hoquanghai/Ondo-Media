"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import type {
  SurveyResultsData,
  SurveyQuestionResult,
} from "@/stores/survey-store";

interface SurveyResultsProps {
  results: SurveyResultsData;
}

export function SurveyResults({ results }: SurveyResultsProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-[hsl(var(--muted-foreground))]">
        回答数: {results.totalResponses}件
      </div>

      {results.questions.map((question, index) => (
        <Card key={question.questionId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Q{index + 1}. {question.text}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionResultView question={question} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QuestionResultView({ question }: { question: SurveyQuestionResult }) {
  if (
    (question.type === "single_choice" ||
      question.type === "multiple_choice") &&
    question.results.type === "multiple_choice"
  ) {
    const { options } = question.results;
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{option.label}</span>
              <span className="text-[hsl(var(--muted-foreground))]">
                {option.count}票 ({option.percentage}%)
              </span>
            </div>
            <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2">
              <div
                className="bg-[hsl(var(--primary))] rounded-full h-2 transition-all"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "free_text" && question.results.type === "free_text") {
    return (
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {question.results.responses.map((response, i) => (
          <div
            key={i}
            className="text-sm p-2 bg-[hsl(var(--muted))] rounded"
          >
            {response}
          </div>
        ))}
        {question.results.responses.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            回答なし
          </p>
        )}
      </div>
    );
  }

  if (question.type === "rating" && question.results.type === "rating") {
    const { average, distribution } = question.results;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{average.toFixed(1)}</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(average)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1">
          {distribution.map((d) => (
            <div key={d.rating} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-right">{d.rating}</span>
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <div className="flex-1 bg-[hsl(var(--muted))] rounded-full h-2">
                <div
                  className="bg-yellow-400 rounded-full h-2"
                  style={{
                    width: `${
                      distribution.length > 0
                        ? (d.count /
                            Math.max(...distribution.map((x) => x.count), 1)) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="w-8 text-xs text-[hsl(var(--muted-foreground))]">
                {d.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
