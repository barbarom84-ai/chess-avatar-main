"use client";

import Image from "next/image";

type AccountAvatarProps = {
  src: string | null | undefined;
  alt: string;
  initials: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
};

export default function AccountAvatar({
  src,
  alt,
  initials,
  className,
  imageClassName,
  sizes = "112px",
}: AccountAvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        className={imageClassName ?? "object-cover"}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center font-bold text-white ${className ?? "text-xl"}`}
    >
      {initials}
    </div>
  );
}
