import Link from "next/link";
import { CURRICULUM, findLine, type Line, rideOrder } from "@/lib/curriculum";
import { curriculumPath } from "@/lib/curriculum-routes";
import { pageMetadata } from "@/lib/seo";
import { TFL_COLOURS } from "@/lib/tfl";

export const metadata = pageMetadata(
  "Reinforcement Learning Curriculum",
  "A structured reinforcement learning curriculum with papers, courses, prerequisites and coding exercises, from Bellman equations and deep RL to RLHF and research.",
  "/curriculum",
);

export default function CurriculumPage() {
  const stations = CURRICULUM.lines.flatMap((line) => line.stations);
  return (
    <>
      <header className="reader-intro">
        <span className="reader-label">Your guide to the map</span>
        <h1>Reinforcement learning curriculum</h1>
        <p className="text-ink-soft text-lg">
          A reading and implementation roadmap through reinforcement learning, organised like the London Underground.
          Start with the foundations, build working agents, then choose the research directions that interest you.
        </p>
      </header>
      <p>
        {CURRICULUM.lines.length} topic lines connect {stations.length} stations of papers, courses and exercises. Each
        station explains the idea, why it matters and what to read or build.
      </p>
      <section aria-label="How to use the roadmap" className="reader-overview">
        <h2>How to use the roadmap</h2>
        <p>
          Start with Orientation to check your mathematics, programming and machine learning prerequisites. Work through
          the core stations and spine exercises in order, with Experimental practice alongside them. Choose
          specialisations after the research sampler; reference stations are there when a project needs them.
        </p>
        <p>
          Read a topic below, or{" "}
          <Link href="/" prefetch={false}>
            open the interactive map
          </Link>{" "}
          to track resources, implementation work and your next station. Your progress is stored in your browser and can
          be exported from the map menu.
        </p>
      </section>
      <section aria-label="Recommended learning sequence">
        <h2>Recommended learning sequence</h2>
        <ol className="space-y-6">
          {CURRICULUM.stages.map((stage) => (
            <li key={stage.id} className="rounded-xl border border-rule bg-surface p-4">
              <h3>{stage.title}</h3>
              <p>{stage.content}</p>
              <p className="text-ink-soft">Ready to move on: {stage.evidence}</p>
              <ul className="flex list-none flex-wrap gap-x-5 gap-y-2 pl-0">
                {stage.lines
                  .map((id) => findLine(CURRICULUM, id))
                  .filter((line): line is Line => Boolean(line))
                  .map((line) => (
                    <li key={line.id}>
                      <Link href={curriculumPath(line)} prefetch={false}>
                        {line.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
      <section aria-label="Explore all topics">
        <h2>Explore all topics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {rideOrder(CURRICULUM).map((line) => (
            <article
              key={line.id}
              className="rounded-xl border border-rule border-l-4 bg-surface p-5"
              style={{ borderLeftColor: TFL_COLOURS[line.tfl] }}
            >
              <h3>
                <Link href={curriculumPath(line)} prefetch={false}>
                  {line.name}
                </Link>
              </h3>
              <p>{line.goal}</p>
              <p className="text-ink-soft text-sm">
                {line.stations.length} stations · {line.phase}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
