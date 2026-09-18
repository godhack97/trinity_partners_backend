# Docker deployment

The deployment entry points are:

```bash
./deploy-prod.sh
./deploy-test.sh
```

Both scripts are launched from the developer workstation. Before connecting to
the server they verify that the backend, portal and admin repositories have no
local changes and that each local `HEAD` is present at `origin/master`.

The scripts intentionally do not create or download backups. Backup policy is
handled independently from application deployment.

## Production

Production uses `/var/www/trinity/.env.docker` and the existing Compose files in
`/var/www/trinity`. The deploy script updates all three repositories with
`git pull --ff-only`, builds a uniquely tagged image, replaces only
`trinity-app`, and verifies health, protected endpoints and every Next.js asset
referenced by the sign-in page.

Validation without a deployment:

```bash
./deploy-prod.sh --dry-run
```

## Test environment

Test is an independent Compose project named `trinity-test`. It binds only to
the ports already used by the test Nginx virtual hosts:

- portal: `127.0.0.1:9140` → `https://partner-test.trinity.ru`;
- backend: `127.0.0.1:9141` → `https://partner-api-test.trinity.ru`;
- admin: `127.0.0.1:9145` → `https://admin-test.trinity.ru`.

It has separate MariaDB, public/upload/log volumes, cookie names and disabled
SMTP, Bitrix and scheduled jobs. It never connects to the production database.

On the first test Docker deployment the script creates server-only
`/var/www/trinity-test/.env.docker` with cryptographically random database,
captcha, CSRF and metrics secrets. Existing env files are never overwritten.
The first start creates a new empty `trinity_test` database and applies all migrations.
If the existing PM2 test database must be retained, migrate it into the Docker
MariaDB volume as a separate one-time operation before switching the test
domains.

Validation without a deployment:

```bash
./deploy-test.sh --dry-run
```

On the first successful test deployment the script stops the three legacy test
PM2 processes. On a failed first cutover it starts exactly those processes
again. Later deployments roll back to the previous test Docker image if an
HTTP or asset check fails.
