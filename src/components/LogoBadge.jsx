"use client";

import Image from "next/image";

export default function LogoBadge({ size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        position: "relative",
        overflow: "hidden",
        borderRadius: size * 0.28,
      }}
    >
      <Image
        src="/logo_lynora.svg"
        alt="Logo LynoraLink"
        fill
        priority
        sizes={`${size}px`}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
