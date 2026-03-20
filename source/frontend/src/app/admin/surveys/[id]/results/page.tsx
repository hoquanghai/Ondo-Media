"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { useSurveyStore } from "@/stores/survey-store";
import { SurveyResults } from "@/components/surveys/survey-results";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";

export default function AdminSurveyResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { results, isLoading, fetchResults } = useSurveyStore();

  useEffect(() => {
    fetchResults(id);
  }, [id, fetchResults]);

  const handleExport = () => {
    // Get token from auth storage
    let token = "";
    try {
      const stored = localStorage.getItem("auth-storage");
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed?.state?.accessToken ?? "";
      }
    } catch {
      // ignore
    }
    window.open(
      `${env.apiBaseUrl}/admin/surveys/${id}/export?token=${token}`,
      "_blank"
    );
  };

  if (isLoading || !results) {
    return (
      <div>
        <Skeleton className="h-8 w-1/3 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        戻る
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{results.title} - 結果</h1>
        <Button variant="outline" className="gap-1" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Excelにエクスポート
        </Button>
      </div>

      <SurveyResults results={results} />
    </div>
  );
}
