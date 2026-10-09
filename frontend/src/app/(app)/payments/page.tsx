"use client";

import { useMemo, useState } from "react";
import { CreditCard, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge, paymentTone } from "@/components/shared/status-badge";
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
import { formatDateTime, formatMoney, fullName } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";
import type { Payment } from "@/lib/types";

interface MemberOption {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
}

export default function PaymentsPage() {
  const auth = useRequireAuth();
  const isMember = auth.user?.role === "MEMBER";
  const canWrite = auth.can("payments:write");
  const canRefund = auth.can("payments:refund");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [payMemberId, setPayMemberId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState("CLASS_FEE");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payDescription, setPayDescription] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status !== "all") params.set("status", status);
    if (!isMember && search.trim()) params.set("search", search.trim());
    return `/payments?${params.toString()}`;
  }, [page, status, search, isMember]);

  const { items, meta, error, loading, refetch } = useListQuery<Payment>(
    auth.user ? query : null,
  );
  const { items: members } = useListQuery<MemberOption>(
    canWrite ? "/members?limit=100" : null,
  );

  const filtered = isMember
    ? items
    : items;

  async function recordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/payments", {
        memberId: payMemberId,
        amount: Number(payAmount),
        type: payType,
        method: payMethod,
        description: payDescription.trim() || undefined,
      });
      toast.success("Payment recorded");
      setDialogOpen(false);
      setPayMemberId("");
      setPayAmount("");
      setPayDescription("");
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function refund() {
    if (!refundTarget) return;
    setBusy(true);
    try {
      await api.post(`/payments/${refundTarget.id}/refund`);
      toast.success("Payment refunded");
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
        title={isMember ? "My payments" : "Payments"}
        description={
          isMember
            ? "Your payment history at the club"
            : "Record class fees and other charges; refund completed payments"
        }
        actions={
          canWrite ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Record payment
            </Button>
          ) : null
        }
      />

      {!isMember ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Search payments"
              placeholder="Search by member code, name or description…"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Loading payments…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-5" />}
          title="No payments found"
          description={isMember ? undefined : "Record a payment or sell a membership."}
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isMember ? <TableHead>Member</TableHead> : null}
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  {canRefund ? <TableHead aria-label="Actions" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    {!isMember ? (
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {fullName(p.member.user)}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {p.member.memberCode}
                        </p>
                      </TableCell>
                    ) : null}
                    <TableCell className="font-semibold">
                      {formatMoney(p.amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.type === "MEMBERSHIP_PURCHASE"
                        ? "Membership"
                        : p.type === "CLASS_FEE"
                          ? "Class fee"
                          : p.description ?? "Other"}
                    </TableCell>
                    <TableCell className="text-sm">{p.method.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(p.paidAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={paymentTone(p.status)}>{p.status}</StatusBadge>
                    </TableCell>
                    {canRefund ? (
                      <TableCell>
                        {p.status === "COMPLETED" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRefundTarget(p)}
                          >
                            Refund
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
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

      {/* Record payment */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Membership purchases go through the Sell membership flow instead.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={recordPayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-member">Member</Label>
              <select
                id="pay-member"
                required
                value={payMemberId}
                onChange={(e) => setPayMemberId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.memberCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Amount</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-method">Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger id="pay-method" aria-label="Method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-type">Type</Label>
              <Select value={payType} onValueChange={setPayType}>
                <SelectTrigger id="pay-type" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASS_FEE">Class fee</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-description">Description</Label>
              <Input
                id="pay-description"
                maxLength={300}
                value={payDescription}
                onChange={(e) => setPayDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !payMemberId || !payAmount}>
                {busy ? "Saving…" : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(refundTarget)}
        onOpenChange={(o) => {
          if (!o) setRefundTarget(null);
        }}
        title="Refund payment?"
        description={
          refundTarget
            ? `${formatMoney(refundTarget.amount)} will be marked as refunded. Linked memberships are cancelled automatically.`
            : undefined
        }
        confirmLabel="Refund"
        destructive
        loading={busy}
        onConfirm={refund}
      />
    </>
  );
}
