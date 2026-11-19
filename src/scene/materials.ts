import * as THREE from 'three';
import { getFinishPreset, type FinishPresetId, type SceneThemeMode } from './presets';
import type { StudioTextures } from './textures';

export interface StudioMaterials {
  chassis: THREE.MeshPhysicalMaterial;
  gimbal: THREE.MeshPhysicalMaterial;
  ceramic: THREE.MeshStandardMaterial;
  glassDome: THREE.MeshPhysicalMaterial;
  coreCrystal: THREE.MeshStandardMaterial;
  accentRing: THREE.MeshStandardMaterial;
  conduit: THREE.MeshStandardMaterial;
  fin: THREE.MeshStandardMaterial;
  packet: THREE.MeshBasicMaterial;
  floorDial: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  nodeHighlight: THREE.MeshStandardMaterial;
  hitbox: THREE.MeshBasicMaterial;
}

export function createStudioMaterials(
  textures: StudioTextures,
  isSoftwareGl: boolean,
  initialFinish: FinishPresetId = 'titanium',
  initialTheme: SceneThemeMode = 'dark'
): StudioMaterials {
  const preset = getFinishPreset(initialFinish);

  const chassis = new THREE.MeshPhysicalMaterial({
    color: preset.chassisColor,
    roughness: preset.chassisRoughness,
    metalness: preset.chassisMetalness,
    roughnessMap: textures.brushedRoughness,
    bumpMap: textures.brushedRoughness,
    bumpScale: 0.008,
    anisotropy: 0.78,
    anisotropyRotation: 0.2,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
  });

  const gimbal = new THREE.MeshPhysicalMaterial({
    color: preset.gimbalColor,
    roughness: preset.gimbalRoughness,
    metalness: preset.gimbalMetalness,
    anisotropy: 0.85,
    anisotropyRotation: 0,
  });

  // Matte architectural ceramic gives >= 0.50 roughness contrast against machined metal
  const ceramic = new THREE.MeshStandardMaterial({
    color: preset.ceramicColor,
    roughness: 0.78,
    metalness: 0.08,
  });

  const glassDome = new THREE.MeshPhysicalMaterial({
    color: 0xe6f2ff,
    metalness: 0,
    roughness: 0.06,
    transmission: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: isSoftwareGl ? 0.34 : 1,
    ior: 1.54,
    thickness: 1.1,
    attenuationColor: new THREE.Color(0x88c8ff),
    attenuationDistance: 2.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    depthWrite: false,
  });

  const coreCrystal = new THREE.MeshStandardMaterial({
    color: preset.accentColor,
    emissive: preset.emissiveColor,
    emissiveIntensity: 1.55,
    roughness: 0.22,
    metalness: 0.15,
  });

  const accentRing = new THREE.MeshStandardMaterial({
    color: preset.accentColor,
    emissive: preset.emissiveColor,
    emissiveIntensity: 0.9,
    roughness: 0.28,
    metalness: 0.45,
  });

  const conduit = new THREE.MeshStandardMaterial({
    color: 0x354468,
    roughness: 0.42,
    metalness: 0.68,
    bumpMap: textures.brushedRoughness,
    bumpScale: 0.006,
  });

  const fin = new THREE.MeshStandardMaterial({
    color: preset.gimbalColor,
    roughness: 0.22,
    metalness: 0.88,
  });

  const packet = new THREE.MeshBasicMaterial({
    color: preset.emissiveColor,
  });

  const floorDial = new THREE.MeshStandardMaterial({
    map: initialTheme === 'light' ? textures.floorDialLight : textures.floorDialDark,
    transparent: true,
    roughness: 0.72,
    metalness: 0.12,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });

  const nodeHighlight = new THREE.MeshStandardMaterial({
    color: 0x55e6b1,
    emissive: 0x55e6b1,
    emissiveIntensity: 1.85,
    roughness: 0.2,
    metalness: 0.2,
  });

  const hitbox = new THREE.MeshBasicMaterial({
    visible: false,
  });

  return {
    chassis,
    gimbal,
    ceramic,
    glassDome,
    coreCrystal,
    accentRing,
    conduit,
    fin,
    packet,
    floorDial,
    contactShadow,
    nodeHighlight,
    hitbox,
  };
}

export function applyFinishToMaterials(
  materials: StudioMaterials,
  finishId: FinishPresetId
): void {
  const preset = getFinishPreset(finishId);
  materials.chassis.color.setHex(preset.chassisColor);
  materials.chassis.roughness = preset.chassisRoughness;
  materials.chassis.metalness = preset.chassisMetalness;

  materials.gimbal.color.setHex(preset.gimbalColor);
  materials.gimbal.roughness = preset.gimbalRoughness;
  materials.gimbal.metalness = preset.gimbalMetalness;

  materials.fin.color.setHex(preset.gimbalColor);
  materials.ceramic.color.setHex(preset.ceramicColor);

  materials.coreCrystal.color.setHex(preset.accentColor);
  materials.coreCrystal.emissive.setHex(preset.emissiveColor);

  materials.accentRing.color.setHex(preset.accentColor);
  materials.accentRing.emissive.setHex(preset.emissiveColor);

  materials.packet.color.setHex(preset.emissiveColor);
}

export function applyThemeToMaterials(
  materials: StudioMaterials,
  textures: StudioTextures,
  theme: SceneThemeMode
): void {
  materials.floorDial.map =
    theme === 'light' ? textures.floorDialLight : textures.floorDialDark;
  materials.floorDial.needsUpdate = true;
  materials.contactShadow.opacity = theme === 'light' ? 0.34 : 0.48;
}

export function disposeStudioMaterials(materials: StudioMaterials): void {
  Object.values(materials).forEach((mat) => mat.dispose());
}
