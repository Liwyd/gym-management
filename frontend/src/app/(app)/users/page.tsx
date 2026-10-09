"use client";

import { useState } from "react";
import { Pencil, Plus, Search, UserSquare2 } from "lucide-react";
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
import { StatusBadge, accountTone } from "@/components/shared/status-badge";
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
import { formatDate, fullName } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";
import type { AdminUser, Role } from "@/lib/types";

const ROLE_OPTIONS: Role[] = ["ADMIN", "MANAGER", "TRAINER", "RECEPTIONIST"];

export default function UsersPage() {
  const auth = useRequireAuth((a) => a.can("users:manage"));
  const canManage = auth.can("users:manage");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [userRole, setUserRole] = useState<Role>("RECEPTIONIST");

  const query = new URLSearchParams({ limit: "100" });
  if (search.trim()) query.set("search", search.trim());
  if (role !== "all") query.set("role", role);

  const { items, error, loading, refetch } = useListQuery<AdminUser>(
    canManage ? `/users?${query.toString()}` : null,
  );

  if (!auth.loading && !canManage) {
    return (
      <>
        <PageHeader title="Users" />
        <PermissionDenied message="User administration is restricted to administrators." />
      </>
    );
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") ?? "").trim(),
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim() || undefined,
      role: userRole,
      ...(form.get("password")
        ? { password: String(form.get("password") ?? "") }
        : {}),
    };
    try {
      if (editing) {
        const { email: _email, password: _password, ...update } = payload;
        void _email;
        void _password;
        await api.patch(`/users/${editing.id}`, update);
        toast.success("User updated");
      } else {
        await api.post("/users", payload);
        toast.success("User created");
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

  async function toggleStatus() {
    if (!toggleTarget) return;
    try {
      await api.patch(`/users/${toggleTarget.id}`, {
        status: toggleTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      toast.success(
        toggleTarget.status === "ACTIVE" ? "Account deactivated" : "Account reactivated",
      );
      setToggleTarget(null);
      await refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Staff accounts, roles and access status"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setUserRole("RECEPTIONIST");
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            New user
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
            aria-label="Search users"
            placeholder="Search by name or email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by role">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<UserSquare2 className="size-5" />}
          title="No users found"
          description="Create staff accounts so they can sign in."
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{fullName(u)}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={u.role === "ADMIN" ? "primary" : "neutral"}>
                        {u.role}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={accountTone(u.status)}>{u.status}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(u);
                            setUserRole(u.role);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={u.id === auth.user?.id}
                          onClick={() => setToggleTarget(u)}
                        >
                          {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
            <DialogDescription>
              Trainers automatically receive a trainer profile. MEMBER accounts are created
              through the Members screen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-first">First name</Label>
                <Input
                  id="user-first"
                  name="firstName"
                  required
                  maxLength={60}
                  defaultValue={editing?.firstName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-last">Last name</Label>
                <Input
                  id="user-last"
                  name="lastName"
                  required
                  maxLength={60}
                  defaultValue={editing?.lastName ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                name="email"
                type="email"
                required
                disabled={Boolean(editing)}
                defaultValue={editing?.email ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <Select value={userRole} onValueChange={(v) => setUserRole(v as Role)}>
                  <SelectTrigger id="user-role" aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-phone">Phone</Label>
                <Input
                  id="user-phone"
                  name="phone"
                  maxLength={30}
                  defaultValue={editing?.phone ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">
                {editing ? "New password (optional)" : "Password"}
              </Label>
              <Input
                id="user-password"
                name="password"
                type="password"
                required={!editing}
                minLength={8}
                autoComplete="new-password"
                placeholder={editing ? "Leave blank to keep current" : "At least 8 chars"}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(o) => {
          if (!o) setToggleTarget(null);
        }}
        title={toggleTarget?.status === "ACTIVE" ? "Deactivate account?" : "Reactivate account?"}
        description={
          toggleTarget?.status === "ACTIVE"
            ? `${fullName(toggleTarget)} will no longer be able to sign in.`
            : `${toggleTarget ? fullName(toggleTarget) : ""} will be able to sign in again.`
        }
        confirmLabel={toggleTarget?.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
        destructive={toggleTarget?.status === "ACTIVE"}
        onConfirm={toggleStatus}
      />
    </>
  );
}
