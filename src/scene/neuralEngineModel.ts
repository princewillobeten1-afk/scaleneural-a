import * as THREE from 'three';
import type { StudioMaterials } from './materials';
import { WORKFLOW_NODES, type WorkflowNodeSpec } from './presets';

export interface SelectablePart {
  id: string;
  label: string;
  summary: string;
  group: THREE.Group;
  lensMesh: THREE.Mesh;
}

export interface ExplodableLayer {
  group: THREE.Object3D;
  basePosition: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

export interface NeuralEngineRig {
  root: THREE.Group;
  outerGimbal: THREE.Group;
  innerGimbal: THREE.Group;
  coreCrystal: THREE.Mesh;
  coreCage: THREE.Mesh;
  coreCageMat: THREE.MeshStandardMaterial;
  workflowRing: THREE.Group;
  packetsMesh: THREE.InstancedMesh;
  conduitCurves: THREE.CatmullRomCurve3[];
  explodables: ExplodableLayer[];
  selectables: SelectablePart[];
  hitboxes: THREE.Mesh[];
  geometriesToDispose: THREE.BufferGeometry[];
  setSelectedId: (id: string | null) => void;
  refreshColors: () => void;
  update: (elapsed: number, explodeRatio: number, flowFactor: number) => void;
}

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _mat4 = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

function createPolygonShape(sides: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + Math.PI / sides;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createRingPolygonShape(
  sides: number,
  outerRadius: number,
  innerRadius: number
): THREE.Shape {
  const shape = createPolygonShape(sides, outerRadius);
  const hole = new THREE.Path();
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + Math.PI / sides;
    const x = Math.cos(angle) * innerRadius;
    const y = Math.sin(angle) * innerRadius;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

export function buildNeuralEngine(materials: StudioMaterials): NeuralEngineRig {
  const root = new THREE.Group();
  root.name = 'ScaleNeuralCore';

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const explodables: ExplodableLayer[] = [];
  const selectables: SelectablePart[] = [];
  const hitboxes: THREE.Mesh[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometriesToDispose.push(geo);
    return geo;
  };

  // 1. Studio Calibration Floor & Soft Contact Shadow (offset on Y to prevent Z-fighting)
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(6.6, 6.6));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMesh = new THREE.Mesh(shadowGeo, materials.contactShadow);
  shadowMesh.position.y = 0.004;
  shadowMesh.renderOrder = 0;
  root.add(shadowMesh);

  const dialGeo = trackGeo(new THREE.CircleGeometry(4.4, 72));
  dialGeo.rotateX(-Math.PI / 2);
  const dialMesh = new THREE.Mesh(dialGeo, materials.floorDial);
  dialMesh.position.y = 0.024;
  dialMesh.receiveShadow = true;
  root.add(dialMesh);

  // 2. Grounded Multi-Tier Manifold Plinth (bottom-center flush at y = 0)
  const plinthGroup = new THREE.Group();
  plinthGroup.name = 'ManifoldPlinth';
  root.add(plinthGroup);

  const plinthProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(2.05, 0.0),
    new THREE.Vector2(2.05, 0.1),
    new THREE.Vector2(1.88, 0.18),
    new THREE.Vector2(1.58, 0.2),
    new THREE.Vector2(1.48, 0.34),
    new THREE.Vector2(1.18, 0.38),
    new THREE.Vector2(0.0, 0.38),
  ];
  const plinthGeo = trackGeo(new THREE.LatheGeometry(plinthProfile, 48));
  if (plinthGeo.index && plinthGeo.attributes.uv) {
    plinthGeo.computeTangents();
  }
  const plinthMesh = new THREE.Mesh(plinthGeo, materials.chassis);
  plinthMesh.castShadow = true;
  plinthMesh.receiveShadow = true;
  plinthGroup.add(plinthMesh);

  // Ceramic acoustic/thermal isolation ring on the plinth
  const isoRingGeo = trackGeo(new THREE.TorusGeometry(1.52, 0.06, 16, 64));
  isoRingGeo.rotateX(Math.PI / 2);
  const isoRing = new THREE.Mesh(isoRingGeo, materials.ceramic);
  isoRing.position.y = 0.24;
  isoRing.castShadow = true;
  isoRing.receiveShadow = true;
  plinthGroup.add(isoRing);

  // Beveled octagonal manifold collar
  const collarShape = createRingPolygonShape(8, 1.32, 0.72);
  const collarGeo = trackGeo(
    new THREE.ExtrudeGeometry(collarShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
    })
  );
  collarGeo.rotateX(-Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, materials.gimbal);
  collarMesh.position.y = 0.38;
  collarMesh.castShadow = true;
  collarMesh.receiveShadow = true;
  plinthGroup.add(collarMesh);

  // Accent light collar strip
  const plinthLightGeo = trackGeo(new THREE.TorusGeometry(1.22, 0.022, 12, 64));
  plinthLightGeo.rotateX(Math.PI / 2);
  const plinthLight = new THREE.Mesh(plinthLightGeo, materials.accentRing);
  plinthLight.position.y = 0.56;
  plinthGroup.add(plinthLight);

  // 3. Lower Turbine Deck + 3 Structural Cradle Struts + Instanced Heatsink Array
  const spindleGroup = new THREE.Group();
  spindleGroup.position.y = 0.56;
  root.add(spindleGroup);

  const spindleProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.5, 0.24),
    new THREE.Vector2(0.38, 0.34),
    new THREE.Vector2(0.0, 0.34),
  ];
  const spindleGeo = trackGeo(new THREE.LatheGeometry(spindleProfile, 36));
  const spindleMesh = new THREE.Mesh(spindleGeo, materials.ceramic);
  spindleMesh.castShadow = true;
  spindleMesh.receiveShadow = true;
  spindleGroup.add(spindleMesh);

  // 3 slim architectural struts framing the glass core bay without intersecting crystal
  const cradleStrutGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.044, 1.56, 14));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const strut = new THREE.Mesh(cradleStrutGeo, materials.ceramic);
    strut.position.set(Math.cos(a) * 0.94, 1.06, Math.sin(a) * 0.94);
    strut.castShadow = true;
    spindleGroup.add(strut);
  }

  // Lower beveled chassis deck
  const lowerPlateShape = createRingPolygonShape(6, 1.18, 0.44);
  const lowerPlateGeo = trackGeo(
    new THREE.ExtrudeGeometry(lowerPlateShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 3,
    })
  );
  lowerPlateGeo.rotateX(-Math.PI / 2);
  const lowerPlate = new THREE.Mesh(lowerPlateGeo, materials.chassis);
  lowerPlate.position.y = 0.12;
  lowerPlate.castShadow = true;
  lowerPlate.receiveShadow = true;
  spindleGroup.add(lowerPlate);

  // Instanced radial cooling fins around lower turbine (>20 repeated parts)
  const finCount = 28;
  const finGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.32, 0.24));
  const finInstanced = new THREE.InstancedMesh(finGeo, materials.fin, finCount);
  finInstanced.castShadow = true;
  finInstanced.receiveShadow = true;
  for (let i = 0; i < finCount; i++) {
    const a = (i / finCount) * Math.PI * 2;
    const r = 0.72;
    _vec3A.set(Math.cos(a) * r, 0.36, Math.sin(a) * r);
    _quat.setFromAxisAngle(_up, -a + Math.PI / 2);
    _mat4.compose(_vec3A, _quat, _scale);
    finInstanced.setMatrixAt(i, _mat4);
  }
  finInstanced.instanceMatrix.needsUpdate = true;
  finInstanced.computeBoundingSphere();
  spindleGroup.add(finInstanced);

  explodables.push({
    group: spindleGroup,
    basePosition: spindleGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.28, 0),
  });

  // 4. Upper Heatsink Crown (separates upward during Explode)
  const crownGroup = new THREE.Group();
  crownGroup.position.y = 2.48;
  root.add(crownGroup);

  const upperPlateShape = createRingPolygonShape(6, 1.06, 0.36);
  const upperPlateGeo = trackGeo(
    new THREE.ExtrudeGeometry(upperPlateShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 3,
    })
  );
  upperPlateGeo.rotateX(-Math.PI / 2);
  const upperPlate = new THREE.Mesh(upperPlateGeo, materials.chassis);
  upperPlate.castShadow = true;
  upperPlate.receiveShadow = true;
  crownGroup.add(upperPlate);

  const crownCapProfile = [
    new THREE.Vector2(0.0, 0.12),
    new THREE.Vector2(0.48, 0.12),
    new THREE.Vector2(0.42, 0.26),
    new THREE.Vector2(0.18, 0.36),
    new THREE.Vector2(0.0, 0.38),
  ];
  const crownCapGeo = trackGeo(new THREE.LatheGeometry(crownCapProfile, 32));
  const crownCap = new THREE.Mesh(crownCapGeo, materials.gimbal);
  crownCap.castShadow = true;
  crownGroup.add(crownCap);

  const crownBeaconGeo = trackGeo(new THREE.TorusGeometry(0.46, 0.02, 12, 48));
  crownBeaconGeo.rotateX(Math.PI / 2);
  const crownBeacon = new THREE.Mesh(crownBeaconGeo, materials.accentRing);
  crownBeacon.position.y = 0.24;
  crownGroup.add(crownBeacon);

  explodables.push({
    group: crownGroup,
    basePosition: crownGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 1.15, 0),
  });

  // 5. Optical Neural Core + Counter-Rotating Gimbal Rings
  const coreAnchor = new THREE.Group();
  coreAnchor.position.y = 1.52;
  root.add(coreAnchor);

  const crystalGeo = trackGeo(new THREE.IcosahedronGeometry(0.36, 1));
  const coreCrystal = new THREE.Mesh(crystalGeo, materials.coreCrystal);
  coreAnchor.add(coreCrystal);

  const cageGeo = trackGeo(new THREE.IcosahedronGeometry(0.48, 0));
  const coreCageMat = new THREE.MeshStandardMaterial({
    color: materials.gimbal.color,
    metalness: 0.9,
    roughness: 0.2,
    wireframe: true,
  });
  const coreCage = new THREE.Mesh(cageGeo, coreCageMat);
  coreCage.scale.setScalar(0.92);
  coreAnchor.add(coreCage);

  // Outer transmissive containment dome (depthWrite=false, renderOrder=2)
  const domeGroup = new THREE.Group();
  coreAnchor.add(domeGroup);
  const domeGeo = trackGeo(new THREE.SphereGeometry(0.62, 40, 28));
  const domeMesh = new THREE.Mesh(domeGeo, materials.glassDome);
  domeMesh.renderOrder = 2;
  domeGroup.add(domeMesh);

  // Interactive hitbox for Central Core
  const coreHitGeo = trackGeo(new THREE.SphereGeometry(0.7, 12, 12));
  const coreHitbox = new THREE.Mesh(coreHitGeo, materials.hitbox);
  coreHitbox.layers.set(1);
  coreHitbox.userData.selectId = 'core';
  coreAnchor.add(coreHitbox);
  hitboxes.push(coreHitbox);

  selectables.push({
    id: 'core',
    label: 'Neural Core',
    summary: 'Central orchestration kernel coordinating agents, data & guardrails',
    group: coreAnchor,
    lensMesh: coreCrystal,
  });

  // Outer Gimbal Ring + Machined Clamp Brackets
  const outerGimbal = new THREE.Group();
  coreAnchor.add(outerGimbal);
  const outerRingGeo = trackGeo(new THREE.TorusGeometry(0.88, 0.048, 20, 72));
  const outerRing = new THREE.Mesh(outerRingGeo, materials.gimbal);
  outerRing.castShadow = true;
  outerGimbal.add(outerRing);

  const clampGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.16, 0.14));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const clamp = new THREE.Mesh(clampGeo, materials.ceramic);
    clamp.position.set(Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0);
    clamp.rotation.z = a;
    outerGimbal.add(clamp);
  }

  // Inner Gimbal Ring
  const innerGimbal = new THREE.Group();
  coreAnchor.add(innerGimbal);
  const innerRingGeo = trackGeo(new THREE.TorusGeometry(0.73, 0.036, 16, 64));
  const innerRing = new THREE.Mesh(innerRingGeo, materials.chassis);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.castShadow = true;
  innerGimbal.add(innerRing);

  const innerAccentGeo = trackGeo(new THREE.TorusGeometry(0.73, 0.015, 10, 64));
  const innerAccent = new THREE.Mesh(innerAccentGeo, materials.accentRing);
  innerAccent.rotation.x = Math.PI / 2;
  innerAccent.position.y = 0.032;
  innerGimbal.add(innerAccent);

  explodables.push({
    group: coreAnchor,
    basePosition: coreAnchor.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.56, 0),
  });

  // 6. 4 Curved Data Conduits (TubeGeometry along CatmullRomCurve3)
  const conduitsGroup = new THREE.Group();
  root.add(conduitsGroup);
  const conduitCurves: THREE.CatmullRomCurve3[] = [];
  const socketProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.14, 0),
    new THREE.Vector2(0.14, 0.08),
    new THREE.Vector2(0.1, 0.14),
    new THREE.Vector2(0, 0.14),
  ];
  const socketGeo = trackGeo(new THREE.LatheGeometry(socketProfile, 20));

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cos * 1.66, 0.2, sin * 1.66),
      new THREE.Vector3(cos * 1.84, 0.72, sin * 1.84),
      new THREE.Vector3(cos * 1.48, 1.56, sin * 1.48),
      new THREE.Vector3(cos * 0.96, 2.38, sin * 0.96),
    ]);
    conduitCurves.push(curve);

    const tubeGeo = trackGeo(new THREE.TubeGeometry(curve, 44, 0.052, 12, false));
    const tubeMesh = new THREE.Mesh(tubeGeo, materials.conduit);
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;

    const singleConduitGroup = new THREE.Group();
    singleConduitGroup.add(tubeMesh);

    const baseSocket = new THREE.Mesh(socketGeo, materials.gimbal);
    baseSocket.position.set(cos * 1.66, 0.18, sin * 1.66);
    singleConduitGroup.add(baseSocket);

    const topSocket = new THREE.Mesh(socketGeo, materials.gimbal);
    topSocket.position.set(cos * 0.96, 2.34, sin * 0.96);
    topSocket.rotation.x = Math.PI;
    singleConduitGroup.add(topSocket);

    conduitsGroup.add(singleConduitGroup);

    explodables.push({
      group: singleConduitGroup,
      basePosition: singleConduitGroup.position.clone(),
      explodeOffset: new THREE.Vector3(cos * 0.55, 0.35, sin * 0.55),
    });
  }

  // 7. 6 Cantilevered Workflow Satellite Assemblies (Audit -> Scale)
  const workflowRing = new THREE.Group();
  root.add(workflowRing);

  const nodeHousingShape = createPolygonShape(6, 0.32);
  const nodeHousingGeo = trackGeo(
    new THREE.ExtrudeGeometry(nodeHousingShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    })
  );
  nodeHousingGeo.rotateX(-Math.PI / 2);

  const nodeCollarGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.26, 0.09, 24));
  const nodeLensGeo = trackGeo(new THREE.SphereGeometry(0.14, 24, 16));
  const armGeo = trackGeo(new THREE.BoxGeometry(0.64, 0.06, 0.09));
  const nodeHitGeo = trackGeo(new THREE.BoxGeometry(0.75, 0.65, 0.75));

  WORKFLOW_NODES.forEach((spec: WorkflowNodeSpec) => {
    const nodeOrbitRadius = 2.45;
    const cos = Math.cos(spec.angleRad);
    const sin = Math.sin(spec.angleRad);

    const nodeGroup = new THREE.Group();
    nodeGroup.name = `Node_${spec.id}`;
    nodeGroup.position.set(cos * nodeOrbitRadius, 0.85, sin * nodeOrbitRadius);
    nodeGroup.rotation.y = -spec.angleRad;
    workflowRing.add(nodeGroup);

    // Cantilever strut back toward plinth/spindle
    const arm = new THREE.Mesh(armGeo, materials.ceramic);
    arm.position.set(-0.42, -0.1, 0);
    arm.rotation.z = 0.28;
    arm.castShadow = true;
    nodeGroup.add(arm);

    // Beveled hexagonal node body
    const housing = new THREE.Mesh(nodeHousingGeo, materials.chassis);
    housing.castShadow = true;
    housing.receiveShadow = true;
    nodeGroup.add(housing);

    // Ceramic collar
    const collar = new THREE.Mesh(nodeCollarGeo, materials.ceramic);
    collar.position.y = 0.16;
    nodeGroup.add(collar);

    // Emissive optical lens
    const lens = new THREE.Mesh(nodeLensGeo, materials.accentRing.clone());
    lens.position.y = 0.24;
    nodeGroup.add(lens);

    // Dedicated simplified proxy hitbox on Layer 1 for fast raycasting
    const hitbox = new THREE.Mesh(nodeHitGeo, materials.hitbox);
    hitbox.position.y = 0.16;
    hitbox.layers.set(1);
    hitbox.userData.selectId = spec.id;
    nodeGroup.add(hitbox);
    hitboxes.push(hitbox);

    selectables.push({
      id: spec.id,
      label: `${spec.code} · ${spec.name}`,
      summary: spec.summary,
      group: nodeGroup,
      lensMesh: lens,
    });

    explodables.push({
      group: nodeGroup,
      basePosition: nodeGroup.position.clone(),
      explodeOffset: new THREE.Vector3(cos * 0.72, 0.3, sin * 0.72),
    });
  });

  // 8. Instanced Data Signal Packets (48 packets flowing along conduits & perimeter ring)
  const packetCount = 48;
  const packetGeo = trackGeo(new THREE.OctahedronGeometry(0.045, 0));
  const packetsMesh = new THREE.InstancedMesh(packetGeo, materials.packet, packetCount);
  packetsMesh.frustumCulled = false;
  root.add(packetsMesh);

  let selectedId: string | null = 'core';
  const applySelectionColors = () => {
    selectables.forEach((part) => {
      if (part.id === 'core') return;
      const mat = part.lensMesh.material as THREE.MeshStandardMaterial;
      if (part.id === selectedId) {
        mat.color.setHex(0x55e6b1);
        mat.emissive.setHex(0x55e6b1);
        mat.emissiveIntensity = 2.0;
      } else {
        mat.color.copy(materials.accentRing.color);
        mat.emissive.copy(materials.accentRing.emissive);
        mat.emissiveIntensity = 0.9;
      }
    });
  };
  const setSelectedId = (id: string | null) => {
    selectedId = id;
    applySelectionColors();
  };
  setSelectedId('core');

  const update = (elapsed: number, explodeRatio: number, flowFactor: number) => {
    // Smoothly offset explodable architectural layers
    for (let i = 0; i < explodables.length; i++) {
      const layer = explodables[i];
      layer.group.position.set(
        layer.basePosition.x + layer.explodeOffset.x * explodeRatio,
        layer.basePosition.y + layer.explodeOffset.y * explodeRatio,
        layer.basePosition.z + layer.explodeOffset.z * explodeRatio
      );
    }

    // Gentle mechanical rotation on gimbals & core crystal
    const t = elapsed * flowFactor;
    outerGimbal.rotation.y = t * 0.35;
    outerGimbal.rotation.x = Math.sin(t * 0.4) * 0.35;
    innerGimbal.rotation.z = -t * 0.5;
    innerGimbal.rotation.x = Math.cos(t * 0.35) * 0.25;
    coreCrystal.rotation.y = t * 0.65;
    coreCrystal.rotation.x = t * 0.28;
    coreCage.rotation.y = -t * 0.32;
    workflowRing.rotation.y = t * 0.06;

    // Update 48 instanced signal packets with zero allocations
    const conduitPackets = 24;
    for (let i = 0; i < packetCount; i++) {
      if (i < conduitPackets) {
        const curveIdx = i % conduitCurves.length;
        const laneOffset = Math.floor(i / conduitCurves.length) / (conduitPackets / conduitCurves.length);
        const u = (t * 0.22 + laneOffset) % 1;
        const curve = conduitCurves[curveIdx];
        curve.getPointAt(u, _vec3A);
        curve.getTangentAt(u, _vec3B);

        // Apply matching explode offset for that conduit
        const angle = (curveIdx / 4) * Math.PI * 2 + Math.PI / 4;
        _vec3A.x += Math.cos(angle) * 0.55 * explodeRatio;
        _vec3A.y += 0.35 * explodeRatio;
        _vec3A.z += Math.sin(angle) * 0.55 * explodeRatio;

        _quat.setFromUnitVectors(_up, _vec3B);
        _scale.setScalar(1.0);
        _mat4.compose(_vec3A, _quat, _scale);
      } else {
        const j = i - conduitPackets;
        const totalRing = packetCount - conduitPackets;
        const a = (j / totalRing) * Math.PI * 2 + t * 0.24;
        const r = 2.45 + 0.72 * explodeRatio;
        const y = 0.96 + Math.sin(a * 3 + t * 1.4) * 0.14 + 0.3 * explodeRatio;
        _vec3A.set(Math.cos(a) * r, y, Math.sin(a) * r);
        _quat.setFromAxisAngle(_up, -a);
        _scale.setScalar(0.88);
        _mat4.compose(_vec3A, _quat, _scale);
      }
      packetsMesh.setMatrixAt(i, _mat4);
    }
    packetsMesh.instanceMatrix.needsUpdate = true;
  };

  return {
    root,
    outerGimbal,
    innerGimbal,
    coreCrystal,
    coreCage,
    coreCageMat,
    workflowRing,
    packetsMesh,
    conduitCurves,
    explodables,
    selectables,
    hitboxes,
    geometriesToDispose,
    setSelectedId,
    refreshColors: applySelectionColors,
    update,
  };
}
