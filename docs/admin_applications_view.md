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
- **Current Club** – associated club or "Free Agent".
- **Tasks** – animated badge cycling through outstanding items (trajectory approvals, new team creation, etc.).

## Row Actions
- **Accept Application** – available when tasks are resolved; prompts confirmation summary before finalizing.
- **External Links** – quick access to references such as Transfermarkt.
- *(Future)* view details, task review and rejection flows can be added modularly.

## Filters
Header includes a filter button which opens selections for:
- Country of origin/nationality.
- Application status.
- Plan type.
Selected filters appear as removable badges next to the button.

## Workflow Integration
1. Application submitted ⇒ entry appears in table with pending status and task count.
2. Admin reviews and completes required tasks (trajectory approvals, team creation).
3. Once tasks = 0, admin can accept or reject application.
4. Acceptance triggers account creation and removes row from pending view.

## Scalability Considerations
- Reusable table component matching `teams`/`career` styling.
- API endpoints should support pagination, sorting and filtering.
- Actions designed as modular buttons to extend with future features (e.g., messaging).
- Maintain audit logs for status changes.

