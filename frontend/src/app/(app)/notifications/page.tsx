"use client";

import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useListQuery } from "@/lib/use-query";
import { formatDateTime } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";
import type { AppNotification } from "@/lib/types";

export default function NotificationsPage() {
  const auth = useRequireAuth();
  const { items, error, loading, refetch } = useListQuery<AppNotification>(
    auth.user ? "/notifications?limit=50" : null,
  );

  async function markRead(id: string) {
    try {
      await api.post(`/notifications/${id}/read`);
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function markAll() {
    try {
      await api.post("/notifications/read-all");
      toast.success("All notifications marked as read");
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread notification${unread === 1 ? "" : "s"}`
            : "You are all caught up"
        }
        actions={
          unread > 0 ? (
            <Button variant="outline" onClick={markAll}>
              <CheckCheck className="size-4" aria-hidden />
              Mark all read
            </Button>
          ) : null
        }
      />

      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="No notifications"
          description="Membership, enrollment and payment events will show up here."
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="divide-y divide-border p-0">
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex flex-wrap items-start justify-between gap-3 p-4 ${
                  n.readAt ? "" : "bg-primary-softer"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.readAt ? (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    ) : null}
                    <p className="font-medium text-foreground">{n.title}</p>
                    <StatusBadge
                      tone={
                        n.type === "WARNING"
                          ? "warning"
                          : n.type === "SUCCESS"
                            ? "success"
                            : "info"
                      }
                    >
                      {n.type}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
                {!n.readAt ? (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
