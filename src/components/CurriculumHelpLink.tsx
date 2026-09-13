import Link from "next/link";

export function CurriculumHelpLink() {
  return (
    <Link
      href="/curriculum"
      prefetch={false}
      title="Help with the reinforcement learning curriculum"
      className="flex h-9 flex-none items-center rounded-full bg-white/12 px-2.5 text-[13px] text-white transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 sm:px-3.5"
    >
      Help
    </Link>
  );
}
