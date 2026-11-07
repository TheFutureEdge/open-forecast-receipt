#!/usr/bin/env node
import { spawnSync } from "node:child_process";

// Explicit application projects only. This script never creates keys or grants
// publisher/write permissions. Review the default plan before using --apply.
const profiles = [
  { project: "oflapp-staging", number: "876906954189", vercel: "prj_hBFBnif5b4eQHIecWiolxQ6EZNal", account: "vercel-library-staging" },
  { project: "oflapp-prod", number: "174334033844", vercel: "prj_f0TWHEE7tK86E5D5gTT6v7nDXDUE", account: "vercel-library-production" },
];
const apply = process.argv.includes("--apply");
const pool = "vercel-library";
const team = "team_HkuVfCYkIOv1BwFHHikUiW4I";
function run(args, inspect = false) {
  if (!inspect) console.log(JSON.stringify({ command: "gcloud", args }));
  if (!apply && !inspect) return;
  const result = spawnSync("gcloud", args, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "gcloud failed");
  return result.stdout;
}
function exists(args) {
  if (!apply) return false;
  const result = spawnSync("gcloud", args, { encoding: "utf8" });
  if (result.status === 0) return true;
  if (/NOT_FOUND|not found|does not exist/i.test(result.stderr)) return false;
  throw new Error(result.stderr);
}
for (const p of profiles) {
  const email = `${p.account}@${p.project}.iam.gserviceaccount.com`;
  run(["services", "enable", "iam.googleapis.com", "iamcredentials.googleapis.com", "sts.googleapis.com", `--project=${p.project}`, "--quiet"]);
  const account = ["iam", "service-accounts", "describe", email, `--project=${p.project}`];
  if (!exists(account)) run(["iam", "service-accounts", "create", p.account, `--project=${p.project}`, "--display-name=Forecast Library Vercel read-only frontend", "--quiet"]);
  const poolScope = [`--location=global`, `--project=${p.project}`];
  if (!exists(["iam", "workload-identity-pools", "describe", pool, ...poolScope])) {
    run(["iam", "workload-identity-pools", "create", pool, ...poolScope, "--display-name=Forecast Library Vercel", "--quiet"]);
  }
  const providerScope = [`--workload-identity-pool=${pool}`, ...poolScope];
  const providerConfig = [
    "--issuer-uri=https://oidc.vercel.com/ipulseai",
    "--allowed-audiences=https://vercel.com/ipulseai",
    "--attribute-mapping=google.subject=assertion.sub,attribute.project_id=assertion.project_id,attribute.owner_id=assertion.owner_id,attribute.environment=assertion.environment",
    `--attribute-condition=assertion.owner_id == '${team}' && assertion.project_id == '${p.vercel}' && assertion.environment == 'production'`,
  ];
  const operation = exists(["iam", "workload-identity-pools", "providers", "describe", pool, ...providerScope]) ? "update-oidc" : "create-oidc";
  run(["iam", "workload-identity-pools", "providers", operation, pool, ...providerScope, ...providerConfig, "--quiet"]);
  run(["iam", "service-accounts", "add-iam-policy-binding", email, `--project=${p.project}`, `--member=principalSet://iam.googleapis.com/projects/${p.number}/locations/global/workloadIdentityPools/${pool}/attribute.project_id/${p.vercel}`, "--role=roles/iam.workloadIdentityUser", "--quiet"]);
  run(["projects", "add-iam-policy-binding", p.project, `--member=serviceAccount:${email}`, "--role=roles/datastore.viewer", "--condition=None", "--quiet"]);
  if (apply) {
    const provider = JSON.parse(run(["iam", "workload-identity-pools", "providers", "describe", pool, ...providerScope, "--format=json"], true));
    console.log(JSON.stringify({ project: p.project, account: email, vercelProject: p.vercel, attributeCondition: provider.attributeCondition, issuer: provider.oidc?.issuerUri, applied: true }));
  }
}
