import Link from "next/link";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/StructuredData";
import { CURRICULUM, findStation, rideOrder } from "@/lib/curriculum";
import { curriculumPath, LINE_SLUGS } from "@/lib/curriculum-routes";
import { pageMetadata, SITE_URL } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

const TRAILING_WORD = /\s+\S*$/;

export const dynamicParams = false;
export function generateStaticParams() {
  return CURRICULUM.lines.map((line) => ({ slug: LINE_SLUGS[line.id] ?? line.id }));
}

async function getLine(params: Props["params"]) {
  const { slug } = await params;
  const line = CURRICULUM.lines.find((item) => (LINE_SLUGS[item.id] ?? item.id) === slug);
  if (!line) notFound();
  return line;
}

export async function generateMetadata({ params }: Props) {
  const line = await getLine(params);
  const summary = line.goal.length > 150 ? `${line.goal.slice(0, 147).replace(TRAILING_WORD, "")}…` : line.goal;
  return pageMetadata(`${line.name} — RL Curriculum`, summary, curriculumPath(line));
}

export default async function LinePage({ params }: Props) {
  const line = await getLine(params);
  const ordered = rideOrder(CURRICULUM);
  const index = ordered.findIndex((item) => item.id === line.id);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-5 text-ink-soft text-sm">
        <Link href="/" prefetch={false}>
          Home
        </Link>{" "}
        /{" "}
        <Link href="/curriculum" prefetch={false}>
          Curriculum
        </Link>{" "}
        / <span aria-current="page">{line.name}</span>
      </nav>
      <h1>{line.name}</h1>
      <p className="text-ink-soft text-lg">{line.goal}</p>
      <section aria-label="What you will learn">
        <h2>What you will learn</h2>
        <p>{line.problem}</p>
        <p>{line.approach}</p>
        <p>{line.outcome}</p>
      </section>
      <nav aria-label="Stations in this topic">
        <h2>Reading and exercises</h2>
        <ol>
          {line.stations.map((station) => (
            <li key={station.id}>
              <a href={`#${station.id}`}>{station.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      {line.stations.map((station) => (
        <section key={station.id} id={station.id} className="scroll-mt-5 border-rule border-t pt-6">
          <p className="text-ink-soft text-sm capitalize">
            {station.tag} · {station.meta}
          </p>
          <h2>{station.title}</h2>
          <p>{station.idea}</p>
          <p>{station.fwd}</p>
          {station.outcome ? (
            <p>
              <strong>Learning outcome:</strong> {station.outcome}
            </p>
          ) : null}
          {station.prereqs?.length ? (
            <div>
              <h3>Prerequisites</h3>
              <ul>
                {station.prereqs.map((id) => {
                  const prerequisite = findStation(CURRICULUM, id);
                  return prerequisite ? (
                    <li key={id}>
                      <Link href={`${curriculumPath(prerequisite.line)}#${id}`} prefetch={false}>
                        {prerequisite.station.title}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          ) : null}
          {station.resources.length > 0 ? (
            <div>
              <h3>Resources</h3>
              {station.pick ? <p>Choose {station.pick} of the suggested resources.</p> : null}
              <ul>
                {station.resources.map((resource) => (
                  <li key={resource.id}>
                    <a href={resource.url}>{resource.label}</a>{" "}
                    <span className="text-ink-soft text-sm">
                      ({resource.kind}
                      {resource.role === "optional" ? ", optional" : ""})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {station.deliverables?.length ? (
            <div>
              <h3>Exercise deliverables</h3>
              <ul>
                {station.deliverables.map((deliverable) => (
                  <li key={deliverable.id}>{deliverable.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}
      <nav
        aria-label="Adjacent curriculum topics"
        className="mt-10 flex flex-wrap justify-between gap-5 border-rule border-t pt-5"
      >
        {previous ? (
          <Link href={curriculumPath(previous)} prefetch={false}>
            Previous: {previous.name}
          </Link>
        ) : null}
        {next ? (
          <Link href={curriculumPath(next)} prefetch={false}>
            Next: {next.name}
          </Link>
        ) : null}
      </nav>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Curriculum", item: `${SITE_URL}/curriculum` },
            { "@type": "ListItem", position: 3, name: line.name, item: `${SITE_URL}${curriculumPath(line)}` },
          ],
        }}
      />
    </>
  );
}
