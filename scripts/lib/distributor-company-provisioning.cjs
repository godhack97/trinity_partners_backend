"use strict";

const crypto = require("node:crypto");

const REQUIRED_HEADERS = Object.freeze([
  "legacy_distributor_id",
  "legacy_name",
  "legal_company_name",
  "inn",
  "owner_first_name",
  "owner_last_name",
  "owner_email",
  "owner_phone",
  "responsible_manager_user_id",
  "existing_company_id",
]);

const LEGAL_FORM_PATTERN = /^(?:ООО|АО|ПАО|НАО|ЗАО|ОАО|ИП|ФГУП|ГУП|МУП|АНО|НКО|ПК|СПК|ТСЖ|СНТ|КФХ|ГБУ|МБУ|ФГБУ|ЧОУ|ФОНД|АССОЦИАЦИЯ|СОЮЗ)\s+\S/iu;
const PERSON_NAME_PATTERN = /^[\p{L}][\p{L}\p{M}'’\- ]{0,99}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u;
const INN_SEPARATOR_PATTERN = /[\s./()\-\u2010-\u2015]/gu;
const INN_INPUT_PATTERN = /^[0-9\s./()\-\u2010-\u2015]+$/u;

class ProvisioningInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProvisioningInputError";
  }
}

function parseCsv(text) {
  if (typeof text !== "string") {
    throw new ProvisioningInputError("CSV input must be a string");
  }

  const matrix = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;

  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((value) => value.trim() !== "")) {
      matrix.push({ line: rowStartLine, values: row });
    }
    row = [];
    rowStartLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
        if (character === "\n") line += 1;
      }
      continue;
    }

    if (character === '"') {
      if (field !== "") {
        throw new ProvisioningInputError(
          `Unexpected quote in CSV field at line ${line}`,
        );
      }
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      pushRow();
      line += 1;
    } else if (character === "\r") {
      if (next !== "\n") pushRow();
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new ProvisioningInputError("Unclosed quoted CSV field");
  }
  if (field !== "" || row.length > 0) pushRow();
  if (matrix.length === 0) throw new ProvisioningInputError("CSV is empty");

  const headers = matrix[0].values.map((value, index) =>
    (index === 0 ? value.replace(/^\uFEFF/u, "") : value).trim(),
  );
  const duplicates = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );
  if (duplicates.length > 0) {
    throw new ProvisioningInputError(
      `Duplicate CSV headers: ${[...new Set(duplicates)].join(", ")}`,
    );
  }

  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  const unexpected = headers.filter((header) => !REQUIRED_HEADERS.includes(header));
  if (missing.length > 0 || unexpected.length > 0) {
    const details = [];
    if (missing.length > 0) details.push(`missing: ${missing.join(", ")}`);
    if (unexpected.length > 0) {
      details.push(`unexpected: ${unexpected.join(", ")}`);
    }
    throw new ProvisioningInputError(`Invalid CSV headers (${details.join("; ")})`);
  }

  return matrix.slice(1).map(({ line: sourceLine, values }) => {
    if (values.length !== headers.length) {
      throw new ProvisioningInputError(
        `CSV line ${sourceLine} has ${values.length} fields; expected ${headers.length}`,
      );
    }
    return Object.fromEntries([
      ["source_line", sourceLine],
      ...headers.map((header, index) => [header, values[index].trim()]),
    ]);
  });
}

function normalizeCompanyName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("ru-RU");
}

function normalizeEmail(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase();
}

function normalizePhone(value) {
  const raw = String(value ?? "").normalize("NFKC").trim();
  if (!raw || !/^\+?[0-9\s().\-]+$/u.test(raw)) return null;
  let digits = raw.replace(/\D/gu, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15 || /^(\d)\1+$/u.test(digits)) {
    return null;
  }
  return `+${digits}`;
}

function checksumDigit(digits, weights) {
  return weights.reduce((sum, weight, index) => sum + weight * digits[index], 0) % 11 % 10;
}

function normalizeRussianInn(value) {
  const raw = String(value ?? "").trim();
  if (!raw || !INN_INPUT_PATTERN.test(raw)) return null;
  const normalized = raw.replace(INN_SEPARATOR_PATTERN, "");
  if (![10, 12].includes(normalized.length) || /^(\d)\1+$/u.test(normalized)) {
    return null;
  }

  const digits = [...normalized].map(Number);
  if (normalized.length === 10) {
    const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
    return checksumDigit(digits, weights) === digits[9] ? normalized : null;
  }

  const first = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
  const second = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
  return checksumDigit(digits, first) === digits[10] &&
    checksumDigit(digits, second) === digits[11]
    ? normalized
    : null;
}

function positiveInteger(value) {
  if (!/^[1-9]\d*$/u.test(String(value ?? "").trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isDeleted(row) {
  return row?.deleted_at !== null && row?.deleted_at !== undefined;
}

function roleNames(user) {
  if (Array.isArray(user?.role_names)) return new Set(user.role_names);
  return new Set(
    String(user?.role_names ?? "")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean),
  );
}

function issue(code, message, field) {
  return { code, message, ...(field ? { field } : {}) };
}

function canonicalizeMapping(raw) {
  const issues = [];
  const legacyDistributorId = positiveInteger(raw.legacy_distributor_id);
  const existingCompanyId = raw.existing_company_id
    ? positiveInteger(raw.existing_company_id)
    : null;
  const managerId = positiveInteger(raw.responsible_manager_user_id);
  const legalCompanyName = String(raw.legal_company_name ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ");
  const ownerFirstName = String(raw.owner_first_name ?? "").normalize("NFKC").trim();
  const ownerLastName = String(raw.owner_last_name ?? "").normalize("NFKC").trim();
  const ownerEmail = normalizeEmail(raw.owner_email);
  const ownerPhone = normalizePhone(raw.owner_phone);
  const inn = normalizeRussianInn(raw.inn);

  if (!legacyDistributorId) {
    issues.push(issue("INVALID_LEGACY_DISTRIBUTOR_ID", "Legacy distributor ID must be a positive integer", "legacy_distributor_id"));
  }
  if (raw.existing_company_id && !existingCompanyId) {
    issues.push(issue("INVALID_EXISTING_COMPANY_ID", "Existing company ID must be empty or a positive integer", "existing_company_id"));
  }
  if (!managerId) {
    issues.push(issue("INVALID_RESPONSIBLE_MANAGER_ID", "Responsible manager user ID must be a positive integer", "responsible_manager_user_id"));
  }
  if (
    legalCompanyName.length < 4 ||
    legalCompanyName.length > 255 ||
    /[\u0000-\u001F<>\{\}]/u.test(legalCompanyName) ||
    !LEGAL_FORM_PATTERN.test(legalCompanyName)
  ) {
    issues.push(issue("INVALID_LEGAL_COMPANY_NAME", "Use a full legal name (for example, ООО «Альфа») with a recognized legal form", "legal_company_name"));
  }
  if (!inn) {
    issues.push(issue("INVALID_RUSSIAN_INN", "INN must contain 10 or 12 digits and pass the Russian checksum", "inn"));
  }
  if (!PERSON_NAME_PATTERN.test(ownerFirstName) || ownerFirstName.length < 2) {
    issues.push(issue("INVALID_OWNER_FIRST_NAME", "Owner first name is invalid", "owner_first_name"));
  }
  if (!PERSON_NAME_PATTERN.test(ownerLastName) || ownerLastName.length < 2) {
    issues.push(issue("INVALID_OWNER_LAST_NAME", "Owner last name is invalid", "owner_last_name"));
  }
  if (!EMAIL_PATTERN.test(ownerEmail) || ownerEmail.length > 255) {
    issues.push(issue("INVALID_OWNER_EMAIL", "Owner email is invalid", "owner_email"));
  }
  if (!ownerPhone) {
    issues.push(issue("INVALID_OWNER_PHONE", "Owner phone must contain 10 to 15 digits", "owner_phone"));
  }

  const canonical = {
    source_line: Number(raw.source_line) || null,
    legacy_distributor_id: legacyDistributorId,
    legacy_name: String(raw.legacy_name ?? "").normalize("NFKC").trim(),
    legal_company_name: legalCompanyName,
    inn,
    owner_first_name: ownerFirstName,
    owner_last_name: ownerLastName,
    owner_email: ownerEmail,
    owner_phone: ownerPhone,
    responsible_manager_user_id: managerId,
    existing_company_id: existingCompanyId,
  };

  return { canonical, issues };
}

function fingerprint(mapping) {
  const fields = REQUIRED_HEADERS.map((header) => mapping[header] ?? "");
  return crypto.createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

function addIdentityConsistencyIssues(rows, key, label) {
  const buckets = new Map();
  for (const row of rows) {
    const value = row.mapping[key];
    if (!value) continue;
    const bucket = buckets.get(value) || [];
    bucket.push(row);
    buckets.set(value, bucket);
  }

  for (const [value, bucket] of buckets) {
    if (bucket.length < 2) continue;
    const identities = new Set(
      bucket.map(({ mapping }) =>
        JSON.stringify([
          normalizeCompanyName(mapping.legal_company_name),
          mapping.inn,
          mapping.owner_email,
          mapping.owner_phone,
          mapping.owner_first_name.toLocaleLowerCase("ru-RU"),
          mapping.owner_last_name.toLocaleLowerCase("ru-RU"),
          mapping.responsible_manager_user_id,
          mapping.existing_company_id,
        ]),
      ),
    );
    if (identities.size > 1) {
      for (const row of bucket) {
        row.issues.push(
          issue(
            `NON_UNIQUE_${key.toUpperCase()}`,
            `${label} ${value} is assigned to conflicting target identities`,
            key,
          ),
        );
      }
    }
  }
}

function buildDistributorProvisioningPlan({
  mappingRows,
  legacyDistributors = [],
  deals = [],
  companies = [],
  users = [],
  memberships = [],
  forbiddenInns = [],
  stagedPlans = [],
  schema = {},
}) {
  const rows = mappingRows.map((raw) => {
    const { canonical, issues } = canonicalizeMapping(raw);
    return {
      mapping: canonical,
      mapping_fingerprint: fingerprint(canonical),
      issues,
      resolution: {
        owner_user_id: null,
        company_id: null,
        affected_nondeleted_deals: 0,
        unassigned_nondeleted_deals: 0,
      },
      action: "blocked",
    };
  });

  const legacyById = new Map(legacyDistributors.map((item) => [Number(item.id), item]));
  const nondeletedDeals = deals.filter((deal) => !isDeleted(deal));
  const referencedIds = new Set(
    nondeletedDeals
      .map((deal) => Number(deal.distributor_id))
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  );
  const rowsByLegacyId = new Map();
  for (const row of rows) {
    const id = row.mapping.legacy_distributor_id;
    if (!id) continue;
    const bucket = rowsByLegacyId.get(id) || [];
    bucket.push(row);
    rowsByLegacyId.set(id, bucket);
  }

  for (const [id, bucket] of rowsByLegacyId) {
    if (bucket.length > 1) {
      for (const row of bucket) {
        row.issues.push(issue("DUPLICATE_LEGACY_DISTRIBUTOR_ID", `Legacy distributor ${id} must appear exactly once`, "legacy_distributor_id"));
      }
    }
  }
  for (const id of referencedIds) {
    if (!rowsByLegacyId.has(id)) {
      rows.push({
        mapping: { legacy_distributor_id: id, source_line: null },
        mapping_fingerprint: null,
        issues: [issue("MISSING_REFERENCED_LEGACY_DISTRIBUTOR", `Referenced legacy distributor ${id} is missing from the mapping`, "legacy_distributor_id")],
        resolution: {
          owner_user_id: null,
          company_id: null,
          affected_nondeleted_deals: nondeletedDeals.filter((deal) => Number(deal.distributor_id) === id).length,
          unassigned_nondeleted_deals: 0,
        },
        action: "blocked",
      });
    }
  }

  addIdentityConsistencyIssues(rows, "inn", "INN");
  addIdentityConsistencyIssues(rows, "owner_email", "Owner email");
  addIdentityConsistencyIssues(rows, "owner_phone", "Owner phone");

  const companiesById = new Map(companies.map((company) => [Number(company.id), company]));
  const usersById = new Map(users.map((user) => [Number(user.id), user]));
  const forbidden = new Set(forbiddenInns.map((item) => normalizeRussianInn(item.inn)).filter(Boolean));

  for (const row of rows) {
    const mapping = row.mapping;
    const legacyId = mapping.legacy_distributor_id;
    const rowDeals = legacyId
      ? nondeletedDeals.filter((deal) => Number(deal.distributor_id) === legacyId)
      : [];
    row.resolution.affected_nondeleted_deals = rowDeals.length;
    row.resolution.unassigned_nondeleted_deals = rowDeals.filter(
      (deal) => deal.distributor_company_id === null || deal.distributor_company_id === undefined,
    ).length;
    if (!legacyId || !mapping.inn || !mapping.owner_email || !mapping.owner_phone) continue;

    const legacy = legacyById.get(legacyId);
    if (!legacy) {
      row.issues.push(issue("LEGACY_DISTRIBUTOR_NOT_FOUND", `Legacy distributor ${legacyId} does not exist`, "legacy_distributor_id"));
    } else if (normalizeCompanyName(legacy.name) !== normalizeCompanyName(mapping.legacy_name)) {
      row.issues.push(issue("LEGACY_NAME_MISMATCH", `CSV legacy name does not match distributor ${legacyId}`, "legacy_name"));
    }
    if (!referencedIds.has(legacyId)) {
      row.issues.push(issue("UNREFERENCED_LEGACY_DISTRIBUTOR", `Legacy distributor ${legacyId} has no non-deleted deals and must not be provisioned by this import`, "legacy_distributor_id"));
    }
    if (forbidden.has(mapping.inn)) {
      row.issues.push(issue("FORBIDDEN_INN", `INN ${mapping.inn} is blocked from registration`, "inn"));
    }

    const manager = usersById.get(mapping.responsible_manager_user_id);
    if (
      !manager ||
      isDeleted(manager) ||
      !Boolean(manager.is_activated) ||
      !roleNames(manager).has("partner_manager")
    ) {
      row.issues.push(issue("INVALID_RESPONSIBLE_MANAGER", `User ${mapping.responsible_manager_user_id} is not an active PartnerManager`, "responsible_manager_user_id"));
    }

    const emailMatches = users.filter(
      (user) => normalizeEmail(user.email) === mapping.owner_email,
    );
    const phoneMatches = users.filter(
      (user) => normalizePhone(user.phone) === mapping.owner_phone,
    );
    if (emailMatches.length > 1) {
      row.issues.push(issue("AMBIGUOUS_OWNER_EMAIL", `Owner email resolves to ${emailMatches.length} users`, "owner_email"));
    }
    if (phoneMatches.length > 1) {
      row.issues.push(issue("AMBIGUOUS_OWNER_PHONE", `Owner phone resolves to ${phoneMatches.length} users`, "owner_phone"));
    }

    const owner = emailMatches.length === 1 ? emailMatches[0] : null;
    if (!owner && phoneMatches.length > 0) {
      row.issues.push(issue("OWNER_PHONE_ALREADY_USED", "Owner phone belongs to a user with a different email", "owner_phone"));
    }
    if (owner && phoneMatches.some((candidate) => Number(candidate.id) !== Number(owner.id))) {
      row.issues.push(issue("OWNER_EMAIL_PHONE_CONFLICT", "Owner email and phone resolve to different users"));
    }
    if (owner) {
      row.resolution.owner_user_id = Number(owner.id);
      if (Number(owner.user_info_count || 0) !== 1) {
        row.issues.push(issue("AMBIGUOUS_OWNER_PROFILE", `Owner user ${owner.id} must have exactly one profile row`));
      }
      if (isDeleted(owner) || !Boolean(owner.is_activated) || !Boolean(owner.email_confirmed)) {
        row.issues.push(issue("OWNER_USER_INACTIVE", `Owner user ${owner.id} is deleted, inactive, or has an unconfirmed email`, "owner_email"));
      }
      if (normalizePhone(owner.phone) !== mapping.owner_phone) {
        row.issues.push(issue("OWNER_PHONE_MISMATCH", `Owner user ${owner.id} does not have the mapped phone`, "owner_phone"));
      }
      if (
        String(owner.first_name ?? "").trim().toLocaleLowerCase("ru-RU") !== mapping.owner_first_name.toLocaleLowerCase("ru-RU") ||
        String(owner.last_name ?? "").trim().toLocaleLowerCase("ru-RU") !== mapping.owner_last_name.toLocaleLowerCase("ru-RU")
      ) {
        row.issues.push(issue("OWNER_NAME_MISMATCH", `Owner user ${owner.id} name does not match the mapping`));
      }
    }

    const innCandidates = companies.filter(
      (company) => normalizeRussianInn(company.inn) === mapping.inn,
    );
    const nameCandidates = companies.filter(
      (company) => normalizeCompanyName(company.name) === normalizeCompanyName(mapping.legal_company_name),
    );
    let company = null;
    if (mapping.existing_company_id) {
      company = companiesById.get(mapping.existing_company_id) || null;
      if (!company) {
        row.issues.push(issue("EXISTING_COMPANY_NOT_FOUND", `Company ${mapping.existing_company_id} does not exist`, "existing_company_id"));
      }
    } else if (innCandidates.length === 1) {
      company = innCandidates[0];
    } else if (innCandidates.length > 1) {
      row.issues.push(issue("AMBIGUOUS_COMPANY_INN", `INN ${mapping.inn} resolves to ${innCandidates.length} companies`, "inn"));
    }

    if (company) {
      row.resolution.company_id = Number(company.id);
      if (isDeleted(company)) {
        row.issues.push(issue("COMPANY_SOFT_DELETED", `Company ${company.id} is soft-deleted`, "existing_company_id"));
      }
      if (normalizeRussianInn(company.inn) !== mapping.inn) {
        row.issues.push(issue("COMPANY_INN_MISMATCH", `Company ${company.id} has a different INN`, "inn"));
      }
      if (normalizeCompanyName(company.name) !== normalizeCompanyName(mapping.legal_company_name)) {
        row.issues.push(issue("COMPANY_NAME_MISMATCH", `Company ${company.id} has a different legal name`, "legal_company_name"));
      }
      const competingInnCompanies = innCandidates.filter(
        (candidate) => Number(candidate.id) !== Number(company.id),
      );
      if (competingInnCompanies.length > 0) {
        row.issues.push(issue("AMBIGUOUS_COMPANY_INN", `INN ${mapping.inn} also belongs to company IDs ${competingInnCompanies.map((item) => item.id).join(", ")}`, "inn"));
      }
      if (company.partnership_type !== "distributor") {
        row.issues.push(issue("COMPANY_WRONG_TYPE", `Company ${company.id} is not a distributor`));
      }
      if (company.status !== "accept") {
        row.issues.push(issue("COMPANY_NOT_ACCEPTED", `Company ${company.id} has status ${company.status}`));
      }
      if (Number(company.responsible_manager_id) !== mapping.responsible_manager_user_id) {
        row.issues.push(issue("COMPANY_MANAGER_MISMATCH", `Company ${company.id} is not assigned to the mapped PartnerManager`, "responsible_manager_user_id"));
      }
      if (!owner || Number(company.owner_id) !== Number(owner.id)) {
        row.issues.push(issue("COMPANY_OWNER_MISMATCH", `Company ${company.id} owner does not match the mapped user`, "owner_email"));
      } else {
        const ownerRoles = roleNames(owner);
        if (!ownerRoles.has("partner") || !ownerRoles.has("company_admin")) {
          row.issues.push(issue("OWNER_ROLE_MISMATCH", `Owner user ${owner.id} must have partner and company_admin roles`));
        }
        const ownerMemberships = memberships.filter(
          (membership) => !isDeleted(membership) && Number(membership.employee_id) === Number(owner.id),
        );
        const companyMemberships = ownerMemberships.filter(
          (membership) => Number(membership.company_id) === Number(company.id),
        );
        if (ownerMemberships.length !== 1 || companyMemberships.length !== 1) {
          row.issues.push(issue("AMBIGUOUS_OWNER_MEMBERSHIP", `Owner user ${owner.id} must have exactly one active company membership`));
        } else if (companyMemberships[0].status !== "accept") {
          row.issues.push(issue("OWNER_MEMBERSHIP_NOT_ACCEPTED", `Owner membership in company ${company.id} is not accepted`));
        }
      }
    } else if (nameCandidates.length > 0) {
      row.issues.push(issue("COMPANY_NAME_COLLISION", `Legal name matches company IDs ${nameCandidates.map((item) => item.id).join(", ")} with a different or invalid INN`, "legal_company_name"));
    }

    if (!company && owner) {
      const ownerMemberships = memberships.filter(
        (membership) => !isDeleted(membership) && Number(membership.employee_id) === Number(owner.id),
      );
      if (ownerMemberships.length > 0) {
        row.issues.push(issue("OWNER_ALREADY_IN_COMPANY", `Owner user ${owner.id} already has an active company membership`));
      }
    }

    const conflictingCompanyIds = [...new Set(
      rowDeals
        .map((deal) => deal.distributor_company_id)
        .filter((id) => id !== null && id !== undefined)
        .map(Number)
        .filter((id) => !company || id !== Number(company.id)),
    )];
    if (conflictingCompanyIds.length > 0) {
      row.issues.push(issue("DEAL_COMPANY_CONFLICT", `Legacy distributor ${legacyId} already points to conflicting company IDs ${conflictingCompanyIds.join(", ")}`));
    }

    const matchingStagedPlans = stagedPlans.filter(
      (plan) => Number(plan.legacy_distributor_id) === legacyId,
    );
    if (matchingStagedPlans.length > 1) {
      row.issues.push(issue("AMBIGUOUS_STAGED_PLAN", `Legacy distributor ${legacyId} has multiple staged plans`));
    } else if (
      matchingStagedPlans.length === 1 &&
      matchingStagedPlans[0].mapping_fingerprint !== row.mapping_fingerprint
    ) {
      row.issues.push(issue("STAGED_PLAN_CHANGED", `The staged plan for legacy distributor ${legacyId} differs from this CSV; reconcile it manually before replacing it`));
    }

    if (row.issues.length > 0) {
      row.action = "blocked";
    } else if (company) {
      row.action = row.resolution.unassigned_nondeleted_deals > 0
        ? "backfill_canonical_deals"
        : "already_reconciled";
    } else if (owner) {
      row.action = "await_admin_company_provisioning";
    } else {
      row.action = "await_owner_self_registration";
    }
  }

  rows.sort((left, right) =>
    Number(left.mapping.legacy_distributor_id || Number.MAX_SAFE_INTEGER) -
    Number(right.mapping.legacy_distributor_id || Number.MAX_SAFE_INTEGER),
  );
  const allIssues = rows.flatMap((row) =>
    row.issues.map((entry) => ({
      legacy_distributor_id: row.mapping.legacy_distributor_id,
      source_line: row.mapping.source_line,
      ...entry,
    })),
  );
  const actionCounts = {};
  for (const row of rows) actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;

  return {
    summary: {
      mapping_rows: mappingRows.length,
      referenced_legacy_distributors: referencedIds.size,
      affected_nondeleted_deals: nondeletedDeals.filter((deal) => referencedIds.has(Number(deal.distributor_id))).length,
      blocker_count: allIssues.length,
      action_counts: actionCounts,
      schema_ready: Boolean(schema.has_staging_table && schema.has_distributor_company_id),
      stage_ready: allIssues.length === 0 && Boolean(schema.has_staging_table),
      backfill_ready:
        allIssues.length === 0 &&
        Boolean(schema.has_distributor_company_id) &&
        rows.every((row) => ["backfill_canonical_deals", "already_reconciled"].includes(row.action)),
    },
    issues: allIssues,
    rows,
  };
}

module.exports = {
  REQUIRED_HEADERS,
  ProvisioningInputError,
  buildDistributorProvisioningPlan,
  canonicalizeMapping,
  fingerprint,
  normalizeCompanyName,
  normalizeEmail,
  normalizePhone,
  normalizeRussianInn,
  parseCsv,
};
