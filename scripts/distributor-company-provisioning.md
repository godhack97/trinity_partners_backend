# Staged provisioning of legacy distributors

The source of truth is
`distributor-company-mapping.template.csv`. Populate it only with verified
legal and owner data. More than one legacy distributor ID may point to the same
real company, but every target identity must then be identical in every row.

Run the default read-only preflight:

```bash
npm run provision:deal-distributors
```

The planner validates all non-deleted deals with a legacy distributor, legal
company names, Russian INN checksums, owner email/phone uniqueness, active
PartnerManager roles, company ownership, accepted membership, company status,
and existing canonical deal links. Exit code `2` means that the audit completed
but the import is not ready.

The normal registration endpoint requires a password supplied by the owner and
does not expose a passwordless invitation completion flow. Therefore this tool
never creates users, salts, passwords, or confirmation tokens. After migration
`1780317800000` is deployed, explicit execute mode stores missing-owner rows in
`distributor_company_import_plans`. The owner then self-registers through the
portal; an administrator reviews/approves the company; rerunning the planner
reconciles the existing user and company.

Only an already accepted distributor company with an exact owner, accepted
membership, and responsible PartnerManager can receive legacy deals. The write
path is a single transaction and refuses production/non-local databases:

```bash
npm run provision:deal-distributors -- \
  --execute \
  --confirm STAGE-AND-BACKFILL-DISTRIBUTORS
```

Do not use execute mode before reviewing the complete JSON plan and database
backup. A changed staged mapping is rejected instead of silently overwritten.
