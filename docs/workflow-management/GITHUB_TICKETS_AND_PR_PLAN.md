# Workflow Management — GitHub Tickets and PR Plan

## Recommended branch
`feat/workflow-management-pa5`

## Tickets
1. `[Phase 3] Workflow Management - Define shared types and database schema`
2. `[Phase 3] Workflow Management - Implement backend workflow CRUD APIs`
3. `[Phase 3] Workflow Management - Implement workflow execution API and history`
4. `[Phase 3] Workflow Management - Implement workflow list and detail UI`
5. `[Phase 3] Workflow Management - Implement create/edit workflow UI`
6. `[Phase 3] Workflow Management - Implement workflow execution UI and history panel`
7. `[Phase 3] Workflow Management - Complete test cases and test report`

## PR split
- PR1: `packages/shared/src/workflow.ts`, workflow migrations.
- PR2: backend repository/service/controller/routes.
- PR3: frontend route + workflow dashboard + CSS.
- PR4: PA5 testing docs and evidence.

## Reviewer checklist comment
```md
## Reviewer Checklist

### Functional & Corner Cases
- [ ] Happy path: Create/Edit/List/Detail/Execute Workflow works.
- [ ] Edge cases: empty name, no steps, draft execution rejected.
- [ ] No regression to existing Authentication and Agent routes.

### UI/UX & Design
- [ ] Workflow list, form, detail, and history are readable.
- [ ] Status pills and action buttons are clear.
- [ ] Layout remains usable on smaller screens.

### Code Quality
- [ ] Shared types are reused by frontend/backend.
- [ ] Backend is split into route/controller/service/repository.
- [ ] Workflow route is isolated under `/app/workflows`.

### Process & Workflow
- [ ] Ticket is linked.
- [ ] PR includes screenshots/video evidence.
- [ ] PR size is kept small enough for review.
```
