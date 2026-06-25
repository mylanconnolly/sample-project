# GitHub App integration

Projects can link one or more GitHub repositories. Access is brokered through a
single **GitHub App**: its credentials are stored (encrypted) in the app, each
org/account that installs it is recorded as an installation, and a linked repo
belongs to a project.

This document covers the one-time GitHub-side setup. Until it's done and the
credentials are entered in the admin UI, the integration is inert.

## 1. Create the GitHub App

On GitHub: **Settings → Developer settings → GitHub Apps → New GitHub App** (under
your org for an org-wide app, or your user for a personal one).

- **Homepage URL**: your app's URL (e.g. `https://your-host`).
- **Webhook → Active**: on.
  - **Webhook URL**: `https://<your-host>/integrations/github/webhooks`
  - **Webhook secret**: generate a strong random string; you'll paste it into the
    admin UI too.
- **Setup URL** (after the app is created, under "Post installation"):
  `https://<your-host>/integrations/github/setup`, with **Redirect on update** on.
- **Permissions → Repository → Metadata: Read-only.** That's enough to list and
  read repositories. Add Contents / Issues / Pull requests (Read) later as new
  features need them.
- **Subscribe to events**: `Installation`, `Installation repositories`,
  `Repository`.
- **Where can this app be installed**: your choice (this account / any account).

After creating it, note the **App ID** and **Client ID**, the **app slug** (the
`...` in `https://github.com/apps/<slug>`), and **generate a private key** — this
downloads a `.pem` file.

## 2. Enter the credentials

As an app admin, go to **Admin → GitHub** (`/app/admin/github`) and fill in:

- **App ID**, **Client ID**, **App slug**
- **Private key (PEM)** — paste the full contents of the downloaded `.pem`
- **Webhook secret** — the same secret you set on GitHub

The private key and webhook secret are encrypted at rest (AshCloak, reusing the
existing `CLOAK_KEY`). They're write-only in the UI: never displayed back, and
leaving them blank on a later save keeps the stored value.

## 3. Install the app

On the same admin page, click **Install on GitHub** (shown once a slug is saved).
Choose the account and the repositories to grant access to. GitHub redirects back
to the setup URL, which records the installation; it then appears under
**Installations** on the admin page. The `installation` /
`installation_repositories` webhooks keep it in step thereafter.

## 4. Link repositories to a project

On a project's detail page, use **Repositories → Add repository**: pick an
installation, then a repository it can access, then link it. Linking fetches the
repo's metadata from GitHub; an hourly background job (`:sync`) keeps it fresh,
and webhook events trigger an immediate refresh.

## Notes

- No new environment variables are required — credentials live in the database,
  encrypted under the existing `CLOAK_KEY`.
- Repository link/unlink is permitted to project admins (membership role `admin`)
  and app admins. The management UI currently lives on the app-admin project page,
  alongside members and tags.
- The GitHub REST base URL is `https://api.github.com` (GitHub Enterprise support
  is a future follow-up).
