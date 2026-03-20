"use client";

import Link from "next/link";
import { ClipboardList, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import type { Survey } from "@/types/survey";

interface SurveyCardProps {
  survey: Survey;
}

export function SurveyCard({ survey }: SurveyCardProps) {
  const isExpired = survey.status === "closed";

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[hsl(var(--primary))]" />
            <CardTitle className="text-base">{survey.title}</CardTitle>
          </div>
          {isExpired && (
            <Badge variant="secondary" className="text-xs">
              終了
            </Badge>
          )}
          {survey.status === "active" && (
            <Badge variant="default" className="text-xs">
              受付中
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
          {survey.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
            <span>{survey.questions.length}問</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              期限: {new Date(survey.endsAt).toLocaleDateString("ja-JP")}
            </span>
            <span>{formatRelativeTime(survey.createdAt)}</span>
          </div>
          {!isExpired && !survey.hasResponded && (
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
