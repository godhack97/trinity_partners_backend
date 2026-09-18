#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");

const hour = Number(process.env.BACKUP_HOUR_LOCAL || 2);
const minute = Number(process.env.BACKUP_MINUTE_LOCAL || 15);
if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
  throw new Error("BACKUP_HOUR_LOCAL must be 0..23");
}
if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
  throw new Error("BACKUP_MINUTE_LOCAL must be 0..59");
}

const run = (script) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [`scripts/${script}`], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code, signal) => {
      if (code !== 0) {
        process.stderr.write(`${script} failed: code=${code} signal=${signal || "none"}\n`);
      }
      resolve();
    });
  });

const nextRun = () => {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= new Date()) next.setDate(next.getDate() + 1);
  return next;
};

const schedule = () => {
  const next = nextRun();
  const delay = next.getTime() - Date.now();
  process.stdout.write(`Next backup scheduled for ${next.toISOString()}\n`);
  setTimeout(async () => {
    await run("backup.js");
    if (new Date().getDay() === 0) await run("restore-check.js");
    schedule();
  }, delay);
};

schedule();

