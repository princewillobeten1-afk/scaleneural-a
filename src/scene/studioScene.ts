import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {
  applyFinishToMaterials,
  applyThemeToMaterials,
  createStudioMaterials,
  disposeStudioMaterials,
} from './materials';
import { buildNeuralEngine } from './neuralEngineModel';
import {
  clampExplodeFactor,
  dampValue,
  getCameraPreset,
  type CameraPresetId,
  type FinishPresetId,
  type SceneThemeMode,
} from './presets';
import { createStudioTextures, disposeStudioTextures } from './textures';

export interface SelectionInfo {
  id: string;
  label: string;
  summary: string;
}

export interface StudioSceneOptions {
  container: HTMLElement;
  initialTheme?: SceneThemeMode;
  initialFinish?: FinishPresetId;
  onSelect?: (info: SelectionInfo) => void;
}

export interface StudioSceneController {
  setExplode: (ratio: number) => void;
  setCameraPreset: (presetId: CameraPresetId) => void;
  setFinish: (finishId: FinishPresetId) => void;
  setTheme: (theme: SceneThemeMode) => void;
  setPaused: (paused: boolean) => void;
  resetView: () => void;
  dispose: () => void;
}

const _pointerNdc = new THREE.Vector2();
const _targetCamPos = new THREE.Vector3();
const _targetCtrlTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function createStudioScene(
  options: StudioSceneOptions
): StudioSceneController {
  const { container, onSelect } = options;
  let currentTheme: SceneThemeMode = options.initialTheme ?? 'dark';
  let currentFinish: FinishPresetId = options.initialFinish ?? 'titanium';
  const isSoftwareGl = detectSoftwareWebGL();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(
    isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
  );
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  const bgDark = new THREE.Color(0x070917);
  const bgLight = new THREE.Color(0xeaf0ff);
  const initialBg = currentTheme === 'light' ? bgLight : bgDark;
  scene.background = initialBg.clone();
  scene.fog = new THREE.FogExp2(initialBg.getHex(), 0.036);

  // Studio environment reflection on every device
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  const responsiveFov = (w: number, h: number) => {
    const aspect = w / Math.max(1, h);
    return aspect < 0.85 ? 58 : aspect < 1.1 ? 48 : 42;
  };

  const camera = new THREE.PerspectiveCamera(
    responsiveFov(width, height),
    width / height,
    0.1,
    100
  );
  const overview = getCameraPreset('overview');
  camera.position.set(...overview.position);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 2.8;
  controls.maxDistance = 13.5;
  controls.minPolarAngle = 0.14;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.target.set(...overview.target);
  controls.update();

  // Balanced 3-point warm/cool studio lighting rig (1 shadow caster)
  const hemiLight = new THREE.HemisphereLight(
    currentTheme === 'light' ? 0xddeaff : 0x7cb8ff,
    currentTheme === 'light' ? 0xbec9e2 : 0x11162b,
    currentTheme === 'light' ? 1.05 : 0.72
  );
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.25);
  keyLight.position.set(5.5, 8.2, 5.2);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 26;
  const d = 5.5;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x7c6cff, 1.15);
  rimLight.position.set(-5.8, 4.2, -5.0);
  scene.add(rimLight);

  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const softboxLeft = new THREE.RectAreaLight(0x6ec3ff, 2.8, 4.2, 2.4);
    softboxLeft.position.set(-5.2, 3.4, 2.4);
    softboxLeft.lookAt(0, 1.4, 0);
    scene.add(softboxLeft);

    const softboxRight = new THREE.RectAreaLight(0xb287ff, 2.2, 4.0, 2.2);
    softboxRight.position.set(5.0, 2.8, -2.6);
    softboxRight.lookAt(0, 1.4, 0);
    scene.add(softboxRight);
  }

  // Procedural textures, PBR materials & composite Neural Engine model
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = createStudioTextures(maxAnisotropy);
  const materials = createStudioMaterials(
    textures,
    isSoftwareGl,
    currentFinish,
    currentTheme
  );
  const engine = buildNeuralEngine(materials);
  scene.add(engine.root);

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Smooth transition states
  let targetExplode = 0;
  let currentExplode = 0;
  let camTransitionActive = false;
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let elapsed = 0;
  let frameId = 0;
  let disposed = false;

  _targetCamPos.set(...overview.position);
  _targetCtrlTarget.set(...overview.target);

  const handleControlStart = () => {
    // Yield immediately when user grabs the viewport
    camTransitionActive = false;
  };
  controls.addEventListener('start', handleControlStart);

  // Layer 1 throttled raycasting for node/core inspection
  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(1);

  let lastHoverCheck = 0;
  let downX = 0;
  let downY = 0;

  const updatePointerNdc = (clientX: number, clientY: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  };

  const handlePointerMove = (event: PointerEvent) => {
    const now = performance.now();
    if (now - lastHoverCheck < 50) return;
    lastHoverCheck = now;
    if (!updatePointerNdc(event.clientX, event.clientY)) return;
    raycaster.setFromCamera(_pointerNdc, camera);
    const hits = raycaster.intersectObjects(engine.hitboxes, false);
    renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
  };

  const handlePointerDown = (event: PointerEvent) => {
    downX = event.clientX;
    downY = event.clientY;
    renderer.domElement.style.cursor = 'grabbing';
  };

  const handlePointerUp = (event: PointerEvent) => {
    renderer.domElement.style.cursor = 'grab';
    const travel = Math.hypot(event.clientX - downX, event.clientY - downY);
    if (travel > 6) return;
    if (!updatePointerNdc(event.clientX, event.clientY)) return;
    raycaster.setFromCamera(_pointerNdc, camera);
    const hits = raycaster.intersectObjects(engine.hitboxes, false);
    if (hits.length > 0) {
      const id = String(hits[0].object.userData.selectId || 'core');
      engine.setSelectedId(id);
      const match = engine.selectables.find((item) => item.id === id);
      if (match && onSelect) {
        onSelect({ id: match.id, label: match.label, summary: match.summary });
      }
    }
  };

  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.addEventListener('pointermove', handlePointerMove, {
    passive: true,
  });
  renderer.domElement.addEventListener('pointerdown', handlePointerDown, {
    passive: true,
  });
  renderer.domElement.addEventListener('pointerup', handlePointerUp, {
    passive: true,
  });

  const handleResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.fov = responsiveFov(w, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
  };
  window.addEventListener('resize', handleResize);

  // Software-WebGL fence pacing helper (SKILL.md Section 2.3)
  function afterDraw(cb: () => void) {
    if (disposed) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    } else {
      frameId = window.setTimeout(cb, 80);
    }
  }

  let lastFrameTime = performance.now();

  function tick() {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(0.12, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    if (!paused) {
      elapsed += dt;
    }

    currentExplode = dampValue(currentExplode, targetExplode, 7.5, dt);

    if (camTransitionActive) {
      const k = 6.5;
      camera.position.x = dampValue(camera.position.x, _targetCamPos.x, k, dt);
      camera.position.y = dampValue(camera.position.y, _targetCamPos.y, k, dt);
      camera.position.z = dampValue(camera.position.z, _targetCamPos.z, k, dt);

      controls.target.x = dampValue(controls.target.x, _targetCtrlTarget.x, k, dt);
      controls.target.y = dampValue(controls.target.y, _targetCtrlTarget.y, k, dt);
      controls.target.z = dampValue(controls.target.z, _targetCtrlTarget.z, k, dt);

      if (
        camera.position.distanceTo(_targetCamPos) < 0.015 &&
        controls.target.distanceTo(_targetCtrlTarget) < 0.015
      ) {
        camera.position.copy(_targetCamPos);
        controls.target.copy(_targetCtrlTarget);
        camTransitionActive = false;
      }
    }

    engine.update(elapsed, currentExplode, paused ? 0 : 1);
    controls.update();
    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  // Kick off loop
  if (isSoftwareGl) {
    renderer.render(scene, camera);
    afterDraw(tick);
  } else {
    frameId = window.requestAnimationFrame(tick);
  }

  const applyTheme = (theme: SceneThemeMode) => {
    currentTheme = theme;
    const bg = theme === 'light' ? bgLight : bgDark;
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(bg);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(bg);
    }
    hemiLight.color.setHex(theme === 'light' ? 0xddeaff : 0x7cb8ff);
    hemiLight.groundColor.setHex(theme === 'light' ? 0xbec9e2 : 0x11162b);
    hemiLight.intensity = theme === 'light' ? 1.05 : 0.72;
    applyThemeToMaterials(materials, textures, theme);
  };

  return {
    setExplode(ratio: number) {
      targetExplode = clampExplodeFactor(ratio);
    },
    setCameraPreset(presetId: CameraPresetId) {
      const preset = getCameraPreset(presetId);
      _targetCamPos.set(...preset.position);
      _targetCtrlTarget.set(...preset.target);
      camTransitionActive = true;
    },
    setFinish(finishId: FinishPresetId) {
      currentFinish = finishId;
      applyFinishToMaterials(materials, finishId);
      engine.coreCageMat.color.copy(materials.gimbal.color);
      engine.refreshColors();
    },
    setTheme(theme: SceneThemeMode) {
      applyTheme(theme);
    },
    setPaused(nextPaused: boolean) {
      paused = nextPaused;
    },
    resetView() {
      targetExplode = 0;
      const preset = getCameraPreset('overview');
      _targetCamPos.set(...preset.position);
      _targetCtrlTarget.set(...preset.target);
      camTransitionActive = true;
    },
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', handleControlStart);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();

      engine.selectables.forEach((part) => {
        if (part.id !== 'core' && !Array.isArray(part.lensMesh.material)) {
          part.lensMesh.material.dispose();
        }
      });
      if (!Array.isArray(engine.coreCage.material)) {
        engine.coreCage.material.dispose();
      }
      engine.geometriesToDispose.forEach((geo) => geo.dispose());
      disposeStudioMaterials(materials);
      disposeStudioTextures(textures);
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
