import type { LayoutNode } from './layout';

export type Fit = 'cover' | 'contain';
export interface Slot {
  img: string | null;
  zoom: number;
  /** Pan offset in [-1, 1] of the available overflow on each axis. */
  ox: number;
  oy: number;
  rot: 0 | 90 | 180 | 270;
  flip: boolean;
  fit: Fit;
}

export interface Style {
  padding: number;
  gap: number;
  radius: number;
  shadow: number;
}

export type BgType = 'color' | 'gradient' | 'photo';
export interface Bg {
  type: BgType;
  color: string;
  color2: string;
  angle: number;
  /** null = use the first photo in the collage */
  img: string | null;
  blur: number;
  dim: number;
}

export type WmPos = 'tl' | 'tc' | 'tr' | 'ml' | 'c' | 'mr' | 'bl' | 'bc' | 'br';
export interface Watermark {
  on: boolean;
  text: string;
  color: string;
  size: number;
  opacity: number;
  rotation: number;
  mode: 'tile' | 'single';
  density: 'sparse' | 'medium' | 'dense';
  pos: WmPos;
}

export type TextStyle = 'plain' | 'outline' | 'pill';
interface AnnotBase {
  id: string;
  color: string;
}
export interface TextAnnot extends AnnotBase {
  kind: 'text';
  /** Center, normalized 0..1 */
  x: number;
  y: number;
  text: string;
  /** Font size in units (1 unit = long edge / 1000). */
  size: number;
  bold: boolean;
  style: TextStyle;
}
export interface BoxAnnot extends AnnotBase {
  kind: 'rect' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: number;
  fill: boolean;
}
export interface ArrowAnnot extends AnnotBase {
  kind: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: number;
}
export type Annot = TextAnnot | BoxAnnot | ArrowAnnot;
export type AnnotKind = Annot['kind'];

export interface Ratio {
  w: number;
  h: number;
}

export interface Doc {
  layout: LayoutNode;
  slots: Record<string, Slot>;
  ratio: Ratio;
  style: Style;
  bg: Bg;
  wm: Watermark;
  annots: Annot[];
}

export const emptySlot = (): Slot => ({ img: null, zoom: 1, ox: 0, oy: 0, rot: 0, flip: false, fit: 'cover' });

export const DEFAULT_STYLE: Style = { padding: 16, gap: 12, radius: 12, shadow: 0 };
export const DEFAULT_BG: Bg = { type: 'color', color: '#FFFFFF', color2: '#B39DDB', angle: 135, img: null, blur: 40, dim: 0 };
export const DEFAULT_WM: Watermark = {
  on: false,
  text: '',
  color: '#FFFFFF',
  size: 28,
  opacity: 0.35,
  rotation: -30,
  mode: 'tile',
  density: 'medium',
  pos: 'br',
};

export interface RatioPreset {
  w: number;
  h: number;
  /** i18n key of a hint such as "6-inch" */
  hint?: string;
  group: 'screen' | 'social' | 'print';
}
export const RATIOS: RatioPreset[] = [
  { w: 1, h: 1, group: 'screen' },
  { w: 4, h: 3, group: 'screen' },
  { w: 3, h: 4, group: 'screen' },
  { w: 16, h: 9, group: 'screen' },
  { w: 9, h: 16, group: 'screen' },
  { w: 3, h: 2, group: 'screen' },
  { w: 2, h: 3, group: 'screen' },
  { w: 21, h: 9, group: 'screen' },
  { w: 4, h: 5, group: 'social', hint: 'ratio.hint.portraitPost' },
  { w: 3, h: 4, group: 'social', hint: 'ratio.hint.rednote' },
  { w: 16, h: 9, group: 'social', hint: 'ratio.hint.cover' },
  { w: 2, h: 3, group: 'print', hint: 'ratio.hint.p6' },
  { w: 5, h: 7, group: 'print', hint: 'ratio.hint.p7' },
  { w: 4, h: 5, group: 'print', hint: 'ratio.hint.p8' },
  { w: 210, h: 297, group: 'print', hint: 'ratio.hint.a4' },
  { w: 297, h: 210, group: 'print', hint: 'ratio.hint.a4l' },
];

export const ANNOT_COLORS = ['#FFFFFF', '#111111', '#E53935', '#FFB300', '#43A047', '#1E88E5', '#8E24AA'];
