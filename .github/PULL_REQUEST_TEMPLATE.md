<!--
  Track Studio PR template.
  The PR title must follow the commit convention: TS-XX: description
-->

## Story / Task

<!-- Story ID and a one-line summary of what it solves. E.g.: TS-03 — Auth0 JWT validation middleware -->

- Story: TS-
- Summary:

## What changes

<!-- Short description of the changes: what was added, modified or removed, and why. -->

## How it was tested

<!-- Steps to verify, or which Pest / frontend tests cover this. An acceptance criterion that can't be verified does not count as tested. -->

- [ ] Automated tests added or updated
- [ ] Verified locally

## Review checklist (required)

### Security — public repo (D2.2)

- [ ] **No real `.env`** or any environment file with real values in the diff
- [ ] **No secrets** (Auth0, AWS, Resend keys, DB credentials) in code, config or commit messages
- [ ] No real client data (Milenium Sound) in seeders, fixtures or examples

### Conventions

- [ ] Title follows `TS-XX: description`
- [ ] Branch follows `feature/TS-XX-name` (or `fix/*` / `hotfix/*`)
- [ ] Table / column / FK names follow D6.6 (if applicable)

### ADR rules

- [ ] Does not touch anything marked `OPEN` in the ADR without flagging it first
- [ ] Does not fall under "What NOT to do yet" (S3, uploads, presigned URLs, integrity hash, migrations for `productions` / `songs` / `versions` / `comments` / `studio_sessions`)
- [ ] If it touches errors: they go through the centralized handler, with the correct `code` field (D3.1)
- [ ] If it touches dates: UTC in persistence (D3.2)
- [ ] If it touches the frontend token: still in memory, never `localStorage` / `sessionStorage` (D5.1)

### CI

- [ ] Pipeline is green
- [ ] Lockfiles committed if dependencies changed (`composer.lock` / `package-lock.json`)

## Notes for the reviewer

<!-- Any context, design decision, or spot where you want specific attention. -->
