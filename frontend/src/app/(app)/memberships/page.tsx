"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PermissionDenied,
} from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge, membershipTone, paymentTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useListQuery } from "@/lib/use-query";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";
import type { Membership } from "@/lib/types";

export default function MembershipsPage() {
  const auth = useRequireAuth();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<Membership | null>(null);
  const [busy, setBusy] = useState(false);

  const canManage = auth.can("memberships:manage") && auth.user?.role !== "MEMBER";
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status !== "all") params.set("status", status);
    return `/memberships?${params.toString()}`;
  }, [page, status]);

  const { items, meta, error, loading, refetch } = useListQuery<Membership>(
    canManage ? query : null,
  );

  if (!auth.loading && !canManage) {
    return (
      <>
        <PageHeader title="Memberships" />
        <PermissionDenied message="Only staff can manage memberships." />
      </>
    );
  }

  const filtered = search.trim()
    ? items.filter((m) => {
        const q = search.trim().toLowerCase();
        return (
          m.member.memberCode.toLowerCase().includes(q) ||
          m.member.user.firstName.toLowerCase().includes(q) ||
          m.member.user.lastName.toLowerCase().includes(q) ||
          m.member.user.email.toLowerCase().includes(q) ||
          m.plan.name.toLowerCase().includes(q)
        );
      })
    : items;

  async function refundMembership() {
    if (!refundTarget) return;
    setBusy(true);
    try {
      await api.patch(`/memberships/${refundTarget.id}`, {
        refund: true,
        reason: "Refunded from memberships screen",
      });
      toast.success("Membership cancelled and payment refunded");
      setRefundTarget(null);
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Memberships"
        description="Sell, track and cancel member subscriptions"
        actions={
          <Button asChild>
            <Link href="/memberships/new">
              <Plus className="size-4" aria-hidden />
              Sell membership
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Filter memberships"
            placeholder="Filter by member or plan…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Loading memberships…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-5" />}
          title="No memberships found"
          description="Sell a membership plan to a member to get started."
          action={
            <Button asChild size="sm">
              <Link href="/memberships/new">Sell membership</Link>
            </Button>
          }
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {fullName(m.member.user)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {m.member.memberCode}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{m.plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(m.plan.price)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(m.startDate)} → {formatDate(m.endDate)}
                    </TableCell>
                    <TableCell>
                      {m.payment ? (
                        <StatusBadge tone={paymentTone(m.payment.status)}>
                          {formatMoney(m.payment.amount)}
                        </StatusBadge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={membershipTone(m.status)}>{m.status}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      {m.status === "ACTIVE" && auth.can("memberships:refund") ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRefundTarget(m)}
                        >
                          Cancel &amp; refund
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {meta ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(refundTarget)}
        onOpenChange={(o) => {
          if (!o) setRefundTarget(null);
        }}
        title="Cancel membership?"
        description={
          refundTarget
            ? `This cancels ${fullName(refundTarget.member.user)}'s ${refundTarget.plan.name} membership and refunds the linked payment.`
            : undefined
        }
        confirmLabel="Cancel & refund"
        destructive
        loading={busy}
        onConfirm={refundMembership}
      />
    </>
  );
}
