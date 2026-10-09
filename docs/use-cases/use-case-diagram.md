# Stage 3 — Use Case Diagram

```mermaid
usecaseDiagram
    actor "Administrator" as Admin
    actor "Manager" as Manager
    actor "Trainer" as Trainer
    actor "Receptionist" as Receptionist
    actor "Member" as Member
    actor "System" as System

    package "Authentication" {
        usecase "Log in" as UC01
        usecase "Log out" as UC02
    }
    package "Members" {
        usecase "Create member account" as UC03
        usecase "Search and view members" as UC04
        usecase "Edit member profile" as UC05
    }
    package "Memberships" {
        usecase "Manage membership plans" as UC06
        usecase "Purchase / activate membership" as UC07
        usecase "Expire memberships" as UC08
        usecase "Refund payment and cancel membership" as UC09
    }
    package "Classes and scheduling" {
        usecase "Manage class catalog" as UC10
        usecase "Schedule class session" as UC11
        usecase "Cancel class session" as UC12
    }
    package "Enrollment and attendance" {
        usecase "Enroll member in class" as UC13
        usecase "Cancel enrollment" as UC14
        usecase "Record attendance" as UC15
    }
    package "Payments" {
        usecase "Record payment" as UC16
    }
    package "Administration" {
        usecase "Manage facilities" as UC17
        usecase "Manage user accounts and roles" as UC18
    }
    package "Dashboards and notifications" {
        usecase "View dashboard" as UC19
        usecase "View and manage notifications" as UC20
    }

    Admin -- UC01
    Admin -- UC02
    Admin -- UC06
    Admin -- UC07
    Admin -- UC09
    Admin -- UC10
    Admin -- UC11
    Admin -- UC12
    Admin -- UC13
    Admin -- UC14
    Admin -- UC15
    Admin -- UC16
    Admin -- UC17
    Admin -- UC18
    Admin -- UC19
    Admin -- UC20

    Manager -- UC01
    Manager -- UC02
    Manager -- UC03
    Manager -- UC04
    Manager -- UC05
    Manager -- UC07
    Manager -- UC09
    Manager -- UC10
    Manager -- UC11
    Manager -- UC12
    Manager -- UC13
    Manager -- UC14
    Manager -- UC15
    Manager -- UC16
    Manager -- UC19
    Manager -- UC20

    Trainer -- UC01
    Trainer -- UC02
    Trainer -- UC11
    Trainer -- UC12
    Trainer -- UC15
    Trainer -- UC19
    Trainer -- UC20

    Receptionist -- UC01
    Receptionist -- UC02
    Receptionist -- UC03
    Receptionist -- UC04
    Receptionist -- UC05
    Receptionist -- UC07
    Receptionist -- UC13
    Receptionist -- UC14
    Receptionist -- UC16
    Receptionist -- UC19
    Receptionist -- UC20

    Member -- UC01
    Member -- UC02
    Member -- UC07
    Member -- UC13
    Member -- UC14
    Member -- UC19
    Member -- UC20

    System -- UC08

    UC13 .> UC01 : "<<includes>>"
    UC07 .> UC16 : "<<includes>>"
    UC09 .> UC16 : "<<extends>>"
    UC12 .> UC11 : "<<extends>>"
```
