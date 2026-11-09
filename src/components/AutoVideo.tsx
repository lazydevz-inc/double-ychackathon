"use client";

import { useEffect, useRef } from "react";

/** Plays only while on screen; the still is the poster until the clip loads. */
export function AutoVideo({ src, poster, className = "", style }: { src?: string; poster: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  if (!src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt="" className={className} style={style} />;
  }
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" className={className} style={style} />;
}
