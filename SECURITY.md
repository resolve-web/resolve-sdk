# Security Policy

## Supported versions

Security fixes are applied to the latest `main` branch until the first registry release, then to the latest published release.

## Reporting a vulnerability

Please report security issues through [GitHub private vulnerability reporting](https://github.com/resolve-web/resolve-sdk/security/advisories/new).

Include:

- A description of the issue and its impact
- Steps to reproduce (PoC if available)
- Affected package version(s)

Do **not** open a public GitHub issue for vulnerabilities that could put user funds or keys at risk.

We aim to acknowledge reports within a few business days. Please give us reasonable time to investigate and publish a fix before any public disclosure.

## Scope notes

- This SDK builds and simulates Soroban transactions; wallet / key management is the integrator’s responsibility.
- Never commit secret keys. Use `.env` locally (see `.env.example`) and keep secrets out of git.
