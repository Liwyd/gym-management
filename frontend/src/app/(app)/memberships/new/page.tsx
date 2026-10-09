"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PermissionDenied,
} from "@/components/shared/states";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListQuery } from "@/lib/use-query";
import { formatDate, formatDuration, formatMoney } from "@/lib/format";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Membership, MembershipPlan } from "@/lib/types";

interface MemberOption {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function NewMembershipPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading form…" />}>
      <NewMembershipForm />
    </Suspense>
  );
}

function NewMembershipForm() {
  const auth = useRequireAuth((a) => a.can("memberships:manage"));
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetMember = searchParams.get("memberId");

  const [memberId, setMemberId] = useState(presetMember ?? "");
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState("CASH");
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canManageStaff = auth.user?.role !== "MEMBER";
  const { items: members, loading: membersLoading } = useListQuery<MemberOption>(
    canManageStaff ? "/members?limit=100" : null,
  );
  const { items: plans, loading: plansLoading, error: plansError, refetch } =
    useListQuery<MembershipPlan>("/plans?limit=100");

  useEffect(() => {
    if (!planId && plans.length > 0) {
      const active = plans.find((p) => p.isActive);
      if (active) setPlanId(active.id);
    }
  }, [plans, planId]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId],
  );

  if (!auth.loading && !auth.can("memberships:manage")) {
    return (
      <>
        <PageHeader title="Sell membership" />
        <PermissionDenied />
      </>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFieldErrors({});
    try {
      const res = await api.post<{ membership: Membership }>("/memberships", {
        memberId,
        planId,
        method,
        startDate: startDate ? new Date(`${startDate}T00:00:00.000Z`).toISOString() : undefined,
      });
      toast.success("Membership activated");
      router.push(`/members/${res.membership.memberId}`);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        const mapped: Record<string, string> = {};
        for (const d of err.details as { path?: string[]; message?: string }[]) {
          if (d.path?.length) mapped[d.path.join(".")] = d.message ?? "Invalid";
        }
        setFieldErrors(mapped);
      }
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  if (auth.loading || membersLoading || plansLoading) {
    return (
      <>
        <PageHeader title="Sell membership" />
        <LoadingState label="Loading form…" />
      </>
    );
  }
  if (plansError) {
    return (
      <>
        <PageHeader title="Sell membership" />
        <ErrorState message={plansError.message} onRetry={refetch} />
      </>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
          <Link href="/memberships">
            <ArrowLeft className="size-4" aria-hidden />
            Back to memberships
          </Link>
        </Button>
      </div>
      <PageHeader
        title="Sell membership"
        description="Activates immediately through a completed payment (R1)"
      />
      <Card className="max-w-xl shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Purchase details</CardTitle>
          <CardDescription>
            A member can only hold one active membership at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="member">Member</Label>
              <Select value={memberId} onValueChange={setMemberId} required>
                <SelectTrigger id="member" aria-label="Member">
                  <SelectValue placeholder="Select a member…" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.memberCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.memberId ? (
                <p className="text-xs text-destructive">{fieldErrors.memberId}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={planId} onValueChange={setPlanId} required>
                <SelectTrigger id="plan" aria-label="Plan">
                  <SelectValue placeholder="Select a plan…" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={!p.isActive}>
                      {p.name} — {formatDuration(p.durationDays)} · {formatMoney(p.price)}
                      {!p.isActive ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.planId ? (
                <p className="text-xs text-destructive">{fieldErrors.planId}</p>
              ) : null}
              {selectedPlan ? (
                <p className="text-xs text-muted-foreground">
                  Ends {formatDate(new Date(Date.now() + selectedPlan.durationDays * 86_400_000))} ·
                  charges {formatMoney(selectedPlan.price)}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="method">Payment method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="method" aria-label="Payment method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date (optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={busy || !memberId || !planId}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Processing…
                  </>
                ) : (
                  "Confirm purchase"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
