# Admin Applications View Proposal

## Overview
Design proposal for the administrative interface to manage player account applications. Replaces card-based layout with a table-based dashboard similar to existing `teams` and `career` sections.

## Table Structure
Columns:
- **ID** – unique application identifier.
- **Applicant** – player's full name and nationality flags.
- **Submitted** – date of application submission.
- **Status** – current state (pending review, awaiting tasks, approved, rejected).
- **Plan** – subscription or account type requested.
- **Current Club** – associated club or "Free Agent".
- **Tasks** – number of outstanding items (trajectory approvals, new team creation, etc.).

## Row Actions
- **View Details** – open a drawer/modal with full personal data, career history and links.
- **Review Tasks** – navigate to pending subtasks for trajectory or team creation.
- **Accept Application** – available when tasks are resolved; prompts confirmation summary before finalizing.
- **Reject Application** – optional action with confirmation dialog.

## Filters
Header includes filter controls for:
- Country of origin/nationality.
- Age range.
- Playing position(s).
- Application status.
- Plan type.

Filters can be combined and persisted via query parameters.

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

