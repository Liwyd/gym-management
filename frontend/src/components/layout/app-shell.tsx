"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
  CreditCard,
  Dumbbell,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Building2,
  Users,
  UserRound,
  UserSquare2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/auth-context";
import { initials, fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "TRAINER", "RECEPTIONIST", "MEMBER"] },
  { href: "/members", label: "Members", icon: Users, roles: ["ADMIN", "MANAGER", "RECEPTIONIST"] },
  { href: "/memberships", label: "Memberships", icon: CreditCard, roles: ["ADMIN", "MANAGER", "RECEPTIONIST"] },
  { href: "/my-membership", label: "My Membership", icon: CreditCard, roles: ["MEMBER"] },
  { href: "/plans", label: "Plans", icon: GraduationCap, roles: ["ADMIN", "MANAGER", "RECEPTIONIST"] },
  { href: "/classes", label: "Classes", icon: Dumbbell, roles: ["ADMIN", "MANAGER", "RECEPTIONIST", "MEMBER", "TRAINER"] },
  { href: "/attendance", label: "Attendance", icon: Activity, roles: ["ADMIN", "MANAGER", "TRAINER"] },
  { href: "/payments", label: "Payments", icon: CalendarDays, roles: ["ADMIN", "MANAGER", "RECEPTIONIST", "MEMBER"] },
  { href: "/trainers", label: "Trainers", icon: UserRound, roles: ["ADMIN", "MANAGER", "RECEPTIONIST"] },
  { href: "/facilities", label: "Facilities", icon: Building2, roles: ["ADMIN", "MANAGER"] },
  { href: "/users", label: "Users", icon: UserSquare2, roles: ["ADMIN"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "MANAGER", "TRAINER", "RECEPTIONIST", "MEMBER"] },
];

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  const items = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <nav aria-label="Main" className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-button">
        <Dumbbell className="size-4" aria-hidden />
      </span>
      <span className="text-base font-semibold tracking-tight text-foreground">
        PulseFit
      </span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary-strong">
              {initials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm md:inline">
            {fullName(user)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{fullName(user)}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </p>
          <Badge variant="outline" className="mt-1.5 text-[10px]">
            {user.role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationBadge() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () => {
      api
        .get<{ count: number }>("/notifications/unread-count")
        .then((res) => {
          if (!cancelled) setCount(res.count);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user, pathname]);

  if (!user || count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background-subtle">
        <p className="text-sm text-muted-foreground" role="status">
          Loading PulseFit…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh bg-background-subtle">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-4">
          <Brand />
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <Separator />
        <div className="p-3">
          <p className="px-2 text-[11px] tracking-wide text-muted-foreground uppercase">
            Signed in as
          </p>
          <p className="mt-1 truncate px-2 text-sm font-medium text-foreground">
            {fullName(user)}
          </p>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-40 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetHeader className="h-16 justify-center border-b border-sidebar-border px-4">
            <SheetTitle asChild>
              <Brand />
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-2 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6 lg:justify-between">
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">Sports club management</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/notifications"
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="Notifications"
            >
              <Bell className="size-5" aria-hidden />
              <NotificationBadge />
            </Link>
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function CloseIcon(props: React.ComponentProps<typeof X>) {
  return <X {...props} />;
}
