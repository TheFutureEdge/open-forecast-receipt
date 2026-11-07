#!/usr/bin/env node
import { execFileSync } from "node:child_process";
const sha = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(sha || "")) throw new Error("Provide an exact reviewed commit SHA");
const root = new URL("../../", import.meta.url);
const packageJson = execFileSync("git", ["show", `${sha}:package.json`], { cwd: root, encoding: "utf8" });
// The connected Vercel account can build source-file deployments even before
// the owner adds this public repository to the selected-repository GitHub App.
// Fetch only the pinned public commit, then verify its identity before npm ci.
// This contains no local env files, tokens, signing material, or credentials.
const bootstrap = `const {execFileSync}=require('node:child_process');
const sha=${JSON.stringify(sha)};
const run=args=>execFileSync('git',args,{stdio:'inherit'});
run(['init','--quiet']);
run(['fetch','--depth=1','--no-tags','https://github.com/TheFutureEdge/open-forecast-receipt.git',sha]);
const actual=execFileSync('git',['rev-parse','FETCH_HEAD'],{encoding:'utf8'}).trim();
if(actual!==sha)throw new Error('Public source commit mismatch');
run(['checkout','--force','FETCH_HEAD','--','.']);
console.log('Verified Forecast Library source commit '+sha);
`;
console.log(JSON.stringify([
  { file: "package.json", data: packageJson, encoding: "utf-8" },
  { file: ".ofl-source-bootstrap.cjs", data: bootstrap, encoding: "utf-8" },
  { file: "vercel.json", data: JSON.stringify({ framework: "nextjs", installCommand: "node .ofl-source-bootstrap.cjs && npm ci", buildCommand: "npm run build", regions: ["iad1"] }), encoding: "utf-8" },
]));
