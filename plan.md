## Plan: Next Iteration (Frontend Dashboard V2)

Previous MVP phases are complete. This plan defines the next frontend iteration as a role-aware, dashboard-first experience with stronger navigation, authentication flow, and group lifecycle UX.

## Product Direction
The application is a dashboard-based expense sharing platform where users manage groups, expenses, balances, and settlements.

Core UX principles:
1. Persistent sidebar navigation.
2. Dedicated screen per module in main content area.
3. Minimal clicks and clear financial visibility.
4. Role-aware actions and transparent states.

## Key Functional Update
Group membership is managed only by group admins:
1. Admins can add users directly to a group.
2. No user join-request flow is included in this iteration.

## Phase 7: Frontend Authentication and Route Security
1. Restrict unauthenticated users to login/signup routes only.
2. Store session token securely after successful login.
3. Redirect authenticated users to dashboard by default.
4. Protect all app routes behind auth guard.
5. Auto-redirect to login when session is missing/expired.

Deliverables:
1. Auth pages (Login, Signup).
2. Protected route wrapper.
3. Token/session management service.
4. Logout flow and forced redirect handling.

## Phase 8: App Shell and Navigation Architecture
1. Build persistent layout with:
2. Left sidebar navigation.
3. Top header with user quick actions/profile.
4. Dynamic main content region for module screens.
5. Ensure sidebar modules are always present:
6. Dashboard, Users, Groups, Expenses, Balances, Settlements, Profile/Settings.

Deliverables:
1. Responsive shell layout (desktop/mobile).
2. Route map for all modules.
3. Active route highlighting and breadcrumb/title behavior.

## Phase 9: Dashboard Experience
1. Make dashboard the post-login landing screen.
2. Display overview cards:
3. Total amount user owes.
4. Total amount owed to user.
5. Active groups.
6. Recent expenses.
7. Add quick actions: Create Group, Add Expense.
8. Implement zero-state onboarding guidance.

Deliverables:
1. Overview widgets.
2. Recent activity list.
3. Empty-state component with guided CTA.

## Phase 10: Users and Profile Management
1. Build user account screen for profile data.
2. Support create/update profile.
3. Support dynamic multiple contact numbers.
4. Frontend uniqueness check for email before submit.
5. Add profile/settings screen for:
6. Name, email, phone list management.
7. Password change workflow.
8. Secure logout.

Deliverables:
1. User management form with dynamic phone fields.
2. Validation schema and reusable form errors.
3. Profile/settings module.

## Phase 11: Groups and Membership Workflows
1. Build groups screen with:
2. Create group (name + description).
3. List all groups user belongs to.
4. Open group workspace view.
5. Show members, group summary, totals.
6. Support admin direct-add member flow.

UX behavior rules:
1. Group module always visible in sidebar.
2. Actions shown/hidden based on role.

Deliverables:
1. Group list and workspace screens.
2. Membership management panel.
3. Role-based member administration UI (admin-only add/remove actions).

## Phase 12: Expenses, Balances, and Settlements UI
1. Expense screen:
2. Select payer, amount, description, split type.
3. Dynamic split form behavior by mode:
4. Equal: auto-calc.
5. Exact: per-user amount input.
6. Percentage: per-user percent input.
7. Group expense history with filters (date/payer).
8. Expandable expense details.
9. Balance screen:
10. Net balances, who owes whom, receivable/owed totals.
11. Toggle between detailed and simplified views.
12. Settlement screen:
13. Record payment between users.
14. Instant balance refresh after submit.
15. Settlement history list.

Deliverables:
1. Expense creation + history module.
2. Balance module (detailed/simplified modes).
3. Settlement module with update feedback.

## Phase 13: UX, Visual System, and Feedback Standards
1. Apply dashboard-style visual language across modules.
2. Maintain strong hierarchy and readable data blocks.
3. Add empty states for new users/groups.
4. Add loading, success, and error states for all async actions.
5. Keep color semantics consistent:
6. Green = money owed to user.
7. Red = user owes money.
8. Neutral = balanced.

Deliverables:
1. Shared UI primitives (cards, tables, alerts, states).
2. Accessibility checks for form labels and keyboard navigation.
3. Mobile behavior polish for all primary workflows.

## Phase 14: Quality Gate and End-to-End Validation
1. Expand frontend tests for:
2. Split input behavior and validation.
3. Main route rendering and protected navigation.
4. Core flow interaction tests across modules.
5. Execute full scenario:
6. Login -> Dashboard -> Create Group -> Add Member -> Add Expense -> View Balances -> Record Settlement -> Verify updated balances.

Deliverables:
1. Frontend unit/integration test suite.
2. End-to-end scenario checklist and run log.
3. Release readiness checklist.

## Updated Scope
Included in this iteration:
1. Full dashboard navigation and role-aware frontend workflows.
2. Admin-managed membership UI (direct add/remove lifecycle).
3. Auth-protected route architecture and session control.

Out of scope for this iteration:
1. Recurring expenses.
2. Notifications.
3. OCR receipts.
4. Multi-currency conversion.
5. Production auth hardening beyond current token flow.

## Navigation Flow (Target)
1. Login -> Dashboard -> Groups -> Group Workspace -> Expenses -> Balances -> Settlement.
2. Sidebar allows fast switching at any point.

## Final Architecture Summary (Iteration)
The frontend evolves into a scalable, role-aware financial management dashboard:
1. Normal users: create groups, manage expenses, manage settlements, and access groups where they are members.
2. Admin users: all normal capabilities plus member and group structure control.
3. System focus: clarity, consistency, and low-friction task completion for group collaboration.