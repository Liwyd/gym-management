"use client";

import { useState } from "react";
import { Pencil, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PermissionDenied,
} from "@/components/shared/states";
import { StatusBadge, accountTone } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { useListQuery } from "@/lib/use-query";
import { initials } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";
import type { Trainer } from "@/lib/types";

export default function TrainersPage() {
  const auth = useRequireAuth();
  const canList = auth.can("trainers:list");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [busy, setBusy] = useState(false);
  const [trainerStatus, setTrainerStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const { items, error, loading, refetch } = useListQuery<Trainer>(
    canList ? `/trainers?limit=100${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}` : null,
  );

  if (!auth.loading && !canList) {
    return (
      <>
        <PageHeader title="Trainers" />
        <PermissionDenied message="Trainers are visible to club staff only." />
      </>
    );
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.patch(`/trainers/${editing.id}`, {
        specialization: String(form.get("specialization") ?? "").trim() || null,
        bio: String(form.get("bio") ?? "").trim() || null,
        ...(auth.can("members:write") ? { status: trainerStatus } : {}),
      });
      toast.success("Trainer updated");
      setEditing(null);
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
        title="Trainers"
        description="Coaches on staff and their specializations"
      />

      <div className="relative mb-4 max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          aria-label="Search trainers"
          placeholder="Search trainers…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading trainers…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<UserRound className="size-5" />}
          title="No trainers found"
          description="Trainer accounts are created from the Users screen with the TRAINER role."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className="shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary-soft text-sm font-semibold text-primary-strong">
                      {initials(t.user.firstName, t.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {t.user.firstName} {t.user.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{t.user.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={accountTone(t.status)}>{t.status}</StatusBadge>
                      {t.specialization ? (
                        <StatusBadge tone="primary">{t.specialization}</StatusBadge>
                      ) : null}
                      {typeof t.upcomingSessions === "number" ? (
                        <span className="text-xs text-muted-foreground">
                          {t.upcomingSessions} upcoming
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {t.bio ? (
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{t.bio}</p>
                ) : null}
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTrainerStatus(t.status);
                      setEditing(t);
                    }}
                  >
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editing ? `${editing.user.firstName} ${editing.user.lastName}` : "trainer"}
            </DialogTitle>
            <DialogDescription>
              Trainers can edit their own specialization and bio (R8).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trainer-spec">Specialization</Label>
              <Input
                id="trainer-spec"
                name="specialization"
                maxLength={120}
                defaultValue={editing?.specialization ?? ""}
                placeholder="Yoga, Strength, Boxing…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainer-bio">Bio</Label>
              <Textarea
                id="trainer-bio"
                name="bio"
                maxLength={1000}
                rows={4}
                defaultValue={editing?.bio ?? ""}
              />
            </div>
            {auth.can("members:write") ? (
              <div className="space-y-2">
                <Label htmlFor="trainer-status">Account status</Label>
                <Select
                  value={trainerStatus}
                  onValueChange={(v) => setTrainerStatus(v as "ACTIVE" | "INACTIVE")}
                >
                  <SelectTrigger id="trainer-status" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
