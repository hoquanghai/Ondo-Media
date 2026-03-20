"use client";

import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SurveyQuestion, SurveyResponseAnswer } from "@/types/survey";
import { cn } from "@/lib/utils";

interface SurveyFormProps {
  questions: SurveyQuestion[];
  onSubmit: (answers: SurveyResponseAnswer[]) => Promise<void>;
}

export function SurveyForm({ questions, onSubmit }: SurveyFormProps) {
  const [answers, setAnswers] = useState<
    Record<string, SurveyResponseAnswer>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateAnswer = (questionId: string, answer: SurveyResponseAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const answerList: SurveyResponseAnswer[] = questions.map((q) => {
        const existing = answers[q.id];
        return (
          existing ?? {
            questionId: q.id,
            selectedOptionIds: [],
            freeText: "",
            rating: undefined,
          }
        );
      });
      await onSubmit(answerList);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allRequiredAnswered = questions
    .filter((q) => q.isRequired)
    .every((q) => {
      const a = answers[q.id];
      if (!a) return false;
      if (
        (q.type === "single_choice" || q.type === "multiple_choice") &&
        (!a.selectedOptionIds || a.selectedOptionIds.length === 0)
      )
        return false;
      if (q.type === "free_text" && (!a.freeText || !a.freeText.trim()))
        return false;
      if (q.type === "rating" && (a.rating === undefined || a.rating === 0))
        return false;
      return true;
    });

  return (
    <div className="space-y-6">
      {questions
        .sort((a, b) => a.order - b.order)
        .map((question, index) => (
          <Card key={question.id}>
            <CardContent className="pt-4">
              <p className="font-medium text-sm mb-3">
                Q{index + 1}. {question.text}
                {question.isRequired && (
                  <span className="text-[hsl(var(--destructive))] ml-1">
                    * 必須
                  </span>
                )}
              </p>

              {/* Single Choice — Radio */}
              {question.type === "single_choice" && (
                <div className="space-y-2">
                  {question.options
                    .sort((a, b) => a.order - b.order)
                    .map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={
                            answers[question.id]?.selectedOptionIds?.[0] ===
                            option.id
                          }
                          onChange={() =>
                            updateAnswer(question.id, {
                              questionId: question.id,
                              selectedOptionIds: [option.id],
                            })
                          }
                          className="accent-[hsl(var(--primary))]"
                        />
                        {option.text}
                      </label>
                    ))}
                </div>
              )}

              {/* Multiple Choice — Checkbox */}
              {question.type === "multiple_choice" && (
                <div className="space-y-2">
                  {question.options
                    .sort((a, b) => a.order - b.order)
                    .map((option) => {
                      const current =
                        answers[question.id]?.selectedOptionIds ?? [];
                      const isChecked = current.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...current, option.id]
                                : current.filter((id) => id !== option.id);
                              updateAnswer(question.id, {
                                questionId: question.id,
                                selectedOptionIds: updated,
                              });
                            }}
                            className="accent-[hsl(var(--primary))]"
                          />
                          {option.text}
                        </label>
                      );
                    })}
                </div>
              )}

              {/* Free Text */}
              {question.type === "free_text" && (
                <Textarea
                  placeholder="回答を入力してください"
                  value={answers[question.id]?.freeText ?? ""}
                  onChange={(e) =>
                    updateAnswer(question.id, {
                      questionId: question.id,
                      freeText: e.target.value,
                    })
                  }
                  rows={3}
                />
              )}

              {/* Rating — Stars */}
              {question.type === "rating" && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() =>
                        updateAnswer(question.id, {
                          questionId: question.id,
                          rating,
                        })
                      }
                      className="p-1"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          (answers[question.id]?.rating ?? 0) >= rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !allRequiredAnswered}
          className="min-w-[120px]"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          回答を送信
        </Button>
      </div>
    </div>
  );
}
