# Stage 2 — Entity Relationship Diagram

Generated from the Stage 1 class diagram; this is the authoritative logical model for the Prisma schema in `backend/prisma/schema.prisma`.

```mermaid
erDiagram
    USER ||--o| MEMBER : "has profile"
    USER ||--o| TRAINER : "has profile"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ ACTIVITY_LOG : "performs"
    USER ||--o{ PAYMENT : "processes"

    MEMBER ||--o{ MEMBERSHIP : "holds"
    MEMBER ||--o{ ENROLLMENT : "registers"
    MEMBER ||--o{ PAYMENT : "makes"

    MEMBERSHIP_PLAN ||--o{ MEMBERSHIP : "defines"
    MEMBERSHIP |o--o| PAYMENT : "activated by"

    FITNESS_CLASS ||--o{ CLASS_SESSION : "instantiates"
    TRAINER ||--o{ CLASS_SESSION : "leads"
    FACILITY ||--o{ CLASS_SESSION : "hosts"

    CLASS_SESSION ||--o{ ENROLLMENT : "receives"
    ENROLLMENT ||--o| ATTENDANCE : "yields"

    USER {
        uuid id PK
        varchar email UK
        varchar passwordHash
        varchar firstName
        varchar lastName
        varchar phone
        role role
        userStatus status
        timestamp createdAt
        timestamp updatedAt
    }

    MEMBER {
        uuid id PK
        uuid userId FK
        varchar memberCode UK
        date dateOfBirth
        varchar gender
        varchar address
        varchar emergencyContact
        memberStatus status
        date joinedAt
    }

    TRAINER {
        uuid id PK
        uuid userId FK
        varchar specialization
        varchar bio
        trainerStatus status
    }

    MEMBERSHIP_PLAN {
        uuid id PK
        varchar name UK
        varchar description
        int durationDays
        decimal price
        boolean isActive
    }

    MEMBERSHIP {
        uuid id PK
        uuid memberId FK
        uuid planId FK
        date startDate
        date endDate
        membershipStatus status
        uuid paymentId FK
    }

    FITNESS_CLASS {
        uuid id PK
        varchar name UK
        varchar description
        varchar category
        int capacity
        boolean isActive
    }

    CLASS_SESSION {
        uuid id PK
        uuid classId FK
        uuid trainerId FK
        uuid facilityId FK
        timestamp startsAt
        timestamp endsAt
        sessionStatus status
        varchar cancelReason
    }

    ENROLLMENT {
        uuid id PK
        uuid memberId FK
        uuid sessionId FK
        enrollmentStatus status
        timestamp enrolledAt
    }

    ATTENDANCE {
        uuid id PK
        uuid enrollmentId FK
        attendanceStatus status
        uuid recordedById FK
        timestamp recordedAt
    }

    PAYMENT {
        uuid id PK
        uuid memberId FK
        decimal amount
        paymentType type
        paymentMethod method
        paymentStatus status
        uuid processedById FK
        timestamp paidAt
    }

    FACILITY {
        uuid id PK
        varchar name UK
        facilityType type
        int capacity
        facilityStatus status
    }

    NOTIFICATION {
        uuid id PK
        uuid userId FK
        varchar title
        varchar message
        notificationType type
        timestamp readAt
    }

    ACTIVITY_LOG {
        uuid id PK
        uuid actorId FK
        varchar action
        varchar entityType
        varchar entityId
        json metadata
    }
```

See [README](README.md) for cardinality rules, constraints, and index justification.
