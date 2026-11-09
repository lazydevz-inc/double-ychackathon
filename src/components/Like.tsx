"use client";

import { useState } from "react";

export function Like({ count }: { count: number }) {
  const [on, setOn] = useState(false);
  return (
    <button onClick={() => setOn(!on)} className="flex items-center gap-1.5 text-[13px] font-semibold" aria-pressed={on} aria-label="Like">
      <svg width="24" height="24" viewBox="0 0 24 24" fill={on ? "#ff2d55" : "none"} stroke={on ? "#ff2d55" : "#f5f1ea"} strokeWidth="1.9" strokeLinejoin="round" aria-hidden>
        <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
      </svg>
      {(count + (on ? 1 : 0)).toLocaleString("en-US")}
    </button>
  );
}
