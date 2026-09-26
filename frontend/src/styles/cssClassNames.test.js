import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { globSync } from 'tinyglobby';
import { describe, expect, it } from 'vitest';

/**
 * Component CSS is plain (no CSS Modules), so two files defining the same class would silently
 * override each other and bend the layout. The convention in styles/common/global.css keeps that
 * impossible: one semantic block per component, BEM elements and modifiers under it, and shared
 * state flags. The block name need not equal the file name (Button.css owns `.btn`), but a block
 * must belong to exactly one file.
 *
 * `styles/common/` is the one place allowed to define shared blocks and utilities.
 *
 * Only a class that *opens* a selector counts as declared here. `.quantity-stepper__btn.btn` merely
 * qualifies someone else's class to win on specificity for one nested element, which is safe.
 */
const SRC = resolve(process.cwd(), 'src');
const SHARED = join('styles', 'common');

/** Theme and state selectors are shared on purpose and appear next to many blocks. */
const SHARED_SELECTORS = /^(dark|light|is-[\w-]+|has-[\w-]+|sr-only)$/;

function classesIn(file) {
  const css = readFileSync(join(SRC, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const names = [...css.matchAll(/(?:^|[\s,>+~(])\.(-?[A-Za-z_][\w-]*)/gm)].map((match) => match[1]);
  return new Set(names.filter((name) => !SHARED_SELECTORS.test(name)));
}

/** `.order-card__head` and `.btn--primary` both belong to their block: `order-card`, `btn`. */
function blockOf(className) {
  return className.split(/__|--/)[0];
}

const files = globSync('**/*.css', { cwd: SRC }).sort();
const componentFiles = files.filter((file) => !file.startsWith(SHARED) && !file.endsWith('index.css'));

function ownersByKey(pick) {
  const owners = new Map();
  for (const file of componentFiles) {
    for (const name of classesIn(file)) {
      const key = pick(name);
      if (!owners.has(key)) owners.set(key, new Set());
      owners.get(key).add(file);
    }
  }
  return owners;
}

function shared(owners) {
  return [...owners.entries()]
    .filter(([, holders]) => holders.size > 1)
    .map(([key, holders]) => `${key}: ${[...holders].sort().join(' vs ')}`)
    .sort();
}

describe('component CSS namespacing', () => {
  it('finds the stylesheets', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('declares no class in two different component files', () => {
    expect(shared(ownersByKey((name) => `.${name}`))).toEqual([]);
  });

  it('gives every block a single owning file', () => {
    // Two files sharing a block means one can restyle the other's elements by accident.
    expect(shared(ownersByKey(blockOf))).toEqual([]);
  });
});
