import React from "react";

export function IconPlayFootball(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon icon-tabler icons-tabler-outline icon-tabler-play-football"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M11 4a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
      <path d="M3 17l5 1l.75 -1.5" />
      <path d="M14 21v-4l-4 -3l1 -6" />
      <path d="M6 12v-3l5 -1l3 3l3 1" />
      <path d="M19.5 20a.5 .5 0 1 0 0 -1a.5 .5 0 0 0 0 1" fill="currentColor" />
    </svg>
  );
}
