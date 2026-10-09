"use client";

import { useState } from "react";
import { CalendarPlus, Dumbbell, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared/states";
import { StatusBadge, sessionTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListQuery } from "@/lib/use-query";
import { formatDate, formatDateTime, formatTimeRange, fullName } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";
import type { ClassSession, FitnessClass, Trainer, Facility } from "@/lib/types";

interface ClassListItem extends FitnessClass {
  upcomingSessions: number;
}

interface MemberOption {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
}

export default function ClassesPage() {
  const auth = useRequireAuth();
  const canWriteClasses = auth.can("classes:write");
  const canWriteSessions = auth.can("sessions:write");

  const { items: classes, error, loading, refetch } = useListQuery<ClassListItem>(
    auth.user ? "/classes?limit=100&includeInactive=true" : null,
  );
  const { items: sessions, refetch: refetchSessions } = useListQuery<ClassSession>(
    auth.user ? "/sessions?limit=50&status=SCHEDULED" : null,
  );
  const { items: trainers } = useListQuery<Trainer>(
    auth.user ? "/trainers?limit=100" : null,
  );
  const { items: facilities } = useListQuery<Facility>(
    auth.user ? "/facilities?limit=100" : null,
  );
  const { items: memberOptions } = useListQuery<MemberOption>(
    auth.user && auth.user.role !== "MEMBER" ? "/members?limit=100" : null,
  );

  const [classDialog, setClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassListItem | null>(null);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enrollDialog, setEnrollDialog] = useState<ClassSession | null>(null);
  const [enrollMemberId, setEnrollMemberId] = useState("");

  const isMember = auth.user?.role === "MEMBER";
  const myMemberId = auth.user?.member?.id;

  async function saveClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      category: String(form.get("category") ?? "").trim(),
      capacity: Number(form.get("capacity") ?? 12),
      description: String(form.get("description") ?? "").trim() || null,
    };
    try {
      if (editingClass) {
        await api.patch(`/classes/${editingClass.id}`, payload);
        toast.success("Class updated");
      } else {
        await api.post("/classes", payload);
        toast.success("Class created");
      }
      setClassDialog(false);
      setEditingClass(null);
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/sessions", {
        classId: String(form.get("classId") ?? ""),
        trainerId: String(form.get("trainerId") ?? ""),
        facilityId: String(form.get("facilityId") ?? ""),
        startsAt: new Date(String(form.get("startsAt") ?? "")).toISOString(),
        endsAt: new Date(String(form.get("endsAt") ?? "")).toISOString(),
      });
      toast.success("Session scheduled");
      setSessionDialog(false);
      await refetchSessions();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancelSession(session: ClassSession) {
    try {
      await api.post(`/sessions/${session.id}/cancel`, { reason: "Cancelled from schedule" });
      toast.success("Session cancelled — enrolled members notified");
      await refetchSessions();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollDialog) return;
    setBusy(true);
    try {
      await api.post("/enrollments", {
        memberId: isMember ? myMemberId : enrollMemberId,
        sessionId: enrollDialog.id,
      });
      toast.success("Enrolled successfully");
      setEnrollDialog(null);
      setEnrollMemberId("");
      await refetchSessions();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnrollment(session: ClassSession) {
    try {
      const list = await fetch(
        `/api/v1/enrollments?sessionId=${session.id}&limit=100`,
        { credentials: "include" },
      ).then((r) => r.json());
      const mine = (list.data as { id: string; memberId: string; status: string }[]).find(
        (en) => en.status === "ENROLLED" && (isMember ? en.memberId === myMemberId : false),
      );
      if (!mine) {
        toast.error("No enrollment found to cancel");
        return;
      }
      await api.post(`/enrollments/${mine.id}/cancel`);
      toast.success("Enrollment cancelled");
      await refetchSessions();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Classes"
        description={
          isMember
            ? "Browse the catalog and enroll in upcoming sessions"
            : "Class catalog and upcoming session schedule"
        }
        actions={
          <>
            {canWriteSessions ? (
              <Button
                variant="outline"
                onClick={() => setSessionDialog(true)}
              >
                <CalendarPlus className="size-4" aria-hidden />
                Schedule session
              </Button>
            ) : null}
            {canWriteClasses ? (
              <Button
                onClick={() => {
                  setEditingClass(null);
                  setClassDialog(true);
                }}
              >
                <Plus className="size-4" aria-hidden />
                New class
              </Button>
            ) : null}
          </>
        }
      />

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="schedule">
            Upcoming sessions{sessions.length ? ` (${sessions.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          {loading ? (
            <LoadingState label="Loading classes…" />
          ) : error ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : classes.length === 0 ? (
            <EmptyState
              icon={<Dumbbell className="size-5" />}
              title="No classes yet"
              description="Create a class to start scheduling sessions."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <Card key={c.id} className="shadow-soft">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.category}</p>
                      </div>
                      <StatusBadge tone={c.isActive ? "success" : "neutral"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </div>
                    {c.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {c.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Capacity {c.capacity} · {c.upcomingSessions ?? 0} upcoming
                      </span>
                      {canWriteClasses ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingClass(c);
                            setClassDialog(true);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                          Edit
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          {sessions.length === 0 ? (
            <EmptyState
              title="No upcoming sessions"
              description="Sessions scheduled by staff or trainers will appear here."
            />
          ) : (
            <Card className="shadow-soft">
              <CardContent className="divide-y divide-border p-0">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{s.class.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(s.startsAt)} · {formatTimeRange(s.startsAt, s.endsAt)} ·{" "}
                        {fullName(s.trainer.user)} · {s.facility.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s._count?.enrollments ?? 0}/{s.class.capacity} enrolled
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={sessionTone(s.status)}>{s.status}</StatusBadge>
                      {isMember && s.status === "SCHEDULED" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setEnrollDialog(s);
                            }}
                          >
                            Enroll
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelEnrollment(s)}
                          >
                            Cancel enrollment
                          </Button>
                        </>
                      ) : null}
                      {canWriteSessions && s.status === "SCHEDULED" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelSession(s)}
                        >
                          Cancel session
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Class create/edit */}
      <Dialog
        open={classDialog}
        onOpenChange={(o) => {
          setClassDialog(o);
          if (!o) setEditingClass(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit class" : "New class"}</DialogTitle>
            <DialogDescription>
              Classes define the activity; sessions schedule them in time and space.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveClass} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Name</Label>
              <Input
                id="class-name"
                name="name"
                required
                maxLength={80}
                defaultValue={editingClass?.name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-category">Category</Label>
              <Input
                id="class-category"
                name="category"
                required
                maxLength={50}
                placeholder="Strength, Yoga, Cardio…"
                defaultValue={editingClass?.category ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-capacity">Capacity</Label>
              <Input
                id="class-capacity"
                name="capacity"
                type="number"
                min={1}
                max={100}
                required
                defaultValue={editingClass?.capacity ?? 12}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-description">Description</Label>
              <Input
                id="class-description"
                name="description"
                maxLength={500}
                defaultValue={editingClass?.description ?? ""}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClassDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : editingClass ? "Save changes" : "Create class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Session schedule */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule session</DialogTitle>
            <DialogDescription>
              Trainer and facility must be free — double-booking is rejected (R5).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveSession} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-class">Class</Label>
              <select
                id="session-class"
                name="classId"
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a class…</option>
                {classes
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-trainer">Trainer</Label>
              <select
                id="session-trainer"
                name="trainerId"
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a trainer…</option>
                {trainers
                  .filter((t) => t.status === "ACTIVE")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {fullName(t.user)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-facility">Facility</Label>
              <select
                id="session-facility"
                name="facilityId"
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a facility…</option>
                {facilities
                  .filter((f) => f.status === "ACTIVE")
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (cap. {f.capacity})
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-start">Starts</Label>
                <Input id="session-start" name="startsAt" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-end">Ends</Label>
                <Input id="session-end" name="endsAt" type="datetime-local" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSessionDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Scheduling…" : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member enroll */}
      <Dialog open={Boolean(enrollDialog)} onOpenChange={(o) => !o && setEnrollDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll in {enrollDialog?.class.name}?</DialogTitle>
            <DialogDescription>
              {enrollDialog
                ? `${formatDateTime(enrollDialog.startsAt)} with ${fullName(enrollDialog.trainer.user)} at ${enrollDialog.facility.name}. An active membership is required.`
                : undefined}
            </DialogDescription>
          </DialogHeader>
          {!isMember ? (
            <div className="space-y-2">
              <Label htmlFor="enroll-member">Member</Label>
              <select
                id="enroll-member"
                value={enrollMemberId}
                onChange={(e) => setEnrollMemberId(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a member…</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.memberCode})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialog(null)}>
              Cancel
            </Button>
            <Button onClick={enroll} disabled={busy || (!isMember && !enrollMemberId)}>
              {busy ? "Enrolling…" : "Confirm enrollment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
