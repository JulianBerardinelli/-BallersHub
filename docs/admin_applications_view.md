# Admin Applications View Proposal

## Overview
Design proposal for the administrative interface to manage player account applications. Replaces card-based layout with a table-based dashboard similar to existing `teams` and `career` sections.

## Table Structure
Columns:
- **ID** – unique application identifier with quick copy button.
- **Applicant** – player's full name and nationality flags.
- **Submitted** – date of application submission.
- **Status** – current state (pending review, awaiting tasks, approved, rejected).
- **Plan** – subscription or account type requested.
- **Current Club** – associated club or "Free Agent" (column kept compact to free space for actions).
- **Tasks** – faded chip cycling through outstanding items (Trayectoria, Equipos, Información) and opening a task summary modal.

## Row Actions
- **Personal Data Review / Details** – icon button that opens a modal with full player information, links and KYC documents; header mirrors career detail view with nationality flags and shows birth date with calculated age. After acceptance it remains as a detail viewer.
- **Accept Application** – icon button enabled only when all tasks are completed.

## Filters
Header includes a filter button which opens selections for:
- Country of origin/nationality.
- Application status.
- Plan type.
Selected filters appear as removable badges next to the button.

## Workflow Integration
1. Application submitted ⇒ entry appears in table with pending status and task badges.
2. Admin reviews and completes required tasks (Trayectoria approvals, new team creation, personal data verification).
3. Once badges disappear (tasks = 0), the accept button is enabled.
4. Acceptance triggers account creation and removes row from pending view.

## Scalability Considerations
- Reusable table component matching `teams`/`career` styling.
- API endpoints should support pagination, sorting and filtering.
- Actions designed as modular buttons to extend with future features (e.g., messaging).
- Maintain audit logs for status changes.

