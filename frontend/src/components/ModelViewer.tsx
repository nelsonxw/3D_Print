"use client";

import { Suspense, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { Bounds, Center, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type ViewMode = "solid" | "wireframe";

function StlMesh({ url, wireframe }: { url: string; wireframe: boolean }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <Center>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#7c9cbf" roughness={0.55} metalness={0.05} wireframe={wireframe} />
      </mesh>
    </Center>
  );
}

const MODES: { value: ViewMode; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "wireframe", label: "Wireframe" },
];

export default function ModelViewer({ url }: { url: string }) {
  const [mode, setMode] = useState<ViewMode>("solid");

  return (
    <div className="space-y-2">
      <div className="flex gap-2" role="group" aria-label="View mode">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            aria-pressed={mode === option.value}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === option.value ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="h-[360px] w-full overflow-hidden rounded-xl bg-slate-900 sm:h-[480px]">
        <Canvas camera={{ fov: 40, near: 0.1, far: 10000 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 7]} intensity={1.2} />
          <directionalLight position={[-5, -4, -6]} intensity={0.4} />
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.2}>
              <StlMesh url={url} wireframe={mode === "wireframe"} />
            </Bounds>
          </Suspense>
          <OrbitControls makeDefault enableDamping enablePan enableZoom enableRotate />
        </Canvas>
      </div>
      <p className="text-xs text-slate-500">Drag to rotate, right-drag to pan, scroll to zoom.</p>
    </div>
  );
}
