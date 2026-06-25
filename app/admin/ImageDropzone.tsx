"use client";

import { useRef, useState } from "react";

interface ImageDropzoneProps {
  /** URL d'aperçu courante (image existante ou objectURL du fichier déposé). */
  previewUrl: string | null;
  /** Nom du perso (initiales du placeholder + alt). */
  name: string;
  /** Appelé avec le fichier image déposé/sélectionné. */
  onFile: (file: File) => void;
  /** Appelé quand on retire l'image. */
  onRemove: () => void;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";

/** Zone de dépôt d'image (glisser-déposer ou clic), avec aperçu portrait. */
export function ImageDropzone({
  previewUrl,
  name,
  onFile,
  onRemove,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  };

  return (
    <div className="shrink-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`group relative flex aspect-[3/4] w-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          dragging
            ? "border-domain bg-domain/10"
            : "border-white/15 bg-void-900/60 hover:border-domain/60"
        }`}
        title="Glisse une image ici, ou clique pour parcourir"
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={name || "aperçu"}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-void-900/0 opacity-0 transition-opacity group-hover:bg-void-900/55 group-hover:opacity-100">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-white">
                Remplacer
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <span className="text-2xl">🖼️</span>
            <span className="text-[11px] leading-tight text-white/55">
              Glisse une image
              <br />
              ou clique
            </span>
          </div>
        )}
      </div>

      {previewUrl && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1.5 w-28 rounded-md border border-cursed/30 px-2 py-1 text-[11px] text-cursed-light transition-colors hover:bg-cursed/10"
        >
          Retirer l&apos;image
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = ""; // permet de re-déposer le même fichier
        }}
      />
    </div>
  );
}
