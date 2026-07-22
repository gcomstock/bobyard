// Matches public/blueprint.png. Previous placeholder: public/blueprint.svg at 1200×850.
export const IMG_W = 1301;
export const IMG_H = 692;

export type ModeKey = 'size' | 'type' | 'system';

export interface Point {
  x: number;
  y: number;
}

export interface PipeRun {
  id: string;
  points: Point[]; // in image coordinate space
  size: string | null;
  type: string | null;
  system: string | null;
}

export interface RowDef {
  value: string | null; // null = Unassigned
  label: string;
  color: string;
  dash?: string; // stroke-dasharray, Type mode only
  confidence: number; // 0–100, placeholder AI confidence score
}

export const MODE_LABELS: Record<ModeKey, string> = {
  size: 'Size',
  type: 'Type',
  system: 'System',
};

export const MODE_ROWS: Record<ModeKey, RowDef[]> = {
  size: [
    { value: '1/2"', label: '1/2"', color: '#22c55e', confidence: 92 },
    { value: '3/4"', label: '3/4"', color: '#f59e0b', confidence: 88 },
    { value: '1"', label: '1"', color: '#14b8a6', confidence: 76 },
    { value: '1 1/4"', label: '1 1/4"', color: '#f97316', confidence: 64 },
    { value: '1 1/2"', label: '1 1/2"', color: '#f43f2e', confidence: 71 },
    { value: '2"', label: '2"', color: '#06b6d4', confidence: 83 },
    { value: '2 1/2"', label: '2 1/2"', color: '#84cc16', confidence: 47 },
    { value: '5"', label: '5"', color: '#8b5cf6', confidence: 58 },
    { value: null, label: 'Unassigned', color: '#9ca3af', confidence: 0 },
  ],
  type: [
    { value: 'PVC', label: 'PVC', color: '#3b82f6', dash: '8 4', confidence: 85 },
    { value: 'Copper', label: 'Copper', color: '#b45309', dash: '2 4', confidence: 66 },
    { value: 'CPVC', label: 'CPVC', color: '#7c3aed', dash: '12 4 2 4', confidence: 41 },
    { value: null, label: 'Unassigned', color: '#9ca3af', confidence: 0 },
  ],
  system: [
    { value: 'Hot Water', label: 'Hot Water', color: '#ef4444', confidence: 78 },
    { value: 'Cold Water', label: 'Cold Water', color: '#2563eb', confidence: 91 },
    { value: 'Cold Water Return', label: 'Cold Water Return', color: '#a855f7', confidence: 53 },
    { value: null, label: 'Unassigned', color: '#9ca3af', confidence: 0 },
  ],
};

export function rowFor(mode: ModeKey, value: string | null): RowDef {
  const rows = MODE_ROWS[mode];
  return rows.find((r) => r.value === value) ?? rows.find((r) => r.value === null)!;
}

export function visKey(mode: ModeKey, value: string | null): string {
  return `${mode}:${value ?? '∅'}`;
}

let seq = 0;
export function nextId(): string {
  return `run-${++seq}-${Date.now().toString(36)}`;
}

export const SEED_RUNS: PipeRun[] = [
  {
    id: nextId(),
    points: [
      { x: 90, y: 210 },
      { x: 500, y: 210 },
      { x: 500, y: 235 },
    ],
    size: '3/4"',
    type: 'Copper',
    system: 'Cold Water',
  },
  {
    id: nextId(),
    points: [
      { x: 62, y: 245 },
      { x: 62, y: 445 },
      { x: 180, y: 445 },
    ],
    size: '1"',
    type: 'PVC',
    system: 'Cold Water',
  },
  {
    id: nextId(),
    points: [
      { x: 560, y: 210 },
      { x: 950, y: 210 },
      { x: 950, y: 300 },
    ],
    size: '1/2"',
    type: 'Copper',
    system: 'Hot Water',
  },
  {
    id: nextId(),
    points: [
      { x: 130, y: 505 },
      { x: 430, y: 505 },
      { x: 430, y: 465 },
    ],
    size: '1/2"',
    type: 'CPVC',
    system: 'Hot Water',
  },
  {
    id: nextId(),
    points: [
      { x: 620, y: 330 },
      { x: 620, y: 470 },
      { x: 720, y: 470 },
    ],
    size: '1 1/2"',
    type: 'PVC',
    system: 'Cold Water',
  },
  {
    id: nextId(),
    points: [
      { x: 975, y: 240 },
      { x: 1135, y: 240 },
      { x: 1135, y: 430 },
    ],
    size: '1 1/4"',
    type: 'Copper',
    system: 'Cold Water Return',
  },
  {
    id: nextId(),
    points: [
      { x: 300, y: 330 },
      { x: 520, y: 330 },
    ],
    size: null,
    type: null,
    system: null,
  },
  {
    id: nextId(),
    points: [
      { x: 760, y: 505 },
      { x: 980, y: 505 },
      { x: 980, y: 435 },
    ],
    size: '2 1/2"',
    type: 'PVC',
    system: 'Cold Water',
  },
  {
    id: nextId(),
    points: [
      { x: 235, y: 390 },
      { x: 235, y: 460 },
      { x: 380, y: 460 },
    ],
    size: '3/4"',
    type: 'CPVC',
    system: 'Hot Water',
  },
  {
    id: nextId(),
    points: [
      { x: 735, y: 240 },
      { x: 735, y: 380 },
      { x: 860, y: 380 },
    ],
    size: '5"',
    type: null,
    system: 'Cold Water',
  },
  {
    id: nextId(),
    points: [
      { x: 480, y: 390 },
      { x: 480, y: 450 },
      { x: 560, y: 450 },
    ],
    size: '2"',
    type: 'Copper',
    system: null,
  },
];
