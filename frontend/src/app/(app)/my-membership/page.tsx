"use client";

import Link from "next/link";
import { CreditCard, Dumbbell } from "lucide-react";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared/states";
import { StatusBadge, membershipTone } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@/lib/use-query";
import { formatDate, formatDuration, formatMoney } from "@/lib/format";
import type { Membership } from "@/lib/types";

export default function MyMembershipPage() {
  useRequireAuth();
  const { data, error, loading, refetch } = useQuery<{ data: Membership[] } | Membership[]>(
    "/memberships/mine",
  );

  const items = Array.isArray(data) ? data : ((data as { data?: Membership[] })?.data ?? []);

  return (
    <>
      <PageHeader
        title="My membership"
        description="Your current subscription and history"
      />
      {loading ? (
        <LoadingState label="Loading membership…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-5" />}
          title="No membership yet"
          description="Visit club reception to purchase a membership plan and start enrolling in classes."
        />
      ) : (
        <div className="grid gap-4">
          {items.map((m) => (
            <Card key={m.id} className="shadow-soft">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-base font-semibold text-foreground">{m.plan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDuration(m.plan.durationDays)} · {formatMoney(m.plan.price)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(m.startDate)} → {formatDate(m.endDate)}
                  </p>
                </div>
                <StatusBadge tone={membershipTone(m.status)}>{m.status}</StatusBadge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/classes"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <Dumbbell className="size-4" aria-hidden />
          Browse classes to enroll
        </Link>
      </div>
    </>
  );
}
