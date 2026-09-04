"use client";
/**
 * Landing hero WebGL scene — "money moves, AI answers".
 * A simulated mobile-money credit stream flows from a phone into the wallet ring,
 * is reserved, settled against a model node, and the unused hold is released back.
 *
 * Client-only (loaded via React.lazy behind ClientOnly). No external assets.
 * Demo visual only — no real money or AI activity is represented.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type Phase = "topup" | "reserve" | "settle" | "release";
export const LOOP = 12; // seconds
export function phaseAt(t: number): Phase {
  const s = t % LOOP;
  if (s < 4) return "topup";
  if (s < 7) return "reserve";
  if (s < 10) return "settle";
  return "release";
}

const GOLD = "#e8b83a";
const CYAN = "#67d5e6";
const GREEN = "#4fbf7a";
const NAVY = "#0b1330";
const ELECTRIC = "#3d7bff";

// Scene anchors
const PHONE = new THREE.Vector3(-3.3, 0.1, 0.2);
const WALLET = new THREE.Vector3(0, 0.4, 0);
const HOLD = new THREE.Vector3(1.9, 1.7, -0.4);
const MODELS = [
  new THREE.Vector3(3.6, 1.6, -1.4),
  new THREE.Vector3(3.9, 0.1, -0.2),
  new THREE.Vector3(3.4, -1.4, -0.9),
];
const MODEL_LABELS = ["Coding agent", "Image model", "Voice model"];

function curve(a: THREE.Vector3, b: THREE.Vector3, lift = 1.2) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y += lift;
  return new THREE.CatmullRomCurve3([a.clone(), mid, b.clone()]);
}

/** Procedural kente texture for the floor; no image fetch. */
function useKenteTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = NAVY;
    g.fillRect(0, 0, 512, 512);
    const cols = [GOLD, "#d8663a", GREEN, CYAN];
    for (let i = 0; i < 16; i++) {
      g.fillStyle = cols[i % cols.length]!;
      g.globalAlpha = 0.22;
      g.fillRect(i * 32, 0, 14, 512);
      g.globalAlpha = 0.14;
      g.fillRect(0, i * 32, 512, 10);
    }
    g.globalAlpha = 0.35;
    g.fillStyle = GOLD;
    for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) g.fillRect(x + 28, y + 28, 8, 8);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
}

function Floor() {
  const tex = useKenteTexture();
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -2.2, 0]} receiveShadow>
      <planeGeometry args={[40, 24]} />
      <meshStandardMaterial map={tex} roughness={0.85} metalness={0.1} transparent opacity={0.55} />
    </mesh>
  );
}

function Phone() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = -0.45 + Math.sin(clock.elapsedTime * 0.6) * 0.08;
  });
  return (
    <group ref={ref} position={PHONE}>
      <mesh castShadow>
        <boxGeometry args={[1.1, 2.1, 0.12]} />
        <meshStandardMaterial color="#141d3f" roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[0.95, 1.9]} />
        <meshStandardMaterial color={ELECTRIC} emissive={ELECTRIC} emissiveIntensity={0.35} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, 0.07]}>
        <planeGeometry args={[0.7, 0.18]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>
      <mesh position={[0, 0.2, 0.07]}>
        <planeGeometry args={[0.55, 0.1]} />
        <meshBasicMaterial color="#c9d6ff" />
      </mesh>
    </group>
  );
}

function WalletRing({ phaseRef }: { phaseRef: React.MutableRefObject<Phase> }) {
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05);
    if (ring.current) {
      ring.current.rotation.z += d * 0.4;
      ring.current.rotation.x = Math.PI / 2 + Math.sin(clock.elapsedTime * 0.5) * 0.15;
    }
    if (core.current && mat.current) {
      const target = phaseRef.current === "topup" || phaseRef.current === "release" ? 0.7 : 0.25;
      mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * (1 - Math.exp(-4 * d));
      const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.03;
      core.current.scale.setScalar(s);
    }
  });
  return (
    <group position={WALLET}>
      <mesh ref={ring} castShadow>
        <torusGeometry args={[1.25, 0.1, 24, 96]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} emissive={GOLD} emissiveIntensity={0.25} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.92, 0.03, 12, 96]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.8} />
      </mesh>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.48, 2]} />
        <meshStandardMaterial ref={mat} color="#12204f" emissive={CYAN} emissiveIntensity={0.3} roughness={0.25} metalness={0.5} flatShading />
      </mesh>
      <Html center position={[0, -1.9, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-full border border-gold/40 bg-navy-abyss/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
          Local wallet · demo
        </div>
      </Html>
    </group>
  );
}

function Node({ pos, label, color, active }: { pos: THREE.Vector3; label: string; color: string; active: React.MutableRefObject<boolean> }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05);
    if (mat.current) {
      const t = active.current ? 1.6 : 0.35;
      mat.current.emissiveIntensity += (t - mat.current.emissiveIntensity) * (1 - Math.exp(-5 * d));
    }
    if (grp.current) grp.current.position.y = pos.y + Math.sin(clock.elapsedTime * 0.9 + pos.x) * 0.08;
  });
  return (
    <group ref={grp} position={pos}>
      <mesh castShadow>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={0.35} metalness={0.6} roughness={0.3} />
      </mesh>
      <Html center position={[0, -0.75, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-md bg-navy-abyss/80 px-2 py-0.5 text-[10px] font-medium text-navy-foreground/85">{label}</div>
      </Html>
    </group>
  );
}

/** Single instanced particle stream along a curve, active during a phase window. */
function Stream({
  path,
  color,
  from,
  to,
  count = 40,
  size = 0.09,
  timeRef,
}: {
  path: THREE.Curve<THREE.Vector3>;
  color: string;
  from: number;
  to: number;
  count?: number;
  size?: number;
  timeRef: React.MutableRefObject<number>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count]);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!mesh.current) return;
    const s = timeRef.current % LOOP;
    const dur = to - from;
    for (let i = 0; i < count; i++) {
      const local = (s - from) / dur; // 0..1 across the phase window
      // each particle spawns at offset and travels for 60% of the window
      const p = (local - offsets[i]! * 0.7) / 0.3;
      if (local < 0 || local > 1 || p < 0 || p > 1) {
        dummy.scale.setScalar(0);
      } else {
        path.getPointAt(p, v);
        dummy.position.copy(v);
        const fade = Math.sin(p * Math.PI);
        dummy.scale.setScalar(size * (0.5 + fade));
      }
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
    </instancedMesh>
  );
}

function PathLine({ path, color, opacity = 0.25 }: { path: THREE.Curve<THREE.Vector3>; color: string; opacity?: number }) {
  const line = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(path.getPoints(48));
    return new THREE.Line(geom, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  }, [path, color, opacity]);
  return <primitive object={line} />;
}

function Rig() {
  const { camera, pointer } = useThree();
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const tx = pointer.x * 0.6;
    const ty = 1.1 + pointer.y * 0.35;
    camera.position.x += (tx - camera.position.x) * (1 - Math.exp(-2 * d));
    camera.position.y += (ty - camera.position.y) * (1 - Math.exp(-2 * d));
    camera.lookAt(0.3, 0.1, 0);
  });
  return null;
}

function World({ onPhase }: { onPhase?: ((p: Phase) => void) | undefined }) {
  const timeRef = useRef(0);
  const phaseRef = useRef<Phase>("topup");
  const holdActive = useRef(false);
  const modelActive = useRef(false);
  const lastPhase = useRef<Phase>("topup");

  const paths = useMemo(
    () => ({
      topup: curve(PHONE, WALLET, 1.6),
      reserve: curve(WALLET, HOLD, 0.8),
      settle: curve(HOLD, MODELS[0]!, 0.5),
      release: curve(HOLD, WALLET, -0.9),
      idle1: curve(WALLET, MODELS[1]!, 0.3),
      idle2: curve(WALLET, MODELS[2]!, -0.6),
    }),
    [],
  );

  useFrame((_, dt) => {
    timeRef.current += Math.min(dt, 0.05);
    const p = phaseAt(timeRef.current);
    phaseRef.current = p;
    holdActive.current = p === "reserve" || p === "settle";
    modelActive.current = p === "settle";
    if (p !== lastPhase.current) {
      lastPhase.current = p;
      onPhase?.(p);
    }
  });

  return (
    <>
      <Rig />
      <color attach="background" args={[NAVY]} />
      <fog attach="fog" args={[NAVY, 9, 22]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 5]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[0, 2.5, 2]} intensity={6} color={GOLD} distance={10} />
      <pointLight position={[-4, 1, 2]} intensity={3} color={ELECTRIC} distance={8} />
      <Environment>
        <Lightformer intensity={2} position={[0, 6, 0]} scale={[12, 12, 1]} color="#ffe9b0" />
        <Lightformer intensity={1.2} color="#8fd8ff" position={[-6, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={0.8} color={GOLD} position={[6, 0, -2]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>

      <Floor />
      <Phone />
      <WalletRing phaseRef={phaseRef} />

      {/* Hold node: reserved credit */}
      <group position={HOLD}>
        <Node pos={new THREE.Vector3(0, 0, 0)} label="Reserved hold" color={GOLD} active={holdActive} />
      </group>
      {MODELS.map((m, i) => (
        <Node key={i} pos={m} label={MODEL_LABELS[i]!} color={i === 0 ? CYAN : i === 1 ? ELECTRIC : "#8fa4ff"} active={i === 0 ? modelActive : holdActive} />
      ))}

      <PathLine path={paths.topup} color={GOLD} />
      <PathLine path={paths.reserve} color={GOLD} opacity={0.2} />
      <PathLine path={paths.settle} color={CYAN} opacity={0.2} />
      <PathLine path={paths.release} color={GREEN} opacity={0.2} />
      <PathLine path={paths.idle1} color={ELECTRIC} opacity={0.1} />
      <PathLine path={paths.idle2} color={ELECTRIC} opacity={0.1} />

      <Stream path={paths.topup} color={GOLD} from={0} to={4} count={26} size={0.065} timeRef={timeRef} />
      <Stream path={paths.reserve} color={GOLD} from={4} to={7} count={16} size={0.06} timeRef={timeRef} />
      <Stream path={paths.settle} color={CYAN} from={7} to={10} count={14} size={0.055} timeRef={timeRef} />
      <Stream path={paths.release} color={GREEN} from={10} to={12} count={10} size={0.055} timeRef={timeRef} />
    </>
  );
}

export default function HeroScene({ onPhase }: { onPhase?: ((p: Phase) => void) | undefined }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0.3, 1.0, 9.6], fov: 46 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <World onPhase={onPhase} />
    </Canvas>
  );
}

/** Returns true when the device is likely unable to run the scene smoothly. */
export function useLowPower() {
  const ref = useRef(false);
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    ref.current = (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || nav.connection?.saveData === true || navigator.hardwareConcurrency <= 2;
  }, []);
  return ref;
}
