# Phase 06 — Survey

## Objectives

- アンケート一覧ページ (未回答のみ表示) を構築する
- アンケート詳細/回答ページを構築する
- アンケート作成ページ (権限のあるユーザーのみ) を構築する
- 質問タイプ別レンダリング (選択式・テキスト・レーティング) を実装する
- アンケート結果表示 (管理者向け: 円グラフ・テキスト一覧・平均評価) を実装する
- 回答後に一覧から消える動作を実装する

## Prerequisites

- Phase 01〜04 完了
- バックエンド API: `GET /api/surveys`, `GET /api/surveys/:id`, `POST /api/surveys`, `POST /api/surveys/:id/respond`, `GET /api/surveys/:id/results`

## Tasks

### 1. アンケート関連の型定義

**File: `src/types/survey.ts`**

```ts
export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  created_by: {
    id: string;
    display_name: string;
  };
  expires_at: string | null;
  is_responded: boolean;
  response_count: number;
  created_at: string;
}

export interface Question {
  id: string;
  type: "multiple_choice" | "text" | "rating";
  text: string;
  required: boolean;
  options?: string[]; // multiple_choice 用
  allow_multiple?: boolean; // multiple_choice で複数選択可能か
  max_rating?: number; // rating 用 (デフォルト 5)
}

export interface SurveyResponse {
  survey_id: string;
  answers: Answer[];
}

export interface Answer {
  question_id: string;
  value: string | string[] | number;
}

export interface SurveyResults {
  survey_id: string;
  title: string;
  total_responses: number;
  questions: QuestionResult[];
}

export interface QuestionResult {
  question_id: string;
  text: string;
  type: "multiple_choice" | "text" | "rating";
  results: MultipleChoiceResult | TextResult | RatingResult;
}

export interface MultipleChoiceResult {
  type: "multiple_choice";
  options: { label: string; count: number; percentage: number }[];
}

export interface TextResult {
  type: "text";
  responses: string[];
}

export interface RatingResult {
  type: "rating";
  average: number;
  distribution: { rating: number; count: number }[];
}

export interface SurveysResponse {
  surveys: Survey[];
  total: number;
  page: number;
  has_more: boolean;
}
```

### 2. アンケートストア (Zustand)

**File: `src/stores/survey-store.ts`**

```ts
import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  Survey,
  SurveysResponse,
  SurveyResponse,
  SurveyResults,
} from "@/types/survey";

interface SurveyState {
  surveys: Survey[];
  currentSurvey: Survey | null;
  results: SurveyResults | null;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

interface SurveyActions {
  fetchSurveys: (page?: number) => Promise<void>;
  fetchSurvey: (id: string) => Promise<void>;
  createSurvey: (data: Partial<Survey>) => Promise<Survey>;
  submitResponse: (data: SurveyResponse) => Promise<void>;
  fetchResults: (id: string) => Promise<void>;
  removeSurveyFromList: (id: string) => void;
}

export const useSurveyStore = create<SurveyState & SurveyActions>((set, get) => ({
  surveys: [],
  currentSurvey: null,
  results: null,
  isLoading: false,
  hasMore: true,
  page: 1,

  fetchSurveys: async (page = 1) => {
    set({ isLoading: true });
    const data = await api.get<SurveysResponse>("/surveys", {
      page: String(page),
      per_page: "20",
      filter: "unanswered",
    });
    set({
      surveys: page === 1 ? data.surveys : [...get().surveys, ...data.surveys],
      isLoading: false,
      hasMore: data.has_more,
      page,
    });
  },

  fetchSurvey: async (id) => {
    set({ isLoading: true });
    const survey = await api.get<Survey>(`/surveys/${id}`);
    set({ currentSurvey: survey, isLoading: false });
  },

  createSurvey: async (data) => {
    const survey = await api.post<Survey>("/surveys", data);
    return survey;
  },

  submitResponse: async (data) => {
    await api.post(`/surveys/${data.survey_id}/respond`, data);
    get().removeSurveyFromList(data.survey_id);
  },

  fetchResults: async (id) => {
    set({ isLoading: true });
    const results = await api.get<SurveyResults>(`/surveys/${id}/results`);
    set({ results, isLoading: false });
  },

  removeSurveyFromList: (id) => {
    set((state) => ({
      surveys: state.surveys.filter((s) => s.id !== id),
    }));
  },
}));
```

### 3. SurveyCard コンポーネント

**File: `src/components/surveys/survey-card.tsx`**

```tsx
"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ClipboardList, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Survey } from "@/types/survey";

interface SurveyCardProps {
  survey: Survey;
}

export function SurveyCard({ survey }: SurveyCardProps) {
  const isExpired = survey.expires_at && new Date(survey.expires_at) < new Date();

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{survey.title}</CardTitle>
          </div>
          {isExpired && (
            <Badge variant="secondary" className="text-xs">
              期限切れ
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{survey.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{survey.questions.length}問</span>
            {survey.expires_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                期限: {format(new Date(survey.expires_at), "yyyy/MM/dd", { locale: ja })}
              </span>
            )}
          </div>
          {!isExpired && (
            <Button asChild size="sm" className="gap-1">
              <Link href={`/surveys/${survey.id}`}>
                回答する
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4. SurveyForm コンポーネント

**File: `src/components/surveys/survey-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Question, Answer } from "@/types/survey";
import { cn } from "@/lib/utils";

interface SurveyFormProps {
  questions: Question[];
  onSubmit: (answers: Answer[]) => Promise<void>;
}

export function SurveyForm({ questions, onSubmit }: SurveyFormProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateAnswer = (questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const current = (answers[questionId] as string[]) ?? [];
    const updated = checked
      ? [...current, option]
      : current.filter((o) => o !== option);
    updateAnswer(questionId, updated);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const answerList: Answer[] = questions.map((q) => ({
        question_id: q.id,
        value: answers[q.id] ?? (q.type === "rating" ? 0 : ""),
      }));
      await onSubmit(answerList);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allRequiredAnswered = questions
    .filter((q) => q.required)
    .every((q) => {
      const a = answers[q.id];
      if (a === undefined || a === "") return false;
      if (Array.isArray(a) && a.length === 0) return false;
      return true;
    });

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardContent className="pt-4">
            <p className="font-medium text-sm mb-3">
              Q{index + 1}. {question.text}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </p>

            {/* Multiple Choice — Radio */}
            {question.type === "multiple_choice" && !question.allow_multiple && (
              <div className="space-y-2">
                {question.options?.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={() => updateAnswer(question.id, option)}
                      className="accent-primary"
                    />
                    {option}
                  </label>
                ))}
              </div>
            )}

            {/* Multiple Choice — Checkbox */}
            {question.type === "multiple_choice" && question.allow_multiple && (
              <div className="space-y-2">
                {question.options?.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={((answers[question.id] as string[]) ?? []).includes(option)}
                      onChange={(e) =>
                        handleCheckboxChange(question.id, option, e.target.checked)
                      }
                      className="accent-primary"
                    />
                    {option}
                  </label>
                ))}
              </div>
            )}

            {/* Text */}
            {question.type === "text" && (
              <Textarea
                placeholder="回答を入力してください"
                value={(answers[question.id] as string) ?? ""}
                onChange={(e) => updateAnswer(question.id, e.target.value)}
                rows={3}
              />
            )}

            {/* Rating — Stars */}
            {question.type === "rating" && (
              <div className="flex items-center gap-1">
                {Array.from({ length: question.max_rating ?? 5 }, (_, i) => i + 1).map(
                  (rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => updateAnswer(question.id, rating)}
                      className="p-1"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          (answers[question.id] as number) >= rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  )
                )}
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
```

### 5. SurveyResults コンポーネント

**File: `src/components/surveys/survey-results.tsx`**

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import type { SurveyResults as SurveyResultsType, QuestionResult } from "@/types/survey";

interface SurveyResultsProps {
  results: SurveyResultsType;
}

export function SurveyResults({ results }: SurveyResultsProps) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        回答数: {results.total_responses}件
      </div>

      {results.questions.map((question, index) => (
        <Card key={question.question_id}>
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

function QuestionResultView({ question }: { question: QuestionResult }) {
  if (question.type === "multiple_choice" && question.results.type === "multiple_choice") {
    const { options } = question.results;
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{option.label}</span>
              <span className="text-muted-foreground">
                {option.count}票 ({option.percentage}%)
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "text" && question.results.type === "text") {
    return (
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {question.results.responses.map((response, i) => (
          <div key={i} className="text-sm p-2 bg-muted rounded">
            {response}
          </div>
        ))}
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
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-yellow-400 rounded-full h-2"
                  style={{
                    width: `${distribution.length > 0 ? (d.count / Math.max(...distribution.map((x) => x.count))) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="w-8 text-xs text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
```

### 6. アンケート一覧ページ

**File: `src/app/(main)/surveys/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useSurveyStore } from "@/stores/survey-store";
import { SurveyCard } from "@/components/surveys/survey-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

export default function SurveysPage() {
  const { surveys, isLoading, fetchSurveys } = useSurveyStore();
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions?.includes("create_survey") || user?.role === "admin";

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">アンケート</h1>
        {canCreate && (
          <Button asChild className="gap-1">
            <Link href="/surveys/create">
              <Plus className="h-4 w-4" />
              アンケート作成
            </Link>
          </Button>
        )}
      </div>

      {surveys.map((survey) => (
        <SurveyCard key={survey.id} survey={survey} />
      ))}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && surveys.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          未回答のアンケートはありません
        </p>
      )}
    </div>
  );
}
```

### 7. アンケート回答ページ

**File: `src/app/(main)/surveys/[id]/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSurveyStore } from "@/stores/survey-store";
import { SurveyForm } from "@/components/surveys/survey-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Answer } from "@/types/survey";

export default function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentSurvey, isLoading, fetchSurvey, submitResponse } = useSurveyStore();

  useEffect(() => {
    fetchSurvey(id);
  }, [id, fetchSurvey]);

  const handleSubmit = async (answers: Answer[]) => {
    await submitResponse({ survey_id: id, answers });
    router.push("/surveys");
  };

  if (isLoading || !currentSurvey) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

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

      <h1 className="text-lg font-bold mb-2">{currentSurvey.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{currentSurvey.description}</p>

      <SurveyForm questions={currentSurvey.questions} onSubmit={handleSubmit} />
    </div>
  );
}
```

### 8. アンケート作成ページ

**File: `src/app/(main)/surveys/create/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useSurveyStore } from "@/stores/survey-store";
import type { Question } from "@/types/survey";

export default function CreateSurveyPage() {
  const router = useRouter();
  const { createSurvey } = useSurveyStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = (type: Question["type"]) => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        text: "",
        required: true,
        options: type === "multiple_choice" ? [""] : undefined,
        allow_multiple: false,
        max_rating: type === "rating" ? 5 : undefined,
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? { ...q, options: [...(q.options ?? []), ""] }
          : q
      )
    );
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options?.map((o, j) => (j === optionIndex ? value : o)),
            }
          : q
      )
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || questions.length === 0) return;
    setIsSubmitting(true);
    try {
      await createSurvey({ title, description, questions: questions as Question[] });
      router.push("/surveys");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        戻る
      </Button>

      <h1 className="text-lg font-bold mb-6">アンケート作成</h1>

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
                <span className="text-xs text-muted-foreground font-medium">
                  Q{qIndex + 1} —{" "}
                  {question.type === "multiple_choice"
                    ? "選択式"
                    : question.type === "text"
                    ? "テキスト"
                    : "レーティング"}
                </span>
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <Input
                placeholder="質問文を入力"
                value={question.text}
                onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
              />

              {question.type === "multiple_choice" && (
                <div className="space-y-2 pl-4">
                  {question.options?.map((option, oIndex) => (
                    <Input
                      key={oIndex}
                      placeholder={`選択肢 ${oIndex + 1}`}
                      value={option}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    />
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
        <Button variant="outline" size="sm" onClick={() => addQuestion("multiple_choice")}>
          <Plus className="h-4 w-4 mr-1" />
          選択式
        </Button>
        <Button variant="outline" size="sm" onClick={() => addQuestion("text")}>
          <Plus className="h-4 w-4 mr-1" />
          テキスト
        </Button>
        <Button variant="outline" size="sm" onClick={() => addQuestion("rating")}>
          <Plus className="h-4 w-4 mr-1" />
          レーティング
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
```

## Verification Checklist

- [ ] `/surveys` に未回答のアンケート一覧が表示される
- [ ] SurveyCard にタイトル・説明・質問数・期限・回答ボタンが表示される
- [ ] `/surveys/:id` で質問がタイプ別にレンダリングされる (ラジオ/チェックボックス/テキスト/星)
- [ ] 必須質問の未回答時に送信ボタンが無効化される
- [ ] 回答送信後に `/surveys` にリダイレクトされ、回答済みアンケートが一覧から消える
- [ ] `/surveys/create` でアンケートを作成できる (選択式・テキスト・レーティング質問)
- [ ] SurveyResults: 選択式 → 棒グラフ (パーセンテージバー)、テキスト → 一覧、レーティング → 平均+分布
- [ ] 権限のないユーザーにはアンケート作成ボタンが非表示
- [ ] すべてのテキストが日本語
- [ ] TypeScript エラーがない

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `src/types/survey.ts` | 作成 | アンケート関連の型定義 |
| `src/stores/survey-store.ts` | 作成 | Zustand アンケートストア |
| `src/components/surveys/survey-card.tsx` | 作成 | アンケートカード |
| `src/components/surveys/survey-form.tsx` | 作成 | アンケート回答フォーム (質問タイプ別) |
| `src/components/surveys/survey-results.tsx` | 作成 | アンケート結果表示 |
| `src/app/(main)/surveys/page.tsx` | 作成 | アンケート一覧ページ |
| `src/app/(main)/surveys/[id]/page.tsx` | 作成 | アンケート回答ページ |
| `src/app/(main)/surveys/create/page.tsx` | 作成 | アンケート作成ページ |
