"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { PHOTO_LIMITS } from "@/lib/config";

type DropzoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

export function Dropzone({ onFiles, disabled = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) onFiles(Array.from(event.dataTransfer.files));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  const stateClasses = dragging
    ? "border-sky-500 bg-sky-50"
    : "border-slate-300 bg-white hover:border-sky-400";

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition sm:p-12 ${stateClasses} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <p className="text-base font-semibold text-slate-800">Drag and drop photos here</p>
      <p className="text-sm text-slate-500">or click to choose files (JPG, JPEG, PNG)</p>
      <p className="text-xs text-slate-400">
        {PHOTO_LIMITS.minPhotos}-{PHOTO_LIMITS.maxPhotos} photos, {PHOTO_LIMITS.recommendedPhotos}+ recommended
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={PHOTO_LIMITS.acceptedTypes.join(",")}
        className="hidden"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
