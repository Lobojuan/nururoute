"use client";
/**
 * Lazy-loaded 3D "heartbeat" globe: a dotted sphere centred on Africa with
 * 15 country pins and pulsing arcs between them. Simulated activity only.
 * Client-only; imported via React.lazy. No external assets.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { PINS, type Pin } from "@/lib/heartbeat";

const GOLD = "#e8b83a";
const CYAN = "#67d5e6";
const R = 2;

function toVec(lat: number, lon: number, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function DotSphere() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const n = 2600;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      pts.push(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.022} color="#7fa2ff" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function PinMesh({ pin, i }: { pin: Pin; i: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => toVec(pin.lat, pin.lon, R + 0.02), [pin]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + i * 0.7;
    const s = 1 + Math.sin(t * 2.2) * 0.25;
    ref.current.scale.setScalar(s);
  });
  const launch = pin.code === "GH";
  return (
    <group position={pos}>
      <mesh ref={ref}>
        <sphereGeometry args={[launch ? 0.075 : 0.045, 12, 12]} />
        <meshBasicMaterial color={launch ? GOLD : CYAN} />
      </mesh>
      <mesh>
        <ringGeometry args={[launch ? 0.11 : 0.07, launch ? 0.13 : 0.085, 24]} />
        <meshBasicMaterial color={launch ? GOLD : CYAN} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Arc({ a, b, i }: { a: Pin; b: Pin; i: number }) {
  const { curve, geo } = useMemo(() => {
    const va = toVec(a.lat, a.lon);
    const vb = toVec(b.lat, b.lon);
    const mid = va.clone().add(vb).multiplyScalar(0.5).normalize().multiplyScalar(R + va.distanceTo(vb) * 0.35);
    const c = new THREE.QuadraticBezierCurve3(va, mid, vb);
    const g = new THREE.BufferGeometry().setFromPoints(c.getPoints(40));
    return { curve: c, geo: g };
  }, [a, b]);
  const dot = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!dot.current) return;
    const t = ((clock.getElapsedTime() * 0.25 + i * 0.17) % 1);
    dot.current.position.copy(curve.getPoint(t));
  });
  return (
    <group>
      <line>
        <primitive object={geo} attach="geometry" />
        <lineBasicMaterial color={GOLD} transparent opacity={0.35} />
      </line>
      <mesh ref={dot}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>
    </group>
  );
}

function Globe() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += Math.min(dt, 0.05) * 0.12;
  });
  const gh = PINS.find((p) => p.code === "GH")!;
  const arcs = PINS.filter((p) => p.code !== "GH").slice(0, 8);
  return (
    // Rotate so Africa (lon ~20°, lat ~5°) faces the camera.
    <group ref={g} rotation={[0.1, -Math.PI / 2 - 0.35, 0]}>
      <mesh>
        <sphereGeometry args={[R - 0.02, 48, 48]} />
        <meshBasicMaterial color="#0b1330" transparent opacity={0.92} />
      </mesh>
      <DotSphere />
      {PINS.map((p, i) => <PinMesh key={p.code} pin={p} i={i} />)}
      {arcs.map((p, i) => <Arc key={p.code} a={gh} b={p} i={i} />)}
    </group>
  );
}

export default function AfricaGlobe() {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.4, 5.6], fov: 38 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
      <ambientLight intensity={1} />
      <Globe />
    </Canvas>
  );
}
