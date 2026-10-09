"use client";

import { useState, type FormEvent } from "react";
import { GraduationCap, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useListQuery } from "@/lib/use-query";
import { formatDuration, formatMoney } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";
import type { MembershipPlan } from "@/lib/types";

export default function PlansPage() {
  const auth = useRequireAuth();
  const canWrite = auth.can("plans:write");
  const { items, error, loading, refetch } = useListQuery<MembershipPlan>(
    auth.user ? "/plans?limit=100&includeInactive=true" : null,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<MembershipPlan | null>(null);

  if (!auth.loading && !auth.user) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim() || undefined,
      durationDays: Number(form.get("durationDays") ?? 0),
      price: Number(form.get("price") ?? 0),
    };
    try {
      if (editing) {
        await api.patch(`/plans/${editing.id}`, payload);
        toast.success("Plan updated");
      } else {
        await api.post("/plans", payload);
        toast.success("Plan created");
      }
      setDialogOpen(false);
      setEditing(null);
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!toggleTarget) return;
    try {
      await api.patch(`/plans/${toggleTarget.id}`, { isActive: !toggleTarget.isActive });
      toast.success(toggleTarget.isActive ? "Plan deactivated" : "Plan activated");
      setToggleTarget(null);
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Membership plans"
        description="Pricing and duration options offered by the club"
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              New plan
            </Button>
          ) : null
        }
      />

      {loading ? (
        <LoadingState label="Loading plans…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-5" />}
          title="No plans configured"
          description="Create your first membership plan."
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active members</TableHead>
                  <TableHead>Status</TableHead>
                  {canWrite ? <TableHead aria-label="Actions" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{p.name}</p>
                      {p.description ? (
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{formatDuration(p.durationDays)}</TableCell>
                    <TableCell className="text-sm font-semibold">
                      {formatMoney(p.price)}
                    </TableCell>
                    <TableCell className="text-sm">{p._count?.memberships ?? 0}</TableCell>
                    <TableCell>
                      <StatusBadge tone={p.isActive ? "success" : "neutral"}>
                        {p.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(p);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setToggleTarget(p)}
                          >
                            {p.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {canWrite ? (
        <Dialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit plan" : "New plan"}</DialogTitle>
              <DialogDescription>
                Duration is stored in days; the membership end date is start + duration (R1).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Name</Label>
                <Input
                  id="plan-name"
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={editing?.name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-description">Description</Label>
                <Input
                  id="plan-description"
                  name="description"
                  maxLength={500}
                  defaultValue={editing?.description ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-duration">Duration (days)</Label>
                  <Input
                    id="plan-duration"
                    name="durationDays"
                    type="number"
                    min={1}
                    max={3660}
                    required
                    defaultValue={editing?.durationDays ?? 30}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-price">Price</Label>
                  <Input
                    id="plan-price"
                    name="price"
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    defaultValue={editing ? Number(editing.price) : 49.99}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Create plan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(o) => {
          if (!o) setToggleTarget(null);
        }}
        title={toggleTarget?.isActive ? "Deactivate plan?" : "Activate plan?"}
        description={
          toggleTarget?.isActive
            ? `${toggleTarget.name} will no longer be available for new purchases. Existing memberships are unaffected.`
            : `${toggleTarget?.name} will become available for new purchases.`
        }
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        destructive={Boolean(toggleTarget?.isActive)}
        onConfirm={toggleActive}
      />
    </>
  );
}
