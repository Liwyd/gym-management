export type Role =
  | "ADMIN"
  | "MANAGER"
  | "TRAINER"
  | "RECEPTIONIST"
  | "MEMBER";

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  member?: { id: string; memberCode: string } | null;
  trainer?: { id: string; specialization: string | null } | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Member {
  id: string;
  memberCode: string;
  status: "ACTIVE" | "INACTIVE";
  joinedAt: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContact: string | null;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    status: "ACTIVE" | "INACTIVE";
  };
  memberships?: Membership[];
  payments?: Payment[];
  enrollments?: Enrollment[];
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: number | string;
  isActive: boolean;
  createdAt: string;
  _count?: { memberships: number };
}

export interface Membership {
  id: string;
  memberId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  paymentId: string | null;
  createdAt: string;
  plan: MembershipPlan;
  payment?: {
    id: string;
    amount: number | string;
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt: string;
    description: string | null;
  } | null;
  member: {
    id: string;
    memberCode: string;
    user: { id: string; firstName: string; lastName: string; email: string };
  };
}

export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PaymentType = "MEMBERSHIP_PURCHASE" | "CLASS_FEE" | "OTHER";

export interface Payment {
  id: string;
  memberId: string;
  amount: number | string;
  type: PaymentType;
  method: PaymentMethod;
  status: PaymentStatus;
  description: string | null;
  paidAt: string;
  member: {
    id: string;
    memberCode: string;
    user: { firstName: string; lastName: string; email: string };
  };
  processedBy?: { firstName: string; lastName: string } | null;
}

export interface FitnessClass {
  id: string;
  name: string;
  description: string | null;
  category: string;
  capacity: number;
  isActive: boolean;
  _count?: { sessions: number };
}

export type SessionStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

export interface ClassSession {
  id: string;
  classId: string;
  trainerId: string;
  facilityId: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  cancelReason: string | null;
  class: { id: string; name: string; category: string; capacity: number };
  trainer: {
    id: string;
    specialization: string | null;
    user: { firstName: string; lastName: string };
  };
  facility: { id: string; name: string; type: string; capacity: number };
  _count?: { enrollments: number };
  enrolledCount?: number;
  roster?: Enrollment[];
}

export type EnrollmentStatus = "ENROLLED" | "CANCELLED";

export interface Enrollment {
  id: string;
  memberId: string;
  sessionId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  member: {
    id: string;
    memberCode: string;
    status: string;
    user: { id: string; firstName: string; lastName: string; email: string };
  };
  session: ClassSession;
  attendance?: { status: AttendanceStatus; recordedAt: string } | null;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  status: AttendanceStatus;
  recordedAt: string;
  enrollment: {
    id: string;
    member: {
      id: string;
      memberCode: string;
      user: { firstName: string; lastName: string; email: string };
    };
    session: {
      id: string;
      startsAt: string;
      endsAt: string;
      status: SessionStatus;
      class: { name: string };
      trainerId: string;
    };
  };
}

export interface Trainer {
  id: string;
  specialization: string | null;
  bio: string | null;
  status: "ACTIVE" | "INACTIVE";
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    status: "ACTIVE" | "INACTIVE";
  };
  upcomingSessions?: number;
  nextSessions?: ClassSession[];
}

export type FacilityType = "GYM_FLOOR" | "STUDIO" | "POOL" | "COURT";

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  capacity: number;
  status: "ACTIVE" | "INACTIVE";
  description: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "REMINDER" | "SUCCESS";
  readAt: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  member?: { id: string; memberCode: string } | null;
  trainer?: { id: string; specialization: string | null } | null;
}

export interface StaffDashboard {
  role: Role;
  generatedAt: string;
  stats: {
    totalMembers: number;
    activeMemberships: number;
    expiringSoon: number;
    todaysSessions: number;
    todaysAttendance: number;
    monthRevenue: number;
    weekRevenue: number;
  };
  revenueByMonth: { month: string; total: number }[];
  upcomingSessions: ClassSession[];
  expiringMemberships: (Pick<Membership, "id" | "endDate" | "status"> & {
    plan: { name: string };
    member: { memberCode: string; user: { firstName: string; lastName: string } };
  })[];
  recentPayments: (Pick<
    Payment,
    "id" | "amount" | "type" | "method" | "paidAt"
  > & { member: { memberCode: string; user: { firstName: string; lastName: string } } })[];
  recentActivity: {
    id: string;
    action: string;
    summary: string;
    actor: string;
    createdAt: string;
  }[];
  showStaffDetail: boolean;
}

export interface TrainerDashboard {
  role: "TRAINER";
  generatedAt: string;
  stats: {
    todaysSessions: number;
    weekSessions: number;
    pendingAttendance: number;
    memberCount: number;
  };
  upcomingSessions: ClassSession[];
}

export interface MemberDashboard {
  role: "MEMBER";
  generatedAt: string;
  stats: {
    daysLeft: number | null;
    upcomingEnrollments: number;
    unreadNotifications: number;
  };
  membership:
    | (Membership & { derivedStatus: "ACTIVE" | "EXPIRED" | "CANCELLED"; daysLeft: number | null })
    | null;
  upcomingSessions: (ClassSession & { enrollmentId: string; enrolledCount: number })[];
  recentPayments: {
    id: string;
    amount: number | string;
    method: PaymentMethod;
    description: string | null;
    paidAt: string;
  }[];
}

export type DashboardData = StaffDashboard | TrainerDashboard | MemberDashboard;
