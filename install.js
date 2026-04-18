#!/usr/bin/env node
// Installer for the githubMarkdown.desktop Vencord userplugin.
// Clones/updates Vencord, copies the plugin source into src/userplugins,
// installs runtime deps, disables Vencord auto-update, and runs pnpm build.
// Usage: node install.js

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const { spawn } = require("child_process");

const REPO_ROOT = __dirname;
const PLUGIN_DIR_NAME = "githubMarkdown.desktop";
const PLUGIN_SRC = path.join(REPO_ROOT, PLUGIN_DIR_NAME);

// Files/dirs inside the plugin folder that are dev-only and must NOT be copied
// into Vencord's src/userplugins tree.
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

const log = {
    step: (n, total, msg) => console.log(bold(cyan(`[${n}/${total}]`)) + " " + msg),
    info: msg => console.log(msg),
    hint: msg => console.log(dim(msg)),
    ok: msg => console.log(green("OK: ") + msg),
    warn: msg => console.log(yellow("WARN: ") + msg),
    err: msg => console.error(red("ERROR: ") + msg),
};

// ---------- child process helpers ----------

function run(cmd, args, opts = {}) {
    // Inherits stdio so the user sees output. Rejects on non-zero exit.
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            stdio: "inherit",
            shell: process.platform === "win32", // needed on Windows for .cmd shims (git, pnpm)
            ...opts,
        });
        child.on("error", reject);
        child.on("close", code => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
        });
    });
}

function runCapture(cmd, args, opts = {}) {
    // Captures stdout/stderr; for quick probes like `git --version`.
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            stdio: ["ignore", "pipe", "pipe"],
            shell: process.platform === "win32",
            ...opts,
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", d => (stdout += d.toString()));
        child.stderr.on("data", d => (stderr += d.toString()));
        child.on("error", reject);
        child.on("close", code => {
            if (code === 0) resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
            else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}\n${stderr}`));
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

async function promptYesNo(question, defaultYes = true) {
    const def = defaultYes ? "Y/n" : "y/N";
    const ans = (await prompt(question, def)).toLowerCase();
    if (ans === "y/n" || ans === "y" || ans === "yes") return true;
    if (ans === "n" || ans === "no") return false;
    // If user just pressed Enter, `ans` === defaultValue lowercased
    return defaultYes;
}

// ---------- prereqs ----------

function checkNodeVersion() {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    if (major < 18) {
        throw new Error(
            `Node 18+ is required (found ${process.versions.node}). Upgrade from https://nodejs.org/`,
        );
    }
}

async function checkPrereqs() {
    log.info(bold("Checking prerequisites..."));
    checkNodeVersion();
    log.ok(`Node ${process.versions.node}`);

    try {
        const { stdout } = await runCapture("git", ["--version"]);
        log.ok(stdout);
    } catch {
        throw new Error("git not found on PATH. Install from https://git-scm.com/");
    }

    try {
        const { stdout } = await runCapture("pnpm", ["--version"]);
        log.ok(`pnpm ${stdout}`);
    } catch {
        throw new Error(
            "pnpm not found on PATH. Install with `npm install -g pnpm` or see https://pnpm.io/installation",
        );
    }
}

// ---------- paths ----------

function defaultVencordDir() {
    return path.join(os.homedir(), "Vencord");
}

function vencordSettingsPath() {
    if (process.platform === "win32") {
        const appdata = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
        return path.join(appdata, "Vencord", "settings", "settings.json");
    }
    if (process.platform === "darwin") {
        return path.join(
            os.homedir(),
            "Library",
            "Application Support",
            "Vencord",
            "settings",
            "settings.json",
        );
    }
    const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
    return path.join(xdg, "Vencord", "settings", "settings.json");
}

// ---------- file ops ----------

function rmrfSync(target, retries = 5) {
    // Recursive delete with retries for Windows pnpm store weirdness (ENOTEMPTY, EBUSY).
    for (let i = 0; i < retries; i++) {
        try {
            fs.rmSync(target, { recursive: true, force: true, maxRetries: 3 });
            return;
        } catch (err) {
            if (i === retries - 1) throw err;
            // tiny sync backoff — not worth going async for this
            const until = Date.now() + 200 * (i + 1);
            while (Date.now() < until) {} // eslint-disable-line no-empty
        }
    }
}

function copyPluginInto(targetDir) {
    // Shared copy routine: wipes targetDir, then copies PLUGIN_SRC into it
    // while respecting COPY_EXCLUDES at the top level.
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

function readPluginDeps() {
    const pkgPath = path.join(PLUGIN_SRC, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const deps = pkg.dependencies || {};
    // Return as an array of `name@version` — pnpm honours explicit versions.
    return Object.keys(deps).map(name => `${name}@${deps[name]}`);
}

// ---------- steps ----------

async function ensureVencord(vencordDir) {
    if (!fs.existsSync(vencordDir)) {
        log.info(`Cloning Vencord into ${vencordDir}`);
        fs.mkdirSync(path.dirname(vencordDir), { recursive: true });
        await run("git", [
            "clone",
            "--depth",
            "1",
            "https://github.com/Vendicated/Vencord.git",
            vencordDir,
        ]);
        return;
    }

    const gitDir = path.join(vencordDir, ".git");
    if (!fs.existsSync(gitDir)) {
        throw new Error(
            `${vencordDir} exists but is not a git clone. Refusing to touch it. ` +
                `Pick a different directory or remove that folder yourself.`,
        );
    }

    log.info(`Vencord directory exists — running git pull`);
    await run("git", ["pull", "--ff-only"], { cwd: vencordDir });
}

async function copyPluginToVencord(vencordDir) {
    const target = path.join(vencordDir, "src", "userplugins", PLUGIN_DIR_NAME);
    log.info(`Copying plugin into ${target}`);
    copyPluginInto(target);
    log.ok("Plugin files copied");
}

async function installRuntimeDeps(vencordDir) {
    const deps = readPluginDeps();
    if (deps.length === 0) {
        log.warn("No runtime deps found in plugin package.json");
        return;
    }
    log.info(`Adding ${deps.length} runtime deps to Vencord's workspace root`);
    log.hint(deps.join(" "));
    // -w makes pnpm install at the workspace root even though Vencord defines a workspace.
    await run("pnpm", ["add", "-w", ...deps], { cwd: vencordDir });
}

function disableAutoUpdate() {
    const settingsPath = vencordSettingsPath();
    if (!fs.existsSync(settingsPath)) {
        log.warn(
            `Vencord settings not found at ${settingsPath} — skipping auto-update disable. ` +
                `Vencord will create it on first run; you can disable auto-update via the UI.`,
        );
        return;
    }
    let settings;
    try {
        settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch (err) {
        log.warn(`Could not parse ${settingsPath}: ${err.message}. Skipping auto-update disable.`);
        return;
    }
    settings.autoUpdate = false;
    settings.autoUpdateNotification = false;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
    log.ok(`Auto-update disabled in ${settingsPath}`);
}

async function pnpmInstall(vencordDir) {
    log.info("Running pnpm install at Vencord root");
    await run("pnpm", ["install"], { cwd: vencordDir });
}

async function pnpmBuild(vencordDir) {
    log.info("Running pnpm build — this takes a minute or two");
    await run("pnpm", ["build"], { cwd: vencordDir });
}

// ---------- main ----------

async function main() {
    console.log(bold("\nVencord GitHub Markdown — installer\n"));

    await checkPrereqs();

    console.log();
    const vencordDir = path.resolve(
        await prompt("Vencord install directory", defaultVencordDir()),
    );
    const wantsDisableAutoUpdate = await promptYesNo(
        "Disable Vencord auto-update? (recommended — otherwise it will overwrite this build)",
        true,
    );

    console.log();
    log.info(bold("Starting install..."));
    log.hint(`  target: ${vencordDir}`);
    log.hint(`  disable auto-update: ${wantsDisableAutoUpdate}`);
    console.log();

    const TOTAL = 6;
    log.step(1, TOTAL, "Ensure Vencord source is present");
    await ensureVencord(vencordDir);

    log.step(2, TOTAL, "Copy plugin into src/userplugins");
    await copyPluginToVencord(vencordDir);

    log.step(3, TOTAL, "Add plugin runtime dependencies");
    await installRuntimeDeps(vencordDir);

    log.step(4, TOTAL, "Disable Vencord auto-update");
    if (wantsDisableAutoUpdate) disableAutoUpdate();
    else log.info("(skipped per user choice)");

    log.step(5, TOTAL, "pnpm install");
    await pnpmInstall(vencordDir);

    log.step(6, TOTAL, "pnpm build");
    await pnpmBuild(vencordDir);

    // final banner
    console.log();
    console.log(green(bold("Build complete.")));
    console.log();
    console.log(bold("Next steps:"));
    console.log();
    console.log("  " + cyan(`cd ${vencordDir}`));
    console.log("  " + cyan("pnpm inject"));
    console.log();
    console.log(
        "`pnpm inject` is interactive — it will ask which Discord install to patch",
    );
    console.log(
        "(Stable / PTB / Canary / custom). That's why this installer can't run it for you.",
    );
    console.log();
    console.log(yellow("Before injecting:"));
    console.log("  - Fully quit Discord, including the system tray / menubar icon.");
    console.log("  - On Windows, check Task Manager for leftover Discord.exe processes.");
    console.log();
    console.log("After `pnpm inject` finishes, start Discord again and the plugin will be live.");
    console.log();
}

main().catch(err => {
    console.error();
    log.err(err.message || String(err));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
});
