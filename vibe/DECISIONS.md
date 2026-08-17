# DECISIONS — JobRadar
> Append-only log of architectural and technical decisions.

## Format
### D-[ID] — [Title]
- **Date**: YYYY-MM-DD · **Task**: [TASK-ID] · **Type**: drift | blocker-resolution | tech-choice | scope-change | discovery
- **What was planned**: ...
- **What was done**: ...
- **Why**: ...
- **Impact**: ...
- **Approved by**: human | agent-autonomous

---

### D-001 — Single Repo Architecture for Express Worker & Next.js Dashboard
- **Date**: 2026-08-11 · **Task**: P1-001 · **Type**: tech-choice
- **What was planned**: Standalone worker process and separate dashboard app
- **What was done**: Maintained Express backend worker in root `src/` and Next.js 14 frontend in `dashboard/` subfolder sharing single MongoDB instance
- **Why**: Simplifies development workflow and local execution for single user
- **Impact**: Shared database schemas and straightforward environment configuration
- **Approved by**: agent-autonomous
