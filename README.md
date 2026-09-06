# [rlonrails.com](https://rlonrails.com)

A London Underground style map of the reinforcement learning reading
curriculum in `Books.md`. Each phase is a line and each paper or chapter is a
station. The Orientation loop sits in the middle like the Circle line,
Foundations runs east to west through it, Value-based and Policy-gradient wrap
around the north and south, Theory and Robotics run north to south, and the
specialised tracks fan out in every direction. Lines cross at interchanges, so
the whole curriculum is one connected network. Progress is saved in the
browser's local storage, so there is no account and no server database.

## Run

```
npm install
npm run dev
```

Open http://localhost:3000. Progress stays in that browser. Export from the
menu to keep a backup or move to another device, then import it there.
`data/progress-export.json` holds the export taken from the earlier SQLite
version; import it from the menu to carry that progress over.

## Deployment

Development
```sh
make up
```

Production
```sh
make deploy
```

Production serves on port 8090 behind the homeserver's Caddy. A push to
`main` triggers the deploy workflow, which reaches the homeserver over SSH.

## Use

- Click a station. The panel on the right shows what it is, why it matters,
  where it leads, and a read list of papers, chapters, videos and code with
  links. Its forward-link connections to other lines appear on the map as
  dotted curves while it is selected.
- Tick items in the read list. Items are grouped as Required, Pick at least N,
  and Optional. The station moves to Reading on the first tick and to Read when
  every required item and enough picked items are done; optional items never
  block it. You can also set the status directly.
- The Orientation stations double as logs. Their own status follows their
  introductory items, and their panel also shows every chapter or lecture of
  that book or course that lives on another station, with its own progress bar.
- Read track fills in the line colour. Trains run only on track you have read,
  and one more train joins the network for every five stations. Each train has
  its own livery, slows into stations, slides into the platform until it is
  fully hidden, waits, then grows back out and accelerates away. It skips some
  stations and turns back at the end of the track.
- Black-ringed stations are interchanges. Another line starts there.
- Scroll to pan, pinch or ⌘-scroll to zoom, drag to move. Arrow keys move along
  a line, space toggles Read, Escape closes the panel.
- Hover a line in the menu or the journey strip to isolate it and its
  connections.
- The first station of every line and the landmark papers have a small London
  street lamp beside them. A lamp stays dim until you read its station, warms
  while you are reading, and sends out pulses of three tiny rays to each side
  once it is read.
- Track turns solid in the line colour between two read stations. From the last
  read station to the next one it is drawn as moving dashes, so the next paper
  to read is always visible on the map.
- The floating pill in the top left holds the title, overall progress, and a
  menu with every line, the next stop, map tools, export, import, select all,
  reset, and a link to your journey.
- Your journey at `/journey` shows totals, streaks, a year of stations read as
  a heatmap, and progress per line.
- On load the network draws itself outward from the Orientation loop. Each
  station spawns as the rail reaches it, and a line starts drawing when the
  rail reaches its junction.
- A "You are here" marker bobs above the next recommended station. Click it to
  open that station.
- Lines end with a terminus bar, as on the real map.

Export downloads a JSON backup. Import restores one. Reset clears everything.

## Structure

| Path | Purpose |
| --- | --- |
| `Books.md` | The curriculum text the map is built from |
| `src/lib/curriculum.ts` | Lines, stations, resources, links, and map geometry |
| `src/lib/geometry.ts` | Pure layout: rounded paths, branch anchoring, station and label placement |
| `src/lib/progress.ts` | Progress types and derived values shared by client and server |
| `src/lib/storage.ts` | Reads and writes progress in local storage |
| `src/app/journey` | The journey page with stats and the heatmap |
| `src/components/` | Map, trains, panel, legend, journey strip, top bar |

## Editing the curriculum

Everything on the map comes from `src/lib/curriculum.ts`. A line has a `path`
of waypoints. A waypoint can be a coordinate or `{ through: stationId }`, which
routes the line through a station on another line and marks it as an
interchange. A line with `from` starts at that station. `snap` gives one
coordinate per station; each station is placed at the nearest point on the
path. `pill` places the line name either at a fixed point or beside the line
between two stations. Each station lists its `resources` with a kind and a URL.
