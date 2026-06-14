import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const rootDir = process.cwd();
const angularConfig = JSON.parse(readFileSync(join(rootDir, 'angular.json'), 'utf8'));
const productionBudgets =
    angularConfig.projects?.MSaver?.architect?.build?.configurations?.production?.budgets ?? [];
const componentStyleBudget = productionBudgets.find(
    (budget) => budget.type === 'anyComponentStyle',
);
const maxWarningBytes = parseBudgetSize(componentStyleBudget?.maximumWarning ?? '4kB');
const componentStyleFiles = findStyleFiles(join(rootDir, 'src', 'app'));
const oversizedFiles = componentStyleFiles
    .map((filePath) => ({
        filePath,
        size: statSync(filePath).size,
    }))
    .filter((entry) => entry.size > maxWarningBytes)
    .sort((left, right) => right.size - left.size);

if (oversizedFiles.length) {
    console.error(
        `Component style budget exceeded: ${formatBytes(maxWarningBytes)} maximum warning.`,
    );

    for (const entry of oversizedFiles) {
        console.error(`- ${relative(rootDir, entry.filePath)}: ${formatBytes(entry.size)}`);
    }

    process.exit(1);
}

console.log(
    `Component style budgets OK: ${componentStyleFiles.length} files <= ${formatBytes(
        maxWarningBytes,
    )}.`,
);

function findStyleFiles(directory) {
    if (!existsSync(directory)) {
        return [];
    }

    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = join(directory, entry.name);

        if (entry.isDirectory()) {
            return findStyleFiles(entryPath);
        }

        return entry.isFile() && entry.name.endsWith('.css') ? [entryPath] : [];
    });
}

function parseBudgetSize(value) {
    const match = /^(\d+(?:\.\d+)?)(b|kb|mb)$/i.exec(`${value}`.trim());

    if (!match) {
        throw new Error(`Unsupported budget size: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'b':
            return amount;
        case 'kb':
            return amount * 1024;
        case 'mb':
            return amount * 1024 * 1024;
        default:
            throw new Error(`Unsupported budget unit: ${unit}`);
    }
}

function formatBytes(bytes) {
    return `${(bytes / 1024).toFixed(2)} kB`;
}
