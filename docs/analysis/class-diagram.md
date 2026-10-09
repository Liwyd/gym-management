# Stage 1 — Class Diagram

```mermaid
classDiagram
    direction LR

    class User {
        +String id
        +String email
        +String passwordHash
        +String firstName
        +String lastName
        +String phone
        +Role role
        +UserStatus status
        +DateTime createdAt
        +DateTime updatedAt
        +authenticate(password) Boolean
        +hasRole(role) Boolean
        +deactivate() void
    }

    class Member {
        +String id
        +String userId
        +String memberCode
        +Date dateOfBirth
        +String gender
        +String emergencyContact
        +MemberStatus status
        +DateTime createdAt
        +isActive() Boolean
        +activeMembership(onDate) Membership
        +canEnroll(session) Boolean
    }

    class Trainer {
        +String id
        +String userId
        +String specialization
        +String bio
        +TrainerStatus status
        +DateTime createdAt
        +hasScheduleConflict(start, end) Boolean
    }

    class MembershipPlan {
        +String id
        +String name
        +String description
        +Int durationDays
        +Decimal price
        +Boolean isActive
        +DateTime createdAt
    }

    class Membership {
        +String id
        +String memberId
        +String planId
        +Date startDate
        +Date endDate
        +MembershipStatus status
        +String paymentId
        +DateTime createdAt
        +isActive(onDate) Boolean
        +activate(payment) void
        +remainingDays(onDate) Int
    }

    class FitnessClass {
        +String id
        +String name
        +String description
        +String category
        +Int capacity
        +Boolean isActive
        +DateTime createdAt
    }

    class ClassSession {
        +String id
        +String classId
        +String trainerId
        +String facilityId
        +DateTime startsAt
        +DateTime endsAt
        +SessionStatus status
        +String cancelReason
        +DateTime createdAt
        +enrolledCount() Int
        +hasCapacity() Boolean
        +isUpcoming(onDate) Boolean
        +cancel(reason) void
    }

    class Enrollment {
        +String id
        +String memberId
        +String sessionId
        +EnrollmentStatus status
        +DateTime enrolledAt
        +cancel() void
    }

    class Attendance {
        +String id
        +String enrollmentId
        +AttendanceStatus status
        +String recordedById
        +DateTime recordedAt
        +mark(status, recorder) void
    }

    class Payment {
        +String id
        +String memberId
        +Decimal amount
        +PaymentType type
        +PaymentMethod method
        +PaymentStatus status
        +String membershipId
        +String description
        +String processedById
        +DateTime paidAt
        +DateTime createdAt
        +complete() void
        +refund() void
    }

    class Facility {
        +String id
        +String name
        +FacilityType type
        +Int capacity
        +FacilityStatus status
        +hasSessionConflict(start, end) Boolean
    }

    class Notification {
        +String id
        +String userId
        +String title
        +String message
        +NotificationType type
        +DateTime readAt
        +DateTime createdAt
        +markRead() void
    }

    class ActivityLog {
        +String id
        +String actorId
        +String action
        +String entityType
        +String entityId
        +Json metadata
        +DateTime createdAt
    }

    User "1" -- "0..1" Member : has profile
    User "1" -- "0..1" Trainer : has profile
    User "1" -- "0..*" Notification : receives
    User "1" -- "0..*" ActivityLog : performs
    User "1" -- "0..*" Payment : processes

    Member "1" -- "0..*" Membership : holds
    Member "1" -- "0..*" Enrollment : registers
    Member "1" -- "0..*" Payment : makes

    MembershipPlan "1" -- "0..*" Membership : defines
    Membership "0..1" -- "1" Payment : activated by

    FitnessClass "1" -- "0..*" ClassSession : instantiates
    Trainer "1" -- "0..*" ClassSession : leads
    Facility "1" -- "0..*" ClassSession : hosts

    ClassSession "1" -- "0..*" Enrollment : receives
    Enrollment "1" -- "0..1" Attendance : yields
```

## Notes

- **Composition over inheritance for identity**: `Member` and `Trainer` are profile entities composed with a `User` account rather than subclasses of `User`. A staff account (`ADMIN`/`MANAGER`/`RECEPTIONIST`) has no `Member`/`Trainer` profile; a `MEMBER` user always has exactly one `Member`, a `TRAINER` user exactly one `Trainer` (`userId` unique in both).
- **Cardinalities**: one active `Membership` per member (rule R1); `Attendance` exists only through an `Enrollment` (1:0..1); a `Payment` optionally activates a `Membership` (class fees have none).
- **Denormalization**: none in the model; `ClassSession.enrolledCount()` is computed, not stored — capacity is enforced inside a transaction at enrollment time (Stage 2/7).
- **Enums**: `Role = ADMIN | MANAGER | TRAINER | RECEPTIONIST | MEMBER`; `MembershipStatus = ACTIVE | EXPIRED | CANCELLED`; `SessionStatus = SCHEDULED | CANCELLED | COMPLETED`; `EnrollmentStatus = ENROLLED | CANCELLED`; `AttendanceStatus = PRESENT | ABSENT | LATE`; `PaymentStatus = PENDING | COMPLETED | FAILED | REFUNDED`; `PaymentMethod = CASH | CARD | BANK_TRANSFER`; `PaymentType = MEMBERSHIP_PURCHASE | CLASS_FEE | OTHER`; `FacilityType = GYM_FLOOR | STUDIO | POOL | COURT`; `NotificationType = INFO | WARNING | REMINDER`.
