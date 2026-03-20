"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSurveyStore } from "@/stores/survey-store";
import { SurveyForm } from "@/components/surveys/survey-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SurveyResponseAnswer } from "@/types/survey";

export default function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentSurvey, isLoading, fetchSurvey, submitResponse } =
    useSurveyStore();

  useEffect(() => {
    fetchSurvey(id);
  }, [id, fetchSurvey]);

  const handleSubmit = async (answers: SurveyResponseAnswer[]) => {
    await submitResponse(id, answers);
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

      <h1 className="text-xl font-bold mb-2">{currentSurvey.title}</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        {currentSurvey.description}
      </p>

      <SurveyForm
        questions={currentSurvey.questions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
