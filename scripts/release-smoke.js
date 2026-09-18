#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const baseUrl = String(process.env.SMOKE_BASE_URL || "http://127.0.0.1:9131").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const dealPayloadFile = process.env.SMOKE_DEAL_PAYLOAD_FILE;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url}: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  return { response, body };
};

const cookiesFromResponse = (response) => {
  const values = response.headers.getSetCookie?.() || [response.headers.get("set-cookie")].filter(Boolean);
  return Object.fromEntries(
    values.flatMap((header) => {
      const first = String(header).split(";", 1)[0];
      const separator = first.indexOf("=");
      return separator > 0 ? [[first.slice(0, separator), first.slice(separator + 1)]] : [];
    }),
  );
};

async function run() {
  const live = await requestJson(`${baseUrl}/health/live`);
  assert(live.body?.status === "ok", "Liveness response is invalid");

  const ready = await requestJson(`${baseUrl}/health/ready`);
  assert(ready.body?.ready === true, "Readiness did not confirm the database and disk");

  assert(email && password, "SMOKE_EMAIL and SMOKE_PASSWORD are required for auth smoke");
  const login = await requestJson(`${baseUrl}/api/auth/login?client_id=web:portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, client_id: "web:portal" }),
  });
  const cookies = cookiesFromResponse(login.response);
  assert(cookies.trinity_session, "Login did not issue the HttpOnly session cookie");
  assert(cookies.trinity_csrf, "Login did not issue the CSRF cookie");
  const cookieHeader = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  const authHeaders = {
    Cookie: cookieHeader,
    "X-CSRF-Token": cookies.trinity_csrf,
  };

  const check = await requestJson(`${baseUrl}/api/auth/check?client_id=web:portal`, {
    headers: authHeaders,
  });
  assert(check.body?.id, "Authenticated session check returned no user");

  await requestJson(`${baseUrl}/api/admin/smtp-settings/health`, {
    headers: authHeaders,
  });

  assert(dealPayloadFile, "SMOKE_DEAL_PAYLOAD_FILE is required for upload/deal smoke");
  const resolvedPayload = path.resolve(dealPayloadFile);
  const payload = JSON.parse(fs.readFileSync(resolvedPayload, "utf8"));

  const form = new FormData();
  form.append(
    "file",
    new Blob(["%PDF-1.4\n% Trinity release smoke\n%%EOF\n"], {
      type: "application/pdf",
    }),
    "release-smoke.pdf",
  );
  const upload = await requestJson(`${baseUrl}/api/upload-file`, {
    method: "POST",
    headers: authHeaders,
    body: form,
  });
  assert(upload.body?.configuration_link, "Upload response contains no file link");

  let createdDealId;
  try {
    const created = await requestJson(`${baseUrl}/api/deal`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        title: `${payload.title || "Release smoke"} ${new Date().toISOString()}`,
        configuration_link: upload.body.configuration_link,
        federal_laws_accepted: true,
        federal_laws_policy_version: payload.federal_laws_policy_version || "2026-09-17",
      }),
    });
    createdDealId = Number(created.body?.id);
    assert(createdDealId > 0, "Deal creation returned no id");
  } finally {
    if (createdDealId) {
      await requestJson(`${baseUrl}/api/deal/${createdDealId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
    }
  }

  await requestJson(`${baseUrl}/api/auth/logout?client_id=web:portal`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: "{}",
  });

  process.stdout.write("Release smoke OK: live, ready/DB, auth/cookies/CSRF, SMTP, upload and deal create/delete\n");
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
