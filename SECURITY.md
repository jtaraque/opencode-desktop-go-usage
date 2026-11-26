# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| Older | No |

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Include the affected version, OpenCode Desktop version, operating system, reproduction steps and any relevant logs.

Do not open a public issue for a security problem. Do not include workspace IDs, tokens, API keys or private session content in a report; redact them first.

## Scope

The plugin is a read-only interface for the local OpenCode server:

- It calls `GET /api/experimental/usage/limits` on the server that runs the plugin.
- It opens the Console URL from the response only when the user presses **Console ↗**.
- It does not store credentials or write usage data to disk.

Reports about the OpenCode Desktop app itself should go to the OpenCode project, not to this plugin.
