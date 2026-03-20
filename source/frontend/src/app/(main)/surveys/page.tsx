"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { useSurveyStore } from "@/stores/survey-store";
import { SurveyCard } from "@/components/surveys/survey-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

export default function SurveysPage() {
  const { surveys, isLoading, fetchSurveys } = useSurveyStore();
  const user = useAuthStore((s) => s.user);
  const canCreate =
    user?.permissions?.includes("create_survey") ||
    user?.permissions?.includes("admin");

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="アンケート"
        description="アンケートの回答・確認ができます"
      >
        {canCreate && (
          <Button asChild className="gap-1">
            <Link href="/surveys/create">
              <Plus className="h-4 w-4" />
              新規作成
            </Link>
          </Button>
        )}
      </PageHeader>

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
        <EmptyState
          icon={ClipboardList}
          title="未回答のアンケートはありません"
          description="新しいアンケートが作成されるとここに表示されます"
        />
      )}
    </div>
  );
}
