# A Sequenced Reading Curriculum for Reinforcement Learning: From Zero to Thesis-Ready Research (2026 Edition)

## TL;DR
- **This is a ~9–12 month reading *and experiment* curriculum** that takes you from MDPs and Sutton & Barto through deep RL (DQN/PPO/SAC), model-based RL (Dreamer/MuZero), and the current frontier of RL for LLM reasoning (GRPO/DAPO/GSPO), and ends in an independent investigation of your own; every entry is connected forward to the state of the art so you always know why you're reading it.
- **The route is tiered, and the core of it is small.** On the map, a station is **Core** (everyone needs it), a **Track requirement** (needed for the specialisation you picked), **Reference** (fetch it when a project asks for it), or an **Exercise** (something you do, judged by deliverables rather than by ticking the reading). The default route is roughly 60 stations out of 150; picking a specialisation adds its own. The Essential/Deeper labels in the prose below are the older, coarser version of the same idea — where they disagree, the map's tier is the one that has been thought about most recently.
- **The non-negotiable spine is small**: Sutton & Barto (chs. 3–13) → DQN → REINFORCE/policy-gradient theorem → TRPO/PPO/GAE → DDPG/TD3/SAC → Dreamer + MuZero → offline RL (CQL/IQL) → RLHF/DPO/GRPO. Everything else is depth you add where your thesis points. Implement as you go (tabular Q-learning → DQN → PPO → SAC → a world model → GRPO on a small LLM) using CleanRL, Stable-Baselines3, and verl/TRL as references.
- **The most active 2025–2026 research areas** — and the best thesis hunting grounds — are RL for LLM reasoning/agents (RLVR, process rewards, multi-turn agentic RL), sample-efficient/scalable value-based RL (BBF), model-based RL at scale (DreamerV3, TD-MPC2), and rigorous evaluation (rliable). Pick a narrow, reproducible question in one of these and implement a clean baseline first.

---

## Key Findings (how to use this document)

1. **Read for the idea, then the connections.** Each entry gives the key idea, the problem it solved, and the forward link. Deep RL is genuinely cumulative: Double DQN fixes a bug in DQN; TD3 ports that same fix to continuous control; SAC adds entropy; PPO is a practical TRPO; GRPO is PPO with the critic removed. If you understand the lineage, papers stop looking like isolated tricks.
2. **Implementation is not optional, and it is not a phase.** RL results are notoriously sensitive to implementation details (Henderson et al. 2018; the "37 details of PPO"). You cannot read your way to competence. Each idea below is followed by the exercise that tests it: read a station, then do the exercise before moving on. Every exercise has explicit deliverables — code, a plot, an explanation, a conclusion — because "I did the project" is not checkable and "here is the plot and what it does not show" is.
3. **Experimental practice starts in Phase 1B, not at the end.** Seeds and spread, a protocol written before the runs, and a debugging order for agents that will not learn all come before your first deep agent. Statistical sophistication grows with the claims you are making: variability between runs first, aggregate metrics and bootstrap intervals when you start comparing across task suites (Phase 7).
4. **Be ruthless about scope.** No one reads all of this linearly. Do the core route, then go deep in the *one or two* tracks your thesis needs. Everything else is a reference map — including most of the LLM-RL line if your thesis is about exploration, and most of the value-based family if it is not.
5. **Verify as you read.** Years/venues below were checked against arXiv/PMLR/OpenReview/dblp. A recurring gotcha: many deep-RL papers are cited by arXiv/submission year but published a year later (e.g., DQN 2013 arXiv / 2015 Nature; R2D2 2018 arXiv / ICLR 2019).

---

## Phase 0 — Orientation and courses to run alongside (Week 0, ongoing)

Do not read these end-to-end before starting; run them *in parallel* with the reading.

- **Mathematical readiness (diagnostic, not a course).** Conditional expectation, distributions and sampling, gradients and the chain rule, stochastic optimisation, and enough statistics to read an error bar. *Mathematics for Machine Learning* (Deisenroth, Faisal & Ong) covers all of it; Boyd & Vandenberghe ch. 1 and appendix A for the optimisation half. **Core**, but test yourself first and refresh only what fails — Bellman equations are conditional expectations and policy gradients are score-function estimators, so a shaky footing here shows up everywhere downstream.
- **Sutton & Barto, *Reinforcement Learning: An Introduction*, 2nd ed. (MIT Press, 2018; corrected 2020).** The canonical textbook; free online. **Essential.** Part I (tabular) is chs. 1–8; Part II (approximation, policy gradient) chs. 9–13; Part III (psychology/neuroscience, case studies incl. AlphaGo) chs. 14–17.
- **David Silver's UCL RL course (2015, DeepMind×UCL, 10 lectures).** Best lecture companion to Sutton & Barto Part I. **Essential** for Phase 1.
- **Sergey Levine's CS285 (UC Berkeley Deep RL).** Actively maintained; Spring 2026 offering underway, with Fall 2023 lectures recorded. The best deep-RL lecture series; maps almost one-to-one onto Phases 2–5. **Essential** from Phase 2 on.
- **OpenAI Spinning Up in Deep RL (Josh Achiam, OpenAI, 2018).** Docs + clean implementations of VPG, PPO, DDPG, TD3, SAC, plus the curated "Key Papers in Deep RL" list this curriculum overlaps with. **Essential** as an implementation reference.
- **Pieter Abbeel's Deep RL Bootcamp (Berkeley, Aug 2017).** Archived lecture videos/slides; good condensed alternative to CS285. **Deeper/optional.**
- **Stanford CS234 (Emma Brunskill), running Winter 2026.** Stronger on theory/bandits than CS285. **Optional**, useful for Phase 8.
- **Reference implementations to keep open throughout:** **CleanRL** (single-file PyTorch+JAX: PPO, DQN, C51, DDPG, TD3, SAC; JMLR 2022), **Stable-Baselines3** (reliable OO PyTorch; JMLR 2021), **Dopamine** (value-based Atari: DQN/C51/Rainbow/IQN), **PureJaxRL** (end-to-end JAX, large speedups), and for LLM RL **verl** (ByteDance/HKU; PPO/GRPO/GSPO with FSDP/Megatron + vLLM), **TRL** (Hugging Face; SFT/RM/PPO/DPO/GRPO), and **OpenRLHF** (Ray-based, scalable PPO/GRPO with vLLM).

---

## Phase 1 — Foundations and tabular RL (Weeks 1–5)
*Goal: fluent with MDPs, Bellman equations, DP, MC, TD, Q-learning/SARSA, eligibility traces, function-approximation basics, and the deadly triad.*

Read Sutton & Barto chs. 3–13 as the backbone; the original papers below add historical grounding and are worth skimming for the source of ideas you'll use forever.

- **Sutton & Barto ch. 3–4 — Finite MDPs, Bellman equations, dynamic programming (policy/value iteration).** **Essential.** *Forward link:* the Bellman optimality operator underlies every value-based method through to MuZero and CQL.
- **Sutton & Barto ch. 5 — Monte Carlo methods.** **Essential.** *Forward link:* MC return estimation reappears in REINFORCE and in GRPO's group-relative returns.
- **Sutton & Barto ch. 5.5–5.9 — Off-policy prediction via importance sampling.** Ordinary IS is unbiased with unbounded variance; weighted IS trades a little bias for much less of it. **Essential.** *Forward link:* the same ratio is PPO's probability ratio, V-trace's clipped ratio, and the implicit reward ratio inside DPO. Meet it here, where you can compute it by hand.
- **Sutton & Barto ch. 6 — Temporal-difference learning; based on Sutton, "Learning to Predict by the Methods of Temporal Differences" (*Machine Learning*, 1988).** **Essential.** *Forward link:* TD is the single most important idea in the field — the bootstrapped target is the ancestor of the DQN loss.
- **Watkins & Dayan, "Q-learning" (*Machine Learning*, 1992; from Watkins's 1989 thesis).** Off-policy TD control with a convergence proof. **Essential (skim original).** *Forward link:* directly becomes DQN when you swap the table for a neural net.
- **SARSA (Rummery & Niranjan 1994; named by Sutton 1996) — S&B ch. 6.** On-policy control. **Essential (via textbook).** *Forward link:* the on-policy/off-policy distinction structures the whole field (PPO vs SAC).
- **Sutton & Barto ch. 7 & 12 — n-step bootstrapping and eligibility traces / TD(λ).** **Essential.** *Forward link:* n-step returns are a Rainbow component and reappear in R2D2, DreamerV3, and BBF; TD(λ) is the conceptual root of GAE.
- **Partial observability — observations are not states.** When the observation does not summarise the history, the Markov property fails and a memoryless policy cannot be optimal; the fixes are all forms of remembering (frame stacking, recurrence, a learned latent state). Hausknecht & Stone's DRQN (AAAI Fall Symposium 2015; arXiv 1507.06527) is the compact entry point; Ni et al., "Recurrent Model-Free RL is a Strong Baseline for Many POMDPs" (ICML 2022; arXiv 2110.05038) is the sober follow-up. **Essential (concept).** *Forward link:* R2D2's recurrence, world models' latent state, and the agentic-RL survey's framing of LLM agents as POMDPs.
- **Dyna-Q — Sutton, "Integrated Architectures for Learning, Planning and Reacting" (1990/1991) and S&B ch. 8.** Learn a model, generate synthetic experience, update the same value function from both. **Essential**, and it belongs here rather than in Phase 4: the tabular version is ten lines and it makes "model-based" concrete long before Dreamer. *Forward link:* MBPO is Dyna with a neural model and a bound on how far you may imagine.
- **Sutton & Barto ch. 9–11 — On-policy and off-policy function approximation; the deadly triad (bootstrapping + off-policy + function approximation).** **Essential.** The triad is a risk, not a prohibition: the combination *can* make value estimates unstable or divergent, and van Hasselt et al., "Deep RL and the Deadly Triad" (arXiv 1812.02648, 2018) found divergence is far from inevitable in practice — every deep agent that works combines all three. *Forward link:* the deadly triad is *the* explanation for why DQN needed target networks and replay, and why offline RL is hard.
- **Sutton & Barto ch. 13 — Policy-gradient methods.** **Essential.** Bridge into Phase 3.

**Exercises (one after each idea, not saved up for the end):**
1. *After MDPs and DP* — write a four-state MDP and solve it by hand, then reproduce the answer with policy iteration and value iteration on FrozenLake (they should agree to 1e-8). Plot max-norm error against sweep; say what the convergence rate is.
2. *After MC and TD* — run both on the same prediction task against a known **v**_π. Plot RMS error against episodes over several step sizes and at least 10 seeds; write the paragraph on which wins when, in bias and variance terms.
3. *After SARSA and Q-learning* — both, plus Expected SARSA, on CliffWalking. Predict the difference before you run it; then plot the returns, show the greedy paths, and explain what happens as ε → 0.
4. *After function approximation* — reproduce Baird's counterexample and watch the weights leave. Then remove one leg of the triad at a time and record which removals rescue it and which do not.
5. *After policy gradients* — REINFORCE with and without a baseline on one task; measure the empirical variance of the gradient estimate for both, and derive on paper that the baseline costs no bias.

---

## Phase 1B — Experimental practice (start here, keep going)
*Goal: be able to run a comparison whose conclusion survives someone else re-running it. Begin on tabular experiments, where a run costs seconds.*

- **Seeds and spread.** Re-run the same agent with independent seeds and look at the distribution before comparing anything to anything; deep-RL curves from a single run routinely differ more between seeds of one method than between two methods. Colas, Sigaud & Oudeyer, "How Many Random Seeds?" (arXiv 1806.08295) for the power analysis; their "Hitchhiker's Guide to Statistical Comparisons of RL Algorithms" (arXiv 1904.06979) for which test to use. **Core.**
- **Henderson et al., "Deep RL That Matters" (AAAI 2018).** Read it *here*, before your first deep agent, not in Phase 7. **Core.**
- **Protocol before runs.** Fix and write down: environment version, interaction budget, number and policy of evaluation episodes, tuning budget per method, held-out tasks, and the commit and config for every run. A protocol chosen after seeing the results is not a protocol. Amid Fish, "Lessons Learned Reproducing a Deep RL Paper", is the honest account of what this costs. **Core.**
- **Debugging: implementation failure or algorithm failure.** Most agents that do not learn are broken rather than badly tuned. Work the usual suspects in a fixed order: terminal masking; **truncation treated as termination**, which silently cuts the bootstrap at a time limit (Gymnasium's termination/truncation docs; Pardo et al., "Time Limits in Reinforcement Learning", arXiv 1712.00378); targets computed with the wrong network or without a stopped gradient; reward and observation scaling; wrapper order; *then* hyperparameters. Andy Jones, "Debugging RL, Without the Agonizing Pain", is the checklist. **Core — read before Phase 2.**

**Exercise:** take the CliffWalking comparison from Phase 1 and redo it as a study — protocol written first, at least 10 seeds, median and interquartile range on the plot, configs and commits logged, and a three-sentence conclusion that states what the evidence does *not* support.

---

## Phase 2 — Value-based deep RL (Weeks 6–11)
*Goal: understand the DQN family and distributional RL end-to-end, and be able to implement and debug DQN + Rainbow components.*

- **Mnih et al., "Playing Atari with Deep RL" (arXiv 2013) and "Human-level control through deep RL" (*Nature* 518:529–533, 2015).** DQN: Q-learning + CNN + experience replay + target network learning Atari from pixels. **Essential — non-negotiable.** *Forward link:* the founding work of deep RL; every value-based method descends from it.
- **van Hasselt, Guez & Silver, "Deep RL with Double Q-learning" (AAAI 2016; arXiv 2015).** Decouples action selection from evaluation to fix Q-value overestimation. **Essential.** *Forward link:* the overestimation fix is reused in TD3 (clipped double-Q) and throughout offline RL.
- **Schaul et al., "Prioritized Experience Replay" (ICLR 2016).** Sample high-TD-error transitions more often. **Essential.** *Forward link:* a Rainbow component; distributed variant is Ape-X.
- **Wang et al., "Dueling Network Architectures" (ICML 2016).** Separate value and advantage streams. **Essential (skim).**
- **Fortunato et al., "Noisy Networks for Exploration" (ICLR 2018).** Learnable parametric noise for exploration. **Deeper.**
- **Bellemare, Dabney & Munos, "A Distributional Perspective on RL" — C51 (ICML 2017).** Learn the *distribution* of returns, not just the mean. **Essential** (this launched a subfield). *Forward link:* → QR-DQN → IQN → used in Rainbow, R2D2, Agent57.
- **Dabney et al., "Distributional RL with Quantile Regression" — QR-DQN (AAAI 2018)** and **Dabney et al., "Implicit Quantile Networks" — IQN (ICML 2018).** **Deeper** (read C51 closely, skim these).
- **Hessel et al., "Rainbow: Combining Improvements in Deep RL" (AAAI 2018, pp. 3215–3222).** Integrates six DQN extensions (double, dueling, PER, multi-step, distributional C51, noisy nets); state of the art on Atari. **Essential** — the best single "what actually matters" ablation. *Forward link:* the template for later "combine everything" agents.
- **Kapturowski et al., "Recurrent Experience Replay in Distributed RL" — R2D2 (ICLR 2019).** LSTM + distributed replay; big Atari jump. **Deeper.** *Forward link:* backbone of NGU/Agent57.
- **Badia et al., "Never Give Up (NGU)" (ICLR 2020)** and **"Agent57" (ICML 2020; arXiv 2003.13350).** Per Badia et al., Agent57 is "the first deep RL agent that outperforms the standard human benchmark on all 57 Atari games," achieving 100% capped human-normalized scores across the set, via episodic+lifelong intrinsic rewards and a meta-controller over exploration policies. **Deeper** (read for the exploration/meta-controller ideas).
- **Schwarzer et al., "Bigger, Better, Faster (BBF)" (ICML 2023, PMLR v202:30365–30380; arXiv 2305.19452).** Reaches an IQM human-normalized score of 1.045 on the Atari 100K sample-efficiency benchmark — the first model-free agent to consistently exceed human-level (IQM ≥ 1.0) within the 100K-step budget — using ~10 hours on half an A100, a ~4× runtime reduction vs EfficientZero, via a scaled Impala-CNN, high replay ratio, periodic soft resets, and annealed n-step returns. **Essential if you care about sample efficiency** — it's the current reference point for "how good can value-based RL be with little data."

**Exercises:**
1. *After DQN* — build it from scratch until CartPole is solved (replay, target network, correct truncation handling), then change exactly **one** component (target-network period, replay capacity, ε schedule) and measure the effect over at least 5 seeds against the noise floor.
2. *After Double DQN* — add Double plus two further components of your choice (Dueling, PER, n-step, distributional) one at a time on a fixed interaction budget, and report an aggregate metric with confidence intervals rather than one mean curve per variant. State what the evidence does and does not support *at that budget*.

Use Dopamine/CleanRL as references, not copies. Everything past Double DQN — PER, Dueling, C51, Rainbow, BBF — is the value-based specialisation, not a prerequisite for the rest of the map.

---

## Phase 3 — Policy gradients and actor-critic (Weeks 12–18)
*Goal: master the policy-gradient family, from REINFORCE to PPO and SAC — the workhorses of modern RL, including LLM RL.*

- **Williams, "Simple statistical gradient-following algorithms" — REINFORCE (*Machine Learning*, 1992).** The original Monte-Carlo policy gradient. **Essential.** *Forward link:* GRPO and RLHF are REINFORCE-style estimators on token sequences.
- **Sutton, McAllester, Singh & Mansour, "Policy Gradient Methods for RL with Function Approximation" (NeurIPS 2000).** The policy-gradient theorem. **Essential.** *Forward link:* the theoretical license for every actor-critic method.
- **Kakade, "A Natural Policy Gradient" (NeurIPS 2002).** Precondition the gradient by the Fisher information → invariance to parameterization. **Deeper.** *Forward link:* the conceptual seed of TRPO.
- **Mnih et al., "Asynchronous Methods for Deep RL" — A3C/A2C (ICML 2016).** Parallel actors, advantage actor-critic. **Essential.** *Forward link:* the actor-learner idea scales into IMPALA.
- **Schulman et al., "High-Dimensional Continuous Control Using Generalized Advantage Estimation (GAE)" (arXiv 2015; ICLR 2016).** Bias-variance-controlled advantage estimates via a TD(λ)-style trace. **Essential.** *Forward link:* GAE is used inside virtually every modern PPO implementation, including LLM RLHF.
- **Schulman et al., "Trust Region Policy Optimization (TRPO)" (ICML 2015).** Monotonic-improvement policy updates via a KL trust region. **Essential (understand), Deeper (math).** *Forward link:* PPO is its practical simplification.
- **Schulman et al., "Proximal Policy Optimization (PPO)" (arXiv 1707.06347, 2017).** Clipped surrogate objective; first-order, robust, ubiquitous. **Essential — non-negotiable.** *Forward link:* the default RL algorithm; the base of InstructGPT RLHF, and the parent of GRPO/DAPO/VAPO.
- **Wu et al., "ACKTR" (NeurIPS 2017).** Kronecker-factored natural gradient actor-critic. **Deeper/optional.**
- **Espeholt et al., "IMPALA" (ICML 2018; arXiv 1802.01561).** Decoupled distributed actor-learner + **V-trace** off-policy correction; reaches "a throughput rate of 250,000 frames per second," over 30× faster than single-machine A3C. **Essential** for distributed RL. *Forward link:* → SEED RL; V-trace recurs in large-scale agents (AlphaStar).
- **Silver et al., "Deterministic Policy Gradient (DPG)" (ICML 2014)** and **Lillicrap et al., "Continuous control with deep RL (DDPG)" (ICLR 2016; arXiv 1509.02971).** Off-policy actor-critic for continuous action spaces. **Essential.** *Forward link:* base of TD3, DrQ-v2.
- **Fujimoto, van Hoof & Meger, "Addressing Function Approximation Error in Actor-Critic Methods (TD3)" (ICML 2018).** Clipped double-Q + delayed updates + target smoothing fix DDPG's overestimation. **Essential.** *Forward link:* the standard deterministic continuous-control baseline; base of TD3+BC in offline RL.
- **Haarnoja et al., "Soft Actor-Critic (SAC)" (ICML 2018; + "Algorithms and Applications," arXiv 1812.05905).** Maximum-entropy off-policy actor-critic; sample-efficient and stable. **Essential — non-negotiable for continuous control.** *Forward link:* the default continuous-control algorithm; used inside MBPO, PEARL, DrQ.

**Entropy and KL, before the trust-region methods.** Entropy measures how spread a policy is; KL measures how far one policy is from another, asymmetrically; both are estimated from samples, and the estimator matters (Schulman, "Approximating KL Divergence"). Levine's "RL and Control as Probabilistic Inference" (arXiv 1805.00909) is the optional deeper account. **Essential** — TRPO's constraint, PPO's clip, SAC's temperature and DPO's implicit penalty are all the same two quantities.

**Exercises:**
1. *After PPO* — PPO from scratch on a MuJoCo task, under a protocol written first (environment version, total interaction budget, evaluation episodes, seed count). Report the final score as an interval, not a number. Then audit your implementation against the 37 details and list what you skipped.
2. *After SAC* — DDPG, TD3 and SAC on the same two tasks, same budget, same evaluation protocol; an aggregate metric with confidence intervals; a table of what actually differs in the code; and a paragraph on which of those differences your evidence says mattered.

---

## Phase 4 — Model-based RL and planning (Weeks 19–25)
*Goal: understand learned world models, background vs decision-time planning, and the AlphaGo→MuZero lineage.*

- **Sutton, "Dyna" (1990/1991).** Integrate learning, planning, and acting; use a learned model to generate synthetic experience. **Essential (concept).** *Forward link:* the "imagined rollouts" idea → MBPO, Dreamer.
- **Deisenroth & Rasmussen, "PILCO" (ICML 2011).** Gaussian-process dynamics with uncertainty for extreme data efficiency. **Deeper.** *Forward link:* the uncertainty-aware-model idea → PETS.
- **Ha & Schmidhuber, "World Models" (NeurIPS 2018; arXiv 1803.10122).** Learn a VAE+RNN latent world model and train a controller inside it. **Essential (highly readable).** *Forward link:* direct ancestor of PlaNet/Dreamer.
- **Chua et al., "PETS: Deep RL in a Handful of Trials" (NeurIPS 2018).** Probabilistic ensemble dynamics + CEM planning. **Essential.** *Forward link:* ensembles → MBPO.
- **Janner et al., "When to Trust Your Model (MBPO)" (NeurIPS 2019).** Short model-generated rollouts branched off real states, feeding SAC; bounds compounding model error. **Essential.** *Forward link:* the standard modern Dyna-style method.
- **Hafner et al., "PlaNet" (ICML 2019)** → **"Dreamer/DreamerV1" (ICLR 2020)** → **"DreamerV2" (ICLR 2021)** → **"DreamerV3: Mastering Diverse Domains through World Models" (arXiv 2301.04104, 2023; published as "Mastering diverse control tasks through world models," *Nature*, 2025).** Learn latent dynamics; train an actor-critic purely in imagination. DreamerV3 outperforms specialized methods across "over 150 diverse tasks, with a single configuration," and is "the first algorithm to collect diamonds in Minecraft from scratch without human data or curricula" (using a single A100 GPU, ~9 days). **Essential (DreamerV3 is a must-read frontier model-based agent).** *Forward link:* the leading general model-based agent line; the reference for the "one algorithm, many domains" ambition.
- **Silver et al., AlphaGo (*Nature* 2016) → AlphaGo Zero (*Nature* 2017) → AlphaZero (*Science* 2018).** MCTS + deep policy/value nets; then self-play from scratch; then one algorithm for Go/chess/shogi. **Essential (read AlphaZero closely).** *Forward link:* directly into MuZero.
- **Schrittwieser et al., "MuZero: Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model" (*Nature* 588:604–609, 2020).** MCTS over a *learned* latent model predicting reward/value/policy — no given rules. **Essential — non-negotiable model-based landmark.** *Forward link:* → EfficientZero; conceptual cousin of RL search for LLM reasoning.
- **Ye et al., "EfficientZero" (NeurIPS 2021).** MuZero + self-supervised consistency; human-level Atari 100K. **Deeper.**
- **Hansen et al., "TD-MPC" (ICML 2022)** and **"TD-MPC2: Scalable, Robust World Models for Continuous Control" (ICLR 2024; arXiv 2310.16828).** Short-horizon planning in a task-oriented latent space + a terminal value function; TD-MPC2 scales to many continuous-control tasks with one recipe. **Essential** for continuous-control model-based RL. *Forward link:* current SOTA-competitive continuous-control planner.
- **MCTS foundations: Browne et al., "A Survey of Monte Carlo Tree Search Methods" (IEEE TCIAIG, 2012).** **Deeper (reference).**

**Exercises:** (Dyna-Q has moved to Phase 1, where it belongs.)
1. *After Dreamer* — a small latent world model on a DM Control task; plot prediction quality against imagination horizon; train a policy inside it and compare against a model-free baseline **at equal environment interaction**; say where the imagined rollouts stop being trustworthy.
2. *After MCTS and AlphaZero* — UCT for Connect Four, with playing strength plotted against simulations per move; then, if you want the full picture, a minimal AlphaZero on a smaller game. Read the MCTS survey *before* AlphaZero, not after it: the search is half the algorithm.

---

## Phase 5 — RL for LLMs, RLHF, and reasoning (Weeks 26–33) — *the current frontier*
*Goal: understand preference-based RL, RLHF, direct alignment (DPO family), and verifiable-reward reasoning RL (GRPO/DAPO/GSPO). This is the most active area in RL today and the richest thesis territory.*

- **Christiano et al., "Deep RL from Human Preferences" (NeurIPS 2017).** Learn a reward model from pairwise trajectory comparisons, then optimize with RL. **Essential — the intellectual root of RLHF.** *Forward link:* everything below.
- **Ziegler et al., "Fine-Tuning Language Models from Human Preferences" (arXiv 1909.08593, 2019)** and **Stiennon et al., "Learning to Summarize from Human Feedback" (NeurIPS 2020).** RLHF applied to LMs. **Essential (skim Ziegler, read Stiennon).**
- **Ouyang et al., "Training language models to follow instructions with human feedback (InstructGPT)" (NeurIPS 2022; arXiv 2203.02155).** The three-stage recipe: SFT → reward model → PPO. **Essential — non-negotiable.** *Forward link:* the template behind ChatGPT and all subsequent LLM RL.
- **Rafailov et al., "Direct Preference Optimization (DPO)" (NeurIPS 2023).** Reparameterize the RLHF objective so the LM *is* its own reward model — a simple supervised loss, no RL loop. **Essential — non-negotiable.** *Forward link:* spawned the direct-alignment family.
- **DPO variants — read the survey-style comparisons, then pick 2–3:** **IPO** (Azar et al., AISTATS 2024; squared-loss objective avoiding DPO's pointwise-reward assumption), **KTO** (Ethayarajh et al. 2024; prospect-theory loss learning from *unpaired* binary good/bad signals), **ORPO** (Hong et al. 2024; odds-ratio penalty, reference-model-free, folds SFT+alignment into one step), **SimPO** (Meng et al., NeurIPS 2024; length-normalized reference-free reward). **Essential to know the landscape; Deeper to read each.** *Forward link:* these are the standard cheap-alignment toolkit.
- **Shao et al., "DeepSeekMath" — introduces GRPO (arXiv 2402.03300, 2024).** Group Relative Policy Optimization: drop PPO's critic; sample a *group* of responses per prompt and use group-relative rewards as the baseline. **Essential — non-negotiable.** *Forward link:* the algorithm behind DeepSeek-R1 and the default for reasoning RL.
- **DeepSeek-AI, "DeepSeek-R1" (arXiv 2501.12948, Jan 2025).** Large-scale RL with verifiable (rule-based) rewards elicits emergent long-chain-of-thought reasoning — including a pure-RL "R1-Zero" with no SFT (AIME 2024 pass@1 rising from 15.6% to 71.0%). **Essential.** *Forward link:* triggered the 2025 RLVR explosion.
- **RL with Verifiable Rewards (RLVR):** term popularized by **Lambert et al., "Tülu 3" (2024).** Use automatically checkable correctness (math answer/unit-test) as reward. **Essential concept.**
- **OpenAI, o1 "Learning to Reason with LLMs" (Sept 2024, blog; no method paper).** Established inference-time-scaling reasoning RL. **Essential context** (note: method details are undisclosed — treat public claims as company-reported).
- **Kimi Team (Moonshot AI), "Kimi k1.5: Scaling RL with LLMs" (arXiv 2501.12599, 2025).** A full RL-scaling recipe emphasizing long-context and a *simplified* policy optimization — deliberately no MCTS, value functions, or PRMs. **Deeper** (excellent contrast to R1).
- **2025 refinements to GRPO/RLVR (read as a cluster):**
  - **DAPO** (Yu et al., ByteDance Seed + Tsinghua; arXiv 2503.14476, 2025): open-source RL system with four fixes over GRPO — Clip-Higher, Dynamic Sampling, token-level loss, overlong-reward shaping. Per the authors, "a state-of-the-art large-scale RL system that achieves 50 points [avg@32] on AIME 2024 using Qwen2.5-32B base model," beating DeepSeek-R1-Zero-Qwen-32B's 47 with ~50% of the training steps (their Table 1 shows naive GRPO reaching only ~30). **Essential (best open recipe).**
  - **Dr. GRPO** (Liu et al., Sea AI Lab/NUS; arXiv 2503.20783, COLM 2025): removes GRPO's length/std normalization bias that inflates wrong-answer length. **Essential (short, clarifying).**
  - **GSPO / Group Sequence Policy Optimization** (Zheng et al., Qwen Team, Alibaba; arXiv 2507.18071, 2025): sequence-level (not token-level) importance ratios; stabilizes MoE RL; used in Qwen3. **Deeper.**
  - **VAPO** (Yue et al., ByteDance Seed; arXiv 2504.05118, 2025): value-based augmented PPO with length-adaptive GAE. Per the authors, it "attains a state-of-the-art score of 60.4" on AIME 2024 with Qwen2.5-32B and "outperforms the previously reported results of DeepSeek-R1-Zero-Qwen-32B and DAPO by more than 10 points" within ~5,000 steps — the "critics are not dead" counterpoint to value-free GRPO/DAPO. **Deeper.**
- **Process reward models (PRMs):** **Lightman et al., "Let's Verify Step by Step" (OpenAI; arXiv 2305.20050, 2023)** — step-level (process) supervision beats outcome supervision on MATH; releases PRM800K. **Essential.** **Wang et al., "Math-Shepherd" (arXiv 2312.08935, 2023; ACL 2024)** — automatic per-step rewards via Monte-Carlo rollouts, no human labels. **Deeper.**
- **Agentic RL (tool-use, multi-turn) — late 2025/2026 frontier:** **Zhang et al., "The Landscape of Agentic RL for LLMs: A Survey" (arXiv 2509.02547, 2025; TMLR 2026)** frames agentic RL as temporally-extended POMDPs and catalogs 500+ works. Representative concrete works: **ToRL** (tool-integrated RL; arXiv 2503.23383), **ToolRL** (arXiv 2504.13958), **VerlTool** (arXiv 2509.01055), and "A Practitioner's Guide to Multi-turn Agentic RL" (arXiv 2510.01132). **Essential survey; Deeper for the individual papers.** *Forward link:* this is where LLM RL is heading in 2026 — the likeliest thesis frontier.

**Exercises:**
1. *After DPO* — train a small reward model on a preference dataset and report held-out pairwise accuracy; run DPO on the same preferences; compare both against the SFT baseline under one stated evaluation, and say what the preference data failed to encode.
2. *After GRPO* — GRPO on a ≤1.5B model for a GSM8K-style task with a rule-based reward; reward and length curves with the budget stated; ablate one DAPO trick with at least 3 seeds per arm; and check whether the effect is bigger than the seed noise before you believe it.

Keep models tiny (≤1.5B, e.g. a Qwen/DeepSeek-Distill-1.5B) so you can iterate. InstructGPT, DPO and GRPO are core; the rest of this line is a specialisation, and a thesis on exploration or continuous control does not need it.

---

## Phase 6 — Specialized tracks (pick per thesis; Weeks 34+)

These are parallel depth modules. Read the track(s) your thesis touches; skim the rest for a mental map.

### 6A. Exploration
- **Bellemare et al., "Unifying Count-Based Exploration and Intrinsic Motivation" (NeurIPS 2016).** Pseudo-counts from density models. **Essential (concept).**
- **Pathak et al., "Curiosity-Driven Exploration by Self-Supervised Prediction (ICM)" (ICML 2017).** Intrinsic reward = forward-model prediction error in a learned feature space. **Essential.** Caveat: the "noisy-TV" failure mode.
- **Burda et al., "Exploration by Random Network Distillation (RND)" (ICLR 2019).** Novelty = error predicting a fixed random net; first to beat average human on Montezuma's Revenge. **Essential** (clean, widely used).
- **Osband et al., "Deep Exploration via Bootstrapped DQN" (NeurIPS 2016).** Posterior-sampling-style exploration via ensemble heads. **Deeper.**
- **Jaksch, Ortner & Auer, "Near-optimal Regret Bounds for Reinforcement Learning (UCRL2)" (JMLR 2010).** Optimism lifted from bandits to *unknown MDPs*: confidence sets over transitions and rewards, optimistic planning inside them, and a regret bound over T steps. **Track requirement (exploration theory).** It sits here rather than with the bandits in Phase 8 because bandit regret and regret in unknown MDPs are different problems; the bonuses in the deep methods above are its heuristic descendants.
- **Ecoffet et al., "Go-Explore" (*Nature* 2021).** Remember and return to promising states, then explore — cracks hard-exploration Atari. **Essential (idea).** *Forward link:* intrinsic-motivation ideas feed NGU/Agent57.

### 6B. Offline / batch RL
- **Levine et al., "Offline RL: Tutorial, Review, and Perspectives" (arXiv 2005.01643, 2020).** **Essential** starting point.
- **Fujimoto et al., "Off-Policy Deep RL without Exploration (BCQ)" (ICML 2019).** Names the distributional-shift/OOD-action problem. **Essential.**
- **Kumar et al., "Conservative Q-Learning (CQL)" (NeurIPS 2020).** Penalize OOD-action Q-values to lower-bound the value. **Essential.**
- **Kostrikov et al., "Offline RL with Implicit Q-Learning (IQL)" (ICLR 2022; arXiv 2110.06169).** Expectile regression avoids querying OOD actions entirely. **Essential.**
- **Fujimoto & Gu, "A Minimalist Approach to Offline RL (TD3+BC)" (NeurIPS 2021).** TD3 + a behavior-cloning term; strong, trivially simple. **Essential.**
- **Chen et al., "Decision Transformer" (NeurIPS 2021)** and **Janner et al., "Trajectory Transformer" (NeurIPS 2021).** Recast offline RL as return-conditioned sequence modeling. **Essential (DT), Deeper (TT).** *Forward link:* the conceptual bridge from RL to sequence models / LLMs.
- **Offline-to-online:** e.g., **Online Decision Transformer** (ICML 2022) and IQL fine-tuning. **Deeper.** Benchmark: **D4RL** (Fu et al. 2020).

### 6C. Imitation learning and inverse RL
- **Behavior cloning** (Pomerleau, ALVINN, 1988) — supervised action prediction. **Essential (concept).**
- **Ross, Gordon & Bagnell, "DAgger" (AISTATS 2011).** Fixes compounding error in BC via interactive expert queries. **Essential.**
- **Ziebart et al., "Maximum Entropy IRL" (AAAI 2008).** Recover a reward under which the expert is optimal, resolving reward ambiguity via max-entropy. **Essential.** *Forward link:* max-ent underlies SAC *and* GAIL.
- **Ho & Ermon, "Generative Adversarial Imitation Learning (GAIL)" (NeurIPS 2016).** Occupancy-measure matching as a GAN; imitate without recovering the reward. **Essential.**
- **Fu, Luo & Levine, "Adversarial IRL (AIRL)" (ICLR 2018).** Recovers a transferable, disentangled reward. **Deeper.**

### 6D. Hierarchical and goal-conditioned RL
- **Sutton, Precup & Singh, "Between MDPs and semi-MDPs: the options framework" (*Artificial Intelligence* 112:181–211, 1999).** Temporally extended actions. **Essential (foundational).**
- **Bacon, Harb & Precup, "The Option-Critic Architecture" (AAAI 2017).** Learn options end-to-end via a policy-gradient theorem for options. **Essential.**
- **Vezhnevets et al., "FeUdal Networks (FuN)" (ICML 2017).** Manager sets latent goals for a worker at different time scales. **Deeper.**
- **Nachum et al., "HIRO" (NeurIPS 2018).** Data-efficient off-policy HRL with goal relabeling. **Deeper.**
- **Schaul et al., "Universal Value Function Approximators (UVFA)" (ICML 2015).** Value functions generalized over goals. **Essential (concept).**
- **Andrychowicz et al., "Hindsight Experience Replay (HER)" (NeurIPS 2017).** Relabel failed trajectories with achieved goals → learn from sparse binary rewards. **Essential.** *Forward link:* a staple of goal-conditioned/robotic RL.

### 6E. Multi-agent RL and game-theoretic RL
- **Tan, "Independent Q-learning" (ICML 1993).** The naive baseline and its non-stationarity problem. **Essential (concept).**
- **Lowe et al., "MADDPG" (NeurIPS 2017).** Centralized-critic, decentralized-actor (CTDE) for mixed cooperative/competitive continuous control. **Essential.**
- **Sunehag et al., "Value-Decomposition Networks (VDN)" (AAMAS 2018)** and **Rashid et al., "QMIX" (ICML 2018; JMLR 2020).** Factor a joint value into per-agent utilities (QMIX with a monotonic mixing net) for cooperative credit assignment. **Essential.**
- **Foerster et al., "Counterfactual Multi-Agent Policy Gradients (COMA)" (AAAI 2018).** Counterfactual baseline for credit assignment. **Deeper.**
- **Vinyals et al., "AlphaStar" (*Nature* 2019)** and **OpenAI et al., "OpenAI Five (Dota 2)" (arXiv 2019).** League/self-play + large-scale PPO/IMPALA at professional level. **Essential (read for the scaling story).**
- **Game-theoretic RL:** **CFR** (Zinkevich et al., NeurIPS 2007; basis of superhuman poker), **PSRO** (Lanctot et al., NeurIPS 2017), and Nash/self-play concepts. **Deeper.**

### 6F. Meta-RL and generalization
- **Duan et al., "RL²" (arXiv 2016)** and **Wang et al., "Learning to RL" (2016).** Encode a fast RL algorithm in an RNN's activations. **Essential (concept).** *Forward link:* the direct ancestor of in-context RL.
- **Finn, Abbeel & Levine, "MAML" (ICML 2017).** Meta-learn an initialization for fast adaptation; applies to RL. **Essential.**
- **Rakelly et al., "PEARL" (ICML 2019).** Off-policy meta-RL via probabilistic task-context inference on top of SAC. **Essential.**
- **Laskin et al., "Algorithm Distillation" (ICLR 2023).** Distill an RL algorithm's *learning history* into a transformer that improves in-context. **Deeper.** *Forward link:* connects meta-RL to LLM in-context learning.
- **Benchmarks:** **Procgen** (Cobbe et al., ICML 2020) for generalization. **Essential (concept).**

### 6G. Representation learning and auxiliary tasks
- **Jaderberg et al., "UNREAL / Reinforcement Learning with Unsupervised Auxiliary Tasks" (ICLR 2017).** Auxiliary prediction/control tasks accelerate RL. **Essential (concept).**
- **Srinivas, Laskin & Abbeel, "CURL" (ICML 2020).** Contrastive auxiliary loss for pixel RL. **Essential.**
- **Laskin et al., "RAD" (NeurIPS 2020)** and **Yarats et al., "DrQ" (ICLR 2021)** / **"DrQ-v2" (arXiv 2107.09645, 2021).** Simple image augmentation alone gives most of the benefit; DrQ-v2 is the first model-free method to solve humanoid-from-pixels. **Essential** (read DrQ; note the CURL-vs-RAD debate that augmentation, not the contrastive loss, drives gains).
- **Schwarzer et al., "Self-Predictive Representations (SPR)" (ICLR 2021).** Self-supervised latent-dynamics prediction for data-efficient Atari. **Essential.** *Forward link:* feeds into BBF.

### 6H. Robotics / sim-to-real (if thesis is embodied)
- **Tobin et al., "Domain Randomization" (IROS 2017)** — randomize sim to bridge to reality. **Essential (concept).**
- **OpenAI et al., "Solving Rubik's Cube with a Robot Hand" (arXiv 2019)** — sim-to-real + automatic domain randomization. **Deeper.**
- **Wu et al., "DayDreamer: World Models for Physical Robot Learning" (CoRL 2023)** — Dreamer on real robots. **Deeper.** Simulators/benchmarks: **MuJoCo/DM Control**, **Isaac Gym/Isaac Lab**.

---

## Phase 7 — Evaluation and experiment design (read alongside Phases 2–6)

Phase 1B taught you to run one comparison honestly. This is the same discipline at the scale of a task suite, and it is where the reporting standards live. Henderson has already been read in Phase 1B.

- **Patterson, Neumann, White & White, "Empirical Design in Reinforcement Learning" (arXiv 2304.01315; JMLR 2024).** How to design an RL experiment whose conclusion survives someone else's rerun: what to control, what to tune, how much to report, and which comparisons are not worth running. **Core.**
- **Comparing runs without fooling yourself.** Independent seeds, paired designs where you can afford them, bootstrap intervals, and an honest account of what a gap between two medians over five runs is worth. **Core.**
- **Agarwal et al., "Deep RL at the Edge of the Statistical Precipice (rliable)" (NeurIPS 2021, outstanding paper).** Report interquartile mean, performance profiles, and stratified bootstrap CIs instead of point means over a few seeds. **Essential — use its tooling in your thesis.**
- **Huang et al., "The 37 Implementation Details of PPO" (ICLR 2022 Blog Track).** **Essential** practical companion to Phase 3.
- **Benchmarks to know:** **Atari ALE** (Bellemare et al. 2013; Machado et al. 2018 revisited protocols), **MuJoCo / DM Control**, **Procgen**, **D4RL** (offline), **MineRL/Minecraft**, **Isaac Gym/Isaac Lab** (massively parallel GPU sim). **Reference** — a catalogue to consult, not a reading list.

**Exercise:** take one comparison you have already run and re-report it properly — IQM with stratified bootstrap confidence intervals, a performance profile, interaction and tuning budgets stated for every arm, and the limitations paragraph you would rather not write.

---

## Phase 7B — Distributed systems and scale (when a project needs it)

Reference material. Come back when your protocol asks for more runs than your machine can deliver — and check first whether vectorisation alone would do it.

- **Horgan et al., "Distributed Prioritized Experience Replay (Ape-X)" (ICLR 2018; arXiv 1803.00933).** Hundreds of actors → shared prioritized buffer → one learner. The distributed-RL mental model.
- **Espeholt et al., "SEED RL" (ICLR 2020; arXiv 1910.06591).** Centralized accelerator-side inference for throughput far above IMPALA.
- **Vectorised, compiled and asynchronous environments.** Most "distributed RL" at small scale is really vectorisation: **EnvPool** (arXiv 2206.10558), **Sample Factory** (ICML 2020; arXiv 2006.11751), and end-to-end JAX pipelines (**PureJaxRL**). Usually the cheapest way to buy the seeds your protocol needs.

---

## Phase 8 — Theory essentials (depth to taste; ongoing)

You don't need all of this for an empirical thesis, but a researcher should know where the guarantees come from.

- **Szepesvári, *Algorithms for Reinforcement Learning* (2010).** Compact, rigorous overview of core algorithms and their analysis. **Essential (reference).**
- **Agarwal, Jiang, Kakade & Sun, *Reinforcement Learning: Theory and Algorithms* (working monograph, 2019–2022).** The modern theory reference: sample complexity, PAC-MDP, policy-gradient convergence, exploration theory. **Essential (theory-track reference).**
- **Convergence of TD/Q-learning:** Tsitsiklis & Van Roy (1997, TD with function approximation); Jaakkola, Jordan & Singh (1994, stochastic-approximation convergence). **Deeper.**
- **Policy-gradient convergence:** Agarwal, Kakade, Lee & Mahajan, "On the Theory of Policy Gradient Methods" (JMLR 2021). **Deeper.**
- **Bandits (foundational to exploration):** UCB (Auer et al. 2002) and Thompson Sampling — regret in the one-state case. **Essential (bandits), Deeper (the proofs).** A good companion is Lattimore & Szepesvári, *Bandit Algorithms* (2020). Regret in *unknown MDPs* (UCRL2) is a different problem and now lives on track 6A.

---

## Recommendations — how to run this, and how to move from reading to research

**The progression (roughly 9–12 months at ~15–20 h/week).** Each stage has evidence that you are ready to leave it — the evidence is a thing you made, not a number of pages read.

| Stage | Main content | Ready to move on when you have |
| --- | --- | --- |
| 1. Readiness and orientation | Maths diagnostic, the environment interface, bandits | A small experiment you can interpret |
| 2. Tabular RL | MDPs, DP, MC, TD, control, importance sampling, Dyna | Correct implementations, and an explanation of what separates them |
| 3. Approximation and deep value learning | Function approximation, the deadly triad, DQN, Double DQN | A debugged agent and a controlled ablation |
| 4. Policy optimisation | REINFORCE, actor-critic, GAE, entropy/KL, PPO, continuous control, SAC | Reproducible experiments under a protocol you wrote first |
| 5. Research sampler | Short introductions to exploration, models, offline RL, imitation | A reasoned choice of one direction |
| 6. Specialisation | One track, with the theory that supports it | Reproduction of a clearly scoped published result |
| 7. Independent investigation | Hypothesis, competing explanations, experiment, analysis | A report with evidence, limitations, and the negative results left in |

Phase 1B and Phase 7 run *alongside* all of it. Phases 4 and 5 are stage-6 specialisations like any other track: model-based and LLM RL are where a lot of current opportunity lives, but neither is a prerequisite for a thesis on exploration, offline RL or continuous control.

**Benchmarks/thresholds that should change what you do:**
- *If your PPO cannot solve CartPole reliably, or cannot reach a reference implementation's score on your chosen MuJoCo task*, stop and debug (revisit the "37 details") before advancing — broken foundations compound. State the threshold properly before you use it as one: the environment and its version (e.g. HalfCheetah-v4), the interaction budget (e.g. 1M steps), the evaluation protocol (e.g. 10 deterministic episodes), and the reference number you are comparing against, with its uncertainty. A bare "~2000 on HalfCheetah" is not a checkpoint, because it does not say at what budget, under which version, or measured how.
- *If you can't reproduce a paper's reported number within its stated seeds/variance*, that is an observation, not yet a result. The research is establishing the cause — implementation difference, hyperparameters, environment version, evaluation protocol, or nothing but seed noise — and then its robustness and significance. Reproducibility work is a legitimate contribution (per Henderson/Agarwal), but the contribution is the explanation, not the discrepancy. Stage 7 is this loop written out in full.
- *If a track's papers start feeling incremental and you can predict the next one*, you've found the research frontier — that's your signal to stop reading and start proposing.

**Picking a thesis topic (concrete process):**
1. **Choose a sub-area and reproduce one clean baseline** end-to-end (e.g., GRPO on GSM8K with a 1.5B model via verl; or DrQ-v2 on DM Control; or CQL on D4RL). Reproduction surfaces the real open problems faster than more reading.
2. **Instrument with rliable from day one** — pick tasks small enough to run 5–10 seeds. A rigorous, well-evaluated small study beats an under-powered ambitious one.
3. **Find your gap** by reading the "Limitations/Future Work" of 5–10 recent papers in your chosen area and the relevant survey (e.g., the Agentic RL survey, arXiv 2509.02547; Levine's offline-RL tutorial).

**Most active / promising areas as of early 2026 (opinionated, and dated on purpose — re-check before you commit to one):**
- **RL for LLM reasoning and agents (highest activity).** Open questions: credit assignment in long multi-turn/agentic trajectories (GRPO gives one terminal reward); reward hacking under verifiable rewards; process vs outcome rewards; whether critics (VAPO) beat critic-free (GRPO/DAPO) at scale; RL that expands (not just sharpens) a base model's capabilities. Tooling: verl, TRL, OpenRLHF.
- **Sample-efficient and scalable value-based RL** (BBF, high replay ratios, plasticity/loss-of-plasticity and network resets).
- **Model-based RL at scale** (DreamerV3, TD-MPC2; world models from video/Genie-style).
- **Rigorous evaluation and reproducibility** (rliable-style methodology; benchmark design) — an underrated, tractable, high-impact thesis area for a strong programmer.
- **Offline and offline-to-online RL** for real-world/robotics deployment.

**Practical guardrails:** keep a lab notebook of every run (seed, config, commit); prefer single-file references (CleanRL/PureJaxRL) when learning, mature libraries (SB3, verl) when scaling; and default to small, fast environments so you can iterate — compute discipline is a research skill, not a limitation.

---

## Caveats

- **Coverage vs. completeness.** This is a curated near-complete map, not a literal list of "all" RL methods — the field produces thousands of papers a year. The Essential spine is deliberately small; the Deeper items are optional depth. Notable omissions you may add per interest: safe/constrained RL (CPO), risk-sensitive RL, average-reward RL, evolutionary strategies (Salimans et al. 2017), successor features, and Muesli/DreamerV3-style unified agents.
- **Verification and dates.** Years/venues were cross-checked against arXiv/PMLR/OpenReview/dblp. Recurring ambiguity: arXiv/submission year vs. published year (DQN 2013→2015; R2D2 2018→ICLR 2019; DreamerV3 2023 arXiv→*Nature* 2025). Where a work is company-reported without a method paper (OpenAI o1), treat performance claims as not independently verified.
- **The frontier moves fast.** Phase 5's 2025–2026 items (DAPO, GSPO, Dr. GRPO, VAPO, agentic-RL survey) are recent and partly pre-peer-review; expect the specific "best recipe" to change within months even as the underlying ideas (verifiable rewards, group-relative baselines, process supervision) persist. Re-check the latest surveys before committing a thesis to a specific method.
- **Skippability is a judgment call.** The tiers reflect a generalist path to research competence; for a thesis squarely in one track (e.g. distributional RL, multi-agent), several of that track's Reference items become required. Adjust to your topic — that is what choosing a track on the map does.
- **Opinions have dates.** Judgements like "the best open recipe" or "the likeliest thesis frontier" are snapshots of early 2026, offered to help you explore rather than to fix anyone's route. Where the map states one, it says so; treat any of them older than a few months as a hypothesis to re-check, not a finding.
