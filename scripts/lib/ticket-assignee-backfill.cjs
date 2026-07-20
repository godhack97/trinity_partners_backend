"use strict";

const HANDLER_ROLE_BY_TICKET_TYPE = {
  manager: "partner_manager",
  tech_specialist: "technical_specialist",
};

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseMappingDocument(document) {
  if (document === null || Array.isArray(document) || typeof document !== "object") {
    throw new Error("mapping must be a JSON object of ticketId -> assigneeId");
  }

  return new Map(
    Object.entries(document).map(([ticketId, assigneeId]) => [
      positiveInteger(ticketId, "mapping ticket id"),
      positiveInteger(assigneeId, `mapping assignee for ticket ${ticketId}`),
    ]),
  );
}

function buildBackfillPlan({ tickets, eligibleHandlers, explicitMapping }) {
  const ticketById = new Map(tickets.map((ticket) => [Number(ticket.id), ticket]));
  const eligibleIdsByType = new Map(
    Object.entries(HANDLER_ROLE_BY_TICKET_TYPE).map(([type, role]) => [
      type,
      new Set((eligibleHandlers[role] || []).map((id) => Number(id))),
    ]),
  );

  for (const ticketId of explicitMapping.keys()) {
    if (!ticketById.has(ticketId)) {
      throw new Error(
        `mapping ticket ${ticketId} is not an active unassigned ticket`,
      );
    }
  }

  const planned = [];
  const blocked = [];

  for (const ticket of [...tickets].sort((left, right) => left.id - right.id)) {
    const ticketId = Number(ticket.id);
    const type = ticket.type;
    const eligibleIds = eligibleIdsByType.get(type);
    const requiredRole = HANDLER_ROLE_BY_TICKET_TYPE[type];

    if (!eligibleIds || !requiredRole) {
      blocked.push({ ticket_id: ticketId, type, reason: "unsupported_ticket_type" });
      continue;
    }

    if (explicitMapping.has(ticketId)) {
      const assigneeId = explicitMapping.get(ticketId);
      if (!eligibleIds.has(assigneeId)) {
        throw new Error(
          `mapping assignee ${assigneeId} for ticket ${ticketId} is not an active ${requiredRole}`,
        );
      }
      planned.push({
        ticket_id: ticketId,
        assignee_id: assigneeId,
        type,
        source: "explicit_mapping",
      });
      continue;
    }

    if (type === "manager") {
      const creatorManagerId = Number(ticket.creator_manager_id || 0);
      if (eligibleIds.has(creatorManagerId)) {
        planned.push({
          ticket_id: ticketId,
          assignee_id: creatorManagerId,
          type,
          source: "eligible_creator_manager",
        });
      } else {
        blocked.push({
          ticket_id: ticketId,
          type,
          reason: creatorManagerId
            ? "creator_manager_ineligible"
            : "creator_manager_missing",
        });
      }
      continue;
    }

    if (eligibleIds.size === 1) {
      planned.push({
        ticket_id: ticketId,
        assignee_id: [...eligibleIds][0],
        type,
        source: "sole_eligible_technical_specialist",
      });
    } else {
      blocked.push({
        ticket_id: ticketId,
        type,
        reason:
          eligibleIds.size === 0
            ? "technical_specialist_missing"
            : "technical_specialist_ambiguous",
      });
    }
  }

  return { planned, blocked };
}

module.exports = {
  HANDLER_ROLE_BY_TICKET_TYPE,
  buildBackfillPlan,
  parseMappingDocument,
};
