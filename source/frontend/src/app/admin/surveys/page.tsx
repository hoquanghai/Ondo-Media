"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Survey } from "@/types/survey";
import { formatRelativeTime } from "@/lib/utils";

export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ surveys: Survey[] }>("/admin/surveys")
      .then((data) => {
        setSurveys(data.surveys);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">アンケート結果</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">アンケート結果</h1>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--muted)/0.5)]">
            <tr>
              <th className="text-left p-3 font-medium">タイトル</th>
              <th className="text-left p-3 font-medium">回答数</th>
              <th className="text-left p-3 font-medium">作成日</th>
              <th className="text-left p-3 font-medium">状態</th>
              <th className="text-left p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((survey) => {
              const isClosed = survey.status === "closed";
              return (
                <tr
                  key={survey.id}
                  className="border-t hover:bg-[hsl(var(--muted)/0.3)]"
                >
                  <td className="p-3 font-medium">{survey.title}</td>
                  <td className="p-3">{survey.responseCount}件</td>
                  <td className="p-3 text-[hsl(var(--muted-foreground))]">
                    {formatRelativeTime(survey.createdAt)}
                  </td>
                  <td className="p-3">
                    <Badge variant={isClosed ? "secondary" : "default"}>
                      {isClosed ? "終了" : "実施中"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                    >
                      <Link href={`/admin/surveys/${survey.id}/results`}>
                        <BarChart3 className="h-4 w-4" />
                        結果を見る
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {surveys.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-[hsl(var(--muted-foreground))]"
                >
                  アンケートがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
