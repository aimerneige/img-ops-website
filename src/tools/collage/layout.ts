/**
 * Collage layouts are split trees: every inner node splits its box into a row
 * (children side by side) or a column (stacked), with adjustable ratios.
 * Leaves are the photo cells. This lets users drag dividers and split/merge any
 * cell, instead of being limited to fixed grids.
 */

export type Dir = 'row' | 'col';
export interface Leaf {
  k: 'leaf';
  id: string;
}
export interface Split {
  k: 'split';
  d: Dir;
  r: number[];
  c: LayoutNode[];
}
export type LayoutNode = Leaf | Split;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface CellRect extends Rect {
  id: string;
}
export interface DividerRect extends Rect {
  /** Path of child indices from root to the split node. */
  path: number[];
  /** The divider sits between child `i` and `i + 1`. */
  i: number;
  d: Dir;
  /** Total length available to the split's children (excluding gaps). */
  span: number;
}

let seq = 0;
export const newId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

/* ───────── Preset DSL ─────────
 *   x                 a cell
 *   h(a,b,…)          row of children        v(a,b,…)  column of children
 *   h[2,1](a,b)       with weights
 */
export function parse(src: string): LayoutNode {
  let i = 0;
  const node = (): LayoutNode => {
    const ch = src[i++];
    if (ch === 'x') return { k: 'leaf', id: newId() };
    if (ch !== 'h' && ch !== 'v') throw new Error(`bad layout "${src}" @${i}`);
    let weights: number[] | null = null;
    if (src[i] === '[') {
      const end = src.indexOf(']', i);
      weights = src.slice(i + 1, end).split(',').map(Number);
      i = end + 1;
    }
    i++; // (
    const c: LayoutNode[] = [node()];
    while (src[i] === ',') {
      i++;
      c.push(node());
    }
    i++; // )
    const w = weights ?? c.map(() => 1);
    const sum = w.reduce((a, b) => a + b, 0);
    return { k: 'split', d: ch === 'h' ? 'row' : 'col', r: w.map((x) => x / sum), c };
  };
  return node();
}

const grid = (rows: number, cols: number) =>
  rows === 1 ? `h(${Array(cols).fill('x')})` : `v(${Array(rows).fill(`h(${Array(cols).fill('x')})`)})`;

/** Curated presets grouped by number of cells. */
export const PRESETS: Record<number, string[]> = {
  1: ['x'],
  2: ['h(x,x)', 'v(x,x)', 'h[2,1](x,x)', 'v[2,1](x,x)', 'h[1,2](x,x)', 'v[1,2](x,x)'],
  3: [
    'h(x,x,x)', 'v(x,x,x)', 'h(x,v(x,x))', 'h(v(x,x),x)', 'v(x,h(x,x))', 'v(h(x,x),x)',
    'h[2,1](x,v(x,x))', 'v[2,1](x,h(x,x))', 'h[1,2,1](x,x,x)', 'v[1,2,1](x,x,x)',
  ],
  4: [
    grid(2, 2), 'h(x,x,x,x)', 'v(x,x,x,x)', 'h[2,1](x,v(x,x,x))', 'v[2,1](x,h(x,x,x))',
    'h(v(x,x,x),x)', 'v(h(x,x,x),x)', 'h(x,v(x,h(x,x)))', 'v(x,h(x,x),x)', 'h(x,v(x,x),x)',
    'h[1,2](v(x,x),v[2,1](x,x))',
  ],
  5: [
    'v(h(x,x),h(x,x,x))', 'v(h(x,x,x),h(x,x))', 'h(v(x,x),v(x,x,x))', 'h[2,1](x,v(x,x,x,x))',
    'v[2,1](x,h(x,x,x,x))', 'h(v(x,x),x,v(x,x))', 'v(h(x,x),x,h(x,x))', 'h[2,1](v(x,x),v(x,x,x))',
    'v[2,1](h(x,x),h(x,x,x))', 'h(x,v(x,h(x,v(x,x))))', 'v(x,x,x,x,x)', 'h(x,x,x,x,x)',
  ],
  6: [
    grid(2, 3), grid(3, 2), 'v[2,1](h[2,1](x,v(x,x)),h(x,x,x))', 'h[2,1](v[2,1](x,h(x,x)),v(x,x,x))',
    'v(h(x,x,x),h[1,2,1](x,x,x))', 'h(v(x,x),v(x,x),v(x,x))', 'v[2,1](x,h(x,x,x,x,x))',
    'h[2,1](x,v(x,x,x,x,x))', 'v(h(x,x),h(x,x,x,x))', 'h(v(x,x,x),x,v(x,x))',
  ],
  7: [
    'v(h(x,x),h(x,x,x),h(x,x))', 'v(h(x,x,x),h(x,x,x,x))', 'h(v(x,x),v(x,x,x),v(x,x))',
    'v(h(x,x,x),x,h(x,x,x))', 'v[2,1](h(x,x),h(x,x,x,x,x))', 'h[2,1](v(x,x),v(x,x,x,x,x))',
    'v[2,1,1](x,h(x,x,x),h(x,x,x))', 'h(v(x,x,x),v(x,x),v(x,x))',
  ],
  8: [
    grid(2, 4), grid(4, 2), 'v(h(x,x,x),h(x,x),h(x,x,x))', 'h(v(x,x,x),v(x,x),v(x,x,x))',
    'v[2,1](h(x,x),h(x,x,x,x,x,x))', 'v[2,1,1](x,h(x,x,x,x),h(x,x,x))', 'h[1,2,1](v(x,x,x),v(x,x),v(x,x,x))',
  ],
  9: [
    grid(3, 3), 'v(h(x,x),h(x,x,x,x,x),h(x,x))', 'h(v(x,x),v(x,x,x,x,x),v(x,x))',
    'v[2,1,1](h(x,x),h(x,x,x,x),h(x,x,x))', 'v(h(x,x,x,x),x,h(x,x,x,x))', 'h[2,1,1](x,v(x,x,x,x),v(x,x,x,x))',
  ],
  10: [grid(2, 5), grid(5, 2), 'v(h(x,x,x),h(x,x,x,x),h(x,x,x))', 'v[2,1,1](h(x,x),h(x,x,x,x),h(x,x,x,x))'],
  12: [grid(3, 4), grid(4, 3), grid(2, 6), grid(6, 2)],
  16: [grid(4, 4)],
};

export const PRESET_COUNTS = Object.keys(PRESETS).map(Number);

export function presetsFor(count: number): string[] {
  if (PRESETS[count]) return PRESETS[count];
  // Fallback: the most square grid that fits.
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return [grid(rows, cols)];
}

/* ───────── Tree utilities ───────── */
export function leaves(n: LayoutNode, out: string[] = []): string[] {
  if (n.k === 'leaf') out.push(n.id);
  else n.c.forEach((c) => leaves(c, out));
  return out;
}

export function at(root: LayoutNode, path: number[]): LayoutNode {
  return path.reduce<LayoutNode>((n, i) => (n as Split).c[i], root);
}

/** Structural signature, used to detect the current preset (ids/ratios ignored). */
export function signature(n: LayoutNode): string {
  return n.k === 'leaf' ? 'x' : `${n.d === 'row' ? 'h' : 'v'}(${n.c.map(signature).join(',')})`;
}

export function compute(root: LayoutNode, box: Rect, gap: number) {
  const cells: CellRect[] = [];
  const dividers: DividerRect[] = [];
  const walk = (n: LayoutNode, r: Rect, path: number[]) => {
    if (n.k === 'leaf') {
      cells.push({ id: n.id, ...r });
      return;
    }
    const horiz = n.d === 'row';
    const total = horiz ? r.w : r.h;
    const span = Math.max(0, total - gap * (n.c.length - 1));
    let cursor = horiz ? r.x : r.y;
    n.c.forEach((child, i) => {
      const len = span * n.r[i];
      const cr: Rect = horiz ? { x: cursor, y: r.y, w: len, h: r.h } : { x: r.x, y: cursor, w: r.w, h: len };
      walk(child, cr, [...path, i]);
      cursor += len;
      if (i < n.c.length - 1) {
        dividers.push(
          horiz
            ? { x: cursor, y: r.y, w: gap, h: r.h, path, i, d: 'row', span }
            : { x: r.x, y: cursor, w: r.w, h: gap, path, i, d: 'col', span },
        );
        cursor += gap;
      }
    });
  };
  walk(root, box, []);
  return { cells, dividers };
}

/** Find path of a leaf. */
function findPath(n: LayoutNode, id: string, path: number[] = []): number[] | null {
  if (n.k === 'leaf') return n.id === id ? path : null;
  for (let i = 0; i < n.c.length; i++) {
    const p = findPath(n.c[i], id, [...path, i]);
    if (p) return p;
  }
  return null;
}

/** Split a cell into two. Returns the new root and the id of the added cell. */
export function splitCell(root: LayoutNode, id: string, d: Dir): { root: LayoutNode; added: string } {
  const added = newId();
  const path = findPath(root, id);
  if (!path) return { root, added };
  const leaf: Leaf = { k: 'leaf', id };
  const fresh: Leaf = { k: 'leaf', id: added };
  if (path.length === 0) return { root: { k: 'split', d, r: [0.5, 0.5], c: [leaf, fresh] }, added };
  const parent = at(root, path.slice(0, -1)) as Split;
  const i = path[path.length - 1];
  if (parent.d === d) {
    // Same direction: insert a sibling and halve this cell's share.
    const half = parent.r[i] / 2;
    parent.r.splice(i, 1, half, half);
    parent.c.splice(i + 1, 0, fresh);
  } else {
    parent.c[i] = { k: 'split', d, r: [0.5, 0.5], c: [leaf, fresh] };
  }
  return { root, added };
}

/** Remove a cell; its share goes to its neighbours. Single-child splits collapse. */
export function removeCell(root: LayoutNode, id: string): LayoutNode {
  const path = findPath(root, id);
  if (!path || path.length === 0) return root;
  const parentPath = path.slice(0, -1);
  const parent = at(root, parentPath) as Split;
  const i = path[path.length - 1];
  const share = parent.r[i];
  parent.c.splice(i, 1);
  parent.r.splice(i, 1);
  const rest = parent.r.reduce((a, b) => a + b, 0) || 1;
  parent.r = parent.r.map((x) => x + (x / rest) * share);
  if (parent.c.length === 1) {
    const only = parent.c[0];
    if (parentPath.length === 0) return only;
    const gp = at(root, parentPath.slice(0, -1)) as Split;
    const gi = parentPath[parentPath.length - 1];
    if (only.k === 'split' && only.d === gp.d) {
      // Flatten into the grandparent to keep the tree tidy.
      const s = gp.r[gi];
      gp.c.splice(gi, 1, ...only.c);
      gp.r.splice(gi, 1, ...only.r.map((x) => x * s));
    } else gp.c[gi] = only;
  }
  return root;
}

export const MIN_RATIO = 0.06;

export function moveDivider(root: LayoutNode, path: number[], i: number, deltaRatio: number) {
  const n = at(root, path) as Split;
  const a = n.r[i];
  const b = n.r[i + 1];
  const d = Math.min(Math.max(deltaRatio, MIN_RATIO - a), b - MIN_RATIO);
  n.r[i] = a + d;
  n.r[i + 1] = b - d;
}

export function equalize(root: LayoutNode, path: number[]) {
  const n = at(root, path) as Split;
  n.r = n.c.map(() => 1 / n.c.length);
}
