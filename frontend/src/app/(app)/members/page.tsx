"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PermissionDenied,
} from "@/components/shared/states";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge, membershipTone, accountTone } from "@/components/shared/status-badge";
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
import { formatDate } from "@/lib/format";

export interface MemberListItem {
  id: string;
  memberCode: string;
  status: "ACTIVE" | "INACTIVE";
  joinedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  activeMembership: {
    id: string;
    planName: string;
    endDate: string;
    status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  } | null;
}

export default function MembersPage() {
  const auth = useRequireAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    return `/members?${params.toString()}`;
  }, [page, search, status]);

  const { items, meta, error, loading, refetch } = useListQuery<MemberListItem>(
    auth.can("members:list") ? query : null,
  );

  if (!auth.loading && !auth.can("members:list")) {
    return (
      <>
        <PageHeader title="Members" />
        <PermissionDenied message="Only club staff can view the member directory." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Members"
        description="Registered club members and their memberships"
        actions={
          auth.can("members:write") ? (
            <Button asChild>
              <Link href="/members/new">
                <Plus className="size-4" aria-hidden />
                Add member
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search members"
            placeholder="Search by name, email or member code…"
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
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Loading members…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No members found"
          description={
            search || status !== "all"
              ? "Try adjusting your search or filters."
              : "Register your first member to get started."
          }
          action={
            auth.can("members:write") && !search && status === "all" ? (
              <Button asChild size="sm">
                <Link href="/members/new">Add member</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.memberCode}</TableCell>
                    <TableCell>
                      {m.activeMembership ? (
                        <>
                          <p className="text-sm">{m.activeMembership.planName}</p>
                          <StatusBadge tone={membershipTone(m.activeMembership.status)}>
                            until {formatDate(m.activeMembership.endDate)}
                          </StatusBadge>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={accountTone(m.status)}>{m.status}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(m.joinedAt)}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/members/${m.id}`}>View</Link>
                      </Button>
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
    </>
  );
}
