"use strict";

const CLASSIFICATIONS = Object.freeze({
  EXACT: "exact",
  UNMAPPED: "unmapped",
  AMBIGUOUS: "ambiguous",
  WRONG_TYPE: "wrong_type",
  INACTIVE: "inactive",
});

/**
 * Keep matching deliberately conservative: Unicode compatibility normalization,
 * case folding, trimming, and collapsing whitespace are safe. Legal-form or
 * punctuation removal would turn this preflight into fuzzy matching and could
 * silently select the wrong company.
 */
function normalizeCompanyName(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("ru-RU");
}

function isSoftDeleted(row) {
  return row.deleted_at !== null && row.deleted_at !== undefined;
}

/**
 * Only non-deleted companies are eligible canonical targets. Deleted matches
 * remain visible in the report, but cannot make a mapping migration-ready.
 */
function classifyDistributorCandidates(candidates) {
  const eligibleCandidates = candidates.filter((candidate) => !isSoftDeleted(candidate));

  if (eligibleCandidates.length === 0) return CLASSIFICATIONS.UNMAPPED;
  if (eligibleCandidates.length > 1) return CLASSIFICATIONS.AMBIGUOUS;
  if (eligibleCandidates[0].partnership_type !== "distributor") {
    return CLASSIFICATIONS.WRONG_TYPE;
  }
  if (eligibleCandidates[0].status !== "accept") {
    return CLASSIFICATIONS.INACTIVE;
  }
  return CLASSIFICATIONS.EXACT;
}

function buildDistributorCompanyAudit({ distributors, companies, dealCountsByDistributorId }) {
  const companiesByNormalizedName = new Map();

  for (const company of companies) {
    const normalizedName = normalizeCompanyName(company.name);
    if (!normalizedName) continue;

    const bucket = companiesByNormalizedName.get(normalizedName) || [];
    bucket.push(company);
    companiesByNormalizedName.set(normalizedName, bucket);
  }

  const rows = [...distributors]
    .sort((left, right) => Number(left.id) - Number(right.id))
    .map((distributor) => {
      const normalizedName = normalizeCompanyName(distributor.name);
      const candidates = normalizedName
        ? [...(companiesByNormalizedName.get(normalizedName) || [])].sort(
            (left, right) => Number(left.id) - Number(right.id),
          )
        : [];
      const activeCandidates = candidates.filter((candidate) => !isSoftDeleted(candidate));

      return {
        distributor,
        normalized_name: normalizedName,
        affected_nondeleted_deals: Number(
          dealCountsByDistributorId.get(Number(distributor.id)) || 0,
        ),
        classification: classifyDistributorCandidates(candidates),
        candidate_companies: candidates,
        active_candidate_count: activeCandidates.length,
        soft_deleted_candidate_count: candidates.length - activeCandidates.length,
      };
    });

  const emptyCounts = () => ({
    exact: 0,
    unmapped: 0,
    ambiguous: 0,
    wrong_type: 0,
    inactive: 0,
  });
  const classificationCounts = emptyCounts();
  const activeDistributorClassificationCounts = emptyCounts();
  const referencedDistributorClassificationCounts = emptyCounts();

  for (const row of rows) {
    classificationCounts[row.classification] += 1;
    if (!isSoftDeleted(row.distributor)) {
      activeDistributorClassificationCounts[row.classification] += 1;
    }
    if (row.affected_nondeleted_deals > 0) {
      referencedDistributorClassificationCounts[row.classification] += 1;
    }
  }

  const blockers = rows.filter(
    (row) =>
      row.classification !== CLASSIFICATIONS.EXACT &&
      (!isSoftDeleted(row.distributor) || row.affected_nondeleted_deals > 0),
  );
  const blockerCount = (classification) =>
    blockers.filter((row) => row.classification === classification).length;

  return {
    rows,
    summary: {
      total_distributors: rows.length,
      active_distributors: rows.filter((row) => !isSoftDeleted(row.distributor)).length,
      soft_deleted_distributors: rows.filter((row) => isSoftDeleted(row.distributor)).length,
      affected_nondeleted_deals: rows.reduce(
        (total, row) => total + row.affected_nondeleted_deals,
        0,
      ),
      classification_counts: classificationCounts,
      active_distributor_classification_counts: activeDistributorClassificationCounts,
      referenced_distributor_classification_counts:
        referencedDistributorClassificationCounts,
      readiness_blockers: {
        total: blockers.length,
        legacy_distributor_ids: blockers.map((row) => Number(row.distributor.id)),
        unmapped: blockerCount(CLASSIFICATIONS.UNMAPPED),
        ambiguous: blockerCount(CLASSIFICATIONS.AMBIGUOUS),
        wrong_type: blockerCount(CLASSIFICATIONS.WRONG_TYPE),
        inactive: blockerCount(CLASSIFICATIONS.INACTIVE),
      },
      ignored_soft_deleted_unreferenced: rows.length - blockers.length - classificationCounts.exact,
      migration_ready: blockers.length === 0,
    },
  };
}

module.exports = {
  CLASSIFICATIONS,
  buildDistributorCompanyAudit,
  classifyDistributorCandidates,
  normalizeCompanyName,
};
