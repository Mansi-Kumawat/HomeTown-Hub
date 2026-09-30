// AVATAR — round profile image with a graceful initials fallback when the
// user hasn't uploaded a photo yet.
import { initials } from "@/lib/client";

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-xl",
} as const;

export default function Avatar({
  name,
  url,
  size = "md",
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZES;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} loading="lazy" className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-2 ring-white`} />;
  }
  return (
    <span className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-ember/10 font-semibold text-ember ring-2 ring-white`}>
      {initials(name)}
    </span>
  );
}
