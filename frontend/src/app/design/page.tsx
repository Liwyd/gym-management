"use client";

import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Info,
  MoreHorizontal,
  Plus,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] leading-6 font-semibold">{title}</h2>
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          {description}
        </p>
      </div>
      <Card className="shadow-soft">
        <CardContent className="flex flex-wrap items-start gap-4 p-6">
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

const swatches: { token: string; value: string; cls: string }[] = [
  { token: "primary", value: "#2563EB", cls: "bg-primary" },
  { token: "primary-strong", value: "#1D4ED8", cls: "bg-primary-strong" },
  { token: "primary-soft", value: "#EAF1FE", cls: "bg-primary-soft" },
  { token: "foreground", value: "#0B1B3F", cls: "bg-foreground" },
  { token: "background-subtle", value: "#F6F9FE", cls: "bg-background-subtle" },
  { token: "border", value: "#E3EAF6", cls: "bg-border" },
  { token: "success", value: "#16A34A", cls: "bg-success" },
  { token: "warning", value: "#D97706", cls: "bg-warning" },
  { token: "destructive", value: "#DC2626", cls: "bg-destructive" },
  { token: "info", value: "#0284C7", cls: "bg-info" },
];

const members = [
  { name: "Liam Foster", code: "MB-2026-001", plan: "Monthly Core", state: "Active" },
  { name: "Olivia Chen", code: "MB-2026-002", plan: "Quarterly Pro", state: "Expiring" },
  { name: "Emma Silva", code: "MB-2026-004", plan: "—", state: "Expired" },
];

export default function DesignPreview() {
  const [checked, setChecked] = useState(true);

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
          Stage 6 · Design system preview
        </p>
        <h1 className="text-[30px] leading-[38px] font-semibold">
          PulseFit design system
        </h1>
        <p className="max-w-[72ch] text-[15px] text-foreground-body">
          Every token, type step, and component the product UI is built from.
          Source of truth:{" "}
          <span className="font-medium text-primary">
            docs/prototype/design-tokens.md
          </span>
          . Stage 7 screens compose only these primitives.
        </p>
      </header>

      <Section title="Color tokens" description="Semantic tokens only — components never use raw hex values.">
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {swatches.map((s) => (
            <div key={s.token} className="flex flex-col gap-2">
              <div className={`h-14 w-full rounded-[var(--radius-md)] border border-border ${s.cls}`} />
              <p className="text-[13px] font-medium">{s.token}</p>
              <p className="text-xs text-muted-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" description="Inter — hierarchy through size and color, weights 400/500/600 only.">
        <div className="flex w-full flex-col gap-3">
          <p className="text-[40px] leading-[48px] font-semibold tabular-nums">18,420</p>
          <p className="text-[30px] leading-[38px] font-semibold">Page title</p>
          <p className="text-[22px] leading-[30px] font-semibold">Section heading</p>
          <p className="text-[17px] leading-6 font-semibold">Card title</p>
          <p className="text-[15px] leading-6">Body — members, classes, attendance and payments in one calm interface.</p>
          <p className="text-sm leading-5">Body small / buttons / nav (14px).</p>
          <p className="text-[13px] leading-[18px] text-muted-foreground">Caption and metadata (13px).</p>
          <p className="text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
            Label / table header (12px)
          </p>
        </div>
      </Section>

      <Section title="Buttons" description="Default height 40px (sm 28, lg 44). Focus ring always visible.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus /> Add member
          </Button>
          <Button variant="outline">
            <Search /> Search
          </Button>
          <Button variant="secondary">
            <CreditCard /> Record payment
          </Button>
          <Button variant="ghost">
            <MoreHorizontal /> More
          </Button>
          <Button variant="destructive">Cancel session</Button>
          <Button variant="link">View all</Button>
          <Button disabled>Saving…</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Notifications">
            <Bell />
          </Button>
        </div>
      </Section>

      <Section title="Badges & status" description="Semantic color on tint — meaning, never decoration.">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-success/30 bg-success-bg text-success-fg">
            <span className="size-1.5 rounded-full bg-current" /> Active
          </Badge>
          <Badge className="border-warning/30 bg-warning-bg text-warning-fg">
            <span className="size-1.5 rounded-full bg-current" /> Expiring soon
          </Badge>
          <Badge className="border-destructive/30 bg-destructive-bg text-destructive-fg">
            <span className="size-1.5 rounded-full bg-current" /> Expired
          </Badge>
          <Badge className="border-info/30 bg-info-bg text-info-fg">
            <span className="size-1.5 rounded-full bg-current" /> Scheduled
          </Badge>
          <Badge variant="outline">Neutral</Badge>
        </div>
      </Section>

      <Section title="Form controls" description="Labels, inline validation, 44px-friendly targets.">
        <div className="grid w-full gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="name@pulsefit.club" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" aria-invalid defaultValue="0" />
            <p className="text-[13px] text-destructive-fg">
              Amount must be greater than 0.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Payment method</Label>
            <Select defaultValue="cash">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="transfer">Bank transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <Checkbox
              id="notify"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
            />
            <Label htmlFor="notify" className="font-normal">
              Notify member by email
            </Label>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" placeholder="Optional internal note…" />
          </div>
        </div>
      </Section>

      <Section title="Cards, stats & elevation" description="shadow-soft + 1px border; inner-soft on stat chips only.">
        <div className="grid w-full gap-5 lg:grid-cols-3">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Regular card</CardTitle>
              <CardDescription>Title, description, content slots.</CardDescription>
            </CardHeader>
            <CardContent className="text-[14px] text-foreground-body">
              Used for panels, forms, and grouped content.
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
                  Active memberships
                </span>
                <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-primary-soft text-primary shadow-inner-soft">
                  <Users className="size-4" />
                </span>
              </div>
              <span className="text-[32px] leading-10 font-semibold tabular-nums">
                1,147
              </span>
              <span className="text-[13px] text-success">▲ 6 this week</span>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="flex flex-col gap-3 p-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
              <p className="text-[13px] text-muted-foreground">
                Skeleton loading state
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Alerts" description="Semantic icon + title + description.">
        <div className="flex w-full flex-col gap-3">
          <Alert className="border-info/30 bg-info-bg [&>svg]:text-info">
            <Info className="size-4" />
            <AlertTitle>Scheduled maintenance</AlertTitle>
            <AlertDescription>
              The pool is closed on Sunday mornings.
            </AlertDescription>
          </Alert>
          <Alert className="border-warning/30 bg-warning-bg [&>svg]:text-warning">
            <AlertTriangle className="size-4" />
            <AlertTitle>3 memberships expire this week</AlertTitle>
            <AlertDescription>Reach out before the end date.</AlertDescription>
          </Alert>
          <Alert variant="destructive" className="bg-destructive-bg [&>svg]:text-destructive-fg">
            <XCircle className="size-4" />
            <AlertTitle>Payment failed</AlertTitle>
            <AlertDescription>No membership was created.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Table" description="Header on subtle background, hover rows in primary tint, numbers right-aligned.">
        <div className="w-full overflow-hidden rounded-[var(--radius-md)] border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Membership</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.code}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary-soft text-[12px] font-semibold text-primary-strong">
                          {m.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{m.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.code}</TableCell>
                  <TableCell>{m.plan}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Overlays & feedback" description="Dialog, dropdown, toast — focus-managed, Esc-closable.">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Spin HIIT?</DialogTitle>
                <DialogDescription>
                  9 enrolled members will be notified. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Keep session</Button>
                <Button variant="destructive">Cancel session</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Row actions <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Member</DropdownMenuLabel>
              <DropdownMenuItem>View profile</DropdownMenuItem>
              <DropdownMenuItem>Edit details</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Deactivate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() =>
              toast.success("Attendance saved", {
                description: "12 members marked present.",
              })
            }
          >
            <CheckCircle2 /> Show toast
          </Button>

          <Badge className="border-info/30 bg-info-bg text-info-fg">
            <Bell className="size-3" /> 3 unread
          </Badge>
        </div>
      </Section>

      <Section title="Tabs" description="Underline tabs, primary active, keyboard arrows.">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="memberships">Memberships</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-4 text-[14px] text-foreground-body">
            Profile overview content.
          </TabsContent>
          <TabsContent value="memberships" className="pt-4 text-[14px] text-foreground-body">
            Membership history table.
          </TabsContent>
          <TabsContent value="payments" className="pt-4 text-[14px] text-foreground-body">
            Payment history table.
          </TabsContent>
        </Tabs>
      </Section>

      <footer className="flex flex-col gap-2 border-t border-border pt-6">
        <p className="text-[13px] text-muted-foreground">
          Screens defined in <code>docs/prototype/screens.md</code> · shell,
          states, and responsive behavior land in Stage 7.
        </p>
        <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
          <CalendarDays className="size-4" /> Next: Stage 7 application build
          <Separator orientation="vertical" className="h-4" />
          <Users className="size-4" /> 44 stories · 40 FRs ready to implement
        </div>
      </footer>
    </main>
  );
}
