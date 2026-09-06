export const TFL_COLOURS = {
  central: "#E32017",
  circle: "#FFD300",
  piccadilly: "#003688",
  district: "#00782A",
  metropolitan: "#9B0056",
  elizabeth: "#6950A1",
  victoria: "#0098D4",
  weaver: "#893B67",
  bakerloo: "#B36305",
  jubilee: "#868C92",
  hammersmith: "#F3A9BB",
  waterloo: "#95CDBA",
  dlr: "#00A4A7",
  tram: "#84B817",
  overground: "#EE7C0E",
  northern: "#000000",
} as const;

export type TflLine = keyof typeof TFL_COLOURS;

const LIGHT_LINES: ReadonlySet<TflLine> = new Set(["circle", "hammersmith", "waterloo", "jubilee", "tram"]);

export const isLightLine = (line: TflLine) => LIGHT_LINES.has(line);

export const textOn = (line: TflLine) => (isLightLine(line) ? "#1a1a1a" : "#ffffff");
