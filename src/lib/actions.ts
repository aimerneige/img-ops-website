/* Svelte actions shared by components. */

/** MD3 ripple: a wave that grows from the pointer and fades on release. */
export function ripple(node: HTMLElement, opts: { center?: boolean } = {}) {
  node.classList.add('rpl-host');

  const spawn = (x: number, y: number) => {
    const r = node.getBoundingClientRect();
    const size = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) * 2;
    const wave = document.createElement('span');
    wave.className = 'rpl-wave';
    wave.style.left = `${x - size / 2}px`;
    wave.style.top = `${y - size / 2}px`;
    wave.style.width = wave.style.height = `${size}px`;
    node.appendChild(wave);
    const born = performance.now();
    return () => {
      // Let the wave grow at least a bit before fading so quick taps still read.
      const wait = Math.max(0, 180 - (performance.now() - born));
      setTimeout(() => {
        wave.classList.add('rpl-out');
        setTimeout(() => wave.remove(), 400);
      }, wait);
    };
  };

  const disabled = () => node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true';

  const down = (e: PointerEvent) => {
    if (e.button !== 0 || disabled()) return;
    const r = node.getBoundingClientRect();
    const release = opts.center ? spawn(r.width / 2, r.height / 2) : spawn(e.clientX - r.left, e.clientY - r.top);
    const up = () => {
      release();
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const key = (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && !disabled()) {
      const r = node.getBoundingClientRect();
      spawn(r.width / 2, r.height / 2)();
    }
  };
  node.addEventListener('pointerdown', down);
  node.addEventListener('keydown', key);
  return {
    update(o: { center?: boolean } = {}) {
      opts = o;
    },
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('keydown', key);
    },
  };
}

/** Move a node to <body> so it escapes overflow/stacking contexts. */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return { destroy: () => node.remove() };
}

/* ───────── Tooltip (single shared element, never the native title) ───────── */
let tipEl: HTMLDivElement | null = null;
let tipTimer = 0;
let tipOwner: HTMLElement | null = null;

function tipShow(anchor: HTMLElement, text: string, delay: number) {
  clearTimeout(tipTimer);
  tipTimer = window.setTimeout(() => {
    if (!anchor.isConnected) return;
    tipEl ??= Object.assign(document.createElement('div'), { className: 'md-tooltip', role: 'tooltip' });
    if (!tipEl.isConnected) document.body.appendChild(tipEl);
    tipEl.textContent = text;
    tipEl.classList.remove('show');
    const a = anchor.getBoundingClientRect();
    const t = tipEl.getBoundingClientRect();
    let top = a.bottom + 6;
    if (top + t.height > innerHeight - 4) top = a.top - t.height - 6;
    const left = Math.min(Math.max(4, a.left + a.width / 2 - t.width / 2), innerWidth - t.width - 4);
    tipEl.style.transform = `translate(${left}px, ${top}px)`;
    void tipEl.offsetWidth;
    tipEl.classList.add('show');
    tipOwner = anchor;
  }, delay);
}
function tipHide(anchor?: HTMLElement) {
  clearTimeout(tipTimer);
  if (anchor && tipOwner !== anchor) return;
  tipEl?.classList.remove('show');
  tipOwner = null;
}

export function tooltip(node: HTMLElement, text: string | undefined) {
  let current = text;
  const enter = (e: PointerEvent) => e.pointerType === 'mouse' && current && tipShow(node, current, 450);
  const focus = () => node.matches(':focus-visible') && current && tipShow(node, current, 0);
  const leave = () => tipHide(node);
  node.addEventListener('pointerenter', enter);
  node.addEventListener('pointerleave', leave);
  node.addEventListener('pointerdown', leave);
  node.addEventListener('focus', focus);
  node.addEventListener('blur', leave);
  return {
    update(t: string | undefined) {
      current = t;
      if (tipOwner === node && tipEl && t) tipEl.textContent = t;
    },
    destroy() {
      leave();
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', leave);
      node.removeEventListener('pointerdown', leave);
      node.removeEventListener('focus', focus);
      node.removeEventListener('blur', leave);
    },
  };
}

/* ───────── Floating placement ───────── */
export type Placement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top' | 'right-start' | 'left-start';

export function place(anchor: DOMRect, el: HTMLElement, placement: Placement, gap = 4) {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = innerWidth;
  const vh = innerHeight;
  let [side, align] = placement.split('-') as [string, string | undefined];

  if (side === 'bottom' && anchor.bottom + gap + h > vh - 8 && anchor.top - gap - h > 8) side = 'top';
  else if (side === 'top' && anchor.top - gap - h < 8 && anchor.bottom + gap + h < vh - 8) side = 'bottom';
  if (side === 'right' && anchor.right + gap + w > vw - 8) side = 'left';

  let x = 0;
  let y = 0;
  if (side === 'bottom' || side === 'top') {
    y = side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - h;
    x = align === 'start' ? anchor.left : align === 'end' ? anchor.right - w : anchor.left + anchor.width / 2 - w / 2;
  } else {
    x = side === 'right' ? anchor.right + gap : anchor.left - gap - w;
    y = anchor.top;
  }
  x = Math.min(Math.max(8, x), vw - w - 8);
  y = Math.min(Math.max(8, y), vh - h - 8);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.maxHeight = `${vh - 16}px`;
  el.dataset.side = side;
  el.style.transformOrigin = side === 'top' ? 'bottom center' : side === 'bottom' ? 'top center' : 'left top';
}
