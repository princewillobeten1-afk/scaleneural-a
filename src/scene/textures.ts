import * as THREE from 'three';
import type { SceneThemeMode } from './presets';

export interface StudioTextures {
  brushedRoughness: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  floorDialDark: THREE.CanvasTexture;
  floorDialLight: THREE.CanvasTexture;
}

function createBrushedMetalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#969696';
    ctx.fillRect(0, 0, size, size);

    // Fine directional micro-grain lines for brushed metallic response
    for (let i = 0; i < 1600; i++) {
      const y = (i * 17) % size;
      const x = (i * 73) % size;
      const len = 36 + ((i * 29) % 140);
      const v = 115 + ((i * 19) % 90);
      ctx.fillStyle = `rgba(${v},${v},${v},0.16)`;
      ctx.fillRect(x, y, len, 1);
      if (x + len > size) {
        ctx.fillRect(x - size, y, len, 1);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const grad = ctx.createRadialGradient(cx, cx, size * 0.08, cx, cx, cx);
    grad.addColorStop(0, 'rgba(3, 6, 18, 0.78)');
    grad.addColorStop(0.42, 'rgba(3, 6, 18, 0.42)');
    grad.addColorStop(0.75, 'rgba(3, 6, 18, 0.12)');
    grad.addColorStop(1, 'rgba(3, 6, 18, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createFloorDialTexture(
  mode: SceneThemeMode,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const isLight = mode === 'light';
    ctx.clearRect(0, 0, size, size);

    // Subtle concentric studio floor plate & radial fade
    const bgGrad = ctx.createRadialGradient(cx, cx, 40, cx, cx, cx * 0.94);
    bgGrad.addColorStop(
      0,
      isLight ? 'rgba(226, 234, 255, 0.92)' : 'rgba(18, 23, 48, 0.92)'
    );
    bgGrad.addColorStop(
      0.65,
      isLight ? 'rgba(235, 240, 255, 0.55)' : 'rgba(11, 14, 30, 0.55)'
    );
    bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    const ringStroke = isLight
      ? 'rgba(14, 118, 230, 0.24)'
      : 'rgba(57, 169, 255, 0.25)';
    const minorStroke = isLight
      ? 'rgba(36, 52, 94, 0.14)'
      : 'rgba(148, 168, 224, 0.14)';

    // Concentric precision rings
    [0.24, 0.38, 0.54, 0.72, 0.88].forEach((rRatio, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cx, cx * rRatio, 0, Math.PI * 2);
      ctx.strokeStyle = idx % 2 === 0 ? ringStroke : minorStroke;
      ctx.lineWidth = idx === 2 ? 2.5 : 1.5;
      ctx.stroke();
    });

    // 72 radial degree tick marks
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const major = i % 6 === 0;
      const r0 = cx * (major ? 0.67 : 0.7);
      const r1 = cx * 0.72;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r0, cx + Math.sin(angle) * r0);
      ctx.lineTo(cx + Math.cos(angle) * r1, cx + Math.sin(angle) * r1);
      ctx.strokeStyle = major ? ringStroke : minorStroke;
      ctx.lineWidth = major ? 2.2 : 1.2;
      ctx.stroke();
    }

    // 6 cardinal node axis lines
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * cx * 0.24, cx + Math.sin(angle) * cx * 0.24);
      ctx.lineTo(cx + Math.cos(angle) * cx * 0.88, cx + Math.sin(angle) * cx * 0.88);
      ctx.strokeStyle = minorStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createStudioTextures(maxAnisotropy: number): StudioTextures {
  return {
    brushedRoughness: createBrushedMetalTexture(maxAnisotropy),
    contactShadow: createContactShadowTexture(),
    floorDialDark: createFloorDialTexture('dark', maxAnisotropy),
    floorDialLight: createFloorDialTexture('light', maxAnisotropy),
  };
}

export function disposeStudioTextures(textures: StudioTextures): void {
  textures.brushedRoughness.dispose();
  textures.contactShadow.dispose();
  textures.floorDialDark.dispose();
  textures.floorDialLight.dispose();
}
