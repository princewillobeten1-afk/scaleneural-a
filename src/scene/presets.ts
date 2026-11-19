export type CameraPresetId = 'overview' | 'core' | 'top' | 'conduits';
export type FinishPresetId = 'titanium' | 'azure' | 'gold' | 'ceramic';
export type SceneThemeMode = 'dark' | 'light';

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

export interface FinishPreset {
  id: FinishPresetId;
  label: string;
  swatch: string;
  chassisColor: number;
  chassisRoughness: number;
  chassisMetalness: number;
  gimbalColor: number;
  gimbalRoughness: number;
  gimbalMetalness: number;
  ceramicColor: number;
  accentColor: number;
  emissiveColor: number;
}

export interface WorkflowNodeSpec {
  id: string;
  code: string;
  name: string;
  summary: string;
  angleRad: number;
}

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  overview: {
    id: 'overview',
    label: 'Overview',
    position: [5.4, 3.35, 6.1],
    target: [0, 1.35, 0],
  },
  core: {
    id: 'core',
    label: 'Core',
    position: [2.45, 1.85, 2.85],
    target: [0, 1.48, 0],
  },
  top: {
    id: 'top',
    label: 'Top',
    position: [0.01, 7.2, 1.55],
    target: [0, 1.15, 0],
  },
  conduits: {
    id: 'conduits',
    label: 'Conduits',
    position: [-4.4, 1.5, 4.3],
    target: [0, 1.05, 0],
  },
};

export const FINISH_PRESETS: Record<FinishPresetId, FinishPreset> = {
  titanium: {
    id: 'titanium',
    label: 'Titanium',
    swatch: '#273558',
    chassisColor: 0x1b243c,
    chassisRoughness: 0.24,
    chassisMetalness: 0.92,
    gimbalColor: 0x7b93c9,
    gimbalRoughness: 0.16,
    gimbalMetalness: 0.95,
    ceramicColor: 0x14192c,
    accentColor: 0x39a9ff,
    emissiveColor: 0x4db8ff,
  },
  azure: {
    id: 'azure',
    label: 'Azure',
    swatch: '#1c6fe8',
    chassisColor: 0x173e7a,
    chassisRoughness: 0.2,
    chassisMetalness: 0.9,
    gimbalColor: 0xd0def7,
    gimbalRoughness: 0.14,
    gimbalMetalness: 0.96,
    ceramicColor: 0x162238,
    accentColor: 0x55e6b1,
    emissiveColor: 0x55e6b1,
  },
  gold: {
    id: 'gold',
    label: 'Brass',
    swatch: '#cfa052',
    chassisColor: 0x26232e,
    chassisRoughness: 0.25,
    chassisMetalness: 0.9,
    gimbalColor: 0xd5a454,
    gimbalRoughness: 0.17,
    gimbalMetalness: 0.96,
    ceramicColor: 0x1a1924,
    accentColor: 0xf4b860,
    emissiveColor: 0x62b8ff,
  },
  ceramic: {
    id: 'ceramic',
    label: 'Frost',
    swatch: '#dbe3f5',
    chassisColor: 0xdbe3f4,
    chassisRoughness: 0.34,
    chassisMetalness: 0.28,
    gimbalColor: 0x344263,
    gimbalRoughness: 0.16,
    gimbalMetalness: 0.94,
    ceramicColor: 0xf4f7ff,
    accentColor: 0x0e76e6,
    emissiveColor: 0x39a9ff,
  },
};

export const WORKFLOW_NODES: readonly WorkflowNodeSpec[] = [
  {
    id: 'audit',
    code: '01',
    name: 'Audit',
    summary: 'Maps workflow bottlenecks, manual handoffs & ROI potential',
    angleRad: 0,
  },
  {
    id: 'ingest',
    code: '02',
    name: 'Ingest',
    summary: 'Normalizes CRM, inbox, ERP & webhook signals cleanly',
    angleRad: Math.PI / 3,
  },
  {
    id: 'qualify',
    code: '03',
    name: 'Qualify',
    summary: 'Scores lead intent, urgency & SLA priority in real time',
    angleRad: (2 * Math.PI) / 3,
  },
  {
    id: 'route',
    code: '04',
    name: 'Route',
    summary: 'Dispatches tasks across teams, tools & approval gates',
    angleRad: Math.PI,
  },
  {
    id: 'automate',
    code: '05',
    name: 'Automate',
    summary: 'Executes multi-step agentic workflows reliably 24/7',
    angleRad: (4 * Math.PI) / 3,
  },
  {
    id: 'scale',
    code: '06',
    name: 'Scale',
    summary: 'Monitors throughput, guardrails & compounding gains',
    angleRad: (5 * Math.PI) / 3,
  },
];

export function clampExplodeFactor(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function getCameraPreset(id: string): CameraPreset {
  if (id in CAMERA_PRESETS) {
    return CAMERA_PRESETS[id as CameraPresetId];
  }
  return CAMERA_PRESETS.overview;
}

export function getFinishPreset(id: string): FinishPreset {
  if (id in FINISH_PRESETS) {
    return FINISH_PRESETS[id as FinishPresetId];
  }
  return FINISH_PRESETS.titanium;
}

export function dampValue(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  if (dt <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
