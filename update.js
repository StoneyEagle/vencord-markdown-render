#!/usr/bin/env node
// Updater: pulls the latest plugin source (git pull in this repo), re-copies
// it into Vencord, and re-builds. Does not re-run pnpm add; if deps changed,
// re-run install.js instead.
// Usage: node update.js

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const { spawn } = require("child_process");

const REPO_ROOT = __dirname;
const PLUGIN_DIR_NAME = "githubMarkdown.desktop";
const PLUGIN_SRC = path.join(REPO_ROOT, PLUGIN_DIR_NAME);

// Must match install.js — these are dev-only and shouldn't be copied.
const COPY_EXCLUDES = new Set([
    "node_modules",
    "tests",
    "package.json",
    "tsconfig.json",
    "vitest.config.ts",
    "pnpm-lock.yaml",
    ".gitignore",
]);

// ---------- colors ----------
const USE_COLOR = !!process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = s => c("1", s);
const green = s => c("32", s);
const red = s => c("31", s);
const yellow = s => c("33", s);
const cyan = s => c("36", s);
const dim = s => c("2", s);

// ---------- child process ----------
function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            stdio: "inherit",
            shell: process.platform === "win32",
            ...opts,
        });
        child.on("error", reject);
        child.on("close", code => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
        });
    });
}

// ---------- prompt ----------
function prompt(question, defaultValue) {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const suffix = defaultValue !== undefined ? dim(` [${defaultValue}]`) : "";
        rl.question(`${question}${suffix}: `, answer => {
            rl.close();
            const trimmed = (answer || "").trim();
            resolve(trimmed === "" && defaultValue !== undefined ? defaultValue : trimmed);
        });
        rl.on("SIGINT", () => {
            rl.close();
            console.log("\n" + yellow("Aborted."));
            process.exit(130);
        });
    });
}

function defaultVencordDir() {
    return path.join(os.homedir(), "Vencord");
}

// ---------- copy helper (duplicated from install.js for single-file simplicity) ----------

function rmrfSync(target, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            fs.rmSync(target, { recursive: true, force: true, maxRetries: 3 });
            return;
        } catch (err) {
            if (i === retries - 1) throw err;
            const until = Date.now() + 200 * (i + 1);
            while (Date.now() < until) {} // eslint-disable-line no-empty
        }
    }
}

function copyPluginInto(targetDir) {
    if (fs.existsSync(targetDir)) rmrfSync(targetDir);
    fs.mkdirSync(targetDir, { recursive: true });

    const entries = fs.readdirSync(PLUGIN_SRC, { withFileTypes: true });
    for (const entry of entries) {
        if (COPY_EXCLUDES.has(entry.name)) continue;
        const src = path.join(PLUGIN_SRC, entry.name);
        const dst = path.join(targetDir, entry.name);
        if (entry.isDirectory()) {
            fs.cpSync(src, dst, { recursive: true });
        } else {
            fs.copyFileSync(src, dst);
        }
    }
}

// ---------- main ----------

async function main() {
    console.log(bold("\nVencord GitHub Markdown — updater\n"));

    const vencordDir = path.resolve(
        await prompt("Vencord install directory", defaultVencordDir()),
    );

    if (!fs.existsSync(vencordDir)) {
        throw new Error(
            `${vencordDir} does not exist. Run install.js first to set up Vencord.`,
        );
    }

    // 1. git pull in this repo, if it's a clone
    const repoGit = path.join(REPO_ROOT, ".git");
    if (fs.existsSync(repoGit)) {
        console.log(bold("Pulling latest plugin source..."));
        await run("git", ["pull", "--ff-only"], { cwd: REPO_ROOT });
    } else {
        console.log(
            yellow("Skipping git pull — this repo is not a git clone (no .git dir)."),
        );
    }

    // 2. copy plugin into Vencord
    const target = path.join(vencordDir, "src", "userplugins", PLUGIN_DIR_NAME);
    console.log(bold(`Copying plugin into ${target}`));
    copyPluginInto(target);
    console.log(green("OK: ") + "plugin files copied");

    // 3. rebuild
    console.log(bold("Running pnpm build..."));
    await run("pnpm", ["build"], { cwd: vencordDir });

    // 4. next steps
    console.log();
    console.log(green(bold("Update complete.")));
    console.log();
    console.log(bold("Next steps:"));
    console.log("  " + cyan(`cd ${vencordDir}`));
    console.log("  " + cyan("pnpm inject"));
    console.log();
    console.log("Then restart Discord (fully quit first — tray icon too).");
    console.log();
    console.log(
        dim("If plugin dependencies changed since your last install, re-run install.js instead."),
    );
}

main().catch(err => {
    console.error();
    console.error(red("ERROR: ") + (err.message || String(err)));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
});
