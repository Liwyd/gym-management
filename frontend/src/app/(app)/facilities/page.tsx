"use client";

import { useState } from "react";
import { Building2, Pencil, Plus } from "lucide-react";
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
import { api, errorMessage } from "@/lib/api";
import type { Facility, FacilityType } from "@/lib/types";
const TYPE_LABELS: Record<FacilityType, string> = {
  GYM_FLOOR: "Gym floor",
  STUDIO: "Studio",
  POOL: "Pool",
  COURT: "Court",
};

export default function FacilitiesPage() {
  const auth = useRequireAuth();
  const canWrite = auth.can("facilities:write");
  const { items, error, loading, refetch } = useListQuery<Facility>(
    auth.user ? "/facilities?limit=100" : null,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [busy, setBusy] = useState(false);
  const [facType, setFacType] = useState<FacilityType>("STUDIO");

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      type: facType,
      capacity: Number(form.get("capacity") ?? 20),
      description: String(form.get("description") ?? "").trim() || null,
    };
    try {
      if (editing) {
        await api.patch(`/facilities/${editing.id}`, payload);
        toast.success("Facility updated");
      } else {
        await api.post("/facilities", payload);
        toast.success("Facility created");
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

  return (
    <>
      <PageHeader
        title="Facilities"
        description="Rooms and spaces where sessions take place"
        actions={
          canWrite ? (
            <Button
            onClick={() => {
              setEditing(null);
              setFacType("STUDIO");
              setDialogOpen(true);
            }}
            >
              <Plus className="size-4" aria-hidden />
              New facility
            </Button>
          ) : null
        }
      />

      {loading ? (
        <LoadingState label="Loading facilities…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="No facilities"
          description="Add rooms so sessions can be scheduled against them."
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  {canWrite ? <TableHead aria-label="Actions" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{f.name}</p>
                      {f.description ? (
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {TYPE_LABELS[f.type] ?? f.type}
                    </TableCell>
                    <TableCell className="text-sm">{f.capacity}</TableCell>
                    <TableCell>
                      <StatusBadge tone={f.status === "ACTIVE" ? "success" : "neutral"}>
                        {f.status}
                      </StatusBadge>
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(f);
                            setFacType(f.type);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                          Edit
                        </Button>
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
              <DialogTitle>{editing ? "Edit facility" : "New facility"}</DialogTitle>
              <DialogDescription>
                Facility capacity must be at least the capacity of classes scheduled there.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="facility-name">Name</Label>
                <Input
                  id="facility-name"
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={editing?.name ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facility-type">Type</Label>
                  <Select value={facType} onValueChange={(v) => setFacType(v as FacilityType)}>
                    <SelectTrigger id="facility-type" aria-label="Type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facility-capacity">Capacity</Label>
                  <Input
                    id="facility-capacity"
                    name="capacity"
                    type="number"
                    min={1}
                    max={1000}
                    required
                    defaultValue={editing?.capacity ?? 20}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facility-description">Description</Label>
                <Input
                  id="facility-description"
                  name="description"
                  maxLength={500}
                  defaultValue={editing?.description ?? ""}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Create facility"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
