import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { globSync } from 'tinyglobby';
import { describe, expect, it } from 'vitest';

/**
 * Component CSS is plain (no CSS Modules), so two files defining the same class would silently
 * override each other and bend the layout. The mockup's rule keeps that impossible: every class
 * starts with the block name of its own file, e.g. OrderCard.css owns `.order-card*` only.
 * `styles/common/` is the one place allowed to define shared blocks and utilities.
 */
const SRC = resolve(process.cwd(), 'src');
const SHARED = join('styles', 'common');

function classesIn(file) {
  const css = readFileSync(join(SRC, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return new Set([...css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((match) => match[1]));
}

function blockOf(file) {
  const name = file.split('/').pop().replace(/\.css$/, '');
  // CustomerDashboardPage.css -> customer-dashboard-page
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const files = globSync('**/*.css', { cwd: SRC }).sort();
const componentFiles = files.filter((file) => !file.startsWith(SHARED) && !file.endsWith('index.css'));

describe('component CSS namespacing', () => {
  it('finds the stylesheets', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.runIf(componentFiles.length > 0)('declares no class in two different component files', () => {
    const owner = new Map();
    const clashes = [];
    for (const file of componentFiles) {
      for (const name of classesIn(file)) {
        if (owner.has(name) && owner.get(name) !== file) {
          clashes.push(`.${name}: ${owner.get(name)} vs ${relative('.', file)}`);
        } else {
          owner.set(name, file);
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it.runIf(componentFiles.length > 0)('prefixes every class with its own block name', () => {
    const strays = [];
    for (const file of componentFiles) {
      const block = blockOf(file);
      for (const name of classesIn(file)) {
        // Allowed: the block itself, its BEM children, and the shared state flags.
        const ok = name === block || name.startsWith(`${block}__`) || name.startsWith(`${block}--`)
          || /^(is|has)-/.test(name);
        if (!ok) strays.push(`${file}: .${name} (expected .${block}…)`);
      }
    }
    expect(strays).toEqual([]);
  });
});
