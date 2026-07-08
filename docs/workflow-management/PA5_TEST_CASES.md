# Workflow Management — PA5 Test Cases

Owner: Nguyễn Trung Dũng  
Module: Workflow Management  
Deadline target: 02/07/2026 before 23:59

## Feature coverage

| Feature | Scope |
|---|---|
| F1 | View Workflow List |
| F2 | Create Workflow |
| F3 | Edit Workflow |
| F4 | View Workflow Detail |
| F5 | Execute Workflow + Execution History |

## Test cases

| ID | Level | Feature | Scenario | Steps | Expected result | Status |
|---|---|---|---|---|---|---|
| WF-L1 | Unit | List | Repository returns seeded workflows | Run migration, call `GET /api/workflows` | Response contains at least 2 workflows | Ready |
| WF-L2 | System | List | Filter active workflows on UI | Open `/app/workflows`, choose Active filter | Only Active workflow cards remain visible | Ready |
| WF-L3 | System | List | Search workflow by name | Type `Customer` in search box | Customer onboarding workflow is visible | Ready |
| WF-L4 | Acceptance | List | User scans workflow overview | Open page and review list columns | Name, status, steps, last run are visible | Ready |
| WF-L5 | Regression | List | App shell still opens | Open `/app` then click Workflow Management | Workflow console opens without breaking auth layout | Ready |
| WF-C1 | Unit | Create | Create valid workflow | POST valid name/status/steps | HTTP 201 with workflow id | Ready |
| WF-C2 | Unit | Create | Empty name validation | POST empty name | HTTP 400 `Workflow name is required` | Ready |
| WF-C3 | Unit | Create | Missing steps validation | POST steps `[]` | HTTP 400 validation message | Ready |
| WF-C4 | Integration | Create | Persist created workflow | POST workflow then GET list | New workflow appears in list | Ready |
| WF-C5 | System | Create | Create from UI | Fill form and save | Success message and selected workflow updated | Ready |
| WF-E1 | Unit | Edit | Edit description | PATCH description | Response contains updated description | Ready |
| WF-E2 | Unit | Edit | Edit missing id | PATCH random id | HTTP 404 | Ready |
| WF-E3 | Unit | Edit | Archived workflow cannot edit | PATCH archived workflow | HTTP 400 validation message | Ready |
| WF-E4 | Integration | Edit | Persist edited steps | PATCH steps then GET detail | New steps are returned | Ready |
| WF-E5 | System | Edit | Edit from UI | Select workflow, edit form, save | Workflow card/detail updates | Ready |
| WF-D1 | Unit | Detail | Get detail by id | GET `/api/workflows/:id` | Full workflow including steps returned | Ready |
| WF-D2 | Unit | Detail | Missing detail | GET random id | HTTP 404 | Ready |
| WF-D3 | Integration | Detail | Detail after execution | Execute then get workflow | executionCount increased | Ready |
| WF-D4 | System | Detail | UI detail panel | Click workflow card | Metadata and step sequence visible | Ready |
| WF-D5 | Acceptance | Detail | User understands workflow | Reviewer inspects detail panel | Steps, status, updated, last run are clear | Ready |
| WF-X1 | Unit | Execute | Execute active workflow | POST `/execute` for active workflow | HTTP 201, status success, logs returned | Ready |
| WF-X2 | Unit | Execute | Execute draft workflow | POST `/execute` for draft workflow | HTTP 400 `Only active workflows can be executed` | Ready |
| WF-X3 | Integration | Execute | Persist execution logs | Execute then GET executions | Execution appears with step logs | Ready |
| WF-X4 | System | Execute | Run from UI | Click Run now and confirm | Success message + history updated | Ready |
| WF-X5 | Acceptance | Execute | Reviewer verifies audit trail | Open history after run | Timestamp, id, status, duration, logs visible | Ready |
