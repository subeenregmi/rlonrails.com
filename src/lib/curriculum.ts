import type { TflLine } from "./tfl";

/**
 * core      everyone on the map needs this
 * track     needed for a chosen specialisation, not for everyone
 * reference come back to it when a project asks for it
 * exercise  something you do, judged by its deliverables rather than by reading
 */
export type Tag = "core" | "track" | "reference" | "exercise";
export type ResourceKind = "paper" | "chapter" | "book" | "video" | "course" | "code" | "blog" | "site";

export interface Resource {
  id: string;
  kind: ResourceKind;
  label: string;
  url: string;
  from?: string;
  role?: "pick" | "optional";
}

export interface Deliverable {
  id: string;
  label: string;
}

export interface LogEntry {
  station: Station;
  line: Line;
  resource: Resource;
}

export interface Station {
  id: string;
  name: string;
  title: string;
  meta: string;
  tag: Tag;
  idea: string;
  fwd: string;
  /** What you can do once this station is done. */
  outcome?: string;
  landmark?: boolean;
  pick?: number;
  /** On the default route even though its line is a specialisation. */
  always?: boolean;
  /** Stations that should be read first. Enforced by the recommendation, not by the UI. */
  prereqs?: string[];
  /** Exercise stations only: what has to exist before the station counts as done. */
  deliverables?: Deliverable[];
  resources: Resource[];
}

export interface PillPoint {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
}

export interface PillBeside {
  at: number;
  side: "above" | "below" | "left" | "right";
  offset?: number;
}

export type Pill = PillPoint | PillBeside;

export type Waypoint = [number, number] | { through: string };

export interface Line {
  id: string;
  name: string;
  short: string;
  phase: string;
  tfl: TflLine;
  goal: string;
  /** A selectable specialisation rather than part of the spine everyone rides. */
  track?: boolean;
  closed?: boolean;
  from?: string;
  relativePath?: boolean;
  path: Waypoint[];
  snap?: [number, number][];
  startPad?: number;
  endPad?: number;
  stationPad?: number;
  stationsFrom?: number;
  flipFirst?: boolean;
  pill: Pill;
  stations: Station[];
}

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  alt: boolean;
  labelAt: "top" | "bottom";
}

export interface Stage {
  id: string;
  title: string;
  content: string;
  /** What shows you are ready to move on. */
  evidence: string;
  /** The reader picks their specialisations once this stage is done. */
  choose?: boolean;
  lines: string[];
}

export interface Curriculum {
  lines: Line[];
  links: [string, string][];
  spineOrder: string[];
  /** The default progression through the map, from readiness to independent work. */
  stages: Stage[];
}

export const MAP_BOUNDS = { x: -420, y: 50, w: 4350, h: 2160 };
export const START_VIEW = { cx: 1220, cy: 990, w: 1560, h: 1050 };
export const ZONES: Zone[] = [
  { x: -390, y: 78, w: 4290, h: 2106, label: "Zone 4 · Specialised tracks & theory", alt: false, labelAt: "top" },
  { x: -104, y: 195, w: 3744, h: 1755, label: "Zone 3 · Frontier", alt: true, labelAt: "top" },
  { x: 234, y: 325, w: 2600, h: 1300, label: "Zone 2 · Deep RL", alt: false, labelAt: "top" },
  { x: 494, y: 494, w: 1508, h: 988, label: "Zone 1 · Foundations", alt: true, labelAt: "top" },
];

export const CURRICULUM: Curriculum = {
  "lines": [
    {
      "id": "p0",
      "name": "Orientation",
      "short": "Orientation",
      "phase": "Phase 0",
      "tfl": "circle",
      "goal": "Courses and references to run in parallel with the reading. Do not read these end to end first.",
      "closed": true,
      "path": [
        [
          728,
          598
        ],
        [
          1716,
          598
        ],
        [
          1846,
          728
        ],
        {
          "through": "p1-pg"
        },
        [
          1846,
          1248
        ],
        [
          1716,
          1378
        ],
        [
          728,
          1378
        ],
        [
          598,
          1248
        ],
        {
          "through": "p1-mc"
        },
        [
          598,
          728
        ]
      ],
      "snap": [
        [
          598,
          1118
        ],
        [
          598,
          806
        ],
        [
          806,
          598
        ],
        [
          1430,
          598
        ],
        [
          1846,
          754
        ],
        [
          1846,
          1118
        ],
        [
          1430,
          1378
        ],
        [
          806,
          1378
        ]
      ],
      "pill": {
        "x": 1144,
        "y": 780,
        "anchor": "middle"
      },
      "stations": [
        {
          "id": "p0-maths",
          "name": "Maths check",
          "title": "Mathematical readiness",
          "meta": "Probability, expectation, gradients, optimisation",
          "tag": "core",
          "idea": "Conditional expectation, distributions and sampling, gradients and the chain rule, stochastic optimisation, and enough statistics to read an error bar. Treat this as a diagnostic rather than a course: test yourself on each topic and refresh only what fails.",
          "fwd": "Bellman equations are conditional expectations and policy gradients are score-function estimators. Everything downstream assumes this.",
          "outcome": "Write E[G_t | S_t = s] without hesitating, differentiate a log-likelihood, and say what a confidence interval does and does not claim.",
          "resources": [
            {
              "id": "p0-maths:1",
              "kind": "book",
              "label": "Mathematics for Machine Learning (probability, vector calculus, optimisation)",
              "url": "https://mml-book.github.io/"
            },
            {
              "id": "p0-maths:2",
              "kind": "book",
              "label": "Convex Optimization (ch. 1, appendix A)",
              "url": "https://web.stanford.edu/~boyd/cvxbook/",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p0-sb",
          "name": "Sutton & Barto",
          "title": "Reinforcement Learning: An Introduction, 2nd ed.",
          "meta": "Sutton & Barto, MIT Press 2018, corrected 2020",
          "tag": "core",
          "idea": "The canonical textbook, free online. Read chs. 1–2 here for orientation; chs. 3–13 are stations on the Foundations line. Part I (tabular) is chs. 1–8. Part II (approximation, policy gradient) is chs. 9–13. Part III (psychology, neuroscience, case studies incl. AlphaGo) is chs. 14–17.",
          "fwd": "Backbone of Phase 1.",
          "outcome": "Set up the book and know which chapters map to which stations on this map.",
          "landmark": true,
          "resources": [
            {
              "id": "p0-sb:3",
              "kind": "chapter",
              "label": "Ch. 1 Introduction",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=23"
            },
            {
              "id": "p0-sb:4",
              "kind": "chapter",
              "label": "Ch. 2 Multi-armed Bandits",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=47"
            },
            {
              "id": "p0-sb:1",
              "kind": "book",
              "label": "Reinforcement Learning: An Introduction (PDF)",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf",
              "role": "optional"
            },
            {
              "id": "p0-sb:2",
              "kind": "site",
              "label": "Book homepage",
              "url": "http://incompleteideas.net/book/the-book-2nd.html",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p0-silver",
          "name": "Silver UCL course",
          "title": "David Silver's UCL RL course",
          "meta": "DeepMind × UCL, 2015, 10 lectures",
          "tag": "core",
          "idea": "Best lecture companion to Sutton & Barto Part I.",
          "fwd": "Essential for Phase 1.",
          "outcome": "Have a lecture series to fall back on when a chapter does not land.",
          "resources": [
            {
              "id": "p0-silver:1",
              "kind": "course",
              "label": "Course page",
              "url": "https://www.davidsilver.uk/teaching/",
              "role": "optional"
            },
            {
              "id": "p0-silver:2",
              "kind": "video",
              "label": "Silver lecture 1: Introduction to Reinforcement Learning",
              "url": "https://www.youtube.com/watch?v=2pWv7GOvuf0"
            }
          ]
        },
        {
          "id": "p0-cs285",
          "name": "CS285",
          "title": "Sergey Levine's CS285: Deep RL",
          "meta": "UC Berkeley, Fall 2023 recordings, Spring 2026 offering",
          "tag": "reference",
          "idea": "The best deep-RL lecture series. Maps almost one to one onto Phases 2–5.",
          "fwd": "Essential from Phase 2 on.",
          "resources": [
            {
              "id": "p0-cs285:1",
              "kind": "course",
              "label": "Course site",
              "url": "https://rail.eecs.berkeley.edu/deeprlcourse/",
              "role": "optional"
            },
            {
              "id": "p0-cs285:2",
              "kind": "video",
              "label": "CS285 lecture 1: Introduction (3 parts)",
              "url": "https://www.youtube.com/watch?v=SupFHGbytvA&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps"
            }
          ]
        },
        {
          "id": "p0-spinup",
          "name": "Spinning Up",
          "title": "OpenAI Spinning Up in Deep RL",
          "meta": "Josh Achiam, OpenAI, 2018",
          "tag": "core",
          "idea": "Docs plus clean implementations of VPG, PPO, DDPG, TD3, SAC, and the curated Key Papers list this curriculum overlaps with.",
          "fwd": "Essential implementation reference for Phase 3.",
          "outcome": "Know the algorithm families and where each one sits before you meet the papers.",
          "resources": [
            {
              "id": "p0-spinup:1",
              "kind": "site",
              "label": "Spinning Up docs",
              "url": "https://spinningup.openai.com/en/latest/",
              "role": "optional"
            },
            {
              "id": "p0-spinup:2",
              "kind": "site",
              "label": "Key Papers in Deep RL",
              "url": "https://spinningup.openai.com/en/latest/spinningup/keypapers.html",
              "role": "optional"
            },
            {
              "id": "p0-spinup:3",
              "kind": "site",
              "label": "Spinning Up Part 2: Kinds of RL Algorithms",
              "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro2.html"
            },
            {
              "id": "p0-spinup:4",
              "kind": "blog",
              "label": "Spinning Up as a Deep RL Researcher",
              "url": "https://spinningup.openai.com/en/latest/spinningup/spinningup.html",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p0-bootcamp",
          "name": "Deep RL Bootcamp",
          "title": "Pieter Abbeel's Deep RL Bootcamp",
          "meta": "Berkeley, Aug 2017",
          "tag": "reference",
          "idea": "Archived lecture videos and slides. A condensed alternative to CS285.",
          "fwd": "Optional.",
          "resources": [
            {
              "id": "p0-bootcamp:1",
              "kind": "video",
              "label": "Bootcamp lectures",
              "url": "https://sites.google.com/view/deep-rl-bootcamp/lectures"
            }
          ]
        },
        {
          "id": "p0-cs234",
          "name": "CS234",
          "title": "Stanford CS234 (Emma Brunskill)",
          "meta": "Winter 2026",
          "tag": "reference",
          "idea": "Stronger on theory and bandits than CS285.",
          "fwd": "Useful for Phase 8.",
          "resources": [
            {
              "id": "p0-cs234:1",
              "kind": "course",
              "label": "CS234 site",
              "url": "https://web.stanford.edu/class/cs234/",
              "role": "optional"
            },
            {
              "id": "p0-cs234:2",
              "kind": "video",
              "label": "CS234 lecture 1: Introduction to Reinforcement Learning",
              "url": "https://www.youtube.com/watch?v=WsvFL-LjA6U"
            }
          ]
        },
        {
          "id": "p0-refs",
          "name": "Reference code",
          "title": "Reference implementations to keep open",
          "meta": "CleanRL, Stable-Baselines3, Dopamine, PureJaxRL, verl, TRL, OpenRLHF",
          "tag": "core",
          "idea": "CleanRL (single-file PPO, DQN, C51, DDPG, TD3, SAC). Stable-Baselines3 (reliable OO PyTorch). Dopamine (value-based Atari). PureJaxRL (end-to-end JAX). For LLM RL: verl, TRL, OpenRLHF.",
          "fwd": "Use as references for every project, never as copies.",
          "outcome": "Have a reference implementation open to diff against when your own agent misbehaves.",
          "resources": [
            {
              "id": "p0-refs:1",
              "kind": "code",
              "label": "CleanRL",
              "url": "https://github.com/vwxyzjn/cleanrl",
              "role": "pick"
            },
            {
              "id": "p0-refs:2",
              "kind": "code",
              "label": "Stable-Baselines3",
              "url": "https://github.com/DLR-RM/stable-baselines3",
              "role": "pick"
            },
            {
              "id": "p0-refs:3",
              "kind": "code",
              "label": "Dopamine",
              "url": "https://github.com/google/dopamine",
              "role": "pick"
            },
            {
              "id": "p0-refs:4",
              "kind": "code",
              "label": "PureJaxRL",
              "url": "https://github.com/luchris429/purejaxrl",
              "role": "pick"
            },
            {
              "id": "p0-refs:5",
              "kind": "code",
              "label": "verl",
              "url": "https://github.com/volcengine/verl",
              "role": "pick"
            },
            {
              "id": "p0-refs:6",
              "kind": "code",
              "label": "TRL",
              "url": "https://github.com/huggingface/trl",
              "role": "pick"
            },
            {
              "id": "p0-refs:7",
              "kind": "code",
              "label": "OpenRLHF",
              "url": "https://github.com/OpenRLHF/OpenRLHF",
              "role": "pick"
            }
          ]
        }
      ]
    },
    {
      "id": "p1",
      "name": "Foundations",
      "short": "Foundations",
      "phase": "Phase 1",
      "tfl": "central",
      "goal": "Tabular RL end to end, from bandits to policy gradients, with an exercise after each idea. Read a station, then do the exercise that follows it before moving on.",
      "path": [
        [
          286,
          988
        ],
        [
          2054,
          988
        ]
      ],
      "snap": [
        [
          286,
          988
        ],
        [
          390,
          988
        ],
        [
          494,
          988
        ],
        [
          598,
          988
        ],
        [
          702,
          988
        ],
        [
          806,
          988
        ],
        [
          910,
          988
        ],
        [
          1014,
          988
        ],
        [
          1118,
          988
        ],
        [
          1222,
          988
        ],
        [
          1326,
          988
        ],
        [
          1430,
          988
        ],
        [
          1534,
          988
        ],
        [
          1638,
          988
        ],
        [
          1742,
          988
        ],
        [
          1846,
          988
        ],
        [
          2054,
          988
        ]
      ],
      "pill": {
        "at": 3.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p8-bandits",
          "name": "Bandits",
          "title": "UCB, Thompson Sampling, Bandit Algorithms",
          "meta": "Auer et al. 2002; Jaksch, Ortner & Auer 2010; Lattimore & Szepesvári 2020",
          "tag": "core",
          "idea": "Regret in the one-state case: optimism (UCB) and posterior sampling (Thompson). Lattimore & Szepesvari is the companion book. Regret in unknown MDPs is a separate problem — it lives on the Exploration track.",
          "fwd": "Foundational to exploration. UCRL2 extends this from bandits to unknown MDPs.",
          "outcome": "Derive the UCB bonus, implement UCB and Thompson sampling, and plot cumulative regret against a fixed baseline.",
          "landmark": true,
          "resources": [
            {
              "id": "p8-bandits:1",
              "kind": "paper",
              "label": "Auer et al. 2002, UCB",
              "url": "https://doi.org/10.1023/A:1013689704352"
            },
            {
              "id": "p8-bandits:3",
              "kind": "book",
              "label": "Lattimore & Szepesvári, Bandit Algorithms (PDF)",
              "url": "https://tor-lattimore.com/downloads/book/book.pdf",
              "role": "optional"
            },
            {
              "id": "p8-bandits:4",
              "kind": "video",
              "label": "Silver lecture 9: Exploration and Exploitation",
              "url": "https://www.youtube.com/watch?v=sGuiWX07sKw",
              "from": "p0-silver",
              "role": "pick"
            },
            {
              "id": "p8-bandits:5",
              "kind": "video",
              "label": "CS234 lecture 11: Exploration 1",
              "url": "https://www.youtube.com/watch?v=sqYii3nd78w",
              "from": "p0-cs234",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p1-dp",
          "name": "MDPs & DP",
          "title": "Finite MDPs, Bellman equations, dynamic programming",
          "meta": "Sutton & Barto ch. 3–4",
          "tag": "core",
          "idea": "Policy and value iteration. The Bellman optimality operator.",
          "fwd": "Underlies every value-based method through to MuZero and CQL.",
          "outcome": "Write the Bellman expectation and optimality equations for a small MDP and say why value iteration converges.",
          "landmark": true,
          "resources": [
            {
              "id": "p1-dp:1",
              "kind": "chapter",
              "label": "Ch. 3 Finite Markov Decision Processes",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=69",
              "from": "p0-sb"
            },
            {
              "id": "p1-dp:2",
              "kind": "chapter",
              "label": "Ch. 4 Dynamic Programming",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=95",
              "from": "p0-sb"
            },
            {
              "id": "p1-dp:3",
              "kind": "video",
              "label": "Silver lecture 2: Markov Decision Process",
              "url": "https://www.youtube.com/watch?v=lfHX2hHRMVQ",
              "from": "p0-silver",
              "role": "pick"
            },
            {
              "id": "p1-dp:4",
              "kind": "video",
              "label": "Silver lecture 3: Planning by Dynamic Programming",
              "url": "https://www.youtube.com/watch?v=Nd1-UUMVfz4",
              "from": "p0-silver",
              "role": "pick"
            },
            {
              "id": "p1-dp:5",
              "kind": "site",
              "label": "Spinning Up Part 1: Key Concepts in RL",
              "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro.html",
              "from": "p0-spinup",
              "role": "optional"
            },
            {
              "id": "p1-dp:6",
              "kind": "video",
              "label": "CS285 lecture 4: Introduction to Reinforcement Learning (6 parts)",
              "url": "https://www.youtube.com/watch?v=jds0Wh9jTvE&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p1-dp:7",
              "kind": "video",
              "label": "Bootcamp 1: Intro to MDPs and Exact Solution Methods (Abbeel)",
              "url": "https://www.youtube.com/watch?v=qaMdN6LS9rA",
              "from": "p0-bootcamp",
              "role": "pick"
            },
            {
              "id": "p1-dp:8",
              "kind": "video",
              "label": "CS234 lecture 2: Tabular MDP Planning",
              "url": "https://www.youtube.com/watch?v=gHdsUUGcBC0",
              "from": "p0-cs234",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p1-x-dp",
          "name": "Solve an MDP",
          "title": "Solve an MDP by hand, then by machine",
          "meta": "Deliverable: code, a plot, a conclusion",
          "tag": "exercise",
          "idea": "Write down a four-state MDP, solve it with pencil and paper, then reproduce the answer with code. Disagreement between the two is the point: it is always your understanding or your indexing, and finding out which is the exercise.",
          "fwd": "Every later implementation rests on getting this arithmetic right.",
          "outcome": "Solve a small MDP both ways and explain any disagreement between them.",
          "prereqs": [
            "p1-dp"
          ],
          "deliverables": [
            {
              "id": "p1-x-dp:d1",
              "label": "A four-state MDP written out in full: v_pi for a fixed policy and v_star, by hand"
            },
            {
              "id": "p1-x-dp:d2",
              "label": "Policy iteration and value iteration on FrozenLake agreeing with each other to 1e-8"
            },
            {
              "id": "p1-x-dp:d3",
              "label": "A plot of max-norm error against sweep, and one sentence on the convergence rate you observe"
            }
          ],
          "resources": [
            {
              "id": "p1-x-dp:1",
              "kind": "site",
              "label": "Gymnasium toy text (FrozenLake, CliffWalking, Taxi)",
              "url": "https://gymnasium.farama.org/environments/toy_text/"
            }
          ]
        },
        {
          "id": "p1-mc",
          "name": "Monte Carlo",
          "title": "Monte Carlo methods",
          "meta": "Sutton & Barto ch. 5",
          "tag": "core",
          "idea": "Estimate values from complete returns.",
          "fwd": "MC return estimation reappears in REINFORCE and in GRPO's group-relative returns.",
          "outcome": "Estimate a value function from complete returns and say when a Monte Carlo estimate is unbiased.",
          "resources": [
            {
              "id": "p1-mc:1",
              "kind": "chapter",
              "label": "Ch. 5 Monte Carlo Methods",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=113",
              "from": "p0-sb"
            },
            {
              "id": "p1-mc:2",
              "kind": "video",
              "label": "Silver lecture 4: Model-Free Prediction",
              "url": "https://www.youtube.com/watch?v=PnHCvfgC_ZA",
              "from": "p0-silver",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p1-is",
          "name": "Off-policy MC",
          "title": "Off-policy prediction via importance sampling",
          "meta": "Sutton & Barto ch. 5.5-5.9",
          "tag": "core",
          "idea": "Reweight returns collected under a behaviour policy to estimate values under a target policy. Ordinary importance sampling is unbiased with unbounded variance; weighted importance sampling trades a little bias for much less of it.",
          "fwd": "The same ratio comes back as PPO's probability ratio, V-trace's clipped ratios, off-policy evaluation, and the implicit reward ratio in DPO.",
          "outcome": "Derive the ratio for a trajectory, say why its variance grows with the horizon, and recognise it when it reappears in a deep RL objective.",
          "prereqs": [
            "p1-mc"
          ],
          "resources": [
            {
              "id": "p1-is:1",
              "kind": "chapter",
              "label": "Ch. 5.5-5.9 Off-policy prediction via importance sampling",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=125"
            },
            {
              "id": "p1-is:2",
              "kind": "paper",
              "label": "IMPALA: the same ratio, clipped (V-trace)",
              "url": "https://arxiv.org/abs/1802.01561",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p1-td",
          "name": "TD learning",
          "title": "Temporal-difference learning",
          "meta": "Sutton & Barto ch. 6; Sutton, Machine Learning 1988",
          "tag": "core",
          "idea": "The single most important idea in the field. The bootstrapped target.",
          "fwd": "Ancestor of the DQN loss.",
          "outcome": "Write the TD(0) update and explain the bias it introduces relative to Monte Carlo.",
          "landmark": true,
          "resources": [
            {
              "id": "p1-td:1",
              "kind": "chapter",
              "label": "Ch. 6 Temporal-Difference Learning",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=141",
              "from": "p0-sb"
            },
            {
              "id": "p1-td:2",
              "kind": "paper",
              "label": "Sutton 1988, Learning to Predict by the Methods of Temporal Differences",
              "url": "https://doi.org/10.1007/BF00115009"
            },
            {
              "id": "p1-td:3",
              "kind": "video",
              "label": "Silver lecture 4: Model-Free Prediction",
              "url": "https://www.youtube.com/watch?v=PnHCvfgC_ZA",
              "from": "p0-silver",
              "role": "pick"
            },
            {
              "id": "p1-td:4",
              "kind": "video",
              "label": "CS234 lecture 3: Policy Evaluation",
              "url": "https://www.youtube.com/watch?v=jjq51TRNVvk",
              "from": "p0-cs234",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p1-x-pred",
          "name": "MC vs TD",
          "title": "Compare Monte Carlo and TD on one prediction task",
          "meta": "Deliverable: code, a plot, a conclusion",
          "tag": "exercise",
          "idea": "Run both estimators against a known ground-truth value function and watch the bias-variance trade-off happen rather than reading about it.",
          "fwd": "The same trade-off reappears as n-step returns, GAE's lambda and every choice of target in deep RL.",
          "outcome": "Say which estimator you would pick for a given task and horizon, from your own measurements.",
          "prereqs": [
            "p1-mc",
            "p1-td"
          ],
          "deliverables": [
            {
              "id": "p1-x-pred:d1",
              "label": "Monte Carlo and TD(0) prediction on the same task, against a known v_pi"
            },
            {
              "id": "p1-x-pred:d2",
              "label": "RMS error against episodes for both, over several step sizes and at least 10 seeds"
            },
            {
              "id": "p1-x-pred:d3",
              "label": "A paragraph on which wins when, in bias and variance terms"
            }
          ],
          "resources": []
        },
        {
          "id": "p1-qlearning",
          "name": "Q-learning",
          "title": "Q-learning",
          "meta": "Watkins & Dayan, Machine Learning 1992 (Watkins thesis 1989)",
          "tag": "core",
          "idea": "Off-policy TD control with a convergence proof. Skim the original.",
          "fwd": "Becomes DQN when you swap the table for a neural net.",
          "outcome": "Implement Q-learning and say why it is off-policy.",
          "resources": [
            {
              "id": "p1-qlearning:1",
              "kind": "paper",
              "label": "Watkins & Dayan 1992, Q-learning",
              "url": "https://doi.org/10.1007/BF00992698"
            },
            {
              "id": "p1-qlearning:2",
              "kind": "chapter",
              "label": "Ch. 6.5 Q-learning",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=153",
              "from": "p0-sb"
            },
            {
              "id": "p1-qlearning:3",
              "kind": "video",
              "label": "Silver lecture 5: Model-Free Control",
              "url": "https://www.youtube.com/watch?v=0g4j2k_Ggc4",
              "from": "p0-silver",
              "role": "pick"
            },
            {
              "id": "p1-qlearning:4",
              "kind": "video",
              "label": "CS234 lecture 4: Q-learning and Function Approximation",
              "url": "https://www.youtube.com/watch?v=b_wvosA70f8",
              "from": "p0-cs234",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p1-sarsa",
          "name": "SARSA",
          "title": "SARSA",
          "meta": "Rummery & Niranjan 1994; named by Sutton 1996; S&B ch. 6",
          "tag": "core",
          "idea": "On-policy control.",
          "fwd": "The on-policy vs off-policy distinction structures the whole field (PPO vs SAC).",
          "outcome": "Implement SARSA and Expected SARSA and predict how each behaves near a cliff.",
          "resources": [
            {
              "id": "p1-sarsa:1",
              "kind": "chapter",
              "label": "Ch. 6.4 Sarsa",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=151",
              "from": "p0-sb"
            },
            {
              "id": "p1-sarsa:2",
              "kind": "chapter",
              "label": "Ch. 6.6 Expected Sarsa",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=155",
              "from": "p0-sb"
            },
            {
              "id": "p1-sarsa:3",
              "kind": "video",
              "label": "Silver lecture 5: Model-Free Control",
              "url": "https://www.youtube.com/watch?v=0g4j2k_Ggc4",
              "from": "p0-silver",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p1-x-control",
          "name": "Cliff walk",
          "title": "SARSA and Q-learning on the cliff",
          "meta": "Deliverable: code, a plot, an explanation",
          "tag": "exercise",
          "idea": "The two algorithms learn different policies on the same task. Predict the difference before you run it, then check whether your prediction was right and why.",
          "fwd": "On-policy versus off-policy control is the fork that eventually separates PPO from DQN.",
          "outcome": "Explain, from your own runs, why the on-policy agent walks the safe path and the off-policy agent walks the edge.",
          "prereqs": [
            "p1-qlearning",
            "p1-sarsa"
          ],
          "deliverables": [
            {
              "id": "p1-x-control:d1",
              "label": "SARSA, Expected SARSA and Q-learning on CliffWalking in one codebase"
            },
            {
              "id": "p1-x-control:d2",
              "label": "Episode-return curves for all three, over at least 10 seeds, plus the greedy paths they learn"
            },
            {
              "id": "p1-x-control:d3",
              "label": "A written explanation of the difference, and what happens to it as epsilon goes to zero"
            }
          ],
          "resources": [
            {
              "id": "p1-x-control:1",
              "kind": "site",
              "label": "Gymnasium toy text (CliffWalking)",
              "url": "https://gymnasium.farama.org/environments/toy_text/"
            }
          ]
        },
        {
          "id": "p4-dyna",
          "name": "Dyna-Q",
          "title": "Dyna",
          "meta": "Sutton, 1990/1991",
          "tag": "core",
          "idea": "Integrate learning, planning and acting: use a learned model to generate synthetic experience and update the same value function you update from real experience. In the tabular case the model is a table of observed transitions.",
          "fwd": "The first taste of model-based RL. Imagined rollouts scale up into MBPO and Dreamer.",
          "outcome": "Say how many planning steps buy how much sample efficiency on a gridworld, and where the synthetic data starts to hurt.",
          "landmark": true,
          "prereqs": [
            "p1-td"
          ],
          "resources": [
            {
              "id": "p4-dyna:1",
              "kind": "paper",
              "label": "Sutton 1990, Integrated Architectures for Learning, Planning, and Reacting (PDF)",
              "url": "http://incompleteideas.net/papers/sutton-90.pdf"
            },
            {
              "id": "p4-dyna:2",
              "kind": "chapter",
              "label": "Ch. 8 Planning and Learning with Tabular Methods",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=181",
              "from": "p0-sb"
            },
            {
              "id": "p4-dyna:3",
              "kind": "video",
              "label": "Silver lecture 8: Integrating Learning and Planning",
              "url": "https://www.youtube.com/watch?v=ItMutbeOHtc",
              "from": "p0-silver",
              "role": "pick"
            },
            {
              "id": "p4-dyna:4",
              "kind": "video",
              "label": "Bootcamp 9: Model-based RL (Finn)",
              "url": "https://www.youtube.com/watch?v=iC2a7M9voYU",
              "from": "p0-bootcamp",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p1-nstep",
          "name": "n-step & TD(λ)",
          "title": "n-step bootstrapping and eligibility traces",
          "meta": "Sutton & Barto ch. 7 & 12",
          "tag": "core",
          "idea": "n-step returns and TD(λ).",
          "fwd": "n-step returns are a Rainbow component and reappear in R2D2, DreamerV3 and BBF. TD(λ) is the conceptual root of GAE.",
          "outcome": "Pick n or lambda for a given task and justify it in bias-variance terms.",
          "resources": [
            {
              "id": "p1-nstep:1",
              "kind": "chapter",
              "label": "Ch. 7 n-step Bootstrapping",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=163",
              "from": "p0-sb"
            },
            {
              "id": "p1-nstep:2",
              "kind": "chapter",
              "label": "Ch. 12 Eligibility Traces",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=309",
              "from": "p0-sb"
            }
          ]
        },
        {
          "id": "p1-pomdp",
          "name": "POMDPs",
          "title": "Partial observability",
          "meta": "POMDPs, histories and belief states",
          "tag": "core",
          "idea": "An observation is not a state. When the observation does not summarise the history, the Markov property fails and a memoryless policy cannot be optimal. The fixes are all forms of remembering: frame stacking, recurrence, or an explicit latent state.",
          "fwd": "Why R2D2 is recurrent, why world models learn a latent state, and why agentic LLM RL is framed as a POMDP rather than an MDP.",
          "outcome": "Decide whether a given environment is partially observed, and choose between stacking, recurrence and a learned latent state with a reason.",
          "resources": [
            {
              "id": "p1-pomdp:1",
              "kind": "paper",
              "label": "Deep Recurrent Q-Learning for Partially Observable MDPs",
              "url": "https://arxiv.org/abs/1507.06527"
            },
            {
              "id": "p1-pomdp:2",
              "kind": "paper",
              "label": "Recurrent Model-Free RL is a Strong Baseline for Many POMDPs",
              "url": "https://arxiv.org/abs/2110.05038",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p1-fa",
          "name": "Deadly triad",
          "title": "Function approximation and the deadly triad",
          "meta": "Sutton & Barto ch. 9–11",
          "tag": "core",
          "idea": "On-policy and off-policy function approximation. Bootstrapping, off-policy updates and function approximation together — the deadly triad — can make value estimates unstable or divergent. All three are present in most deep RL agents that work, so the triad is a risk to manage, not a prohibition.",
          "fwd": "Explains why DQN needed target networks and replay, and why offline RL is hard.",
          "outcome": "Name the three ingredients, say which one you could drop in a given agent, and predict where instability will show up in a learning curve.",
          "landmark": true,
          "resources": [
            {
              "id": "p1-fa:1",
              "kind": "chapter",
              "label": "Ch. 9 On-policy Prediction with Approximation",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=219",
              "from": "p0-sb"
            },
            {
              "id": "p1-fa:2",
              "kind": "chapter",
              "label": "Ch. 10 On-policy Control with Approximation",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=265",
              "from": "p0-sb"
            },
            {
              "id": "p1-fa:3",
              "kind": "chapter",
              "label": "Ch. 11 Off-policy Methods with Approximation",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=279",
              "from": "p0-sb"
            },
            {
              "id": "p1-fa:4",
              "kind": "site",
              "label": "Baird's counterexample (1st ed.)",
              "url": "http://incompleteideas.net/book/first/ebook/node88.html",
              "role": "optional"
            },
            {
              "id": "p1-fa:5",
              "kind": "video",
              "label": "Silver lecture 6: Value Function Approximation",
              "url": "https://www.youtube.com/watch?v=UoPei5o4fps",
              "from": "p0-silver",
              "role": "pick"
            },
            {
              "id": "p1-fa:6",
              "kind": "video",
              "label": "CS285 lecture 7: Value Function Methods (4 parts)",
              "url": "https://www.youtube.com/watch?v=pP_67mTJbGw&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p1-fa:7",
              "kind": "video",
              "label": "Bootcamp 2: Sample-based Approximations and Fitted Learning (Duan)",
              "url": "https://www.youtube.com/watch?v=qO-HUo0LsO4",
              "from": "p0-bootcamp",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p1-x-triad",
          "name": "Divergence",
          "title": "Build a divergence, then stop it",
          "meta": "Deliverable: code, a plot, a diagnosis",
          "tag": "exercise",
          "idea": "Reproduce Baird's counterexample and watch the weights leave. Then remove one leg of the triad at a time and record which removals rescue it.",
          "fwd": "You will recognise this failure mode in a deep agent, where it is much harder to see.",
          "outcome": "Diagnose an unstable value function by identifying which leg of the triad is doing the damage.",
          "prereqs": [
            "p1-fa"
          ],
          "deliverables": [
            {
              "id": "p1-x-triad:d1",
              "label": "Baird's counterexample reproduced, with weights diverging"
            },
            {
              "id": "p1-x-triad:d2",
              "label": "A plot of the same setup with one ingredient removed at a time (on-policy sampling, bootstrapping, function approximation)"
            },
            {
              "id": "p1-x-triad:d3",
              "label": "A paragraph naming which removals fixed it and which did not, and why"
            }
          ],
          "resources": []
        },
        {
          "id": "p1-pg",
          "name": "Policy gradient",
          "title": "Policy-gradient methods",
          "meta": "Sutton & Barto ch. 13",
          "tag": "core",
          "idea": "Parameterise the policy directly and follow the gradient of expected return.",
          "fwd": "Bridge into Phase 3.",
          "outcome": "Derive REINFORCE and say why policy gradients handle continuous actions that value methods cannot.",
          "resources": [
            {
              "id": "p1-pg:1",
              "kind": "chapter",
              "label": "Ch. 13 Policy Gradient Methods",
              "url": "http://incompleteideas.net/book/RLbook2020.pdf#page=343",
              "from": "p0-sb"
            },
            {
              "id": "p1-pg:2",
              "kind": "video",
              "label": "Silver lecture 7: Policy Gradient Methods",
              "url": "https://www.youtube.com/watch?v=KHZVXao4qXs",
              "from": "p0-silver",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p1-x-pg",
          "name": "Baselines",
          "title": "Measure what a baseline buys",
          "meta": "Deliverable: code, a plot, a derivation",
          "tag": "exercise",
          "idea": "Estimate the variance of the policy-gradient estimator with and without a baseline, on the same task and the same samples. Then show on paper that subtracting a state-dependent baseline leaves the estimator unbiased.",
          "fwd": "Everything from A2C to GRPO is an argument about what the baseline should be.",
          "outcome": "Quantify the variance reduction a baseline gives, and prove it costs no bias.",
          "prereqs": [
            "p1-pg"
          ],
          "deliverables": [
            {
              "id": "p1-x-pg:d1",
              "label": "REINFORCE with and without a value baseline on one task"
            },
            {
              "id": "p1-x-pg:d2",
              "label": "Empirical variance of the gradient estimate for both, plotted against training"
            },
            {
              "id": "p1-x-pg:d3",
              "label": "A short derivation that the baseline leaves the gradient unbiased"
            }
          ],
          "resources": []
        }
      ]
    },
    {
      "id": "p1e",
      "name": "Experimental practice",
      "short": "Practice",
      "phase": "Phase 1B",
      "tfl": "mildmay",
      "goal": "How to run an experiment that means something, starting with tabular ones. Read this alongside Phases 1 and 2 rather than after them.",
      "from": "p1-x-control",
      "path": [
        [
          1222,
          988
        ],
        [
          1222,
          1118
        ],
        [
          1352,
          1248
        ],
        [
          1690,
          1248
        ]
      ],
      "snap": [
        [
          1222,
          1118
        ],
        [
          1378,
          1248
        ],
        [
          1482,
          1248
        ],
        [
          1586,
          1248
        ],
        [
          1690,
          1248
        ]
      ],
      "pill": {
        "x": 1300,
        "y": 1195,
        "anchor": "middle"
      },
      "stations": [
        {
          "id": "p1e-seeds",
          "name": "Seeds & spread",
          "title": "One run is an anecdote",
          "meta": "Statistical power in deep RL",
          "tag": "core",
          "idea": "Re-run the same agent with independent seeds and look at the spread before comparing anything to anything. Deep RL learning curves from a single run routinely differ more between seeds of one method than between two methods.",
          "fwd": "Sets up every comparison you will make, and the aggregate metrics on Phase 7.",
          "outcome": "Report a result as a distribution over seeds, and say how many seeds a claim of a given size needs.",
          "prereqs": [
            "p1-x-control"
          ],
          "resources": [
            {
              "id": "p1e-seeds:1",
              "kind": "paper",
              "label": "How Many Random Seeds? Statistical Power Analysis in Deep RL",
              "url": "https://arxiv.org/abs/1806.08295"
            },
            {
              "id": "p1e-seeds:2",
              "kind": "paper",
              "label": "A Hitchhiker's Guide to Statistical Comparisons of RL Algorithms",
              "url": "https://arxiv.org/abs/1904.06979",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p7-henderson",
          "name": "Deep RL that Matters",
          "title": "Deep RL That Matters",
          "meta": "Henderson et al., AAAI 2018",
          "tag": "core",
          "idea": "Documents how fragile and irreproducible deep-RL results are: seeds, hyperparameters, codebases. Read early.",
          "fwd": "It will change how you run experiments.",
          "outcome": "List the confounders that make two published numbers incomparable, and say which ones your own runs are exposed to.",
          "resources": [
            {
              "id": "p7-henderson:1",
              "kind": "paper",
              "label": "Deep RL That Matters",
              "url": "https://arxiv.org/abs/1709.06560"
            },
            {
              "id": "p7-henderson:2",
              "kind": "video",
              "label": "Bootcamp 6: Nuts and Bolts of Deep RL Experimentation (Schulman)",
              "url": "https://www.youtube.com/watch?v=8EcdaCk9KaQ",
              "from": "p0-bootcamp",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p1e-protocol",
          "name": "Protocol",
          "title": "Decide the protocol before you run",
          "meta": "Budgets, evaluation, logging",
          "tag": "core",
          "idea": "Fix and write down what is held constant: environment version, interaction budget, number and policy of evaluation episodes, tuning budget per method, held-out tasks, and the exact commit and config for every run. A protocol chosen after seeing results is not a protocol.",
          "fwd": "Turns a pile of runs into evidence. Reused for every project on this map.",
          "outcome": "Write the protocol paragraph for a comparison before running it, and hold yourself to it.",
          "prereqs": [
            "p1e-seeds"
          ],
          "resources": [
            {
              "id": "p1e-protocol:1",
              "kind": "blog",
              "label": "Lessons Learned Reproducing a Deep RL Paper",
              "url": "https://amid.fish/reproducing-deep-rl"
            },
            {
              "id": "p1e-protocol:2",
              "kind": "blog",
              "label": "Spinning Up as a Deep RL Researcher",
              "url": "https://spinningup.openai.com/en/latest/spinningup/spinningup.html",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p1e-x-study",
          "name": "Small study",
          "title": "Run your tabular comparison properly",
          "meta": "Deliverable: a protocol, a plot, a conclusion",
          "tag": "exercise",
          "idea": "Take the CliffWalking comparison you already ran and redo it as a study: protocol first, enough seeds, uncertainty on the plot, and a conclusion that says what the evidence does not support.",
          "fwd": "The template for every experiment from here on, including the deep ones.",
          "outcome": "Produce a comparison another person could re-run from your write-up alone.",
          "prereqs": [
            "p1e-protocol",
            "p1-x-control"
          ],
          "deliverables": [
            {
              "id": "p1e-x-study:d1",
              "label": "The protocol, written down before the runs"
            },
            {
              "id": "p1e-x-study:d2",
              "label": "At least 10 seeds per method, with median and interquartile range on the plot"
            },
            {
              "id": "p1e-x-study:d3",
              "label": "A three-sentence conclusion that states what the evidence does not support"
            },
            {
              "id": "p1e-x-study:d4",
              "label": "Configs and commit hashes logged for every run"
            }
          ],
          "resources": []
        },
        {
          "id": "p1e-debug",
          "name": "Debugging",
          "title": "Implementation failure or algorithm failure",
          "meta": "The usual suspects, in order",
          "tag": "core",
          "idea": "Most agents that do not learn are broken, not badly tuned. Work through the usual suspects in a fixed order: terminal masking, truncation treated as termination so the bootstrap is cut off, targets computed with the wrong network or without a stopped gradient, reward and observation scaling, wrapper order, and only then hyperparameters.",
          "fwd": "Read this before DQN. It will save you a fortnight.",
          "outcome": "Rule out implementation faults in a fixed order before concluding anything about an algorithm.",
          "prereqs": [
            "p1e-protocol"
          ],
          "resources": [
            {
              "id": "p1e-debug:1",
              "kind": "blog",
              "label": "Debugging RL, Without the Agonizing Pain",
              "url": "https://andyljones.com/posts/rl-debugging.html"
            },
            {
              "id": "p1e-debug:2",
              "kind": "site",
              "label": "Gymnasium: handling termination and truncation",
              "url": "https://gymnasium.farama.org/tutorials/gymnasium_basics/handling_time_limits/"
            },
            {
              "id": "p1e-debug:3",
              "kind": "paper",
              "label": "Time Limits in Reinforcement Learning",
              "url": "https://arxiv.org/abs/1712.00378",
              "role": "optional"
            }
          ]
        }
      ]
    },
    {
      "id": "p2",
      "name": "Value-based deep RL",
      "short": "Value-based",
      "phase": "Phase 2",
      "tfl": "piccadilly",
      "goal": "Value-based deep RL, from DQN to the sample-efficient modern agents. Everyone needs DQN and Double DQN; the rest of the family is a specialisation.",
      "from": "p1-x-pg",
      "path": [
        [
          2054,
          988
        ],
        [
          2262,
          780
        ],
        [
          2262,
          572
        ],
        [
          2106,
          416
        ],
        [
          1300,
          416
        ],
        [
          1248,
          468
        ],
        [
          988,
          468
        ],
        [
          936,
          416
        ],
        [
          390,
          416
        ]
      ],
      "snap": [
        [
          2110,
          932
        ],
        [
          2216,
          826
        ],
        [
          2262,
          676
        ],
        [
          2197,
          481
        ],
        [
          1950,
          416
        ],
        [
          1794,
          416
        ],
        [
          1638,
          416
        ],
        [
          1430,
          416
        ],
        [
          1170,
          468
        ],
        [
          1040,
          468
        ],
        [
          806,
          416
        ],
        [
          598,
          416
        ],
        [
          390,
          416
        ]
      ],
      "pill": {
        "at": 4.5,
        "side": "below"
      },
      "stations": [
        {
          "id": "p2-dqn",
          "name": "DQN",
          "title": "Playing Atari with Deep RL / Human-level control through deep RL",
          "meta": "Mnih et al., arXiv 2013; Nature 518, 2015",
          "tag": "core",
          "idea": "Q-learning + CNN + experience replay + target network, learning Atari from pixels. Non-negotiable.",
          "fwd": "The founding work of deep RL. Every value-based method descends from it.",
          "outcome": "Implement DQN from scratch, including replay, target networks and the terminal/truncation handling, and get it learning on CartPole.",
          "landmark": true,
          "prereqs": [
            "p1-fa",
            "p1e-debug"
          ],
          "resources": [
            {
              "id": "p2-dqn:1",
              "kind": "paper",
              "label": "Playing Atari with Deep RL (2013)",
              "url": "https://arxiv.org/abs/1312.5602"
            },
            {
              "id": "p2-dqn:2",
              "kind": "paper",
              "label": "Human-level control through deep RL (Nature 2015)",
              "url": "https://doi.org/10.1038/nature14236"
            },
            {
              "id": "p2-dqn:3",
              "kind": "video",
              "label": "CS285 lecture 8: Deep RL with Q-functions (6 parts)",
              "url": "https://www.youtube.com/watch?v=7-D8RL3D6CI&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p2-dqn:4",
              "kind": "video",
              "label": "Bootcamp 3: DQN + Variants (Mnih)",
              "url": "https://www.youtube.com/watch?v=fevMOp5TDQs",
              "from": "p0-bootcamp",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p2-x-dqn",
          "name": "Build DQN",
          "title": "Build DQN, then change one thing",
          "meta": "Deliverable: an agent, an ablation, a plot",
          "tag": "exercise",
          "idea": "Write DQN from scratch until CartPole is solved, then change exactly one component and measure the effect against seed noise. One component at a time is the whole discipline.",
          "fwd": "The codebase you will extend for the whole value-based line.",
          "outcome": "Debug a value-based agent to a working state, and measure a single design change against the noise floor.",
          "prereqs": [
            "p2-dqn"
          ],
          "deliverables": [
            {
              "id": "p2-x-dqn:d1",
              "label": "DQN from scratch solving CartPole, with replay, target network and correct truncation handling"
            },
            {
              "id": "p2-x-dqn:d2",
              "label": "One component changed (target-network period, replay capacity or exploration schedule) and measured over at least 5 seeds"
            },
            {
              "id": "p2-x-dqn:d3",
              "label": "A plot with seed spread, and a paragraph on what you expected versus what happened"
            }
          ],
          "resources": [
            {
              "id": "p2-x-dqn:1",
              "kind": "code",
              "label": "CleanRL DQN docs",
              "url": "https://docs.cleanrl.dev/rl-algorithms/dqn/"
            }
          ],
          "always": true
        },
        {
          "id": "p2-ddqn",
          "name": "Double DQN",
          "title": "Deep RL with Double Q-learning",
          "meta": "van Hasselt, Guez & Silver, AAAI 2016",
          "tag": "core",
          "idea": "Decouple action selection from evaluation to fix Q-value overestimation.",
          "fwd": "The same overestimation problem is attacked again by TD3's clipped double-Q, though by a different mechanism: TD3 keeps two independent critics and takes their minimum, rather than splitting selection from evaluation across the online and target networks.",
          "outcome": "Write both the DQN and Double DQN targets and say which one a given implementation is using.",
          "resources": [
            {
              "id": "p2-ddqn:1",
              "kind": "paper",
              "label": "Deep RL with Double Q-learning",
              "url": "https://arxiv.org/abs/1509.06461"
            }
          ]
        },
        {
          "id": "p2-per",
          "name": "PER",
          "title": "Prioritized Experience Replay",
          "meta": "Schaul et al., ICLR 2016",
          "tag": "track",
          "idea": "Sample high-TD-error transitions more often.",
          "fwd": "A Rainbow component. The distributed variant is Ape-X.",
          "resources": [
            {
              "id": "p2-per:1",
              "kind": "paper",
              "label": "Prioritized Experience Replay",
              "url": "https://arxiv.org/abs/1511.05952"
            }
          ]
        },
        {
          "id": "p2-dueling",
          "name": "Dueling",
          "title": "Dueling Network Architectures",
          "meta": "Wang et al., ICML 2016",
          "tag": "track",
          "idea": "Separate value and advantage streams. Skim.",
          "fwd": "A Rainbow component.",
          "resources": [
            {
              "id": "p2-dueling:1",
              "kind": "paper",
              "label": "Dueling Network Architectures",
              "url": "https://arxiv.org/abs/1511.06581"
            }
          ]
        },
        {
          "id": "p2-noisy",
          "name": "Noisy Nets",
          "title": "Noisy Networks for Exploration",
          "meta": "Fortunato et al., ICLR 2018",
          "tag": "track",
          "idea": "Learnable parametric noise for exploration.",
          "fwd": "A Rainbow component.",
          "resources": [
            {
              "id": "p2-noisy:1",
              "kind": "paper",
              "label": "Noisy Networks for Exploration",
              "url": "https://arxiv.org/abs/1706.10295"
            }
          ]
        },
        {
          "id": "p2-c51",
          "name": "C51",
          "title": "A Distributional Perspective on RL",
          "meta": "Bellemare, Dabney & Munos, ICML 2017",
          "tag": "track",
          "idea": "Learn the distribution of returns, not just the mean. This launched a subfield.",
          "fwd": "QR-DQN, IQN, Rainbow, R2D2, Agent57.",
          "resources": [
            {
              "id": "p2-c51:1",
              "kind": "paper",
              "label": "A Distributional Perspective on RL",
              "url": "https://arxiv.org/abs/1707.06887"
            }
          ]
        },
        {
          "id": "p2-qrdqn",
          "name": "QR-DQN & IQN",
          "title": "Distributional RL with Quantile Regression / Implicit Quantile Networks",
          "meta": "Dabney et al., AAAI 2018; ICML 2018",
          "tag": "reference",
          "idea": "Quantile-based distributional RL. Read C51 closely, skim these.",
          "fwd": "Distributional heads in later agents.",
          "resources": [
            {
              "id": "p2-qrdqn:1",
              "kind": "paper",
              "label": "QR-DQN",
              "url": "https://arxiv.org/abs/1710.10044"
            },
            {
              "id": "p2-qrdqn:2",
              "kind": "paper",
              "label": "Implicit Quantile Networks",
              "url": "https://arxiv.org/abs/1806.06923"
            }
          ]
        },
        {
          "id": "p2-rainbow",
          "name": "Rainbow",
          "title": "Rainbow: Combining Improvements in Deep RL",
          "meta": "Hessel et al., AAAI 2018",
          "tag": "track",
          "idea": "Integrates six DQN extensions: double, dueling, PER, multi-step, C51, noisy nets. The best single ablation of what actually matters.",
          "fwd": "Template for later combine-everything agents.",
          "landmark": true,
          "resources": [
            {
              "id": "p2-rainbow:1",
              "kind": "paper",
              "label": "Rainbow",
              "url": "https://arxiv.org/abs/1710.02298"
            },
            {
              "id": "p2-rainbow:2",
              "kind": "code",
              "label": "Dopamine Rainbow agent",
              "url": "https://github.com/google/dopamine/tree/master/dopamine/jax/agents/rainbow",
              "from": "p0-refs",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p2-r2d2",
          "name": "R2D2",
          "title": "Recurrent Experience Replay in Distributed RL",
          "meta": "Kapturowski et al., ICLR 2019",
          "tag": "reference",
          "idea": "LSTM plus distributed replay. Big Atari jump.",
          "fwd": "Backbone of NGU and Agent57.",
          "prereqs": [
            "p1-pomdp"
          ],
          "resources": [
            {
              "id": "p2-r2d2:1",
              "kind": "paper",
              "label": "R2D2 (OpenReview, ICLR 2019)",
              "url": "https://openreview.net/forum?id=r1lyTjAqYX"
            }
          ]
        },
        {
          "id": "p2-ngu",
          "name": "NGU & Agent57",
          "title": "Never Give Up / Agent57",
          "meta": "Badia et al., ICLR 2020; ICML 2020",
          "tag": "reference",
          "idea": "Episodic and lifelong intrinsic rewards plus a meta-controller over exploration policies. First agent above the human benchmark on all 57 Atari games.",
          "fwd": "Read for the exploration and meta-controller ideas.",
          "resources": [
            {
              "id": "p2-ngu:1",
              "kind": "paper",
              "label": "Never Give Up",
              "url": "https://arxiv.org/abs/2002.06038"
            },
            {
              "id": "p2-ngu:2",
              "kind": "paper",
              "label": "Agent57",
              "url": "https://arxiv.org/abs/2003.13350"
            }
          ]
        },
        {
          "id": "p2-bbf",
          "name": "BBF",
          "title": "Bigger, Better, Faster",
          "meta": "Schwarzer et al., ICML 2023",
          "tag": "track",
          "idea": "IQM human-normalised 1.045 on Atari 100K in about 10 GPU hours. Scaled Impala-CNN, high replay ratio, periodic soft resets, annealed n-step returns, and SPR's self-predictive loss underneath. Read SPR (Representation learning) first if you have not.",
          "fwd": "The reference point for how good value-based RL can be with little data.",
          "landmark": true,
          "resources": [
            {
              "id": "p2-bbf:0",
              "kind": "paper",
              "label": "SPR (the representation BBF builds on)",
              "url": "https://arxiv.org/abs/2007.05929",
              "role": "optional"
            },
            {
              "id": "p2-bbf:1",
              "kind": "paper",
              "label": "Bigger, Better, Faster",
              "url": "https://arxiv.org/abs/2305.19452"
            }
          ]
        },
        {
          "id": "p2-x-value",
          "name": "Ablation",
          "title": "Add the Rainbow components one at a time",
          "meta": "Deliverable: an ablation under a stated budget",
          "tag": "exercise",
          "idea": "Add Double DQN and two more components of your choice to your own agent, one at a time, on a fixed interaction budget, and report the result with uncertainty rather than one curve per variant.",
          "fwd": "The first experiment on this map that looks like a paper's ablation table.",
          "outcome": "Run and report a multi-variant ablation whose conclusion survives the seed noise.",
          "prereqs": [
            "p2-ddqn",
            "p1e-protocol",
            "p7-rliable"
          ],
          "deliverables": [
            {
              "id": "p2-x-value:d1",
              "label": "Double DQN plus two further components (Dueling, PER, n-step or distributional) added incrementally to one codebase"
            },
            {
              "id": "p2-x-value:d2",
              "label": "All variants on the same environment and interaction budget, at least 5 seeds each"
            },
            {
              "id": "p2-x-value:d3",
              "label": "An aggregate metric with confidence intervals, not just mean curves"
            },
            {
              "id": "p2-x-value:d4",
              "label": "A conclusion naming what the evidence does and does not support at this budget"
            }
          ],
          "resources": [
            {
              "id": "p2-x-value:1",
              "kind": "site",
              "label": "Dopamine Atari baselines",
              "url": "https://google.github.io/dopamine/baselines/atari/plots.html"
            },
            {
              "id": "p2-x-value:2",
              "kind": "code",
              "label": "Arcade Learning Environment",
              "url": "https://github.com/Farama-Foundation/Arcade-Learning-Environment"
            }
          ]
        }
      ],
      "track": true
    },
    {
      "id": "p3",
      "name": "Policy gradients & actor-critic",
      "short": "Policy gradients",
      "phase": "Phase 3",
      "tfl": "district",
      "goal": "Policy optimisation from REINFORCE to PPO and SAC, plus the two entropy quantities the trust-region methods are built on.",
      "from": "p1-x-pg",
      "path": [
        [
          2054,
          988
        ],
        [
          2262,
          1196
        ],
        [
          2262,
          1404
        ],
        [
          2106,
          1560
        ],
        [
          390,
          1560
        ]
      ],
      "snap": [
        [
          2158,
          1092
        ],
        [
          2262,
          1300
        ],
        [
          2197,
          1495
        ],
        [
          1950,
          1560
        ],
        [
          1846,
          1560
        ],
        [
          1742,
          1560
        ],
        [
          1612,
          1560
        ],
        [
          1521,
          1560
        ],
        [
          1430,
          1560
        ],
        [
          1300,
          1560
        ],
        [
          1196,
          1560
        ],
        [
          1092,
          1560
        ],
        [
          949,
          1560
        ],
        [
          806,
          1560
        ],
        [
          598,
          1560
        ],
        [
          390,
          1560
        ]
      ],
      "pill": {
        "at": 4.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p3-reinforce",
          "name": "REINFORCE",
          "title": "Simple statistical gradient-following algorithms",
          "meta": "Williams, Machine Learning 1992",
          "tag": "core",
          "idea": "The original Monte-Carlo policy gradient.",
          "fwd": "GRPO and RLHF are REINFORCE-style estimators on token sequences.",
          "outcome": "Derive the score-function estimator and explain why a state-dependent baseline leaves it unbiased.",
          "landmark": true,
          "prereqs": [
            "p1-pg"
          ],
          "resources": [
            {
              "id": "p3-reinforce:1",
              "kind": "paper",
              "label": "Williams 1992, REINFORCE",
              "url": "https://doi.org/10.1007/BF00992696"
            },
            {
              "id": "p3-reinforce:2",
              "kind": "site",
              "label": "Spinning Up Part 3: Intro to Policy Optimization",
              "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro3.html",
              "from": "p0-spinup",
              "role": "optional"
            },
            {
              "id": "p3-reinforce:3",
              "kind": "video",
              "label": "CS285 lecture 5: Policy Gradients (6 parts)",
              "url": "https://www.youtube.com/watch?v=GKoKNYaBvM0&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p3-reinforce:4",
              "kind": "video",
              "label": "Bootcamp 4a: Policy Gradients and Actor Critic (Abbeel)",
              "url": "https://www.youtube.com/watch?v=S_gwYj1Q-44",
              "from": "p0-bootcamp",
              "role": "pick"
            },
            {
              "id": "p3-reinforce:5",
              "kind": "video",
              "label": "Bootcamp 4b: Pong from Pixels (Karpathy)",
              "url": "https://www.youtube.com/watch?v=tqrcjHuNdmQ",
              "from": "p0-bootcamp",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p3-pgtheorem",
          "name": "PG theorem",
          "title": "Policy Gradient Methods for RL with Function Approximation",
          "meta": "Sutton, McAllester, Singh & Mansour, NeurIPS 2000",
          "tag": "core",
          "idea": "The policy-gradient theorem.",
          "fwd": "The theoretical licence for every actor-critic method.",
          "outcome": "State the policy gradient theorem and identify each term in an implementation.",
          "resources": [
            {
              "id": "p3-pgtheorem:1",
              "kind": "paper",
              "label": "Policy Gradient Methods for RL with Function Approximation (PDF)",
              "url": "http://incompleteideas.net/papers/SMSM-NIPS99.pdf"
            },
            {
              "id": "p3-pgtheorem:2",
              "kind": "site",
              "label": "Spinning Up: Vanilla Policy Gradient",
              "url": "https://spinningup.openai.com/en/latest/algorithms/vpg.html",
              "from": "p0-spinup",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p3-npg",
          "name": "Natural PG",
          "title": "A Natural Policy Gradient",
          "meta": "Kakade, NeurIPS 2002",
          "tag": "reference",
          "idea": "Precondition the gradient by the Fisher information for invariance to parameterisation.",
          "fwd": "The conceptual seed of TRPO.",
          "resources": [
            {
              "id": "p3-npg:1",
              "kind": "paper",
              "label": "A Natural Policy Gradient (NeurIPS 2001)",
              "url": "https://papers.nips.cc/paper_files/paper/2001/hash/4b86abe48d358ecf194c56c69108433e-Abstract.html"
            }
          ]
        },
        {
          "id": "p3-a3c",
          "name": "A3C / A2C",
          "title": "Asynchronous Methods for Deep RL",
          "meta": "Mnih et al., ICML 2016",
          "tag": "core",
          "idea": "Parallel actors, advantage actor-critic.",
          "fwd": "The actor-learner idea scales into IMPALA.",
          "outcome": "Explain what the critic replaces in REINFORCE and why parallel actors decorrelate updates.",
          "resources": [
            {
              "id": "p3-a3c:1",
              "kind": "paper",
              "label": "Asynchronous Methods for Deep RL",
              "url": "https://arxiv.org/abs/1602.01783"
            },
            {
              "id": "p3-a3c:2",
              "kind": "video",
              "label": "CS285 lecture 6: Actor-Critic Algorithms (5 parts)",
              "url": "https://www.youtube.com/watch?v=wr00ef_TY6Q&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p3-gae",
          "name": "GAE",
          "title": "High-Dimensional Continuous Control Using Generalized Advantage Estimation",
          "meta": "Schulman et al., ICLR 2016",
          "tag": "core",
          "idea": "Bias-variance controlled advantage estimates via a TD(λ)-style trace.",
          "fwd": "Inside virtually every modern PPO implementation, including LLM RLHF.",
          "outcome": "Explain the bias-variance trade-off that lambda controls, and pick a value for a given episode length.",
          "resources": [
            {
              "id": "p3-gae:1",
              "kind": "paper",
              "label": "Generalized Advantage Estimation",
              "url": "https://arxiv.org/abs/1506.02438"
            }
          ]
        },
        {
          "id": "p3-entropy",
          "name": "Entropy & KL",
          "title": "Entropy and KL divergence",
          "meta": "The two quantities behind trust regions, SAC and DPO",
          "tag": "core",
          "idea": "Entropy measures how spread a policy is; KL measures how far one policy is from another, asymmetrically. Both are estimated from samples in practice, and the estimator you choose matters.",
          "fwd": "TRPO's constraint, PPO's clip as a cheap stand-in for it, SAC's entropy bonus, and the implicit KL penalty inside DPO.",
          "outcome": "Estimate a KL from samples, say which direction you are penalising and why, and explain what an entropy bonus does to exploration.",
          "prereqs": [
            "p0-maths"
          ],
          "resources": [
            {
              "id": "p3-entropy:1",
              "kind": "blog",
              "label": "Approximating KL Divergence",
              "url": "http://joschu.net/blog/kl-approx.html"
            },
            {
              "id": "p3-entropy:2",
              "kind": "paper",
              "label": "RL and Control as Probabilistic Inference",
              "url": "https://arxiv.org/abs/1805.00909",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p3-trpo",
          "name": "TRPO",
          "title": "Trust Region Policy Optimization",
          "meta": "Schulman et al., ICML 2015",
          "tag": "core",
          "idea": "Monotonic-improvement updates via a KL trust region. Understand the idea, the maths is Deeper.",
          "fwd": "PPO is its practical simplification.",
          "outcome": "Explain the trust region and why PPO's clip is a cheap approximation of it.",
          "landmark": true,
          "prereqs": [
            "p3-entropy"
          ],
          "resources": [
            {
              "id": "p3-trpo:1",
              "kind": "paper",
              "label": "Trust Region Policy Optimization",
              "url": "https://arxiv.org/abs/1502.05477"
            },
            {
              "id": "p3-trpo:2",
              "kind": "site",
              "label": "Spinning Up: TRPO",
              "url": "https://spinningup.openai.com/en/latest/algorithms/trpo.html",
              "from": "p0-spinup",
              "role": "optional"
            },
            {
              "id": "p3-trpo:3",
              "kind": "video",
              "label": "CS285 lecture 9: Advanced Policy Gradients (4 parts)",
              "url": "https://www.youtube.com/watch?v=ySenCHPsKJU&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p3-trpo:4",
              "kind": "video",
              "label": "Bootcamp 5: Natural Policy Gradients, TRPO, and PPO (Schulman)",
              "url": "https://www.youtube.com/watch?v=xvRrgxcpaHY",
              "from": "p0-bootcamp",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p7-details",
          "name": "37 details of PPO",
          "title": "The 37 Implementation Details of PPO",
          "meta": "Huang et al., ICLR 2022 Blog Track",
          "tag": "core",
          "idea": "Every implementation detail that changes PPO results.",
          "fwd": "Practical companion to Phase 3.",
          "outcome": "Audit a PPO implementation against the list and say which details your version omits and what each omission costs.",
          "resources": [
            {
              "id": "p7-details:1",
              "kind": "blog",
              "label": "The 37 Implementation Details of PPO",
              "url": "https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/"
            }
          ]
        },
        {
          "id": "p3-ppo",
          "name": "PPO",
          "title": "Proximal Policy Optimization",
          "meta": "Schulman et al., arXiv 1707.06347, 2017",
          "tag": "core",
          "idea": "Clipped surrogate objective. First-order, robust, ubiquitous. Non-negotiable. Read it with the 37 implementation details station.",
          "fwd": "The default RL algorithm. Base of InstructGPT RLHF and parent of GRPO, DAPO, VAPO.",
          "outcome": "Write the clipped surrogate objective from memory and explain what the ratio and the clip range each do.",
          "landmark": true,
          "prereqs": [
            "p3-trpo"
          ],
          "resources": [
            {
              "id": "p3-ppo:1",
              "kind": "paper",
              "label": "Proximal Policy Optimization",
              "url": "https://arxiv.org/abs/1707.06347"
            },
            {
              "id": "p3-ppo:2",
              "kind": "site",
              "label": "Spinning Up: PPO",
              "url": "https://spinningup.openai.com/en/latest/algorithms/ppo.html",
              "from": "p0-spinup",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p3-x-ppo",
          "name": "Build PPO",
          "title": "PPO from scratch under a protocol",
          "meta": "Deliverable: an agent, a protocol, an audit",
          "tag": "exercise",
          "idea": "Implement PPO, run it under a protocol you wrote first, then audit your implementation against the 37 details and count what you missed. The audit is where most of the learning is.",
          "fwd": "PPO is the base of GRPO and of most LLM RL. You want to trust your own version of it.",
          "outcome": "Get PPO working on a continuous-control task and state its result with a reproducible protocol rather than a remembered number.",
          "prereqs": [
            "p3-ppo",
            "p1e-protocol",
            "p7-details"
          ],
          "deliverables": [
            {
              "id": "p3-x-ppo:d1",
              "label": "PPO from scratch on a MuJoCo task, with the environment version, total interaction budget, evaluation episodes and seed count stated up front"
            },
            {
              "id": "p3-x-ppo:d2",
              "label": "A learning curve with seed spread and a final score reported as an interval"
            },
            {
              "id": "p3-x-ppo:d3",
              "label": "An audit against the 37 implementation details, listing which you implemented and which you skipped"
            },
            {
              "id": "p3-x-ppo:d4",
              "label": "A paragraph naming the single fix that mattered most"
            }
          ],
          "resources": [
            {
              "id": "p3-x-ppo:1",
              "kind": "code",
              "label": "CleanRL PPO docs",
              "url": "https://docs.cleanrl.dev/rl-algorithms/ppo/"
            },
            {
              "id": "p3-x-ppo:2",
              "kind": "site",
              "label": "Gymnasium MuJoCo (Hopper, HalfCheetah, Walker2d)",
              "url": "https://gymnasium.farama.org/environments/mujoco/"
            },
            {
              "id": "p3-x-ppo:3",
              "kind": "blog",
              "label": "The 37 Implementation Details of PPO",
              "url": "https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/"
            }
          ]
        },
        {
          "id": "p3-acktr",
          "name": "ACKTR",
          "title": "ACKTR",
          "meta": "Wu et al., NeurIPS 2017",
          "tag": "reference",
          "idea": "Kronecker-factored natural gradient actor-critic.",
          "fwd": "Optional depth on natural gradients.",
          "resources": [
            {
              "id": "p3-acktr:1",
              "kind": "paper",
              "label": "ACKTR",
              "url": "https://arxiv.org/abs/1708.05144"
            }
          ]
        },
        {
          "id": "p3-impala",
          "name": "IMPALA",
          "title": "IMPALA",
          "meta": "Espeholt et al., ICML 2018",
          "tag": "reference",
          "idea": "Decoupled distributed actor-learner plus V-trace off-policy correction. 250,000 frames per second.",
          "fwd": "SEED RL. V-trace recurs in AlphaStar.",
          "resources": [
            {
              "id": "p3-impala:1",
              "kind": "paper",
              "label": "IMPALA",
              "url": "https://arxiv.org/abs/1802.01561"
            }
          ]
        },
        {
          "id": "p3-ddpg",
          "name": "DPG & DDPG",
          "title": "Deterministic Policy Gradient / Continuous control with deep RL",
          "meta": "Silver et al., ICML 2014; Lillicrap et al., ICLR 2016",
          "tag": "core",
          "idea": "Off-policy actor-critic for continuous action spaces.",
          "fwd": "Base of TD3 and DrQ-v2.",
          "outcome": "Explain why deterministic policies need off-policy exploration noise.",
          "resources": [
            {
              "id": "p3-ddpg:1",
              "kind": "paper",
              "label": "Deterministic Policy Gradient (ICML 2014)",
              "url": "https://proceedings.mlr.press/v32/silver14.html"
            },
            {
              "id": "p3-ddpg:2",
              "kind": "paper",
              "label": "DDPG",
              "url": "https://arxiv.org/abs/1509.02971"
            },
            {
              "id": "p3-ddpg:3",
              "kind": "site",
              "label": "Spinning Up: DDPG",
              "url": "https://spinningup.openai.com/en/latest/algorithms/ddpg.html",
              "from": "p0-spinup",
              "role": "optional"
            },
            {
              "id": "p3-ddpg:4",
              "kind": "video",
              "label": "Bootcamp 7: SVG, DDPG, and Stochastic Computation Graphs (Schulman)",
              "url": "https://www.youtube.com/watch?v=jmMsNQ2eug4",
              "from": "p0-bootcamp",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p3-td3",
          "name": "TD3",
          "title": "Addressing Function Approximation Error in Actor-Critic Methods",
          "meta": "Fujimoto, van Hoof & Meger, ICML 2018",
          "tag": "core",
          "idea": "Clipped double-Q, delayed policy updates and target-policy smoothing fix DDPG's overestimation. The clipped double-Q term takes the minimum of two independently trained critics, which is related to Double DQN's motivation but not the same estimator: it deliberately biases the target downwards rather than decorrelating selection from evaluation.",
          "fwd": "The standard deterministic continuous-control baseline. Base of TD3+BC.",
          "outcome": "Implement the three TD3 changes on top of a working DDPG and say what each one buys.",
          "resources": [
            {
              "id": "p3-td3:1",
              "kind": "paper",
              "label": "TD3",
              "url": "https://arxiv.org/abs/1802.09477"
            },
            {
              "id": "p3-td3:2",
              "kind": "site",
              "label": "Spinning Up: TD3",
              "url": "https://spinningup.openai.com/en/latest/algorithms/td3.html",
              "from": "p0-spinup",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p3-sac",
          "name": "SAC",
          "title": "Soft Actor-Critic",
          "meta": "Haarnoja et al., ICML 2018; arXiv 1812.05905",
          "tag": "core",
          "idea": "Maximum-entropy off-policy actor-critic. Sample-efficient and stable. Non-negotiable for continuous control.",
          "fwd": "The default continuous-control algorithm. Used inside MBPO, PEARL, DrQ.",
          "outcome": "Say what the entropy term does to exploration and how the temperature is tuned.",
          "landmark": true,
          "prereqs": [
            "p3-entropy"
          ],
          "resources": [
            {
              "id": "p3-sac:1",
              "kind": "paper",
              "label": "Soft Actor-Critic",
              "url": "https://arxiv.org/abs/1801.01290"
            },
            {
              "id": "p3-sac:2",
              "kind": "paper",
              "label": "SAC Algorithms and Applications",
              "url": "https://arxiv.org/abs/1812.05905",
              "role": "optional"
            },
            {
              "id": "p3-sac:3",
              "kind": "site",
              "label": "Spinning Up: SAC",
              "url": "https://spinningup.openai.com/en/latest/algorithms/sac.html",
              "from": "p0-spinup",
              "role": "optional"
            },
            {
              "id": "p3-sac:4",
              "kind": "video",
              "label": "CS285 lecture 19: Control as Inference (5 parts)",
              "url": "https://www.youtube.com/watch?v=MzVlYYGtg0M&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p3-x-continuous",
          "name": "Compare three",
          "title": "Three continuous-control agents, one protocol",
          "meta": "Deliverable: a fair comparison",
          "tag": "exercise",
          "idea": "Run all three on the same tasks, the same interaction budget and the same evaluation protocol, then explain the differences in code before explaining the differences in the plot.",
          "fwd": "The comparison every offline and robotics paper assumes you have already internalised.",
          "outcome": "Compare three closely related algorithms fairly, and attribute differences to specific implementation choices.",
          "prereqs": [
            "p3-sac",
            "p3-td3",
            "p7-rliable"
          ],
          "deliverables": [
            {
              "id": "p3-x-continuous:d1",
              "label": "DDPG, TD3 and SAC on the same two tasks, same budget, same evaluation protocol"
            },
            {
              "id": "p3-x-continuous:d2",
              "label": "An aggregate metric with confidence intervals across at least 5 seeds"
            },
            {
              "id": "p3-x-continuous:d3",
              "label": "A table of what actually differs between the three implementations"
            },
            {
              "id": "p3-x-continuous:d4",
              "label": "A paragraph on which of those differences your evidence says mattered"
            }
          ],
          "resources": [
            {
              "id": "p3-x-continuous:1",
              "kind": "site",
              "label": "Spinning Up algorithm docs (VPG, PPO, DDPG, TD3, SAC)",
              "url": "https://spinningup.openai.com/en/latest/user/algorithms.html"
            },
            {
              "id": "p3-x-continuous:2",
              "kind": "code",
              "label": "CleanRL SAC docs",
              "url": "https://docs.cleanrl.dev/rl-algorithms/sac/"
            }
          ]
        }
      ]
    },
    {
      "id": "p7",
      "name": "Evaluation & experiment design",
      "short": "Evaluation",
      "phase": "Phase 7",
      "tfl": "overground",
      "goal": "How results are established and reported. Read it before your first deep agent, on the tabular runs you already have, and keep coming back: it decides whether your own experiments are worth anything.",
      "from": "p2-per",
      "path": [
        [
          2197,
          481
        ],
        [
          3250,
          481
        ],
        [
          3445,
          676
        ],
        [
          3445,
          1495
        ],
        [
          3250,
          1690
        ],
        {
          "through": "p5-x-grpo"
        }
      ],
      "snap": [
        [
          2470,
          481
        ],
        [
          2925,
          481
        ],
        [
          3445,
          845
        ],
        [
          3445,
          1300
        ],
        [
          3120,
          1690
        ]
      ],
      "pill": {
        "at": 0.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p7-empirical",
          "name": "Empirical design",
          "title": "Empirical Design in Reinforcement Learning",
          "meta": "Patterson, Neumann, White & White",
          "tag": "core",
          "idea": "How to design an RL experiment whose conclusion survives contact with someone else's rerun: what to control, what to tune, how to report, and which comparisons are not worth running.",
          "fwd": "The methodology backbone for every project and for the investigation line.",
          "outcome": "Design a study before running it, and defend each of its choices.",
          "resources": [
            {
              "id": "p7-empirical:1",
              "kind": "paper",
              "label": "Empirical Design in Reinforcement Learning",
              "url": "https://arxiv.org/abs/2304.01315"
            }
          ]
        },
        {
          "id": "p7-stats",
          "name": "Comparing runs",
          "title": "Comparing algorithms without fooling yourself",
          "meta": "Intervals, paired designs, multiple comparisons",
          "tag": "core",
          "idea": "Independent seeds, paired comparisons where you can afford them, bootstrap intervals, and an honest account of what a gap between two medians over five runs is worth. Start from the spread you measured in Phase 1B and add aggregate metrics when you move to a suite of tasks.",
          "fwd": "Feeds directly into rliable's aggregate metrics and the reporting exercise at the end of this line.",
          "outcome": "Choose an interval or test appropriate to a comparison, and state the uncertainty rather than the point estimate.",
          "prereqs": [
            "p1e-seeds"
          ],
          "resources": []
        },
        {
          "id": "p7-benchmarks",
          "name": "Benchmarks",
          "title": "Benchmarks to know",
          "meta": "Atari ALE, MuJoCo, DM Control, Procgen, D4RL, MineRL, Isaac Gym / Isaac Lab",
          "tag": "reference",
          "idea": "Atari ALE (Bellemare 2013; Machado 2018 protocols). MuJoCo and DM Control. Procgen. D4RL. MineRL. Isaac Gym and Isaac Lab for massively parallel GPU sim.",
          "fwd": "Pick small, fast environments so you can iterate.",
          "resources": [
            {
              "id": "p7-benchmarks:1",
              "kind": "paper",
              "label": "Arcade Learning Environment",
              "url": "https://arxiv.org/abs/1207.4708"
            },
            {
              "id": "p7-benchmarks:2",
              "kind": "paper",
              "label": "Revisiting the ALE",
              "url": "https://arxiv.org/abs/1709.06009"
            },
            {
              "id": "p7-benchmarks:3",
              "kind": "code",
              "label": "DM Control",
              "url": "https://github.com/google-deepmind/dm_control",
              "role": "optional"
            },
            {
              "id": "p7-benchmarks:4",
              "kind": "code",
              "label": "Procgen",
              "url": "https://github.com/openai/procgen",
              "role": "optional"
            },
            {
              "id": "p7-benchmarks:5",
              "kind": "code",
              "label": "D4RL",
              "url": "https://github.com/Farama-Foundation/D4RL",
              "role": "optional"
            },
            {
              "id": "p7-benchmarks:6",
              "kind": "code",
              "label": "MineRL",
              "url": "https://github.com/minerllabs/minerl",
              "role": "optional"
            },
            {
              "id": "p7-benchmarks:7",
              "kind": "code",
              "label": "Isaac Lab",
              "url": "https://github.com/isaac-sim/IsaacLab",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p7-rliable",
          "name": "rliable",
          "title": "Deep RL at the Edge of the Statistical Precipice",
          "meta": "Agarwal et al., NeurIPS 2021, outstanding paper",
          "tag": "core",
          "idea": "Point estimates over a handful of runs hide enormous uncertainty. Report interval estimates, performance profiles and aggregate metrics such as the IQM instead of the mean over a few seeds.",
          "fwd": "The reporting standard for any comparison across a task suite.",
          "outcome": "Produce an IQM with stratified bootstrap confidence intervals and a performance profile for your own runs.",
          "landmark": true,
          "prereqs": [
            "p1e-seeds"
          ],
          "resources": [
            {
              "id": "p7-rliable:1",
              "kind": "paper",
              "label": "Deep RL at the Edge of the Statistical Precipice",
              "url": "https://arxiv.org/abs/2108.13264"
            },
            {
              "id": "p7-rliable:2",
              "kind": "code",
              "label": "rliable",
              "url": "https://github.com/google-research/rliable",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p7-x-report",
          "name": "Report it",
          "title": "Re-report a comparison you already ran",
          "meta": "Deliverable: a figure and a limitations paragraph",
          "tag": "exercise",
          "idea": "Take one comparison from an earlier phase and report it the way a careful paper would: aggregate metric, stratified bootstrap intervals, performance profile, stated budgets, and the limitations you would rather not write.",
          "fwd": "The last step before the investigation line, where you produce evidence nobody asked you for.",
          "outcome": "Turn a set of runs into a figure and a paragraph that would survive review.",
          "prereqs": [
            "p7-rliable",
            "p1e-x-study"
          ],
          "deliverables": [
            {
              "id": "p7-x-report:d1",
              "label": "IQM with stratified bootstrap confidence intervals for one earlier comparison"
            },
            {
              "id": "p7-x-report:d2",
              "label": "A performance profile across tasks or seeds"
            },
            {
              "id": "p7-x-report:d3",
              "label": "Interaction budget and tuning budget stated for every arm"
            },
            {
              "id": "p7-x-report:d4",
              "label": "A limitations paragraph, including the comparisons your data cannot support"
            }
          ],
          "resources": []
        }
      ]
    },
    {
      "id": "p6a",
      "name": "Exploration",
      "short": "Exploration",
      "phase": "Track 6A",
      "tfl": "victoria",
      "goal": "Intrinsic motivation and hard-exploration Atari.",
      "track": true,
      "from": "p3-a3c",
      "path": [
        [
          1950,
          1560
        ],
        {
          "through": "p2-dueling"
        },
        {
          "through": "p4-muzero"
        },
        [
          1950,
          156
        ]
      ],
      "snap": [
        [
          1950,
          1404
        ],
        [
          1950,
          1222
        ],
        [
          1950,
          1014
        ],
        [
          1950,
          832
        ],
        [
          1950,
          572
        ],
        [
          1950,
          156
        ]
      ],
      "pill": {
        "x": 1992,
        "y": 1240,
        "anchor": "start"
      },
      "stations": [
        {
          "id": "p6a-pseudo",
          "name": "Pseudo-counts",
          "title": "Unifying Count-Based Exploration and Intrinsic Motivation",
          "meta": "Bellemare et al., NeurIPS 2016",
          "tag": "track",
          "idea": "Pseudo-counts from density models.",
          "fwd": "Concept behind count-based bonuses.",
          "landmark": true,
          "resources": [
            {
              "id": "p6a-pseudo:1",
              "kind": "paper",
              "label": "Unifying Count-Based Exploration and Intrinsic Motivation",
              "url": "https://arxiv.org/abs/1606.01868"
            },
            {
              "id": "p6a-pseudo:2",
              "kind": "video",
              "label": "CS285 lecture 13: Exploration 1 (6 parts)",
              "url": "https://www.youtube.com/watch?v=RTLeJrp5Yp4&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p6a-pseudo:3",
              "kind": "video",
              "label": "CS285 lecture 14: Exploration 2 (4 parts)",
              "url": "https://www.youtube.com/watch?v=HnV3ed8wqPA&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p6a-icm",
          "name": "ICM",
          "title": "Curiosity-Driven Exploration by Self-Supervised Prediction",
          "meta": "Pathak et al., ICML 2017",
          "tag": "track",
          "idea": "Intrinsic reward = forward-model prediction error in a learned feature space. Beware the noisy-TV failure mode.",
          "fwd": "RND.",
          "resources": [
            {
              "id": "p6a-icm:1",
              "kind": "paper",
              "label": "Curiosity-driven Exploration (ICM)",
              "url": "https://arxiv.org/abs/1705.05363"
            }
          ]
        },
        {
          "id": "p6a-rnd",
          "name": "RND",
          "title": "Exploration by Random Network Distillation",
          "meta": "Burda et al., ICLR 2019",
          "tag": "core",
          "idea": "Novelty = error predicting a fixed random net. First to beat average human on Montezuma's Revenge. Clean and widely used.",
          "fwd": "Default intrinsic bonus.",
          "outcome": "Explain why a fixed random target network gives a usable novelty signal, and where intrinsic bonuses fail.",
          "landmark": true,
          "resources": [
            {
              "id": "p6a-rnd:1",
              "kind": "paper",
              "label": "Random Network Distillation",
              "url": "https://arxiv.org/abs/1810.12894"
            }
          ]
        },
        {
          "id": "p6a-bootdqn",
          "name": "Bootstrapped DQN",
          "title": "Deep Exploration via Bootstrapped DQN",
          "meta": "Osband et al., NeurIPS 2016",
          "tag": "reference",
          "idea": "Posterior-sampling-style exploration via ensemble heads.",
          "fwd": "Ensemble exploration.",
          "resources": [
            {
              "id": "p6a-bootdqn:1",
              "kind": "paper",
              "label": "Bootstrapped DQN",
              "url": "https://arxiv.org/abs/1602.04621"
            }
          ]
        },
        {
          "id": "p6a-goexplore",
          "name": "Go-Explore",
          "title": "Go-Explore",
          "meta": "Ecoffet et al., Nature 2021",
          "tag": "track",
          "idea": "Remember and return to promising states, then explore. Cracks hard-exploration Atari.",
          "fwd": "Intrinsic-motivation ideas feed NGU and Agent57.",
          "resources": [
            {
              "id": "p6a-goexplore:1",
              "kind": "paper",
              "label": "First return, then explore (arXiv)",
              "url": "https://arxiv.org/abs/2004.12919"
            },
            {
              "id": "p6a-goexplore:2",
              "kind": "paper",
              "label": "Go-Explore (Nature 2021)",
              "url": "https://doi.org/10.1038/s41586-020-03157-9"
            }
          ]
        },
        {
          "id": "p6a-regret",
          "name": "Regret in MDPs",
          "title": "UCRL2 and regret in unknown MDPs",
          "meta": "Jaksch, Ortner & Auer, JMLR 2010",
          "tag": "track",
          "idea": "Optimism lifted from bandits to unknown MDPs: keep confidence sets over transitions and rewards, plan optimistically inside them, and bound total regret over T steps. A different problem from bandit regret, and a much harder one.",
          "fwd": "The theory the heuristic exploration bonuses on this line are descended from.",
          "prereqs": [
            "p8-bandits"
          ],
          "resources": [
            {
              "id": "p8-bandits:2",
              "kind": "paper",
              "label": "Jaksch, Ortner & Auer 2010, UCRL2 (JMLR)",
              "url": "https://www.jmlr.org/papers/v11/jaksch10a.html"
            }
          ]
        }
      ]
    },
    {
      "id": "p4",
      "name": "Model-based RL & planning",
      "short": "Model-based",
      "phase": "Phase 4",
      "tfl": "metropolitan",
      "goal": "Learned world models, background versus decision-time planning, and the AlphaGo to MuZero lineage. World Models and MCTS are for everyone; the rest is a specialisation.",
      "track": true,
      "from": "p2-x-value",
      "path": [
        [
          390,
          416
        ],
        [
          520,
          286
        ],
        [
          1534,
          286
        ],
        [
          1586,
          234
        ],
        [
          1820,
          234
        ],
        [
          1872,
          286
        ],
        [
          2470,
          286
        ],
        {
          "through": "p7-empirical"
        },
        {
          "through": "p2-ddqn"
        }
      ],
      "snap": [
        [
          494,
          312
        ],
        [
          650,
          286
        ],
        [
          806,
          286
        ],
        [
          962,
          286
        ],
        [
          1118,
          286
        ],
        [
          1274,
          286
        ],
        [
          1430,
          286
        ],
        [
          1651,
          234
        ],
        [
          1768,
          234
        ],
        [
          1950,
          286
        ],
        [
          2106,
          286
        ],
        [
          2262,
          286
        ],
        [
          2392,
          286
        ]
      ],
      "pill": {
        "at": 3.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p4-pilco",
          "name": "PILCO",
          "title": "PILCO",
          "meta": "Deisenroth & Rasmussen, ICML 2011",
          "tag": "reference",
          "idea": "Gaussian-process dynamics with uncertainty for extreme data efficiency.",
          "fwd": "The uncertainty-aware model idea leads to PETS.",
          "resources": [
            {
              "id": "p4-pilco:1",
              "kind": "paper",
              "label": "PILCO (PDF)",
              "url": "https://mlg.eng.cam.ac.uk/pub/pdf/DeiRas11.pdf"
            }
          ]
        },
        {
          "id": "p4-pets",
          "name": "PETS",
          "title": "Deep RL in a Handful of Trials",
          "meta": "Chua et al., NeurIPS 2018",
          "tag": "track",
          "idea": "Probabilistic ensemble dynamics plus CEM planning.",
          "fwd": "Ensembles lead to MBPO.",
          "resources": [
            {
              "id": "p4-pets:1",
              "kind": "paper",
              "label": "PETS",
              "url": "https://arxiv.org/abs/1805.12114"
            },
            {
              "id": "p4-pets:2",
              "kind": "video",
              "label": "CS285 lecture 11: Model-Based RL (5 parts)",
              "url": "https://www.youtube.com/watch?v=LkTmiylbHYk&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p4-worldmodels",
          "name": "World Models",
          "title": "World Models",
          "meta": "Ha & Schmidhuber, NeurIPS 2018",
          "tag": "core",
          "idea": "Learn a VAE+RNN latent world model and train a controller inside it. Highly readable.",
          "fwd": "Direct ancestor of PlaNet and Dreamer.",
          "outcome": "Explain what a latent world model has to predict, and why training a controller inside it can work at all.",
          "prereqs": [
            "p1-pomdp"
          ],
          "resources": [
            {
              "id": "p4-worldmodels:1",
              "kind": "paper",
              "label": "World Models",
              "url": "https://arxiv.org/abs/1803.10122"
            },
            {
              "id": "p4-worldmodels:2",
              "kind": "site",
              "label": "Interactive article",
              "url": "https://worldmodels.github.io/",
              "role": "optional"
            },
            {
              "id": "p4-worldmodels:3",
              "kind": "video",
              "label": "CS285 lecture 18: Variational Inference and Generative Models (4 parts)",
              "url": "https://www.youtube.com/watch?v=UTMpM4orS30&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p4-mbpo",
          "name": "MBPO",
          "title": "When to Trust Your Model",
          "meta": "Janner et al., NeurIPS 2019",
          "tag": "track",
          "idea": "Short model-generated rollouts branched off real states, feeding SAC. Bounds compounding model error.",
          "fwd": "The standard modern Dyna-style method.",
          "resources": [
            {
              "id": "p4-mbpo:1",
              "kind": "paper",
              "label": "MBPO",
              "url": "https://arxiv.org/abs/1906.08253"
            },
            {
              "id": "p4-mbpo:2",
              "kind": "video",
              "label": "CS285 lecture 12: Model-Based RL with Policies (4 parts)",
              "url": "https://www.youtube.com/watch?v=UQGS4ycGv8g&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p4-dreamer",
          "name": "PlaNet & Dreamer",
          "title": "PlaNet / Dreamer / DreamerV2",
          "meta": "Hafner et al., ICML 2019; ICLR 2020; ICLR 2021",
          "tag": "track",
          "idea": "Learn latent dynamics and train an actor-critic purely in imagination.",
          "fwd": "Leads to DreamerV3.",
          "resources": [
            {
              "id": "p4-dreamer:1",
              "kind": "paper",
              "label": "PlaNet",
              "url": "https://arxiv.org/abs/1811.04551"
            },
            {
              "id": "p4-dreamer:2",
              "kind": "paper",
              "label": "Dreamer",
              "url": "https://arxiv.org/abs/1912.01603"
            },
            {
              "id": "p4-dreamer:3",
              "kind": "paper",
              "label": "DreamerV2",
              "url": "https://arxiv.org/abs/2010.02193"
            }
          ]
        },
        {
          "id": "p4-x-model",
          "name": "Latent model",
          "title": "Train a small latent world model",
          "meta": "Deliverable: a model, a horizon plot, a comparison",
          "tag": "exercise",
          "idea": "Learn latent dynamics on one control task, measure how far ahead the model stays trustworthy, and train a policy inside it against a model-free baseline at the same interaction budget.",
          "fwd": "The ideas you need before reading DreamerV3's engineering.",
          "outcome": "Say where a learned model stops being useful, from your own measurements rather than a paper's.",
          "prereqs": [
            "p4-dreamer"
          ],
          "deliverables": [
            {
              "id": "p4-x-model:d1",
              "label": "A latent dynamics model trained on a DM Control task"
            },
            {
              "id": "p4-x-model:d2",
              "label": "Prediction quality plotted against imagination horizon"
            },
            {
              "id": "p4-x-model:d3",
              "label": "A policy trained in imagination compared against a model-free baseline at equal environment interaction"
            },
            {
              "id": "p4-x-model:d4",
              "label": "A paragraph on where the imagined rollouts stop being trustworthy"
            }
          ],
          "resources": [
            {
              "id": "p4-x-model:1",
              "kind": "code",
              "label": "DM Control",
              "url": "https://github.com/google-deepmind/dm_control"
            }
          ]
        },
        {
          "id": "p4-dreamerv3",
          "name": "DreamerV3",
          "title": "Mastering Diverse Domains through World Models",
          "meta": "Hafner et al., arXiv 2023; Nature 2025",
          "tag": "track",
          "idea": "One configuration across 150+ tasks. First to collect diamonds in Minecraft from scratch without human data. Must-read frontier model-based agent.",
          "fwd": "The reference for the one algorithm, many domains ambition.",
          "landmark": true,
          "resources": [
            {
              "id": "p4-dreamerv3:1",
              "kind": "paper",
              "label": "DreamerV3 (arXiv)",
              "url": "https://arxiv.org/abs/2301.04104"
            },
            {
              "id": "p4-dreamerv3:2",
              "kind": "paper",
              "label": "Nature 2025 version",
              "url": "https://doi.org/10.1038/s41586-025-08744-2"
            }
          ]
        },
        {
          "id": "p4-mcts",
          "name": "MCTS",
          "title": "Monte Carlo Tree Search",
          "meta": "Browne et al., IEEE TCIAIG 2012",
          "tag": "core",
          "idea": "Selection, expansion, simulation, backup, and UCT's exploration term. Decision-time planning: search from the current state instead of learning a policy for all states.",
          "fwd": "The search half of AlphaZero and MuZero. Read this before either of them.",
          "outcome": "Implement UCT for a small deterministic game and explain what the tree statistics converge to.",
          "resources": [
            {
              "id": "p4-mcts:1",
              "kind": "paper",
              "label": "A Survey of Monte Carlo Tree Search Methods",
              "url": "https://doi.org/10.1109/TCIAIG.2012.2186810"
            },
            {
              "id": "p4-mcts:2",
              "kind": "video",
              "label": "CS285 lecture 10: Optimal Control and Planning (5 parts)",
              "url": "https://www.youtube.com/watch?v=4SL0DnxC1GM&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p4-alphazero",
          "name": "AlphaGo → AlphaZero",
          "title": "AlphaGo / AlphaGo Zero / AlphaZero",
          "meta": "Silver et al., Nature 2016; Nature 2017; Science 2018",
          "tag": "track",
          "idea": "MCTS plus deep policy and value nets. Then self-play from scratch. Then one algorithm for Go, chess and shogi. Read AlphaZero closely.",
          "fwd": "Directly into MuZero.",
          "landmark": true,
          "prereqs": [
            "p4-mcts"
          ],
          "resources": [
            {
              "id": "p4-alphazero:1",
              "kind": "paper",
              "label": "AlphaGo (Nature 2016)",
              "url": "https://doi.org/10.1038/nature16961"
            },
            {
              "id": "p4-alphazero:2",
              "kind": "paper",
              "label": "AlphaGo Zero (Nature 2017)",
              "url": "https://doi.org/10.1038/nature24270"
            },
            {
              "id": "p4-alphazero:3",
              "kind": "paper",
              "label": "AlphaZero (arXiv)",
              "url": "https://arxiv.org/abs/1712.01815"
            },
            {
              "id": "p4-alphazero:4",
              "kind": "paper",
              "label": "AlphaZero (Science 2018)",
              "url": "https://doi.org/10.1126/science.aar6404",
              "role": "optional"
            },
            {
              "id": "p4-alphazero:5",
              "kind": "video",
              "label": "Silver lecture 10: Classic Games",
              "url": "https://www.youtube.com/watch?v=kZ_AUmFcZtk",
              "from": "p0-silver",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p4-muzero",
          "name": "MuZero",
          "title": "MuZero: Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model",
          "meta": "Schrittwieser et al., Nature 588, 2020",
          "tag": "track",
          "idea": "MCTS over a learned latent model predicting reward, value and policy. No given rules. Non-negotiable landmark.",
          "fwd": "EfficientZero. Conceptual cousin of RL search for LLM reasoning.",
          "landmark": true,
          "resources": [
            {
              "id": "p4-muzero:1",
              "kind": "paper",
              "label": "MuZero (arXiv)",
              "url": "https://arxiv.org/abs/1911.08265"
            },
            {
              "id": "p4-muzero:2",
              "kind": "paper",
              "label": "MuZero (Nature 2020)",
              "url": "https://doi.org/10.1038/s41586-020-03051-4"
            }
          ]
        },
        {
          "id": "p4-efficientzero",
          "name": "EfficientZero",
          "title": "EfficientZero",
          "meta": "Ye et al., NeurIPS 2021",
          "tag": "reference",
          "idea": "MuZero plus self-supervised consistency. Human-level Atari 100K.",
          "fwd": "Sample-efficient planning.",
          "resources": [
            {
              "id": "p4-efficientzero:1",
              "kind": "paper",
              "label": "EfficientZero",
              "url": "https://arxiv.org/abs/2111.00210"
            }
          ]
        },
        {
          "id": "p4-x-mcts",
          "name": "Game tree",
          "title": "UCT for a small game, then a minimal AlphaZero",
          "meta": "Deliverable: a player, a strength curve",
          "tag": "exercise",
          "idea": "Implement UCT for Connect Four and measure playing strength against simulation count. Then, if you want the full picture, replace the rollouts with a small trained network.",
          "fwd": "Makes AlphaZero and MuZero concrete instead of impressive.",
          "outcome": "Explain exactly what the learned network replaces in plain MCTS, having built both.",
          "prereqs": [
            "p4-alphazero"
          ],
          "deliverables": [
            {
              "id": "p4-x-mcts:d1",
              "label": "UCT for Connect Four beating random and greedy opponents"
            },
            {
              "id": "p4-x-mcts:d2",
              "label": "Playing strength plotted against simulations per move"
            },
            {
              "id": "p4-x-mcts:d3",
              "label": "Optional: a minimal AlphaZero on tic-tac-toe or Connect Four"
            },
            {
              "id": "p4-x-mcts:d4",
              "label": "A paragraph on what the policy and value networks replace in plain MCTS"
            }
          ],
          "resources": []
        },
        {
          "id": "p4-tdmpc",
          "name": "TD-MPC / TD-MPC2",
          "title": "TD-MPC / TD-MPC2: Scalable, Robust World Models for Continuous Control",
          "meta": "Hansen et al., ICML 2022; ICLR 2024",
          "tag": "track",
          "idea": "Short-horizon planning in a task-oriented latent space plus a terminal value function. One recipe across many continuous-control tasks.",
          "fwd": "Current SOTA-competitive continuous-control planner.",
          "resources": [
            {
              "id": "p4-tdmpc:1",
              "kind": "paper",
              "label": "TD-MPC",
              "url": "https://arxiv.org/abs/2203.04955"
            },
            {
              "id": "p4-tdmpc:2",
              "kind": "paper",
              "label": "TD-MPC2",
              "url": "https://arxiv.org/abs/2310.16828"
            }
          ]
        }
      ]
    },
    {
      "id": "p6b",
      "name": "Offline RL",
      "short": "Offline RL",
      "phase": "Track 6B",
      "tfl": "weaver",
      "goal": "Learning from fixed datasets and the distributional-shift problem.",
      "track": true,
      "from": "p3-ddpg",
      "path": [
        [
          949,
          1560
        ],
        {
          "through": "p5-dpo"
        },
        [
          949,
          1924
        ],
        [
          819,
          2054
        ],
        [
          560,
          2054
        ],
        [
          430,
          2184
        ],
        [
          130,
          2184
        ],
        [
          0,
          2054
        ],
        [
          -100,
          1954
        ],
        {
          "through": "p6g-spr"
        }
      ],
      "snap": [
        [
          740,
          2054
        ],
        [
          600,
          2054
        ],
        [
          490,
          2120
        ],
        [
          300,
          2184
        ],
        [
          150,
          2184
        ],
        [
          30,
          2090
        ],
        [
          -100,
          1880
        ]
      ],
      "pill": {
        "at": 0.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p6b-tutorial",
          "name": "Offline RL tutorial",
          "title": "Offline RL: Tutorial, Review, and Perspectives",
          "meta": "Levine et al., arXiv 2005.01643, 2020",
          "tag": "core",
          "idea": "The starting point for the whole track.",
          "fwd": "Frames BCQ, CQL, IQL.",
          "outcome": "State the distributional-shift problem in one sentence and say why off-policy algorithms do not solve it by default.",
          "landmark": true,
          "resources": [
            {
              "id": "p6b-tutorial:1",
              "kind": "paper",
              "label": "Offline RL: Tutorial, Review, and Perspectives",
              "url": "https://arxiv.org/abs/2005.01643"
            },
            {
              "id": "p6b-tutorial:2",
              "kind": "video",
              "label": "CS285 lecture 15: Offline RL 1 (3 parts)",
              "url": "https://www.youtube.com/watch?v=NV4oSWe1H9o&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p6b-tutorial:3",
              "kind": "video",
              "label": "CS234 lecture 8: Offline RL 1",
              "url": "https://www.youtube.com/watch?v=IEbuJtjqtMU",
              "from": "p0-cs234",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p6b-bcq",
          "name": "BCQ",
          "title": "Off-Policy Deep RL without Exploration",
          "meta": "Fujimoto et al., ICML 2019",
          "tag": "track",
          "idea": "Names the distributional-shift / OOD-action problem.",
          "fwd": "CQL and IQL respond to it.",
          "resources": [
            {
              "id": "p6b-bcq:1",
              "kind": "paper",
              "label": "BCQ",
              "url": "https://arxiv.org/abs/1812.02900"
            }
          ]
        },
        {
          "id": "p6b-cql",
          "name": "CQL",
          "title": "Conservative Q-Learning",
          "meta": "Kumar et al., NeurIPS 2020",
          "tag": "track",
          "idea": "Penalise OOD-action Q-values to lower-bound the value.",
          "fwd": "Standard offline baseline.",
          "landmark": true,
          "resources": [
            {
              "id": "p6b-cql:1",
              "kind": "paper",
              "label": "Conservative Q-Learning",
              "url": "https://arxiv.org/abs/2006.04779"
            },
            {
              "id": "p6b-cql:2",
              "kind": "video",
              "label": "CS285 lecture 16: Offline RL 2 (4 parts)",
              "url": "https://www.youtube.com/watch?v=TCn26YClkCw&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p6b-iql",
          "name": "IQL",
          "title": "Offline RL with Implicit Q-Learning",
          "meta": "Kostrikov et al., ICLR 2022",
          "tag": "track",
          "idea": "Expectile regression avoids querying OOD actions entirely.",
          "fwd": "Offline-to-online fine-tuning.",
          "resources": [
            {
              "id": "p6b-iql:1",
              "kind": "paper",
              "label": "Implicit Q-Learning",
              "url": "https://arxiv.org/abs/2110.06169"
            }
          ]
        },
        {
          "id": "p6b-td3bc",
          "name": "TD3+BC",
          "title": "A Minimalist Approach to Offline RL",
          "meta": "Fujimoto & Gu, NeurIPS 2021",
          "tag": "track",
          "idea": "TD3 plus a behaviour-cloning term. Strong, trivially simple.",
          "fwd": "Sanity baseline for any offline paper.",
          "resources": [
            {
              "id": "p6b-td3bc:1",
              "kind": "paper",
              "label": "TD3+BC",
              "url": "https://arxiv.org/abs/2106.06860"
            }
          ]
        },
        {
          "id": "p6b-dt",
          "name": "Decision Transformer",
          "title": "Decision Transformer / Trajectory Transformer",
          "meta": "Chen et al., NeurIPS 2021; Janner et al., NeurIPS 2021",
          "tag": "track",
          "idea": "Recast offline RL as return-conditioned sequence modelling. DT is Essential, TT is Deeper.",
          "fwd": "The conceptual bridge from RL to sequence models and LLMs.",
          "resources": [
            {
              "id": "p6b-dt:1",
              "kind": "paper",
              "label": "Decision Transformer",
              "url": "https://arxiv.org/abs/2106.01345"
            },
            {
              "id": "p6b-dt:2",
              "kind": "paper",
              "label": "Trajectory Transformer",
              "url": "https://arxiv.org/abs/2106.02039"
            }
          ]
        },
        {
          "id": "p6b-o2o",
          "name": "Offline-to-online",
          "title": "Online Decision Transformer, IQL fine-tuning, D4RL",
          "meta": "ICML 2022; Fu et al. 2020",
          "tag": "reference",
          "idea": "Continue learning online from an offline start. D4RL is the benchmark.",
          "fwd": "Real-world and robotics deployment.",
          "resources": [
            {
              "id": "p6b-o2o:1",
              "kind": "paper",
              "label": "Online Decision Transformer",
              "url": "https://arxiv.org/abs/2202.05607"
            },
            {
              "id": "p6b-o2o:2",
              "kind": "paper",
              "label": "D4RL (paper)",
              "url": "https://arxiv.org/abs/2004.07219"
            },
            {
              "id": "p6b-o2o:3",
              "kind": "code",
              "label": "D4RL",
              "url": "https://github.com/Farama-Foundation/D4RL",
              "role": "optional"
            }
          ]
        }
      ]
    },
    {
      "id": "p6c",
      "name": "Imitation & inverse RL",
      "short": "Imitation",
      "phase": "Track 6C",
      "tfl": "bakerloo",
      "goal": "Learning from demonstrations and recovering rewards.",
      "track": true,
      "from": "p3-npg",
      "path": [
        [
          2197,
          1495
        ],
        [
          2470,
          1495
        ],
        [
          2600,
          1625
        ],
        [
          2900,
          1625
        ],
        [
          3030,
          1495
        ],
        [
          3250,
          1495
        ],
        {
          "through": "p7-details"
        }
      ],
      "snap": [
        [
          2380,
          1495
        ],
        [
          2650,
          1625
        ],
        [
          2850,
          1625
        ],
        [
          3080,
          1495
        ],
        [
          3250,
          1495
        ]
      ],
      "pill": {
        "at": 0.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p6c-bc",
          "name": "Behaviour cloning",
          "title": "Behavior cloning (ALVINN)",
          "meta": "Pomerleau, 1988",
          "tag": "core",
          "idea": "Supervised action prediction.",
          "fwd": "Baseline for all imitation.",
          "outcome": "Explain compounding error in behaviour cloning and why DAgger fixes it.",
          "landmark": true,
          "resources": [
            {
              "id": "p6c-bc:1",
              "kind": "paper",
              "label": "ALVINN (NeurIPS 1988)",
              "url": "https://proceedings.neurips.cc/paper/1988/hash/812b4ba287f5ee0bc9d43bbf5bbe87fb-Abstract.html"
            },
            {
              "id": "p6c-bc:2",
              "kind": "video",
              "label": "CS285 lecture 2: Imitation Learning (5 parts)",
              "url": "https://www.youtube.com/watch?v=tbLaFtYpWWU&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p6c-dagger",
          "name": "DAgger",
          "title": "DAgger",
          "meta": "Ross, Gordon & Bagnell, AISTATS 2011",
          "tag": "track",
          "idea": "Fixes compounding error in BC via interactive expert queries.",
          "fwd": "Interactive imitation.",
          "resources": [
            {
              "id": "p6c-dagger:1",
              "kind": "paper",
              "label": "DAgger",
              "url": "https://arxiv.org/abs/1011.0686"
            }
          ]
        },
        {
          "id": "p6c-maxent",
          "name": "MaxEnt IRL",
          "title": "Maximum Entropy IRL",
          "meta": "Ziebart et al., AAAI 2008",
          "tag": "track",
          "idea": "Recover a reward under which the expert is optimal, resolving ambiguity via max-entropy.",
          "fwd": "Max-ent underlies SAC and GAIL.",
          "resources": [
            {
              "id": "p6c-maxent:1",
              "kind": "paper",
              "label": "Maximum Entropy IRL (PDF)",
              "url": "https://cdn.aaai.org/AAAI/2008/AAAI08-227.pdf"
            },
            {
              "id": "p6c-maxent:2",
              "kind": "video",
              "label": "CS285 lecture 20: Inverse RL (4 parts)",
              "url": "https://www.youtube.com/watch?v=EcxpbhDeuZw&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p6c-maxent:3",
              "kind": "video",
              "label": "Bootcamp 10b: Inverse RL (Finn)",
              "url": "https://www.youtube.com/watch?v=d9DlQSJQAoI",
              "from": "p0-bootcamp",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p6c-gail",
          "name": "GAIL",
          "title": "Generative Adversarial Imitation Learning",
          "meta": "Ho & Ermon, NeurIPS 2016",
          "tag": "track",
          "idea": "Occupancy-measure matching as a GAN. Imitate without recovering the reward.",
          "fwd": "AIRL.",
          "landmark": true,
          "resources": [
            {
              "id": "p6c-gail:1",
              "kind": "paper",
              "label": "GAIL",
              "url": "https://arxiv.org/abs/1606.03476"
            }
          ]
        },
        {
          "id": "p6c-airl",
          "name": "AIRL",
          "title": "Adversarial IRL",
          "meta": "Fu, Luo & Levine, ICLR 2018",
          "tag": "reference",
          "idea": "Recovers a transferable, disentangled reward.",
          "fwd": "Reward transfer.",
          "resources": [
            {
              "id": "p6c-airl:1",
              "kind": "paper",
              "label": "AIRL",
              "url": "https://arxiv.org/abs/1710.11248"
            }
          ]
        }
      ]
    },
    {
      "id": "p6d",
      "name": "Hierarchical & goal-conditioned",
      "short": "Hierarchical",
      "phase": "Track 6D",
      "tfl": "jubilee",
      "goal": "Temporal abstraction and goals as inputs.",
      "track": true,
      "from": "p3-pgtheorem",
      "path": [
        [
          2262,
          1300
        ],
        [
          2530,
          1300
        ],
        [
          2660,
          1170
        ],
        [
          3090,
          1170
        ],
        [
          3220,
          1300
        ],
        {
          "through": "p7-rliable"
        },
        [
          3700,
          1300
        ],
        [
          3800,
          1400
        ]
      ],
      "snap": [
        [
          2470,
          1300
        ],
        [
          2760,
          1170
        ],
        [
          2950,
          1170
        ],
        [
          3260,
          1300
        ],
        [
          3600,
          1300
        ],
        [
          3800,
          1400
        ]
      ],
      "pill": {
        "at": 0.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p6d-options",
          "name": "Options",
          "title": "Between MDPs and semi-MDPs: the options framework",
          "meta": "Sutton, Precup & Singh, Artificial Intelligence 1999",
          "tag": "track",
          "idea": "Temporally extended actions. Foundational.",
          "fwd": "Option-Critic.",
          "landmark": true,
          "resources": [
            {
              "id": "p6d-options:1",
              "kind": "paper",
              "label": "Between MDPs and semi-MDPs",
              "url": "https://doi.org/10.1016/S0004-3702(99)00052-1"
            }
          ]
        },
        {
          "id": "p6d-oc",
          "name": "Option-Critic",
          "title": "The Option-Critic Architecture",
          "meta": "Bacon, Harb & Precup, AAAI 2017",
          "tag": "track",
          "idea": "Learn options end to end via a policy-gradient theorem for options.",
          "fwd": "End-to-end hierarchy.",
          "resources": [
            {
              "id": "p6d-oc:1",
              "kind": "paper",
              "label": "The Option-Critic Architecture",
              "url": "https://arxiv.org/abs/1609.05140"
            }
          ]
        },
        {
          "id": "p6d-fun",
          "name": "FeUdal Networks",
          "title": "FeUdal Networks (FuN)",
          "meta": "Vezhnevets et al., ICML 2017",
          "tag": "reference",
          "idea": "Manager sets latent goals for a worker at different time scales.",
          "fwd": "HIRO.",
          "resources": [
            {
              "id": "p6d-fun:1",
              "kind": "paper",
              "label": "FeUdal Networks",
              "url": "https://arxiv.org/abs/1703.01161"
            }
          ]
        },
        {
          "id": "p6d-hiro",
          "name": "HIRO",
          "title": "HIRO",
          "meta": "Nachum et al., NeurIPS 2018",
          "tag": "reference",
          "idea": "Data-efficient off-policy HRL with goal relabelling.",
          "fwd": "Off-policy hierarchy.",
          "resources": [
            {
              "id": "p6d-hiro:1",
              "kind": "paper",
              "label": "HIRO",
              "url": "https://arxiv.org/abs/1805.08296"
            }
          ]
        },
        {
          "id": "p6d-uvfa",
          "name": "UVFA",
          "title": "Universal Value Function Approximators",
          "meta": "Schaul et al., ICML 2015",
          "tag": "track",
          "idea": "Value functions generalised over goals.",
          "fwd": "HER.",
          "resources": [
            {
              "id": "p6d-uvfa:1",
              "kind": "paper",
              "label": "UVFA (ICML 2015)",
              "url": "https://proceedings.mlr.press/v37/schaul15.html"
            }
          ]
        },
        {
          "id": "p6d-her",
          "name": "HER",
          "title": "Hindsight Experience Replay",
          "meta": "Andrychowicz et al., NeurIPS 2017",
          "tag": "track",
          "idea": "Relabel failed trajectories with achieved goals to learn from sparse binary rewards.",
          "fwd": "A staple of goal-conditioned and robotic RL.",
          "landmark": true,
          "resources": [
            {
              "id": "p6d-her:1",
              "kind": "paper",
              "label": "Hindsight Experience Replay",
              "url": "https://arxiv.org/abs/1707.01495"
            }
          ]
        }
      ]
    },
    {
      "id": "p6e",
      "name": "Multi-agent & games",
      "short": "Multi-agent",
      "phase": "Track 6E",
      "tfl": "hammersmith",
      "goal": "Many learners, credit assignment, and self-play at scale.",
      "track": true,
      "from": "p3-impala",
      "path": [
        [
          1092,
          1560
        ],
        {
          "through": "p5-dpovariants"
        },
        [
          1092,
          1924
        ],
        [
          1196,
          2028
        ],
        [
          1420,
          2028
        ],
        [
          1550,
          2158
        ],
        [
          2050,
          2158
        ],
        [
          2176,
          2158
        ],
        {
          "through": "p6f-ad"
        }
      ],
      "snap": [
        [
          1240,
          2028
        ],
        [
          1380,
          2028
        ],
        [
          1620,
          2158
        ],
        [
          1770,
          2158
        ],
        [
          1910,
          2158
        ],
        [
          2040,
          2158
        ]
      ],
      "pill": {
        "at": 0.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p6e-iql",
          "name": "Independent Q",
          "title": "Independent Q-learning",
          "meta": "Tan, ICML 1993",
          "tag": "track",
          "idea": "The naive baseline and its non-stationarity problem.",
          "fwd": "Motivates CTDE.",
          "landmark": true,
          "resources": [
            {
              "id": "p6e-iql:1",
              "kind": "paper",
              "label": "Tan 1993, Multi-Agent RL: Independent vs Cooperative Agents (PDF)",
              "url": "https://web.media.mit.edu/~cynthiab/Readings/tan-MAS-reinfLearn.pdf"
            },
            {
              "id": "p6e-iql:2",
              "kind": "video",
              "label": "CS234 lecture 14: Multi-Agent Game Playing",
              "url": "https://www.youtube.com/watch?v=UgANzoWc0nc",
              "from": "p0-cs234",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p6e-maddpg",
          "name": "MADDPG",
          "title": "MADDPG",
          "meta": "Lowe et al., NeurIPS 2017",
          "tag": "track",
          "idea": "Centralised critic, decentralised actors for mixed cooperative and competitive continuous control.",
          "fwd": "The CTDE template.",
          "resources": [
            {
              "id": "p6e-maddpg:1",
              "kind": "paper",
              "label": "MADDPG",
              "url": "https://arxiv.org/abs/1706.02275"
            }
          ]
        },
        {
          "id": "p6e-qmix",
          "name": "VDN & QMIX",
          "title": "Value-Decomposition Networks / QMIX",
          "meta": "Sunehag et al., AAMAS 2018; Rashid et al., ICML 2018, JMLR 2020",
          "tag": "track",
          "idea": "Factor a joint value into per-agent utilities with a monotonic mixing net.",
          "fwd": "Cooperative credit assignment.",
          "landmark": true,
          "resources": [
            {
              "id": "p6e-qmix:1",
              "kind": "paper",
              "label": "VDN",
              "url": "https://arxiv.org/abs/1706.05296"
            },
            {
              "id": "p6e-qmix:2",
              "kind": "paper",
              "label": "QMIX (ICML 2018)",
              "url": "https://arxiv.org/abs/1803.11485"
            },
            {
              "id": "p6e-qmix:3",
              "kind": "paper",
              "label": "QMIX (JMLR 2020)",
              "url": "https://www.jmlr.org/papers/v21/20-081.html"
            }
          ]
        },
        {
          "id": "p6e-coma",
          "name": "COMA",
          "title": "Counterfactual Multi-Agent Policy Gradients",
          "meta": "Foerster et al., AAAI 2018",
          "tag": "reference",
          "idea": "Counterfactual baseline for credit assignment.",
          "fwd": "Policy-gradient MARL.",
          "resources": [
            {
              "id": "p6e-coma:1",
              "kind": "paper",
              "label": "COMA",
              "url": "https://arxiv.org/abs/1705.08926"
            }
          ]
        },
        {
          "id": "p6e-alphastar",
          "name": "AlphaStar & Five",
          "title": "AlphaStar / OpenAI Five",
          "meta": "Vinyals et al., Nature 2019; OpenAI, arXiv 2019",
          "tag": "track",
          "idea": "League self-play plus large-scale PPO and IMPALA at professional level. Read for the scaling story.",
          "fwd": "Large-scale self-play.",
          "resources": [
            {
              "id": "p6e-alphastar:1",
              "kind": "paper",
              "label": "AlphaStar (Nature 2019)",
              "url": "https://doi.org/10.1038/s41586-019-1724-z"
            },
            {
              "id": "p6e-alphastar:2",
              "kind": "paper",
              "label": "OpenAI Five",
              "url": "https://arxiv.org/abs/1912.06680"
            }
          ]
        },
        {
          "id": "p6e-cfr",
          "name": "CFR & PSRO",
          "title": "Counterfactual Regret Minimization / PSRO",
          "meta": "Zinkevich et al., NeurIPS 2007; Lanctot et al., NeurIPS 2017",
          "tag": "reference",
          "idea": "Game-theoretic RL. CFR is the basis of superhuman poker. Nash and self-play concepts.",
          "fwd": "Equilibrium-seeking learning.",
          "resources": [
            {
              "id": "p6e-cfr:1",
              "kind": "paper",
              "label": "Regret Minimization in Games with Incomplete Information (CFR)",
              "url": "https://papers.nips.cc/paper_files/paper/2007/hash/08d98638c6fcd194a4b1e6992063e944-Abstract.html"
            },
            {
              "id": "p6e-cfr:2",
              "kind": "paper",
              "label": "PSRO",
              "url": "https://arxiv.org/abs/1711.00832"
            }
          ]
        }
      ]
    },
    {
      "id": "p6f",
      "name": "Meta-RL & generalisation",
      "short": "Meta-RL",
      "phase": "Track 6F",
      "tfl": "waterloo",
      "goal": "Learning to learn and in-context RL.",
      "track": true,
      "from": "p3-trpo",
      "path": [
        [
          1612,
          1560
        ],
        {
          "through": "p5-rlvr"
        },
        [
          1612,
          1820
        ],
        [
          1716,
          1924
        ],
        [
          2100,
          1924
        ],
        [
          2230,
          2054
        ],
        [
          2410,
          2054
        ]
      ],
      "snap": [
        [
          1790,
          1924
        ],
        [
          1930,
          1924
        ],
        [
          2070,
          1924
        ],
        [
          2280,
          2054
        ],
        [
          2410,
          2054
        ]
      ],
      "pill": {
        "at": 0.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p6f-rl2",
          "name": "RL²",
          "title": "RL² / Learning to RL",
          "meta": "Duan et al., 2016; Wang et al., 2016",
          "tag": "track",
          "idea": "Encode a fast RL algorithm in an RNN's activations.",
          "fwd": "The direct ancestor of in-context RL.",
          "landmark": true,
          "resources": [
            {
              "id": "p6f-rl2:1",
              "kind": "paper",
              "label": "RL²",
              "url": "https://arxiv.org/abs/1611.02779"
            },
            {
              "id": "p6f-rl2:2",
              "kind": "paper",
              "label": "Learning to Reinforcement Learn",
              "url": "https://arxiv.org/abs/1611.05763"
            },
            {
              "id": "p6f-rl2:3",
              "kind": "video",
              "label": "CS285 lecture 22: Transfer Learning and Meta-Learning (5 parts)",
              "url": "https://www.youtube.com/watch?v=y1BKW2PN4pU&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p6f-maml",
          "name": "MAML",
          "title": "Model-Agnostic Meta-Learning",
          "meta": "Finn, Abbeel & Levine, ICML 2017",
          "tag": "track",
          "idea": "Meta-learn an initialisation for fast adaptation. Applies to RL.",
          "fwd": "Gradient-based meta-RL.",
          "landmark": true,
          "resources": [
            {
              "id": "p6f-maml:1",
              "kind": "paper",
              "label": "MAML",
              "url": "https://arxiv.org/abs/1703.03400"
            }
          ]
        },
        {
          "id": "p6f-pearl",
          "name": "PEARL",
          "title": "PEARL",
          "meta": "Rakelly et al., ICML 2019",
          "tag": "track",
          "idea": "Off-policy meta-RL via probabilistic task-context inference on top of SAC.",
          "fwd": "Sample-efficient meta-RL.",
          "resources": [
            {
              "id": "p6f-pearl:1",
              "kind": "paper",
              "label": "PEARL",
              "url": "https://arxiv.org/abs/1903.08254"
            }
          ]
        },
        {
          "id": "p6f-ad",
          "name": "Algorithm Distillation",
          "title": "Algorithm Distillation",
          "meta": "Laskin et al., ICLR 2023",
          "tag": "reference",
          "idea": "Distil an RL algorithm's learning history into a transformer that improves in context.",
          "fwd": "Connects meta-RL to LLM in-context learning.",
          "resources": [
            {
              "id": "p6f-ad:1",
              "kind": "paper",
              "label": "Algorithm Distillation",
              "url": "https://arxiv.org/abs/2210.14215"
            }
          ]
        },
        {
          "id": "p6f-procgen",
          "name": "Procgen",
          "title": "Procgen benchmark",
          "meta": "Cobbe et al., ICML 2020",
          "tag": "track",
          "idea": "Procedurally generated environments for measuring generalisation.",
          "fwd": "Standard generalisation benchmark.",
          "resources": [
            {
              "id": "p6f-procgen:1",
              "kind": "paper",
              "label": "Procgen benchmark (paper)",
              "url": "https://arxiv.org/abs/1912.01588"
            },
            {
              "id": "p6f-procgen:2",
              "kind": "code",
              "label": "Procgen",
              "url": "https://github.com/openai/procgen",
              "role": "optional"
            }
          ]
        }
      ]
    },
    {
      "id": "p6g",
      "name": "Representation learning",
      "short": "Representation",
      "phase": "Track 6G",
      "tfl": "dlr",
      "goal": "Auxiliary tasks and augmentation for pixel RL.",
      "track": true,
      "from": "p3-sac",
      "path": [
        [
          598,
          1560
        ],
        {
          "through": "p5-ziegler"
        },
        [
          598,
          1742
        ],
        [
          468,
          1872
        ],
        [
          260,
          1872
        ],
        [
          130,
          1742
        ],
        [
          -100,
          1742
        ]
      ],
      "snap": [
        [
          430,
          1872
        ],
        [
          290,
          1872
        ],
        [
          60,
          1742
        ],
        [
          -100,
          1742
        ]
      ],
      "pill": {
        "at": 0.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p6g-unreal",
          "name": "UNREAL",
          "title": "RL with Unsupervised Auxiliary Tasks",
          "meta": "Jaderberg et al., ICLR 2017",
          "tag": "track",
          "idea": "Auxiliary prediction and control tasks accelerate RL.",
          "fwd": "Auxiliary losses everywhere.",
          "landmark": true,
          "resources": [
            {
              "id": "p6g-unreal:1",
              "kind": "paper",
              "label": "UNREAL",
              "url": "https://arxiv.org/abs/1611.05397"
            }
          ]
        },
        {
          "id": "p6g-curl",
          "name": "CURL",
          "title": "CURL",
          "meta": "Srinivas, Laskin & Abbeel, ICML 2020",
          "tag": "track",
          "idea": "Contrastive auxiliary loss for pixel RL.",
          "fwd": "The CURL vs RAD debate.",
          "resources": [
            {
              "id": "p6g-curl:1",
              "kind": "paper",
              "label": "CURL",
              "url": "https://arxiv.org/abs/2004.04136"
            }
          ]
        },
        {
          "id": "p6g-drq",
          "name": "RAD & DrQ",
          "title": "RAD / DrQ / DrQ-v2",
          "meta": "Laskin et al., NeurIPS 2020; Yarats et al., ICLR 2021; arXiv 2021",
          "tag": "track",
          "idea": "Simple image augmentation alone gives most of the benefit. DrQ-v2 first solves humanoid from pixels model-free. Read DrQ.",
          "fwd": "Augmentation, not the contrastive loss, drives gains.",
          "landmark": true,
          "resources": [
            {
              "id": "p6g-drq:1",
              "kind": "paper",
              "label": "RAD",
              "url": "https://arxiv.org/abs/2004.14990"
            },
            {
              "id": "p6g-drq:2",
              "kind": "paper",
              "label": "DrQ",
              "url": "https://arxiv.org/abs/2004.13649"
            },
            {
              "id": "p6g-drq:3",
              "kind": "paper",
              "label": "DrQ-v2",
              "url": "https://arxiv.org/abs/2107.09645"
            }
          ]
        },
        {
          "id": "p6g-spr",
          "name": "SPR",
          "title": "Self-Predictive Representations",
          "meta": "Schwarzer et al., ICLR 2021",
          "tag": "track",
          "idea": "Self-supervised latent-dynamics prediction for data-efficient Atari.",
          "fwd": "Feeds into BBF.",
          "resources": [
            {
              "id": "p6g-spr:1",
              "kind": "paper",
              "label": "SPR",
              "url": "https://arxiv.org/abs/2007.05929"
            }
          ]
        }
      ]
    },
    {
      "id": "p6h",
      "name": "Robotics & sim-to-real",
      "short": "Robotics",
      "phase": "Track 6H",
      "tfl": "tram",
      "goal": "If the thesis is embodied.",
      "track": true,
      "from": "p3-ppo",
      "path": [
        [
          1430,
          1560
        ],
        {
          "through": "p0-cs234"
        },
        {
          "through": "p1-nstep"
        },
        {
          "through": "p0-cs285"
        },
        {
          "through": "p2-qrdqn"
        },
        {
          "through": "p4-dreamerv3"
        }
      ],
      "snap": [
        [
          1430,
          1469
        ],
        [
          1430,
          1183
        ],
        [
          1430,
          793
        ]
      ],
      "pill": {
        "x": 1472,
        "y": 1300,
        "anchor": "start"
      },
      "stations": [
        {
          "id": "p6h-domrand",
          "name": "Domain randomisation",
          "title": "Domain Randomization",
          "meta": "Tobin et al., IROS 2017",
          "tag": "track",
          "idea": "Randomise the simulator to bridge to reality.",
          "fwd": "Automatic domain randomisation.",
          "landmark": true,
          "resources": [
            {
              "id": "p6h-domrand:1",
              "kind": "paper",
              "label": "Domain Randomization",
              "url": "https://arxiv.org/abs/1703.06907"
            }
          ]
        },
        {
          "id": "p6h-rubik",
          "name": "Rubik's Cube",
          "title": "Solving Rubik's Cube with a Robot Hand",
          "meta": "OpenAI, arXiv 2019",
          "tag": "reference",
          "idea": "Sim-to-real plus automatic domain randomisation.",
          "fwd": "Large-scale sim-to-real.",
          "resources": [
            {
              "id": "p6h-rubik:1",
              "kind": "paper",
              "label": "Solving Rubik's Cube with a Robot Hand",
              "url": "https://arxiv.org/abs/1910.07113"
            }
          ]
        },
        {
          "id": "p6h-daydreamer",
          "name": "DayDreamer",
          "title": "DayDreamer: World Models for Physical Robot Learning",
          "meta": "Wu et al., CoRL 2023. Simulators: MuJoCo, DM Control, Isaac Gym, Isaac Lab",
          "tag": "reference",
          "idea": "Dreamer on real robots.",
          "fwd": "World models in the physical world.",
          "resources": [
            {
              "id": "p6h-daydreamer:1",
              "kind": "paper",
              "label": "DayDreamer",
              "url": "https://arxiv.org/abs/2206.14176"
            },
            {
              "id": "p6h-daydreamer:2",
              "kind": "code",
              "label": "Isaac Lab",
              "url": "https://github.com/isaac-sim/IsaacLab",
              "role": "optional"
            },
            {
              "id": "p6h-daydreamer:3",
              "kind": "code",
              "label": "DM Control",
              "url": "https://github.com/google-deepmind/dm_control",
              "role": "optional"
            }
          ]
        }
      ]
    },
    {
      "id": "p5",
      "name": "RL for LLMs & reasoning",
      "short": "LLM RL",
      "phase": "Phase 5",
      "tfl": "elizabeth",
      "goal": "Preference-based RL, RLHF, direct alignment and verifiable-reward reasoning RL. InstructGPT, DPO and GRPO are core; the rest is a specialisation, not a prerequisite for other tracks.",
      "track": true,
      "from": "p3-x-continuous",
      "path": [
        [
          390,
          1560
        ],
        [
          520,
          1690
        ],
        [
          1820,
          1690
        ],
        [
          1898,
          1768
        ],
        [
          2730,
          1768
        ],
        [
          2808,
          1690
        ],
        [
          2990,
          1690
        ]
      ],
      "snap": [
        [
          494,
          1664
        ],
        [
          598,
          1690
        ],
        [
          780,
          1690
        ],
        [
          949,
          1690
        ],
        [
          1092,
          1690
        ],
        [
          1196,
          1690
        ],
        [
          1300,
          1690
        ],
        [
          1404,
          1690
        ],
        [
          1612,
          1690
        ],
        [
          1742,
          1690
        ],
        [
          1950,
          1768
        ],
        [
          2106,
          1768
        ],
        [
          2262,
          1768
        ],
        [
          2418,
          1768
        ],
        [
          2574,
          1768
        ],
        [
          2704,
          1768
        ],
        [
          2782,
          1716
        ],
        [
          2990,
          1690
        ]
      ],
      "pill": {
        "at": 9.5,
        "side": "below"
      },
      "stations": [
        {
          "id": "p5-christiano",
          "name": "RL from preferences",
          "title": "Deep RL from Human Preferences",
          "meta": "Christiano et al., NeurIPS 2017",
          "tag": "track",
          "idea": "Learn a reward model from pairwise trajectory comparisons, then optimise with RL. The intellectual root of RLHF.",
          "fwd": "Everything on this line.",
          "landmark": true,
          "resources": [
            {
              "id": "p5-christiano:1",
              "kind": "paper",
              "label": "Deep RL from Human Preferences",
              "url": "https://arxiv.org/abs/1706.03741"
            }
          ]
        },
        {
          "id": "p5-ziegler",
          "name": "Ziegler & Stiennon",
          "title": "Fine-Tuning LMs from Human Preferences / Learning to Summarize from Human Feedback",
          "meta": "Ziegler et al., 2019; Stiennon et al., NeurIPS 2020",
          "tag": "track",
          "idea": "RLHF applied to language models. Skim Ziegler, read Stiennon.",
          "fwd": "InstructGPT.",
          "resources": [
            {
              "id": "p5-ziegler:1",
              "kind": "paper",
              "label": "Fine-Tuning Language Models from Human Preferences",
              "url": "https://arxiv.org/abs/1909.08593"
            },
            {
              "id": "p5-ziegler:2",
              "kind": "paper",
              "label": "Learning to Summarize from Human Feedback",
              "url": "https://arxiv.org/abs/2009.01325"
            }
          ]
        },
        {
          "id": "p5-instructgpt",
          "name": "InstructGPT",
          "title": "Training language models to follow instructions with human feedback",
          "meta": "Ouyang et al., NeurIPS 2022",
          "tag": "core",
          "idea": "The three-stage recipe: SFT, reward model, PPO. Non-negotiable.",
          "fwd": "The template behind ChatGPT and all subsequent LLM RL.",
          "outcome": "Draw the three-stage pipeline and say what data each stage needs.",
          "landmark": true,
          "resources": [
            {
              "id": "p5-instructgpt:1",
              "kind": "paper",
              "label": "InstructGPT",
              "url": "https://arxiv.org/abs/2203.02155"
            },
            {
              "id": "p5-instructgpt:2",
              "kind": "video",
              "label": "CS285 lecture 21: RL with Sequence Models and Language Models (3 parts)",
              "url": "https://www.youtube.com/watch?v=egJgDbe5oaM&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "optional"
            }
          ]
        },
        {
          "id": "p5-dpo",
          "name": "DPO",
          "title": "Direct Preference Optimization",
          "meta": "Rafailov et al., NeurIPS 2023",
          "tag": "core",
          "idea": "Reparameterise the RLHF objective so the LM is its own reward model. A simple supervised loss, no RL loop. Non-negotiable.",
          "fwd": "Spawned the direct-alignment family.",
          "outcome": "Explain how DPO removes the reward model and the RL loop, and what it gives up.",
          "landmark": true,
          "resources": [
            {
              "id": "p5-dpo:1",
              "kind": "paper",
              "label": "Direct Preference Optimization",
              "url": "https://arxiv.org/abs/2305.18290"
            },
            {
              "id": "p5-dpo:2",
              "kind": "video",
              "label": "CS285 guest lecture: Eric Mitchell on RLHF",
              "url": "https://www.youtube.com/watch?v=BqZC7mDSbIg&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285",
              "role": "pick"
            },
            {
              "id": "p5-dpo:3",
              "kind": "video",
              "label": "CS234 lecture 9: Guest lecture on DPO (Rafailov, Sharma, Mitchell)",
              "url": "https://www.youtube.com/watch?v=Q7rl8ovBWwQ",
              "from": "p0-cs234",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p5-dpovariants",
          "name": "DPO variants",
          "title": "DPO variants",
          "meta": "Azar et al., AISTATS 2024; Ethayarajh et al., 2024; Hong et al., 2024; Meng et al., NeurIPS 2024",
          "tag": "track",
          "idea": "IPO (squared loss), KTO (prospect theory, unpaired signals), ORPO (reference-free, folds SFT in), SimPO (length-normalised reference-free reward). Know the landscape, read 2–3.",
          "fwd": "The standard cheap-alignment toolkit.",
          "pick": 2,
          "resources": [
            {
              "id": "p5-dpovariants:1",
              "kind": "paper",
              "label": "IPO",
              "url": "https://arxiv.org/abs/2310.12036",
              "role": "pick"
            },
            {
              "id": "p5-dpovariants:2",
              "kind": "paper",
              "label": "KTO",
              "url": "https://arxiv.org/abs/2402.01306",
              "role": "pick"
            },
            {
              "id": "p5-dpovariants:3",
              "kind": "paper",
              "label": "ORPO",
              "url": "https://arxiv.org/abs/2403.07691",
              "role": "pick"
            },
            {
              "id": "p5-dpovariants:4",
              "kind": "paper",
              "label": "SimPO",
              "url": "https://arxiv.org/abs/2405.14734",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p5-x-reward",
          "name": "Reward model",
          "title": "Preferences into a policy, twice",
          "meta": "Deliverable: two runs, one comparison",
          "tag": "exercise",
          "idea": "Train a small reward model on a preference dataset and report its held-out accuracy, then run DPO on the same preferences and compare both against the SFT baseline under one evaluation.",
          "fwd": "The two halves of alignment practice, on a scale you can iterate on.",
          "outcome": "Say what preference data does and does not encode, having fit it two different ways.",
          "prereqs": [
            "p5-dpo"
          ],
          "deliverables": [
            {
              "id": "p5-x-reward:d1",
              "label": "A small reward model with held-out pairwise accuracy reported"
            },
            {
              "id": "p5-x-reward:d2",
              "label": "DPO run on the same preference data with a small instruct model"
            },
            {
              "id": "p5-x-reward:d3",
              "label": "Both compared against the SFT baseline under one stated evaluation"
            },
            {
              "id": "p5-x-reward:d4",
              "label": "A paragraph on what the preference data failed to encode"
            }
          ],
          "resources": [
            {
              "id": "p5-x-reward:1",
              "kind": "code",
              "label": "TRL",
              "url": "https://github.com/huggingface/trl"
            }
          ]
        },
        {
          "id": "p5-grpo",
          "name": "GRPO",
          "title": "DeepSeekMath (introduces GRPO)",
          "meta": "Shao et al., arXiv 2402.03300, 2024",
          "tag": "core",
          "idea": "Drop PPO's critic. Sample a group of responses per prompt and use group-relative rewards as the baseline. Non-negotiable.",
          "fwd": "The algorithm behind DeepSeek-R1 and the default for reasoning RL.",
          "outcome": "Write GRPO's advantage and say exactly what it replaces in PPO.",
          "landmark": true,
          "prereqs": [
            "p3-ppo"
          ],
          "resources": [
            {
              "id": "p5-grpo:1",
              "kind": "paper",
              "label": "DeepSeekMath (GRPO)",
              "url": "https://arxiv.org/abs/2402.03300"
            }
          ]
        },
        {
          "id": "p5-r1",
          "name": "DeepSeek-R1",
          "title": "DeepSeek-R1",
          "meta": "DeepSeek-AI, arXiv 2501.12948, Jan 2025",
          "tag": "track",
          "idea": "Large-scale RL with verifiable rewards elicits emergent long chain-of-thought reasoning. R1-Zero uses pure RL with no SFT: AIME 2024 pass@1 from 15.6% to 71.0%.",
          "fwd": "Triggered the 2025 RLVR explosion.",
          "landmark": true,
          "resources": [
            {
              "id": "p5-r1:1",
              "kind": "paper",
              "label": "DeepSeek-R1",
              "url": "https://arxiv.org/abs/2501.12948"
            }
          ]
        },
        {
          "id": "p5-rlvr",
          "name": "RLVR",
          "title": "RL with Verifiable Rewards",
          "meta": "Term popularised by Lambert et al., Tülu 3, 2024",
          "tag": "track",
          "idea": "Use automatically checkable correctness (math answer, unit tests) as reward.",
          "fwd": "The concept behind every reasoning-RL recipe.",
          "resources": [
            {
              "id": "p5-rlvr:1",
              "kind": "paper",
              "label": "Tülu 3",
              "url": "https://arxiv.org/abs/2411.15124"
            }
          ]
        },
        {
          "id": "p5-o1",
          "name": "OpenAI o1",
          "title": "Learning to Reason with LLMs",
          "meta": "OpenAI blog, Sept 2024, no method paper",
          "tag": "track",
          "idea": "Established inference-time-scaling reasoning RL. Method details undisclosed. Treat claims as company-reported.",
          "fwd": "Context for R1 and the 2025 recipes.",
          "resources": [
            {
              "id": "p5-o1:1",
              "kind": "blog",
              "label": "Learning to Reason with LLMs",
              "url": "https://openai.com/index/learning-to-reason-with-llms/"
            }
          ]
        },
        {
          "id": "p5-kimi",
          "name": "Kimi k1.5",
          "title": "Kimi k1.5: Scaling RL with LLMs",
          "meta": "Kimi Team, arXiv 2501.12599, 2025",
          "tag": "reference",
          "idea": "A full RL-scaling recipe emphasising long context and simplified policy optimisation. Deliberately no MCTS, value functions or PRMs.",
          "fwd": "Excellent contrast to R1.",
          "resources": [
            {
              "id": "p5-kimi:1",
              "kind": "paper",
              "label": "Kimi k1.5",
              "url": "https://arxiv.org/abs/2501.12599"
            }
          ]
        },
        {
          "id": "p5-dapo",
          "name": "DAPO",
          "title": "DAPO",
          "meta": "Yu et al., ByteDance Seed + Tsinghua, arXiv 2503.14476, 2025",
          "tag": "track",
          "idea": "Four fixes over GRPO: Clip-Higher, Dynamic Sampling, token-level loss, overlong-reward shaping. 50 on AIME 2024 with Qwen2.5-32B in half the steps.",
          "fwd": "As of the 2025 papers on this line, the strongest fully open recipe. Re-check before relying on it.",
          "landmark": true,
          "resources": [
            {
              "id": "p5-dapo:1",
              "kind": "paper",
              "label": "DAPO",
              "url": "https://arxiv.org/abs/2503.14476"
            }
          ]
        },
        {
          "id": "p5-drgrpo",
          "name": "Dr. GRPO",
          "title": "Dr. GRPO",
          "meta": "Liu et al., Sea AI Lab / NUS, COLM 2025",
          "tag": "track",
          "idea": "Removes GRPO's length and std normalisation bias that inflates wrong-answer length. Short and clarifying.",
          "fwd": "Fixes a subtle bias in every GRPO implementation.",
          "resources": [
            {
              "id": "p5-drgrpo:1",
              "kind": "paper",
              "label": "Dr. GRPO (Understanding R1-Zero-Like Training)",
              "url": "https://arxiv.org/abs/2503.20783"
            }
          ]
        },
        {
          "id": "p5-gspo",
          "name": "GSPO",
          "title": "Group Sequence Policy Optimization",
          "meta": "Zheng et al., Qwen Team, arXiv 2507.18071, 2025",
          "tag": "reference",
          "idea": "Sequence-level rather than token-level importance ratios. Stabilises MoE RL. Used in Qwen3.",
          "fwd": "Stable RL at MoE scale.",
          "resources": [
            {
              "id": "p5-gspo:1",
              "kind": "paper",
              "label": "GSPO",
              "url": "https://arxiv.org/abs/2507.18071"
            }
          ]
        },
        {
          "id": "p5-vapo",
          "name": "VAPO",
          "title": "VAPO",
          "meta": "Yue et al., ByteDance Seed, arXiv 2504.05118, 2025",
          "tag": "reference",
          "idea": "Value-based augmented PPO with length-adaptive GAE. 60.4 on AIME 2024 within about 5,000 steps. The critics-are-not-dead counterpoint.",
          "fwd": "Open question: do critics beat critic-free at scale?",
          "resources": [
            {
              "id": "p5-vapo:1",
              "kind": "paper",
              "label": "VAPO",
              "url": "https://arxiv.org/abs/2504.05118"
            }
          ]
        },
        {
          "id": "p5-prm",
          "name": "Process rewards",
          "title": "Let's Verify Step by Step / Math-Shepherd",
          "meta": "Lightman et al., 2023; Wang et al., ACL 2024",
          "tag": "track",
          "idea": "Step-level supervision beats outcome supervision on MATH, releases PRM800K. Math-Shepherd automates per-step rewards via Monte-Carlo rollouts (Deeper).",
          "fwd": "Process vs outcome rewards is an open thesis question.",
          "resources": [
            {
              "id": "p5-prm:1",
              "kind": "paper",
              "label": "Let's Verify Step by Step",
              "url": "https://arxiv.org/abs/2305.20050"
            },
            {
              "id": "p5-prm:2",
              "kind": "paper",
              "label": "Math-Shepherd",
              "url": "https://arxiv.org/abs/2312.08935"
            }
          ]
        },
        {
          "id": "p5-agentic",
          "name": "Agentic RL",
          "title": "The Landscape of Agentic RL for LLMs: A Survey",
          "meta": "Zhang et al., arXiv 2509.02547, 2025; TMLR 2026. Plus ToRL, ToolRL, VerlTool, A Practitioner's Guide to Multi-turn Agentic RL",
          "tag": "track",
          "idea": "Frames agentic RL as temporally extended POMDPs and catalogues 500+ works. Survey is Essential, individual papers are Deeper.",
          "fwd": "The direction LLM RL was moving in through 2025-2026, and a plausible thesis area. Treat it as a snapshot, not a forecast.",
          "pick": 2,
          "resources": [
            {
              "id": "p5-agentic:1",
              "kind": "paper",
              "label": "The Landscape of Agentic RL for LLMs",
              "url": "https://arxiv.org/abs/2509.02547"
            },
            {
              "id": "p5-agentic:2",
              "kind": "paper",
              "label": "ToRL",
              "url": "https://arxiv.org/abs/2503.23383",
              "role": "pick"
            },
            {
              "id": "p5-agentic:3",
              "kind": "paper",
              "label": "ToolRL",
              "url": "https://arxiv.org/abs/2504.13958",
              "role": "pick"
            },
            {
              "id": "p5-agentic:4",
              "kind": "paper",
              "label": "VerlTool",
              "url": "https://arxiv.org/abs/2509.01055",
              "role": "pick"
            },
            {
              "id": "p5-agentic:5",
              "kind": "paper",
              "label": "A Practitioner's Guide to Multi-turn Agentic RL",
              "url": "https://arxiv.org/abs/2510.01132",
              "role": "pick"
            }
          ]
        },
        {
          "id": "p5-x-grpo",
          "name": "Run GRPO",
          "title": "GRPO on a verifiable task",
          "meta": "Deliverable: a run, an ablation, a noise check",
          "tag": "exercise",
          "idea": "Run GRPO on a small model with a rule-based reward, then ablate one DAPO trick and check whether its effect is bigger than the seed noise. Keep the model small enough to iterate in a day.",
          "fwd": "The smallest honest version of the experiment the whole LLM RL line is about.",
          "outcome": "Run a reasoning-RL experiment and tell a real effect apart from run-to-run variation.",
          "prereqs": [
            "p5-grpo"
          ],
          "deliverables": [
            {
              "id": "p5-x-grpo:d1",
              "label": "GRPO on a model of 1.5B parameters or fewer, with a rule-based reward on a GSM8K-style task"
            },
            {
              "id": "p5-x-grpo:d2",
              "label": "Reward and response-length curves, with the interaction budget stated"
            },
            {
              "id": "p5-x-grpo:d3",
              "label": "One DAPO trick ablated, with at least 3 seeds per arm"
            },
            {
              "id": "p5-x-grpo:d4",
              "label": "A paragraph on whether the ablation's effect exceeds the seed noise"
            }
          ],
          "resources": [
            {
              "id": "p5-x-grpo:1",
              "kind": "site",
              "label": "verl GRPO guide",
              "url": "https://verl.readthedocs.io/en/latest/algo/grpo.html"
            },
            {
              "id": "p5-x-grpo:2",
              "kind": "site",
              "label": "TRL GRPO Trainer",
              "url": "https://huggingface.co/docs/trl/grpo_trainer"
            }
          ]
        }
      ]
    },
    {
      "id": "pd",
      "name": "Distributed & scale",
      "short": "Scale",
      "phase": "Phase 7B",
      "tfl": "liberty",
      "goal": "Throughput, for when a project genuinely needs it. Reference material: come back when your protocol asks for more runs than your machine can deliver.",
      "track": true,
      "from": "p7-stats",
      "path": [
        [
          2925,
          481
        ],
        [
          2925,
          286
        ],
        [
          3055,
          156
        ],
        [
          3600,
          156
        ]
      ],
      "snap": [
        [
          2925,
          338
        ],
        [
          3120,
          156
        ],
        [
          3400,
          156
        ]
      ],
      "pill": {
        "at": 1.5,
        "side": "above"
      },
      "stations": [
        {
          "id": "p7-apex",
          "name": "Ape-X",
          "title": "Distributed Prioritized Experience Replay",
          "meta": "Horgan et al., ICLR 2018",
          "tag": "track",
          "idea": "Hundreds of actors, one shared prioritised buffer, one learner. It assumes prioritised replay: read PER (Value-based deep RL) first if you have not.",
          "fwd": "The distributed-RL mental model.",
          "landmark": true,
          "resources": [
            {
              "id": "p7-apex:0",
              "kind": "paper",
              "label": "Prioritized Experience Replay (assumed)",
              "url": "https://arxiv.org/abs/1511.05952",
              "role": "optional"
            },
            {
              "id": "p7-apex:1",
              "kind": "paper",
              "label": "Ape-X",
              "url": "https://arxiv.org/abs/1803.00933"
            }
          ]
        },
        {
          "id": "p7-seed",
          "name": "SEED RL",
          "title": "SEED RL",
          "meta": "Espeholt et al., ICLR 2020",
          "tag": "reference",
          "idea": "Centralised accelerator-side inference for throughput far above IMPALA.",
          "fwd": "Modern distributed RL infra.",
          "resources": [
            {
              "id": "p7-seed:1",
              "kind": "paper",
              "label": "SEED RL",
              "url": "https://arxiv.org/abs/1910.06591"
            }
          ]
        },
        {
          "id": "pd-vector",
          "name": "Vectorised envs",
          "title": "Vectorised, compiled and asynchronous environments",
          "meta": "Where the throughput actually comes from",
          "tag": "track",
          "idea": "Most 'distributed RL' at small scale is really vectorisation: batching environments, moving the step loop onto the accelerator, or decoupling actors from learners. Know the options before you reach for a cluster.",
          "fwd": "The cheapest way to buy the seeds your protocol needs.",
          "resources": [
            {
              "id": "pd-vector:1",
              "kind": "paper",
              "label": "EnvPool: a highly parallel environment execution engine",
              "url": "https://arxiv.org/abs/2206.10558"
            },
            {
              "id": "pd-vector:2",
              "kind": "paper",
              "label": "Sample Factory",
              "url": "https://arxiv.org/abs/2006.11751",
              "role": "optional"
            },
            {
              "id": "pd-vector:3",
              "kind": "code",
              "label": "PureJaxRL",
              "url": "https://github.com/luchris429/purejaxrl",
              "role": "optional"
            }
          ]
        }
      ]
    },
    {
      "id": "p8",
      "name": "Theory essentials",
      "short": "Theory",
      "phase": "Phase 8",
      "tfl": "northern",
      "goal": "Where the guarantees come from. Bandit regret is on the Foundations line, where it is read early; this line is the depth behind it, taken to taste.",
      "track": true,
      "path": [
        [
          806,
          156
        ],
        {
          "through": "p4-worldmodels"
        },
        {
          "through": "p2-ngu"
        },
        {
          "through": "p0-silver"
        },
        {
          "through": "p1-td"
        },
        {
          "through": "p0-refs"
        },
        {
          "through": "p3-td3"
        },
        {
          "through": "p5-instructgpt"
        },
        [
          806,
          1846
        ]
      ],
      "snap": [
        [
          806,
          507
        ],
        [
          806,
          793
        ],
        [
          806,
          1183
        ],
        [
          806,
          1846
        ]
      ],
      "pill": {
        "x": 848,
        "y": 1300,
        "anchor": "start"
      },
      "stations": [
        {
          "id": "p8-szepesvari",
          "name": "Szepesvári",
          "title": "Algorithms for Reinforcement Learning",
          "meta": "Szepesvári, 2010",
          "tag": "track",
          "idea": "Compact, rigorous overview of core algorithms and their analysis.",
          "fwd": "Reference.",
          "resources": [
            {
              "id": "p8-szepesvari:1",
              "kind": "book",
              "label": "Algorithms for Reinforcement Learning",
              "url": "https://sites.ualberta.ca/~szepesva/rlbook.html"
            }
          ]
        },
        {
          "id": "p8-monograph",
          "name": "Theory monograph",
          "title": "Reinforcement Learning: Theory and Algorithms",
          "meta": "Agarwal, Jiang, Kakade & Sun, working monograph 2019–2022",
          "tag": "track",
          "idea": "Sample complexity, PAC-MDP, policy-gradient convergence, exploration theory.",
          "fwd": "The modern theory reference.",
          "landmark": true,
          "resources": [
            {
              "id": "p8-monograph:1",
              "kind": "book",
              "label": "RL: Theory and Algorithms",
              "url": "https://rltheorybook.github.io/"
            },
            {
              "id": "p8-monograph:2",
              "kind": "video",
              "label": "CS285 lecture 17: RL Theory (2 parts)",
              "url": "https://www.youtube.com/watch?v=o1dB2xDcCuo&list=PL_iWQOsE6TfVYGEGiAOMaOzzv41Jfm_Ps",
              "from": "p0-cs285"
            }
          ]
        },
        {
          "id": "p8-tdconv",
          "name": "TD convergence",
          "title": "Convergence of TD and Q-learning",
          "meta": "Tsitsiklis & Van Roy 1997; Jaakkola, Jordan & Singh 1994",
          "tag": "reference",
          "idea": "TD with function approximation and stochastic-approximation convergence.",
          "fwd": "Why the deadly triad bites.",
          "resources": [
            {
              "id": "p8-tdconv:1",
              "kind": "paper",
              "label": "Tsitsiklis & Van Roy 1997",
              "url": "https://doi.org/10.1109/9.580874"
            },
            {
              "id": "p8-tdconv:2",
              "kind": "paper",
              "label": "Jaakkola, Jordan & Singh 1994",
              "url": "https://doi.org/10.1162/neco.1994.6.6.1185"
            }
          ]
        },
        {
          "id": "p8-pgconv",
          "name": "PG convergence",
          "title": "On the Theory of Policy Gradient Methods",
          "meta": "Agarwal, Kakade, Lee & Mahajan, JMLR 2021",
          "tag": "reference",
          "idea": "Convergence of policy-gradient methods.",
          "fwd": "Guarantees behind Phase 3.",
          "resources": [
            {
              "id": "p8-pgconv:1",
              "kind": "paper",
              "label": "On the Theory of Policy Gradient Methods",
              "url": "https://arxiv.org/abs/1908.00261"
            }
          ]
        }
      ]
    },
    {
      "id": "p9",
      "name": "Independent investigation",
      "short": "Investigation",
      "phase": "Phase 9",
      "tfl": "suffragette",
      "goal": "Turning implementation skill into research: pick a claim, reproduce a slice of it, explain the gap, and design an experiment that could prove you wrong.",
      "from": "p7-x-report",
      "path": [
        [
          3120,
          1690
        ],
        [
          3120,
          1846
        ],
        [
          3250,
          1976
        ],
        [
          3850,
          1976
        ]
      ],
      "snap": [
        [
          3120,
          1820
        ],
        [
          3280,
          1976
        ],
        [
          3430,
          1976
        ],
        [
          3580,
          1976
        ],
        [
          3730,
          1976
        ],
        [
          3880,
          1976
        ]
      ],
      "pill": {
        "x": 3580,
        "y": 1898,
        "anchor": "middle"
      },
      "stations": [
        {
          "id": "p9-claim",
          "name": "Claim",
          "title": "One paper, one precise claim",
          "meta": "Deliverable: a claim and its evidence",
          "tag": "exercise",
          "idea": "Choose a single claim from one paper and write it down precisely enough to be wrong: what is asserted, over which tasks, at which budget, measured how. Vague claims cannot be reproduced or refuted.",
          "fwd": "Everything on this line is downstream of choosing this well.",
          "outcome": "State someone else's claim precisely enough to test it.",
          "prereqs": [
            "p7-x-report"
          ],
          "deliverables": [
            {
              "id": "p9-claim:d1",
              "label": "The claim quoted in one sentence, with the figure or table that supports it"
            },
            {
              "id": "p9-claim:d2",
              "label": "The protocol behind that evidence: tasks, budget, seeds, metric"
            },
            {
              "id": "p9-claim:d3",
              "label": "What would have to be true for the claim to generalise beyond that setting"
            }
          ],
          "resources": [
            {
              "id": "p9-claim:1",
              "kind": "site",
              "label": "Key Papers in Deep RL",
              "url": "https://spinningup.openai.com/en/latest/spinningup/keypapers.html"
            }
          ]
        },
        {
          "id": "p9-repro",
          "name": "Reproduce",
          "title": "Reproduce the smallest sufficient part",
          "meta": "Deliverable: your numbers next to theirs",
          "tag": "exercise",
          "idea": "Reproduce the smallest bounded piece of that evidence, not the whole paper. Report your number and theirs with uncertainty on both, and list every deviation from their setup, including the ones you think do not matter.",
          "fwd": "Reproduction is where the real open problems surface.",
          "outcome": "Bound a reproduction to something you can finish, and report it honestly.",
          "prereqs": [
            "p9-claim"
          ],
          "deliverables": [
            {
              "id": "p9-repro:d1",
              "label": "One bounded slice of the original evidence re-run"
            },
            {
              "id": "p9-repro:d2",
              "label": "Your result and theirs side by side, with uncertainty on both"
            },
            {
              "id": "p9-repro:d3",
              "label": "A complete list of deviations from their setup"
            }
          ],
          "resources": []
        },
        {
          "id": "p9-discrepancy",
          "name": "Discrepancy",
          "title": "A discrepancy is an observation, not a result",
          "meta": "Deliverable: candidate explanations, ruled in or out",
          "tag": "exercise",
          "idea": "A failed reproduction is a starting point. The work is establishing the cause: implementation difference, hyperparameters, environment version, evaluation protocol, or nothing but seed noise. Rule candidates in or out with evidence before you tell anyone what you found.",
          "fwd": "This is the step that separates a complaint from a contribution.",
          "outcome": "Attribute a discrepancy to a cause with evidence, or show it is within noise.",
          "prereqs": [
            "p9-repro"
          ],
          "deliverables": [
            {
              "id": "p9-discrepancy:d1",
              "label": "Candidate explanations enumerated for each discrepancy"
            },
            {
              "id": "p9-discrepancy:d2",
              "label": "At least one candidate ruled in or out by an experiment you ran"
            },
            {
              "id": "p9-discrepancy:d3",
              "label": "An explicit check that the gap exceeds seed noise"
            }
          ],
          "resources": []
        },
        {
          "id": "p9-hypothesis",
          "name": "Hypothesis",
          "title": "One falsifiable statement",
          "meta": "Deliverable: a hypothesis and its rival",
          "tag": "exercise",
          "idea": "Write one statement that could be false, the prediction it makes, and at least one competing explanation that predicts something different. If both explanations predict the same observation, you do not yet have an experiment.",
          "fwd": "The hinge between reproducing other people's work and producing your own.",
          "outcome": "Turn an observation into a hypothesis that an experiment could kill.",
          "prereqs": [
            "p9-discrepancy"
          ],
          "deliverables": [
            {
              "id": "p9-hypothesis:d1",
              "label": "One falsifiable statement and the prediction it makes"
            },
            {
              "id": "p9-hypothesis:d2",
              "label": "At least one competing explanation of the same observation"
            },
            {
              "id": "p9-hypothesis:d3",
              "label": "The observation that would distinguish them"
            }
          ],
          "resources": []
        },
        {
          "id": "p9-design",
          "name": "Design",
          "title": "Design it before you run it",
          "meta": "Deliverable: a pre-registered protocol",
          "tag": "exercise",
          "idea": "Write the protocol before the runs: factors and levels, interaction and tuning budget per arm, seeds, metric, and the analysis you will do. Pilot runs are for estimating spread, not for choosing the conclusion.",
          "fwd": "The difference between an experiment and a search for a flattering plot.",
          "outcome": "Pre-register a study, then execute it without changing the question.",
          "prereqs": [
            "p9-hypothesis"
          ],
          "deliverables": [
            {
              "id": "p9-design:d1",
              "label": "The protocol written and dated before the runs: factors, budgets, seeds, metric, stopping rule"
            },
            {
              "id": "p9-design:d2",
              "label": "A spread estimate from pilot runs, and the seed count it implies"
            },
            {
              "id": "p9-design:d3",
              "label": "The analysis chosen in advance"
            }
          ],
          "resources": []
        },
        {
          "id": "p9-writeup",
          "name": "Write-up",
          "title": "Report it, including what did not work",
          "meta": "Deliverable: a report and the code to rerun it",
          "tag": "exercise",
          "idea": "Method, results with uncertainty, limitations, and the negative or inconclusive parts left in. A short honest report is worth more than a long one that quietly drops the arms that disagreed.",
          "fwd": "The artefact you show a prospective supervisor or a reviewer.",
          "outcome": "Produce a report someone else could act on, disagree with, or rerun.",
          "prereqs": [
            "p9-design"
          ],
          "deliverables": [
            {
              "id": "p9-writeup:d1",
              "label": "A short report: method, results with uncertainty, limitations"
            },
            {
              "id": "p9-writeup:d2",
              "label": "Negative and inconclusive results kept in"
            },
            {
              "id": "p9-writeup:d3",
              "label": "Code and configs sufficient to rerun the study"
            },
            {
              "id": "p9-writeup:d4",
              "label": "A paragraph on what you would do next and why"
            }
          ],
          "resources": []
        }
      ]
    }
  ],
  "links": [
    [
      "p0-sb",
      "p1-dp"
    ],
    [
      "p0-silver",
      "p1-td"
    ],
    [
      "p0-cs285",
      "p2-dqn"
    ],
    [
      "p0-spinup",
      "p3-ppo"
    ],
    [
      "p0-refs",
      "p2-x-dqn"
    ],
    [
      "p0-cs234",
      "p8-bandits"
    ],
    [
      "p1-td",
      "p2-dqn"
    ],
    [
      "p1-qlearning",
      "p2-dqn"
    ],
    [
      "p1-mc",
      "p3-reinforce"
    ],
    [
      "p1-mc",
      "p5-grpo"
    ],
    [
      "p1-nstep",
      "p3-gae"
    ],
    [
      "p1-nstep",
      "p2-rainbow"
    ],
    [
      "p1-fa",
      "p6b-tutorial"
    ],
    [
      "p1-pg",
      "p3-reinforce"
    ],
    [
      "p1-dp",
      "p4-muzero"
    ],
    [
      "p1-dp",
      "p6b-cql"
    ],
    [
      "p2-ddqn",
      "p3-td3"
    ],
    [
      "p2-per",
      "p7-apex"
    ],
    [
      "p6g-spr",
      "p2-bbf"
    ],
    [
      "p6a-goexplore",
      "p2-ngu"
    ],
    [
      "p3-reinforce",
      "p5-grpo"
    ],
    [
      "p3-ppo",
      "p5-instructgpt"
    ],
    [
      "p3-ppo",
      "p5-grpo"
    ],
    [
      "p3-impala",
      "p7-seed"
    ],
    [
      "p3-impala",
      "p6e-alphastar"
    ],
    [
      "p3-ddpg",
      "p6g-drq"
    ],
    [
      "p3-td3",
      "p6b-td3bc"
    ],
    [
      "p3-sac",
      "p4-mbpo"
    ],
    [
      "p3-sac",
      "p6f-pearl"
    ],
    [
      "p6c-maxent",
      "p3-sac"
    ],
    [
      "p7-details",
      "p3-ppo"
    ],
    [
      "p4-dreamerv3",
      "p6h-daydreamer"
    ],
    [
      "p4-muzero",
      "p5-o1"
    ],
    [
      "p6b-dt",
      "p6f-ad"
    ],
    [
      "p6d-her",
      "p6h-domrand"
    ],
    [
      "p8-bandits",
      "p6a-pseudo"
    ],
    [
      "p8-tdconv",
      "p1-td"
    ],
    [
      "p8-pgconv",
      "p3-pgtheorem"
    ],
    [
      "p0-sb",
      "p1-mc"
    ],
    [
      "p0-sb",
      "p1-td"
    ],
    [
      "p0-sb",
      "p1-qlearning"
    ],
    [
      "p0-sb",
      "p1-sarsa"
    ],
    [
      "p0-sb",
      "p1-nstep"
    ],
    [
      "p0-sb",
      "p1-fa"
    ],
    [
      "p0-sb",
      "p1-pg"
    ],
    [
      "p0-sb",
      "p4-dyna"
    ],
    [
      "p0-silver",
      "p1-dp"
    ],
    [
      "p0-silver",
      "p1-mc"
    ],
    [
      "p0-silver",
      "p1-qlearning"
    ],
    [
      "p0-silver",
      "p1-sarsa"
    ],
    [
      "p0-silver",
      "p1-fa"
    ],
    [
      "p0-silver",
      "p1-pg"
    ],
    [
      "p0-silver",
      "p4-dyna"
    ],
    [
      "p0-silver",
      "p4-alphazero"
    ],
    [
      "p0-silver",
      "p8-bandits"
    ],
    [
      "p0-cs285",
      "p1-dp"
    ],
    [
      "p0-cs285",
      "p1-fa"
    ],
    [
      "p0-cs285",
      "p3-reinforce"
    ],
    [
      "p0-cs285",
      "p3-a3c"
    ],
    [
      "p0-cs285",
      "p3-trpo"
    ],
    [
      "p0-cs285",
      "p3-sac"
    ],
    [
      "p0-cs285",
      "p4-worldmodels"
    ],
    [
      "p0-cs285",
      "p4-pets"
    ],
    [
      "p0-cs285",
      "p4-mbpo"
    ],
    [
      "p0-cs285",
      "p4-mcts"
    ],
    [
      "p0-cs285",
      "p5-instructgpt"
    ],
    [
      "p0-cs285",
      "p5-dpo"
    ],
    [
      "p0-cs285",
      "p6a-pseudo"
    ],
    [
      "p0-cs285",
      "p6b-tutorial"
    ],
    [
      "p0-cs285",
      "p6b-cql"
    ],
    [
      "p0-cs285",
      "p6c-bc"
    ],
    [
      "p0-cs285",
      "p6c-maxent"
    ],
    [
      "p0-cs285",
      "p6f-rl2"
    ],
    [
      "p0-cs285",
      "p8-monograph"
    ],
    [
      "p0-spinup",
      "p1-dp"
    ],
    [
      "p0-spinup",
      "p3-reinforce"
    ],
    [
      "p0-spinup",
      "p3-pgtheorem"
    ],
    [
      "p0-spinup",
      "p3-trpo"
    ],
    [
      "p0-spinup",
      "p3-ddpg"
    ],
    [
      "p0-spinup",
      "p3-td3"
    ],
    [
      "p0-spinup",
      "p3-sac"
    ],
    [
      "p0-spinup",
      "p3-x-ppo"
    ],
    [
      "p0-bootcamp",
      "p1-dp"
    ],
    [
      "p0-bootcamp",
      "p1-fa"
    ],
    [
      "p0-bootcamp",
      "p2-dqn"
    ],
    [
      "p0-bootcamp",
      "p3-reinforce"
    ],
    [
      "p0-bootcamp",
      "p3-trpo"
    ],
    [
      "p0-bootcamp",
      "p3-ddpg"
    ],
    [
      "p0-bootcamp",
      "p4-dyna"
    ],
    [
      "p0-bootcamp",
      "p6c-maxent"
    ],
    [
      "p0-bootcamp",
      "p7-henderson"
    ],
    [
      "p0-cs234",
      "p1-dp"
    ],
    [
      "p0-cs234",
      "p1-td"
    ],
    [
      "p0-cs234",
      "p1-qlearning"
    ],
    [
      "p0-cs234",
      "p5-dpo"
    ],
    [
      "p0-cs234",
      "p6b-tutorial"
    ],
    [
      "p0-cs234",
      "p6e-iql"
    ],
    [
      "p0-refs",
      "p2-rainbow"
    ],
    [
      "p0-refs",
      "p3-x-ppo"
    ],
    [
      "p0-refs",
      "p5-x-grpo"
    ],
    [
      "p1-is",
      "p3-ppo"
    ],
    [
      "p1-is",
      "p3-impala"
    ],
    [
      "p1-is",
      "p5-dpo"
    ],
    [
      "p1-pomdp",
      "p2-r2d2"
    ],
    [
      "p1-pomdp",
      "p4-worldmodels"
    ],
    [
      "p1-pomdp",
      "p5-agentic"
    ],
    [
      "p3-entropy",
      "p3-trpo"
    ],
    [
      "p3-entropy",
      "p3-sac"
    ],
    [
      "p3-entropy",
      "p5-dpo"
    ],
    [
      "p4-dyna",
      "p4-mbpo"
    ],
    [
      "p4-mcts",
      "p4-alphazero"
    ],
    [
      "p1e-debug",
      "p2-dqn"
    ],
    [
      "p1e-seeds",
      "p7-rliable"
    ],
    [
      "p1e-protocol",
      "p7-empirical"
    ],
    [
      "p8-bandits",
      "p6a-regret"
    ],
    [
      "p1-fa",
      "p8-tdconv"
    ],
    [
      "p7-x-report",
      "p9-claim"
    ],
    [
      "p3-x-ppo",
      "p7-x-report"
    ],
    [
      "p0-maths",
      "p3-entropy"
    ]
  ],
  "spineOrder": [
    "p0",
    "p1",
    "p1e",
    "p7",
    "p2",
    "p3",
    "p6a",
    "p4",
    "p6b",
    "p6c",
    "p6d",
    "p6e",
    "p6f",
    "p6g",
    "p6h",
    "p5",
    "pd",
    "p8",
    "p9"
  ],
  "stages": [
    {
      "id": "s1",
      "title": "Readiness & orientation",
      "content": "Mathematical checks and the environment interface.",
      "evidence": "A small experiment you can interpret.",
      "lines": [
        "p0"
      ]
    },
    {
      "id": "s2",
      "title": "Tabular RL",
      "content": "Bandits, MDPs, dynamic programming, Monte Carlo, TD, control, Dyna.",
      "evidence": "Correct implementations, and an explanation of what separates them.",
      "lines": [
        "p1"
      ]
    },
    {
      "id": "s3",
      "title": "Approximation & deep value learning",
      "content": "Function approximation, the deadly triad, DQN, Double DQN.",
      "evidence": "A debugged agent and a controlled ablation.",
      "lines": [
        "p2"
      ]
    },
    {
      "id": "s4",
      "title": "Policy optimisation",
      "content": "REINFORCE, actor-critic, GAE, PPO, continuous control, SAC.",
      "evidence": "Reproducible experiments under a protocol you wrote first.",
      "lines": [
        "p3"
      ]
    },
    {
      "id": "s5",
      "title": "Research sampler",
      "content": "Short introductions to exploration, models, offline RL and imitation.",
      "evidence": "A reasoned choice of one direction.",
      "choose": true,
      "lines": [
        "p6a",
        "p4",
        "p6b",
        "p6c"
      ]
    },
    {
      "id": "s6",
      "title": "Specialisation",
      "content": "One selected track, with the theory that supports it.",
      "evidence": "Reproduction of a clearly scoped published result.",
      "lines": [
        "p2",
        "p4",
        "p5",
        "p6a",
        "p6b",
        "p6c",
        "p6d",
        "p6e",
        "p6f",
        "p6g",
        "p6h",
        "p8",
        "pd"
      ]
    },
    {
      "id": "s7",
      "title": "Independent investigation",
      "content": "Hypothesis, competing explanations, experiment, analysis.",
      "evidence": "A report with evidence, limitations and the negative results left in.",
      "lines": [
        "p9"
      ]
    }
  ]
};

export const allStations = (curriculum: Curriculum): Station[] => curriculum.lines.flatMap((line) => line.stations);

export const isTrackLine = (line: Line) => Boolean(line.track);

/** The opening sentence of a line's goal, for lists that have room for one line. */
export const lineSummary = (line: Line) => `${line.goal.split(". ")[0].replace(/\.$/, "")}.`;

export const stationIds = (curriculum: Curriculum): Set<string> => new Set(allStations(curriculum).map((s) => s.id));
export const resourceIds = (curriculum: Curriculum): Set<string> => new Set(allStations(curriculum).flatMap((s) => s.resources.map((r) => r.id)));

export function findStation(curriculum: Curriculum, id: string): { station: Station; line: Line } | null {
  for (const line of curriculum.lines) {
    const station = line.stations.find((s) => s.id === id);
    if (station) return { station, line };
  }
  return null;
}

const logIndex = new WeakMap<Curriculum, Map<string, LogEntry[]>>();

export function logResources(curriculum: Curriculum, hubId: string): LogEntry[] {
  let index = logIndex.get(curriculum);
  if (!index) {
    index = new Map();
    for (const line of curriculum.lines) {
      for (const station of line.stations) {
        for (const resource of station.resources) {
          if (!resource.from) continue;
          const entries = index.get(resource.from) ?? [];
          entries.push({ station, line, resource });
          index.set(resource.from, entries);
        }
      }
    }
    logIndex.set(curriculum, index);
  }
  return index.get(hubId) ?? [];
}

export function findResource(curriculum: Curriculum, resourceId: string): LogEntry | null {
  for (const line of curriculum.lines) {
    for (const station of line.stations) {
      const resource = station.resources.find((r) => r.id === resourceId);
      if (resource) return { station, line, resource };
    }
  }
  return null;
}

export const findLine = (curriculum: Curriculum, id: string): Line | undefined =>
  curriculum.lines.find((line) => line.id === id);

/**
 * The lines in the order the route rides them: the spine in order, then anything
 * left off it. Every list that says it is showing the journey reads off this, so
 * the strip and the recommendation cannot disagree about what comes next.
 */
export const rideOrder = (curriculum: Curriculum): Line[] => [
  ...curriculum.spineOrder.map((id) => findLine(curriculum, id)).filter((l): l is Line => Boolean(l)),
  ...curriculum.lines.filter((l) => !curriculum.spineOrder.includes(l.id)),
];
