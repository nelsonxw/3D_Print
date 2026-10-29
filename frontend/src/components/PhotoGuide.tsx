import { PHOTO_LIMITS } from "@/lib/config";

const DO_TIPS = [
  "Walk a full circle around the object at three heights: low, eye level and high.",
  "Add a ring of shots looking down at the top of the object.",
  "Overlap neighbouring photos by about 60-80% so the software can match them.",
  "Keep the whole object in frame and fill most of the picture with it.",
  "Use even, diffuse light (an overcast day or soft room light).",
  "Use a matte, textured object on a plain, textured background such as a patterned mat.",
  "Lock focus and exposure if your phone allows it, so every shot looks the same.",
];

const AVOID_TIPS = [
  "Shiny, transparent or very dark objects, and plain white or single-colour surfaces.",
  "Flash, direct sun or strong shadows that move across the object.",
  "Moving the object, the lighting or the background during the shoot.",
  "Blurry, dark or heavily cropped photos.",
  "Screenshots or photos sent through chat apps, which are resized and compressed.",
  "Hands, people or other objects that appear in only some of the photos.",
];

const REQUIREMENTS = [
  `Format: JPG, JPEG or PNG`,
  `Resolution: shorter side at least ${PHOTO_LIMITS.minShortSidePx} px`,
  `Size: up to ${PHOTO_LIMITS.maxFileBytes / (1024 * 1024)} MB per photo`,
  `Count: ${PHOTO_LIMITS.minPhotos} to ${PHOTO_LIMITS.maxPhotos} photos (${PHOTO_LIMITS.recommendedPhotos}-100 recommended)`,
];

function GuideList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div>
      <h3 className={`text-sm font-semibold ${tone}`}>{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function PhotoGuide() {
  return (
    <details open className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer text-base font-semibold text-slate-900">
        How to take photos for a successful model
      </summary>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <GuideList title="Do" items={DO_TIPS} tone="text-emerald-700" />
        <GuideList title="Avoid" items={AVOID_TIPS} tone="text-red-700" />
      </div>
      <div className="mt-6 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Photo requirements (checked on upload)</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {REQUIREMENTS.map((requirement) => (
            <li key={requirement}>{requirement}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
