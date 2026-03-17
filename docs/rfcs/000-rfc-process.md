# OAHL RFC Process

## Summary
The "Request for Comments" (RFC) process is the primary mechanism for proposing major new features, protocol changes, and architectural additions to the Open Agent Hardware Layer (OAHL) ecosystem.

## Motivation
As OAHL grows into a foundational protocol connecting AI agents to physical hardware, it requires a transparent, community-driven governance model to avoid fracturing the ecosystem.

## When to write an RFC
You should consider writing an RFC for:
- Changes to the core OAHL protocol specification (`oahl-protocol-v1.md`)
- New foundational capabilities that span multiple domains
- Security architecture changes
- Major additions to the CLI or Cloud Relay layer

You do **not** need an RFC for:
- Bug fixes
- Introducing a new adapter plugin for a specific piece of hardware
- Documentation improvements

## RFC Lifecycle
1. **Draft:** Create a PR adding your RFC to `docs/rfcs/0000-my-feature.md` using the template below.
2. **Review:** The core team and community discuss the proposal.
3. **Accepted:** The RFC is merged. This indicates agreement on the design, though implementation might still be pending.
4. **Implemented:** The feature lands in main.
5. **Rejected:** The RFC is closed with rationale.

## Template

Submit your RFC as a Markdown file copying the structure below:

```markdown
# RFC: [Feature Name]

- Author: [Name or Handle]
- Date: [YYYY-MM-DD]
- Status: Draft

## Summary
One paragraph explanation of the feature.

## Motivation
Why are we doing this? What problem does it solve?

## Detailed Design
Explain the technical architecture, protocol changes, data models, or API boundaries required.

## Drawbacks
Why should we *not* do this?

## Alternatives
What other designs were considered?
```
