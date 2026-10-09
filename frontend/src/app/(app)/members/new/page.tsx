"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/components/auth/auth-context";
import { PageHeader, PermissionDenied } from "@/components/shared/states";
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
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Member } from "@/lib/types";

export default function NewMemberPage() {
  const auth = useRequireAuth((a) => a.can("members:write"));
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!auth.loading && !auth.can("members:write")) {
    return (
      <>
        <PageHeader title="Add member" />
        <PermissionDenied message="Only staff can register new members." />
      </>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim() || undefined,
      dateOfBirth: String(form.get("dateOfBirth") ?? "") || undefined,
      gender: String(form.get("gender") ?? "").trim() || undefined,
      address: String(form.get("address") ?? "").trim() || undefined,
      emergencyContact: String(form.get("emergencyContact") ?? "").trim() || undefined,
    };

    try {
      const res = await api.post<{ member: Member }>("/members", payload);
      toast.success(`Member ${res.member.memberCode} registered`);
      router.push(`/members/${res.member.id}`);
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

  return (
    <>
      <PageHeader
        title="Add member"
        description="Create a member account — a unique member code is generated automatically"
      />
      <Card className="max-w-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Member details</CardTitle>
          <CardDescription>
            Login credentials are required so the member can sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required maxLength={60} />
              {fieldErrors.firstName ? (
                <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required maxLength={60} />
              {fieldErrors.lastName ? (
                <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
              {fieldErrors.email ? (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 chars with a letter and number"
              />
              {fieldErrors.password ? (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" maxLength={30} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Input id="gender" name="gender" maxLength={30} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency contact</Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                maxLength={200}
                placeholder="Name and phone"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" maxLength={200} />
            </div>

            <div className="flex gap-3 pt-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  "Create member"
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
