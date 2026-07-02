# Workflow Management — PA5 Test Plan

## Objective
Verify that the Workflow Management feature supports core user scenarios: list workflows, create workflow, edit workflow, view detail, execute workflow, and inspect execution history.

## Test levels
- Unit: API validation and service-level behavior.
- Integration: API + database persistence through Knex/PostgreSQL.
- System: Frontend + backend manual verification through the browser.
- Acceptance: Reviewer-facing validation of usability and traceability.

## Environment
- Frontend: React + Vite + TypeScript, running on `localhost:5173`.
- Backend: Express + TypeScript, running on `localhost:3000`.
- Database: PostgreSQL from `docker-compose.yml`, port `5433`.

## Entry criteria
- `npm install` completed.
- `docker compose up -d db` completed.
- `npm run db:migrate --workspace @ai-agent-platform/backend` completed.
- Backend and frontend can start with `npm run dev`.

## Exit criteria
- All 25 Workflow test cases executed or reviewed.
- No critical blocker remains for Workflow Management demo.
- PR contains screenshots/video evidence and reviewer checklist comment.

## Risks
- If database migration fails, use screenshots of UI + API code as fallback evidence.
- If another branch changes shared layout, keep Workflow route isolated under `/app/workflows` to reduce conflicts.
