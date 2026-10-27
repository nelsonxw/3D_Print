"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { getToken } from "@/lib/session";

const STEPS = [
  "Upload 20-150 photos of one object",
  "We reconstruct it with COLMAP and OpenMVS",
  "Clean, repair and scale it in Blender",
  "Preview it and download an STL for Bambu Studio",
];

export default function HomePage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (getToken() !== null) {
      router.replace("/upload");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <section className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          From photos to a print-ready STL, free and open source.
        </h1>
        <p className="text-slate-600">
          Built for the Bambu Lab A1 Mini (180 x 180 x 180 mm). No paid APIs, no SaaS: all reconstruction runs on
          your own hardware.
        </p>
        <ol className="space-y-2 text-sm text-slate-700">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="font-semibold text-sky-600">{index + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
      <div className="flex justify-center md:justify-end">
        <AuthPanel onAuthenticated={() => router.push("/upload")} />
      </div>
    </div>
  );
}
