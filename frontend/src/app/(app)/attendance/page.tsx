"use client";

import { useMemo, useState } from "react";
import { Activity, Check, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PermissionDenied,
} from "@/components/shared/states";
import { StatusBadge, attendanceTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useListQuery, useQuery } from "@/lib/use-query";
import { formatDate, formatTimeRange, fullName } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";
import type { AttendanceRecord, ClassSession } from "@/lib/types";

interface RosterRow {
  id: string;
  member: {
    id: string;
    memberCode: string;
    user: { id: string; firstName: string; lastName: string; email: string };
  };
  attendance: { status: string } | null;
}

export default function AttendancePage() {
  const auth = useRequireAuth((a) => a.can("attendance:manage"));
  const canManage = auth.can("attendance:manage");

  const [sessionId, setSessionId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const { items: sessions, error, loading, refetch } = useListQuery<ClassSession>(
    canManage ? "/sessions?limit=100&status=SCHEDULED" : null,
  );

  const { data: sessionDetail, refetch: refetchDetail } = useQuery<ClassSession>(
    sessionId ? `/sessions/${sessionId}` : null,
  );

  const { items: recent, refetch: refetchRecent } = useListQuery<AttendanceRecord>(
    canManage ? "/attendance?limit=50" : null,
  );

  const now = useMemo(() => Date.now(), []);
  const selected = sessions.find((s) => s.id === sessionId);
  const canMark = selected ? new Date(selected.startsAt).getTime() <= now : false;

  if (!auth.loading && !canManage) {
    return (
      <>
        <PageHeader title="Attendance" />
        <PermissionDenied message="Only managers, admins and trainers can record attendance." />
      </>
    );
  }

  async function mark(memberId: string, status: "PRESENT" | "ABSENT" | "LATE") {
    if (!sessionId) return;
    setBusy(true);
    try {
      await api.post("/attendance", {
        sessionId,
        marks: [{ memberId, status }],
      });
      toast.success("Attendance saved");
      await Promise.all([refetchDetail(), refetchRecent()]);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const roster: RosterRow[] = (sessionDetail?.roster ?? []) as unknown as RosterRow[];

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Mark attendance for sessions that have started (R4)"
      />

      <div className="mb-6 max-w-xl">
        <label className="mb-2 block text-sm font-medium" htmlFor="session-select">
          Session
        </label>
        <Select value={sessionId} onValueChange={setSessionId}>
          <SelectTrigger id="session-select" aria-label="Session">
            <SelectValue placeholder="Select a session…" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.class.name} · {formatDate(s.startsAt)} {formatTimeRange(s.startsAt, s.endsAt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Loading sessions…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !sessionId ? (
        <EmptyState
          icon={<Activity className="size-5" />}
          title="Select a session"
          description="Choose a scheduled session above to see its roster."
        />
      ) : (
        <>
          {!canMark ? (
            <p className="mb-4 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning-fg">
              This session has not started yet — attendance can only be recorded once it begins.
            </p>
          ) : null}
          {roster.length === 0 ? (
            <EmptyState title="No enrollments" description="This session has no enrolled members." />
          ) : (
            <Card className="shadow-soft">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Current mark</TableHead>
                      <TableHead aria-label="Actions" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">
                            {fullName(r.member.user)}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {r.member.memberCode}
                          </p>
                        </TableCell>
                        <TableCell>
                          {r.attendance ? (
                            <StatusBadge tone={attendanceTone(r.attendance.status)}>
                              {r.attendance.status}
                            </StatusBadge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not marked</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant={r.attendance?.status === "PRESENT" ? "default" : "outline"}
                              disabled={!canMark || busy}
                              onClick={() => mark(r.member.id, "PRESENT")}
                            >
                              <Check className="size-4" aria-hidden />
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant={r.attendance?.status === "LATE" ? "default" : "outline"}
                              disabled={!canMark || busy}
                              onClick={() => mark(r.member.id, "LATE")}
                            >
                              <Clock className="size-4" aria-hidden />
                              Late
                            </Button>
                            <Button
                              size="sm"
                              variant={r.attendance?.status === "ABSENT" ? "destructive" : "outline"}
                              disabled={!canMark || busy}
                              onClick={() => mark(r.member.id, "ABSENT")}
                            >
                              <X className="size-4" aria-hidden />
                              Absent
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <h2 className="mt-10 mb-3 text-lg font-semibold text-foreground">Recent marks</h2>
      {recent.length === 0 ? (
        <EmptyState title="No attendance recorded yet" />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="divide-y divide-border p-0">
            {recent.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {fullName(a.enrollment.member.user)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.enrollment.session.class.name} ·{" "}
                    {formatDate(a.enrollment.session.startsAt)}
                  </p>
                </div>
                <StatusBadge tone={attendanceTone(a.status)}>{a.status}</StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
