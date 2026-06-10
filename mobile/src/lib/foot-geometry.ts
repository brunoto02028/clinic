import * as THREE from "three";

export interface FootMeasurements {
  leftFootLength?: number | null;
  rightFootLength?: number | null;
  leftFootWidth?: number | null;
  rightFootWidth?: number | null;
  leftArchHeight?: number | null;
  rightArchHeight?: number | null;
}

const TURQUOISE = 0x5dc9c0;
const SLATE = 0x607d7d;

/**
 * Builds a 3D group with a simplified, measurement-driven representation of both
 * feet (capsule "soles" scaled by length × width, raised by arch height). Not the
 * web's detailed procedural foot (a larger port) — a faithful proportional model
 * for the native viewer.
 */
function buildFoot(
  lengthMm: number,
  widthMm: number,
  archMm: number,
  color: number
): THREE.Mesh {
  // Normalize mm → scene units (~0..1 range based on typical foot sizes).
  const len = (lengthMm || 260) / 260; // ~1.0 for a 260mm foot
  const wid = (widthMm || 95) / 260;
  const arch = (archMm || 20) / 260;

  // A capsule lying along Z approximates a sole; scale to the measurements.
  const geo = new THREE.CapsuleGeometry(0.5, 1, 6, 16);
  geo.rotateX(Math.PI / 2); // lie flat along Z
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05 })
  );
  // Scale: X=width, Y=arch (height), Z=length.
  mesh.scale.set(wid * 1.6, Math.max(arch * 2.2, 0.18), len * 1.1);
  return mesh;
}

export function buildFeetGroup(m: FootMeasurements): THREE.Group {
  const group = new THREE.Group();

  const left = buildFoot(
    m.leftFootLength ?? 260,
    m.leftFootWidth ?? 95,
    m.leftArchHeight ?? 20,
    TURQUOISE
  );
  left.position.x = -0.5;

  const right = buildFoot(
    m.rightFootLength ?? 260,
    m.rightFootWidth ?? 95,
    m.rightArchHeight ?? 20,
    SLATE
  );
  right.position.x = 0.5;

  group.add(left, right);
  return group;
}
