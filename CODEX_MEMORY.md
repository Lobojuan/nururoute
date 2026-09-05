# NuruRoute Project Memory

Last updated: 2026-09-04

- GitHub repository `Lobojuan/nururoute` is the current source of truth.
- The initial source baseline was exported from the NuruRoute Lovable project on 2026-09-04 and committed as `ecc1ea5`.
- The project is an investor demo and mock/sandbox foundation. Do not represent payments, AI-provider connections, vouchers, customers, or provider partnerships as live without independent approval and verification.
- Use one feature branch per change. Never force-push or rewrite published Git history.
- Migration numbers are reserved in filename order. Before creating a migration, inspect `packages/database/migrations/`, take the next unused number, and record the reservation here in the same change. Never rename or edit a migration that has already been applied outside a local disposable database.
- Current migration sequence ends at `0006_subscription_foundation.sql`. The next new migration is `0007`; coordinate any concurrent work before reserving it.
- Run `scripts/check-project-state.sh` for a read-only handoff report before reviews. It must never push, deploy, publish, or edit files.
- Never store API keys, passwords, MoMo/payment data, or investor/private contact details in this file or in Git.
