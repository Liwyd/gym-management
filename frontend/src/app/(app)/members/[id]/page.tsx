"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PermissionDenied,
} from "@/components/shared/states";
import {
  StatusBadge,
  accountTone,
  attendanceTone,
  membershipTone,
  paymentTone,
  sessionTone,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@/lib/use-query";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatDuration,
} from "@/lib/format";
import { api, errorMessage } from "@/lib/api";

interface MemberDetail {
  id: string;
  memberCode: string;
  status: "ACTIVE" | "INACTIVE";
  joinedAt: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContact: string | null;
  notes: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  memberships: {
    id: string;
    startDate: string;
    endDate: string;
    status: "ACTIVE" | "EXPIRED" | "CANCELLED";
    plan: { id: string; name: string; durationDays: number; price: number | string };
    payment: {
      id: string;
      amount: number | string;
      method: string;
      status: string;
      paidAt: string;
    } | null;
  }[];
  payments: {
    id: string;
    amount: number | string;
    type: string;
    method: string;
    status: string;
    description: string | null;
    paidAt: string;
  }[];
  enrollments: {
    id: string;
    status: string;
    enrolledAt: string;
    session: {
      id: string;
      startsAt: string;
      endsAt: string;
      status: string;
      class: { name: string };
      trainer: { user: { firstName: string; lastName: string } };
    };
    attendance: { status: string; recordedAt: string } | null;
  }[];
  attendanceSummary?: { status: string; count: number }[];
}

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const auth = useRequireAuth();
  const { data, error, loading, refetch } = useQuery<MemberDetail>(
    auth.user ? `/members/${id}` : null,
  );
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!auth.loading && !auth.can("members:list") && auth.user?.role !== "MEMBER") {
    return (
      <>
        <PageHeader title="Member" />
        <PermissionDenied />
      </>
    );
  }

  if (loading) return <LoadingState label="Loading member…" />;
  if (error)
    return (
      <>
        <PageHeader title="Member" />
        <ErrorState message={error.message} onRetry={refetch} />
      </>
    );
  if (!data)
    return (
      <>
        <PageHeader title="Member" />
        <EmptyState title="Member not found" />
      </>
    );

  const canEdit = auth.can("members:write");

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.patch(`/members/${id}`, {
        phone: String(form.get("phone") ?? "").trim() || null,
        address: String(form.get("address") ?? "").trim() || null,
        emergencyContact: String(form.get("emergencyContact") ?? "").trim() || null,
        notes: String(form.get("notes") ?? "").trim() || null,
        gender: String(form.get("gender") ?? "").trim() || null,
      });
      toast.success("Member updated");
      setEditing(false);
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
          <Link href="/members">
            <ArrowLeft className="size-4" aria-hidden />
            Back to members
          </Link>
        </Button>
      </div>
      <PageHeader
        title={`${data.user.firstName} ${data.user.lastName}`}
        description={`${data.memberCode} · joined ${formatDate(data.joinedAt)}`}
        actions={
          <>
            <StatusBadge tone={accountTone(data.status)}>{data.status}</StatusBadge>
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing((v) => !v)}
              >
                <Pencil className="size-4" aria-hidden />
                {editing ? "Close editor" : "Edit profile"}
              </Button>
            ) : null}
            {auth.can("memberships:manage") ? (
              <Button asChild size="sm">
                <Link href={`/memberships/new?memberId=${data.id}`}>
                  <CreditCard className="size-4" aria-hidden />
                  Sell membership
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {editing ? (
        <Card className="mb-6 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Edit profile</CardTitle>
            <CardDescription>Contact details and staff notes</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={data.user.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Input id="gender" name="gender" defaultValue={data.gender ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={data.address ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency contact</Label>
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  defaultValue={data.emergencyContact ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" defaultValue={data.notes ?? ""} />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" size="sm" disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="mt-1 truncate text-sm font-medium text-foreground">
              {data.user.email}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {data.user.phone ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Emergency contact</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {data.emergencyContact ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="memberships">
        <TabsList>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="enrollments">Class enrollments</TabsTrigger>
        </TabsList>

        <TabsContent value="memberships" className="mt-4">
          {data.memberships.length === 0 ? (
            <EmptyState
              title="No memberships yet"
              description="Sell a membership plan to activate this member."
            />
          ) : (
            <Card className="shadow-soft">
              <CardContent className="divide-y divide-border p-0">
                {data.memberships.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(m.plan.durationDays)} · {formatMoney(m.plan.price)} ·{" "}
                        {formatDate(m.startDate)} → {formatDate(m.endDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.payment ? (
                        <StatusBadge tone={paymentTone(m.payment.status)}>
                          payment {m.payment.status.toLowerCase()}
                        </StatusBadge>
                      ) : null}
                      <StatusBadge tone={membershipTone(m.status)}>{m.status}</StatusBadge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {data.payments.length === 0 ? (
            <EmptyState title="No payments recorded" />
          ) : (
            <Card className="shadow-soft">
              <CardContent className="divide-y divide-border p-0">
                {data.payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {p.description ?? p.type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(p.paidAt)} · {p.method.replace("_", " ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatMoney(p.amount)}</span>
                      <StatusBadge tone={paymentTone(p.status)}>{p.status}</StatusBadge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          {data.enrollments.length === 0 ? (
            <EmptyState title="No class enrollments" />
          ) : (
            <Card className="shadow-soft">
              <CardContent className="divide-y divide-border p-0">
                {data.enrollments.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {e.session.class.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(e.session.startsAt)} · trainer{" "}
                        {e.session.trainer.user.firstName} {e.session.trainer.user.lastName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {e.attendance ? (
                        <StatusBadge tone={attendanceTone(e.attendance.status)}>
                          {e.attendance.status}
                        </StatusBadge>
                      ) : null}
                      <StatusBadge tone={sessionTone(e.session.status)}>
                        {e.session.status}
                      </StatusBadge>
                      <StatusBadge tone={e.status === "ENROLLED" ? "primary" : "neutral"}>
                        {e.status}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
