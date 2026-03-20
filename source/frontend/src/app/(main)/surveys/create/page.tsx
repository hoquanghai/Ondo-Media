"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useSurveyStore } from "@/stores/survey-store";
import type { SurveyQuestionType } from "@/types/survey";

interface QuestionDraft {
  id: string;
  type: SurveyQuestionType;
  text: string;
  isRequired: boolean;
  options: { id: string; text: string; order: number }[];
  order: number;
}

const typeLabels: Record<SurveyQuestionType, string> = {
  single_choice: "選択肢（単一）",
  multiple_choice: "選択肢（複数）",
  free_text: "テキスト",
  rating: "評価",
};

export default function CreateSurveyPage() {
  const router = useRouter();
  const { createSurvey } = useSurveyStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = (type: SurveyQuestionType) => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        text: "",
        isRequired: true,
        options:
          type === "single_choice" || type === "multiple_choice"
            ? [{ id: crypto.randomUUID(), text: "", order: 0 }]
            : [],
        order: prev.length,
      },
    ]);
  };

  const updateQuestion = (
    index: number,
    updates: Partial<QuestionDraft>
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, order: i }))
    );
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    setQuestions((prev) => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated.map((q, i) => ({ ...q, order: i }));
    });
  };

  const addOption = (questionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: [
                ...q.options,
                {
                  id: crypto.randomUUID(),
                  text: "",
                  order: q.options.length,
                },
              ],
            }
          : q
      )
    );
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map((o, j) =>
                j === optionIndex ? { ...o, text: value } : o
              ),
            }
          : q
      )
    );
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options
                .filter((_, j) => j !== optionIndex)
                .map((o, j) => ({ ...o, order: j })),
            }
          : q
      )
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || questions.length === 0) return;
    setIsSubmitting(true);
    try {
      await createSurvey({
        title,
        description,
        questions: questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          isRequired: q.isRequired,
          options: q.options,
          order: q.order,
        })),
      });
      router.push("/surveys");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        戻る
      </Button>

      <h1 className="text-xl font-bold mb-6">アンケート作成</h1>

      <div className="space-y-4 mb-6">
        <Input
          placeholder="アンケートタイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-medium"
        />
        <Textarea
          placeholder="説明 (任意)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((question, qIndex) => (
          <Card key={question.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                  Q{qIndex + 1} — {typeLabels[question.type]}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveQuestion(qIndex, "up")}
                    disabled={qIndex === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveQuestion(qIndex, "down")}
                    disabled={qIndex === questions.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                </div>
              </div>

              <Input
                placeholder="質問文を入力"
                value={question.text}
                onChange={(e) =>
                  updateQuestion(qIndex, { text: e.target.value })
                }
              />

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.isRequired}
                  onChange={(e) =>
                    updateQuestion(qIndex, { isRequired: e.target.checked })
                  }
                  className="accent-[hsl(var(--primary))]"
                />
                必須
              </label>

              {(question.type === "single_choice" ||
                question.type === "multiple_choice") && (
                <div className="space-y-2 pl-4">
                  {question.options.map((option, oIndex) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Input
                        placeholder={`選択肢 ${oIndex + 1}`}
                        value={option.text}
                        onChange={(e) =>
                          updateOption(qIndex, oIndex, e.target.value)
                        }
                        className="flex-1"
                      />
                      {question.options.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeOption(qIndex, oIndex)}
                        >
                          <Trash2 className="h-3 w-3 text-[hsl(var(--destructive))]" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => addOption(qIndex)}
                  >
                    <Plus className="h-3 w-3" />
                    選択肢を追加
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add question buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addQuestion("single_choice")}
        >
          <Plus className="h-4 w-4 mr-1" />
          選択肢（単一）
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addQuestion("multiple_choice")}
        >
          <Plus className="h-4 w-4 mr-1" />
          選択肢（複数）
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addQuestion("free_text")}
        >
          <Plus className="h-4 w-4 mr-1" />
          テキスト
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addQuestion("rating")}
        >
          <Plus className="h-4 w-4 mr-1" />
          評価
        </Button>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || questions.length === 0}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          アンケートを作成
        </Button>
      </div>
    </div>
  );
}
