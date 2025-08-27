// src/components/team/TeamCrest.tsx
"use client";


export default function TeamCrest({
  src,
  name = "Club",
  size = 18,
  className = "",
  title,
}: {
  src?: string | null;
  name?: string;
  size?: number;         // px
  className?: string;
  title?: string;
}) {
  const url = src && src.trim() ? src : "/images/team-default.svg";
  const px = `${size}px`;
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      <img
        src={url}
        alt={name}
        title={title ?? name}
        loading="lazy"
        decoding="async"
        className="block w-full h-full"
        style={{ objectFit: "contain" }} // 👈 clave: no recorta
      />
    </span>
  );
}

