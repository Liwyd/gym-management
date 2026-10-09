"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CreditCard,
  Dumbbell,
  IndianRupee,
  Timer,
  Users,
} from "lucide-react";
import { useRequireAuth } from "@/components/auth/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared/states";
import { StatusBadge, membershipTone, sessionTone } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@/lib/use-query";
import {
  formatDateTime,
  formatMoney,
  formatMonth,
  formatTimeRange,
} from "@/lib/format";
import type {
  DashboardData,
  MemberDashboard,
  StaffDashboard,
  TrainerDashboard,
} from "@/lib/types";

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionRow({
  session,
}: {
  session: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    class: { name: string; category: string };
    trainer?: { user: { firstName: string; lastName: string } };
    facility?: { name: string };
    _count?: { enrollments: number };
    enrolledCount?: number;
  };
}) {
  const enrolled = session.enrolledCount ?? session._count?.enrollments ?? 0;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {session.class.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDateTime(session.startsAt)} · {formatTimeRange(session.startsAt, session.endsAt)}
          {session.trainer
            ? ` · ${session.trainer.user.firstName} ${session.trainer.user.lastName}`
            : ""}
          {session.facility ? ` · ${session.facility.name}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted-foreground">{enrolled} enrolled</span>
        <StatusBadge tone={sessionTone(session.status)}>{session.status}</StatusBadge>
      </div>
    </li>
  );
}

function StaffDashboardView({ data }: { data: StaffDashboard }) {
  const maxRevenue = Math.max(...data.revenueByMonth.map((r) => r.total), 1);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" value={data.stats.totalMembers} icon={Users} />
        <StatCard
          label="Active memberships"
          value={data.stats.activeMemberships}
          icon={CreditCard}
          hint={`${data.stats.expiringSoon} expiring within 7 days`}
        />
        <StatCard
          label="Today's sessions"
          value={data.stats.todaysSessions}
          icon={CalendarDays}
          hint={`${data.stats.todaysAttendance} attendance marks`}
        />
        <StatCard
          label="Revenue this month"
          value={formatMoney(data.stats.monthRevenue)}
          icon={IndianRupee}
          hint={`${formatMoney(data.stats.weekRevenue)} in the last 7 days`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue — last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueByMonth.every((r) => r.total === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No completed payments in this period yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {data.revenueByMonth.map((row) => (
                  <li key={row.month} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
                      {formatMonth(row.month)}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max((row.total / maxRevenue) * 100, 2)}%` }}
                      />
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs font-medium text-foreground">
                      {formatMoney(row.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming sessions</CardTitle>
            <Link
              href="/classes"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View classes
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingSessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No upcoming sessions scheduled.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.upcomingSessions.slice(0, 5).map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expiring memberships</CardTitle>
          </CardHeader>
          <CardContent>
            {data.expiringMemberships.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No memberships expiring in the next 7 days.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.expiringMemberships.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {m.member.user.firstName} {m.member.user.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.member.memberCode} · {m.plan.name}
                      </p>
                    </div>
                    <StatusBadge tone={membershipTone(m.status)}>
                      ends {new Date(m.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recent activity recorded.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="py-2.5">
                    <p className="truncate text-sm text-foreground">{a.summary}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.actor} · {formatDateTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function TrainerDashboardView({ data }: { data: TrainerDashboard }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sessions today" value={data.stats.todaysSessions} icon={CalendarDays} />
        <StatCard label="Sessions this week" value={data.stats.weekSessions} icon={Timer} />
        <StatCard
          label="Pending attendance"
          value={data.stats.pendingAttendance}
          icon={Activity}
          hint="Started sessions without marks"
        />
        <StatCard label="Members seen" value={data.stats.memberCount} icon={Users} />
      </div>
      <Card className="mt-6 shadow-soft">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Your upcoming sessions</CardTitle>
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Record attendance
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </CardHeader>
        <CardContent>
          {data.upcomingSessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No upcoming sessions on your schedule.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.upcomingSessions.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MemberDashboardView({ data }: { data: MemberDashboard }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Membership"
          value={
            data.membership
              ? data.membership.derivedStatus === "ACTIVE"
                ? `${data.stats.daysLeft ?? 0} days left`
                : data.membership.derivedStatus
              : "No membership"
          }
          icon={CreditCard}
          hint={data.membership?.plan.name}
        />
        <StatCard
          label="Upcoming classes"
          value={data.stats.upcomingEnrollments}
          icon={Dumbbell}
        />
        <StatCard
          label="Unread notifications"
          value={data.stats.unreadNotifications}
          icon={Activity}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">My next classes</CardTitle>
            <Link
              href="/classes"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Browse classes
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {data.upcomingSessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                You are not enrolled in any upcoming classes.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.upcomingSessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent payments</CardTitle>
            <Link
              href="/payments"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {p.description ?? "Payment"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(p.paidAt)} · {p.method.replace("_", " ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {formatMoney(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  useRequireAuth();
  const { data, error, loading, refetch } = useQuery<DashboardData>("/dashboard");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of club activity at a glance"
      />
      {loading ? (
        <LoadingState label="Loading dashboard…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !data ? (
        <EmptyState title="No dashboard data" description="Try refreshing the page." />
      ) : data.role === "MEMBER" ? (
        <MemberDashboardView data={data as MemberDashboard} />
      ) : data.role === "TRAINER" ? (
        <TrainerDashboardView data={data as TrainerDashboard} />
      ) : (
        <StaffDashboardView data={data as StaffDashboard} />
      )}
    </>
  );
}
