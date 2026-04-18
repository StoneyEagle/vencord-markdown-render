#!/usr/bin/env node
// Uninstaller: removes the githubMarkdown.desktop folder from Vencord's
// src/userplugins. Does NOT touch package.json — other plugins might rely
// on the same deps. User can remove them manually if they want to.
// Usage: node uninstall.js

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const PLUGIN_DIR_NAME = "githubMarkdown.desktop";

// Deps the installer added. Printed so the user can remove them manually.
const RUNTIME_DEPS = [
    "unified",
    "remark-parse",
    "remark-gfm",
    "remark-github-alerts",
    "remark-math",
    "remark-mermaidjs",
    "remark-rehype",
    "rehype-raw",
    "rehype-sanitize",
    "rehype-katex",
    "rehype-slug",
    "rehype-autolink-headings",
    "rehype-highlight",
    "hast-util-to-jsx-runtime",
    "hast-util-sanitize",
    "katex",
    "mermaid",
];

// ---------- colors ----------
const USE_COLOR = !!process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = s => c("1", s);
const green = s => c("32", s);
const red = s => c("31", s);
const yellow = s => c("33", s);
const dim = s => c("2", s);

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

// ---------- rm with retries ----------

function sleepSync(ms) {
    const until = Date.now() + ms;
    while (Date.now() < until) {} // eslint-disable-line no-empty
}

function rmrfWithRetries(target, maxAttempts = 5) {
    // Windows + pnpm's .pnpm hardlink store occasionally throws ENOTEMPTY / EBUSY
    // while AV scanners or editors hold files open. Retrying a few times usually
    // unsticks it; if not, the user can re-run and it'll probably succeed.
    let lastErr;
    for (let i = 1; i <= maxAttempts; i++) {
        try {
            fs.rmSync(target, { recursive: true, force: true, maxRetries: 3 });
            return;
        } catch (err) {
            lastErr = err;
            console.log(yellow(`  attempt ${i}/${maxAttempts} failed: ${err.code || err.message}`));
            sleepSync(300 * i);
        }
    }
    throw lastErr;
}

// ---------- main ----------

async function main() {
    console.log(bold("\nVencord GitHub Markdown — uninstaller\n"));

    const vencordDir = path.resolve(
        await prompt("Vencord install directory", defaultVencordDir()),
    );

    const pluginDir = path.join(vencordDir, "src", "userplugins", PLUGIN_DIR_NAME);

    if (!fs.existsSync(pluginDir)) {
        console.log(yellow(`Nothing to remove — ${pluginDir} does not exist.`));
        return;
    }

    console.log(`Removing ${pluginDir}`);
    rmrfWithRetries(pluginDir);
    console.log(green("OK: ") + "plugin folder removed.");

    console.log();
    console.log(bold("Note on dependencies:"));
    console.log(
        "The installer added markdown-rendering packages to Vencord's package.json.",
    );
    console.log("They were not removed because other userplugins may use them.");
    console.log("If you want to remove them manually, run this inside the Vencord directory:");
    console.log();
    console.log("  " + dim(`pnpm remove -w ${RUNTIME_DEPS.join(" ")}`));
    console.log();

    console.log(bold("Rebuild Vencord to drop the plugin from the bundle:"));
    console.log();
    console.log("  cd " + vencordDir);
    console.log("  pnpm build");
    console.log("  pnpm inject");
    console.log();
    console.log("Then restart Discord (fully quit first, including the tray icon).");
}

main().catch(err => {
    console.error();
    console.error(red("ERROR: ") + (err.message || String(err)));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
});
