import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import postcss from 'postcss';

const rootDir = process.cwd();
const homeStyleFiles = [
    join(rootDir, 'src', 'app', 'features', 'home', 'ui', 'home-page.component.css'),
    join(rootDir, 'src', 'app', 'features', 'home', 'ui', 'home-page.part-2.css'),
];

const stickyBalanceRules = [];

for (const filePath of homeStyleFiles) {
    const source = readFileSync(filePath, 'utf8');
    const ast = postcss.parse(source, { from: filePath });

    ast.walkDecls('position', (declaration) => {
        if (declaration.value.trim().toLowerCase() !== 'sticky') {
            return;
        }

        const rule = declaration.parent;

        if (rule?.type !== 'rule' || !rule.selector.includes('.home-page__sticky')) {
            return;
        }

        stickyBalanceRules.push({
            filePath,
            line: declaration.source?.start?.line ?? 0,
            selector: rule.selector,
        });
    });
}

if (stickyBalanceRules.length) {
    console.error(
        'Home balance header must scroll with the page; sticky positioning keeps it pinned on desktop.',
    );

    for (const rule of stickyBalanceRules) {
        console.error(
            `- ${relative(rootDir, rule.filePath)}:${rule.line} (${rule.selector})`,
        );
    }

    process.exit(1);
}

console.log('Home scroll behavior OK: balance header is not sticky.');
