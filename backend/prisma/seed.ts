import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo password shared by every seeded account (demo environment only).
const DEMO_PASSWORD = "Password123!";

const now = new Date();

function at(daysFromNow: number, hour: number, min = 0): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, min, 0, 0);
  return d;
}

function dateOnly(daysFromNow: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.error("Database already contains data — refusing to seed twice.");
    console.error(
      "To load demo data again, reset first: docker compose down -v && docker compose up -d",
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  // --- Accounts -------------------------------------------------------------
  const staff = [
    { key: "admin", email: "admin@pulsefit.club", firstName: "Ava", lastName: "Mitchell", role: "ADMIN" as const, phone: "+1 555 0101" },
    { key: "manager", email: "manager@pulsefit.club", firstName: "Daniel", lastName: "Ortiz", role: "MANAGER" as const, phone: "+1 555 0102" },
    { key: "trainer1", email: "sofia@pulsefit.club", firstName: "Sofia", lastName: "Lindqvist", role: "TRAINER" as const, phone: "+1 555 0201" },
    { key: "trainer2", email: "marcus@pulsefit.club", firstName: "Marcus", lastName: "Webb", role: "TRAINER" as const, phone: "+1 555 0202" },
    { key: "trainer3", email: "elena@pulsefit.club", firstName: "Elena", lastName: "Petrova", role: "TRAINER" as const, phone: "+1 555 0203" },
    { key: "trainer4", email: "james@pulsefit.club", firstName: "James", lastName: "Park", role: "TRAINER" as const, phone: "+1 555 0204" },
    { key: "reception", email: "reception@pulsefit.club", firstName: "Nora", lastName: "Osei", role: "RECEPTIONIST" as const, phone: "+1 555 0103" },
  ];

  const memberSeeds = [
    ["Liam", "Foster"], ["Olivia", "Chen"], ["Noah", "Bergman"], ["Emma", "Silva"],
    ["Ethan", "Novak"], ["Sophia", "Rossi"], ["Mason", "Haddad"], ["Isabella", "Kim"],
    ["Lucas", "Moreau"], ["Mia", "Kowalski"], ["Logan", "Petrov"], ["Charlotte", "Dubois"],
    ["Oliver", "Nguyen"], ["Amelia", "Costa"], ["Jacob", "Fischer"], ["Harper", "Larsen"],
    ["Leo", "Martinez"], ["Evelyn", "Ibrahim"],
  ] as const;

  const userIds: Record<string, string> = {};
  await prisma.user.createMany({
    data: staff.map((s) => {
      const id = randomUUID();
      userIds[s.key] = id;
      return {
        id,
        email: s.email,
        passwordHash,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        role: s.role,
      };
    }),
  });

  const memberUserIds: string[] = [];
  await prisma.user.createMany({
    data: memberSeeds.map(([firstName, lastName], i) => {
      const id = randomUUID();
      memberUserIds.push(id);
      return {
        id,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        passwordHash,
        firstName,
        lastName,
        phone: `+1 555 1${String(i).padStart(3, "0")}`,
        role: "MEMBER" as const,
      };
    }),
  });

  // --- Trainers -------------------------------------------------------------
  const trainerDefs = [
    { key: "trainer1", specialization: "Yoga & Mobility", bio: "RYT-500 certified, teaches flow and recovery classes." },
    { key: "trainer2", specialization: "Strength & Conditioning", bio: "Former competitive powerlifter, focuses on safe technique." },
    { key: "trainer3", specialization: "Boxing & Combat", bio: "10 years amateur boxing, runs beginner-friendly sessions." },
    { key: "trainer4", specialization: "Cycling & HIIT", bio: "Indoor cycling coach with a love of interval training." },
  ];
  const trainerIds: Record<string, string> = {};
  await prisma.trainer.createMany({
    data: trainerDefs.map((t) => {
      const id = randomUUID();
      trainerIds[t.key] = id;
      return { id, userId: userIds[t.key], specialization: t.specialization, bio: t.bio };
    }),
  });

  // --- Members --------------------------------------------------------------
  const memberIds: string[] = [];
  const memberRecords = memberUserIds.map((userId, i) => {
    const id = randomUUID();
    memberIds.push(id);
    return {
      id,
      userId,
      memberCode: `MB-${new Date().getFullYear()}-${String(i + 1).padStart(3, "0")}`,
      dateOfBirth: dateOnly(-11000 - i * 400),
      gender: i % 2 === 0 ? "male" : "female",
      emergencyContact: `+1 555 9${String(i).padStart(3, "0")}`,
      joinedAt: dateOnly(-300 + i * 12),
    };
  });
  await prisma.member.createMany({ data: memberRecords });

  // --- Plans ----------------------------------------------------------------
  const planSeeds = [
    { key: "monthly", name: "Monthly Core", description: "Full gym access for 30 days.", durationDays: 30, price: 39.99 },
    { key: "quarterly", name: "Quarterly Pro", description: "90 days of full access plus two guest passes.", durationDays: 90, price: 99.99 },
    { key: "annual", name: "Annual Elite", description: "A full year of access, classes included.", durationDays: 365, price: 349.99 },
    { key: "student", name: "Student Monthly", description: "Discounted 30-day plan with valid student ID.", durationDays: 30, price: 29.99 },
  ];
  const planIds: Record<string, { id: string; durationDays: number; price: number }> = {};
  await prisma.membershipPlan.createMany({
    data: planSeeds.map((p) => {
      const id = randomUUID();
      planIds[p.key] = { id, durationDays: p.durationDays, price: p.price };
      return { id, name: p.name, description: p.description, durationDays: p.durationDays, price: p.price };
    }),
  });

  // --- Facilities -----------------------------------------------------------
  const facilitySeeds = [
    { name: "Main Gym Floor", type: "GYM_FLOOR" as const, capacity: 60 },
    { name: "Yoga Studio", type: "STUDIO" as const, capacity: 20 },
    { name: "Spin Studio", type: "STUDIO" as const, capacity: 16 },
    { name: "Boxing Gym", type: "GYM_FLOOR" as const, capacity: 20 },
    { name: "Indoor Pool", type: "POOL" as const, capacity: 24 },
  ];
  const facilityIds: Record<string, string> = {};
  await prisma.facility.createMany({
    data: facilitySeeds.map((f) => {
      const id = randomUUID();
      facilityIds[f.name] = id;
      return { id, ...f };
    }),
  });

  // --- Classes --------------------------------------------------------------
  const classSeeds = [
    { key: "yoga", name: "Yoga Flow", category: "YOGA", capacity: 16, description: "Vinyasa flow for all levels." },
    { key: "spin", name: "Spin HIIT", category: "CYCLE", capacity: 16, description: "Indoor cycling with interval blocks." },
    { key: "boxing", name: "Boxing Basics", category: "BOXING", capacity: 14, description: "Fundamentals of stance, guard and footwork." },
    { key: "strength", name: "Strength 101", category: "STRENGTH", capacity: 12, description: "Barbell technique and progressive overload." },
    { key: "zumba", name: "Zumba Party", category: "DANCE", capacity: 24, description: "High-energy dance fitness." },
    { key: "swim", name: "Morning Swim", category: "AQUA", capacity: 12, description: "Coached lane swimming." },
  ];
  const classIds: Record<string, { id: string; capacity: number }> = {};
  await prisma.fitnessClass.createMany({
    data: classSeeds.map((c) => {
      const id = randomUUID();
      classIds[c.key] = { id, capacity: c.capacity };
      return { id, name: c.name, description: c.description, category: c.category, capacity: c.capacity };
    }),
  });

  // --- Sessions (4 weeks past, today, next week) ----------------------------
  interface SessionSeed {
    id: string;
    classKey: string;
    trainerKey: string;
    facility: string;
    day: number;
    hour: number;
    min?: number;
  }
  const weeklyPattern: Omit<SessionSeed, "id" | "day">[] = [
    { classKey: "yoga", trainerKey: "trainer1", facility: "Yoga Studio", hour: 18 },
    { classKey: "spin", trainerKey: "trainer4", facility: "Spin Studio", hour: 17, min: 30 },
    { classKey: "boxing", trainerKey: "trainer3", facility: "Boxing Gym", hour: 19 },
    { classKey: "strength", trainerKey: "trainer2", facility: "Main Gym Floor", hour: 18 },
    { classKey: "zumba", trainerKey: "trainer4", facility: "Main Gym Floor", hour: 11 },
    { classKey: "swim", trainerKey: "trainer1", facility: "Indoor Pool", hour: 9 },
  ];
  const weekdayOffset = [-6, -5, -4, -3, -1, -2]; // Mon..Sat relative layout

  const sessionSeeds: SessionSeed[] = [];
  for (let week = 4; week >= 1; week--) {
    weeklyPattern.forEach((p, i) => {
      sessionSeeds.push({ id: randomUUID(), ...p, day: weekdayOffset[i] - 7 * week });
    });
  }
  // Today
  sessionSeeds.push({ id: randomUUID(), classKey: "spin", trainerKey: "trainer4", facility: "Spin Studio", day: 0, hour: 17, min: 30 });
  sessionSeeds.push({ id: randomUUID(), classKey: "yoga", trainerKey: "trainer1", facility: "Yoga Studio", day: 0, hour: 19 });
  // Next week
  weeklyPattern.forEach((p, i) => {
    sessionSeeds.push({ id: randomUUID(), ...p, day: weekdayOffset[i] + 7 });
  });

  const sessions = sessionSeeds.map((s) => {
    const startsAt = at(s.day, s.hour, s.min ?? 0);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    return {
      id: s.id,
      classId: classIds[s.classKey].id,
      trainerId: trainerIds[s.trainerKey],
      // Attendance.recordedById references the trainer's User, not Trainer.
      trainerUserId: userIds[s.trainerKey],
      facilityId: facilityIds[s.facility],
      startsAt,
      endsAt,
      status: (endsAt < now ? "COMPLETED" : "SCHEDULED") as "COMPLETED" | "SCHEDULED",
      classKey: s.classKey,
      capacity: classIds[s.classKey].capacity,
    };
  });
  await prisma.classSession.createMany({
    data: sessions.map(
      ({
        classKey: _classKey,
        capacity: _capacity,
        trainerUserId: _trainerUserId,
        ...s
      }) => s,
    ),
  });

  // --- Enrollments + attendance --------------------------------------------
  const enrollmentRows: {
    id: string;
    memberId: string;
    sessionId: string;
    sessionIndex: number;
    sessionEndsAt: Date;
  }[] = [];

  sessions.forEach((session, sessionIndex) => {
    const rosterSize = Math.min(session.capacity, 6 + (sessionIndex % 5));
    for (let i = 0; i < rosterSize; i++) {
      const memberId = memberIds[(i * 3 + sessionIndex * 5) % memberIds.length];
      if (enrollmentRows.some((e) => e.sessionId === session.id && e.memberId === memberId)) continue;
      enrollmentRows.push({
        id: randomUUID(),
        memberId,
        sessionId: session.id,
        sessionIndex,
        sessionEndsAt: session.endsAt,
      });
    }
  });

  await prisma.enrollment.createMany({
    data: enrollmentRows.map((e) => ({
      id: e.id,
      memberId: e.memberId,
      sessionId: e.sessionId,
      enrolledAt: at(e.sessionIndex < 20 ? -30 : -5, 10),
    })),
  });

  const attendanceRows = enrollmentRows
    .filter((e) => e.sessionEndsAt < now)
    .map((e, i) => {
      const session = sessions[e.sessionIndex];
      const status = i % 9 === 0 ? "ABSENT" : i % 7 === 3 ? "LATE" : "PRESENT";
      return {
        id: randomUUID(),
        enrollmentId: e.id,
        status: status as "ABSENT" | "LATE" | "PRESENT",
        recordedById: session.trainerUserId,
        recordedAt: new Date(session.endsAt.getTime() + 15 * 60 * 1000),
      };
    });
  await prisma.attendance.createMany({ data: attendanceRows });

  // --- Payments + memberships ----------------------------------------------
  const planKeys = ["monthly", "quarterly", "annual", "student"] as const;
  const methods = ["CARD", "CASH", "BANK_TRANSFER"] as const;

  const paymentRows: {
    id: string;
    memberId: string;
    planKey: (typeof planKeys)[number];
    purchasedAt: Date;
  }[] = [];

  memberIds.forEach((memberId, i) => {
    paymentRows.push({
      id: randomUUID(),
      memberId,
      planKey: planKeys[i % planKeys.length],
      purchasedAt: dateOnly(-300 + i * 12),
    });
    if (i % 4 === 0) {
      // renewal purchase
      paymentRows.push({
        id: randomUUID(),
        memberId,
        planKey: "quarterly",
        purchasedAt: dateOnly(-60 + i),
      });
    }
    if (i % 5 === 0) {
      paymentRows.push({
        id: randomUUID(),
        memberId,
        planKey: "monthly",
        purchasedAt: dateOnly(-14 + i),
      });
    }
  });

  await prisma.payment.createMany({
    data: paymentRows.map((p, i) => {
      const plan = planIds[p.planKey];
      const planName = planSeeds.find((s) => s.key === p.planKey)!.name;
      return {
        id: p.id,
        memberId: p.memberId,
        amount: plan.price,
        type: "MEMBERSHIP_PURCHASE" as const,
        method: methods[i % methods.length],
        status: "COMPLETED" as const,
        description: `${planName} membership`,
        processedById: i % 3 === 0 ? userIds["reception"] : userIds["manager"],
        paidAt: p.purchasedAt,
      };
    }),
  });

  // Latest purchase per member determines the current membership.
  const latestByMember = new Map<string, { id: string; planKey: (typeof planKeys)[number]; purchasedAt: Date }>();
  for (const p of paymentRows) {
    const prev = latestByMember.get(p.memberId);
    if (!prev || p.purchasedAt > prev.purchasedAt) latestByMember.set(p.memberId, p);
  }

  const membershipRows = memberIds.map((memberId, i) => {
    const payment = latestByMember.get(memberId)!;
    const plan = planIds[payment.planKey];
    const startDate = payment.purchasedAt;
    const endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + plan.durationDays);
    const status = endDate < now ? ("EXPIRED" as const) : ("ACTIVE" as const);
    return {
      id: randomUUID(),
      memberId,
      planId: plan.id,
      startDate,
      endDate,
      status: i === 7 ? ("CANCELLED" as const) : status,
      paymentId: payment.id,
    };
  });
  await prisma.membership.createMany({ data: membershipRows });

  // --- Notifications --------------------------------------------------------
  const notificationRows = [
    ...membershipRows.slice(0, 6).map((m, i) => ({
      id: randomUUID(),
      userId: memberUserIds[i],
      title: "Membership activated",
      message: "Your membership is now active. Welcome to PulseFit!",
      type: "INFO" as const,
      createdAt: at(-7 + i, 9),
    })),
    ...sessions
      .filter((s) => s.startsAt > now)
      .slice(0, 6)
      .map((s, i) => ({
        id: randomUUID(),
        userId: memberUserIds[i % memberUserIds.length],
        title: "Class reminder",
        message: `Your class starts soon — check the schedule for details.`,
        type: "REMINDER" as const,
        createdAt: at(-1, 8),
      })),
    {
      id: randomUUID(),
      userId: memberUserIds[0],
      title: "Payment received",
      message: "We received your latest membership payment.",
      type: "INFO" as const,
      createdAt: at(-3, 12),
    },
  ];
  await prisma.notification.createMany({ data: notificationRows });

  // --- Activity log ---------------------------------------------------------
  const activitySeeds = [
    { action: "MEMBER_CREATED", entityType: "Member", actor: "reception" },
    { action: "MEMBERSHIP_ACTIVATED", entityType: "Membership", actor: "manager" },
    { action: "SESSION_SCHEDULED", entityType: "ClassSession", actor: "manager" },
    { action: "PAYMENT_RECORDED", entityType: "Payment", actor: "reception" },
    { action: "MEMBER_ENROLLED", entityType: "Enrollment", actor: null },
    { action: "ATTENDANCE_MARKED", entityType: "Attendance", actor: "trainer2" },
  ];
  await prisma.activityLog.createMany({
    data: activitySeeds.map((a, i) => ({
      id: randomUUID(),
      actorId: a.actor ? userIds[a.actor] : null,
      action: a.action,
      entityType: a.entityType,
      metadata: { source: "seed" },
      createdAt: at(-5 + i, 10 + i),
    })),
  });

  const counts = {
    users: staff.length + memberSeeds.length,
    members: memberIds.length,
    trainers: trainerDefs.length,
    plans: planSeeds.length,
    facilities: facilitySeeds.length,
    classes: classSeeds.length,
    sessions: sessions.length,
    enrollments: enrollmentRows.length,
    attendance: attendanceRows.length,
    payments: paymentRows.length,
    memberships: membershipRows.length,
    notifications: notificationRows.length,
  };
  console.table(counts);
  console.log(`\nSeed complete. Every demo account uses the password: ${DEMO_PASSWORD}`);
  console.log("Staff logins: admin@pulsefit.club, manager@pulsefit.club, reception@pulsefit.club,");
  console.log("sofia@pulsefit.club, marcus@pulsefit.club, elena@pulsefit.club, james@pulsefit.club");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
