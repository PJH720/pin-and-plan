# Pin & Plan 📌

> **Seated, hands-only WebXR morning planner in passthrough AR for Meta Quest 3 & Quest 3S.**  
> Built for the **Meta VR Start Developer Competition 2026** · *Productivity Track (New Experience Division)*

---

## 🔗 Quick Links

- 🚀 **Live WebXR App:** [https://pin-and-plan.vercel.app](https://pin-and-plan.vercel.app)
- 🏆 **Devpost Project:** [https://devpost.com/software/pin-plan](https://devpost.com/software/pin-plan)
- 📺 **Demonstration Video:** [Watch on YouTube](https://youtu.be/hPLJEprhNcc)

---

## 💡 Overview & The Interaction Loop

Traditional productivity tools fail in spatial computing when they replicate 2D floating windows or laser-pointer menus. **Pin & Plan** reimagines morning scheduling as a physical, tactile ritual at your real-world desk using passthrough augmented reality.

Instead of an opaque AI black box that takes away your autonomy, Pin & Plan implements a collaborative **"Pin → Hand Over → Take Back"** agentic interaction model:

```
[ 1. Pin ]                 [ 2. Hand Over ]                  [ 3. Take Back ]
User pinches 1-2      →    User pinches glowing Orb     →    User moves any task.
priority tasks into        Deterministic agent places        It becomes a locked pin,
morning time blocks.       remaining tasks with staged       and the agent re-plans
                           timing and reason chips.          only the affected tasks.
```

1. **Pin (User Agency):** Grab and drop your non-negotiable tasks (e.g. *Exercise*, *Deep work*) into morning time blocks (`09:00–12:00`, `13:00–18:00`, `19:00–21:00`, `22:00`). User-placed tokens show a bright yellow pin indicator and are permanently locked.
2. **Hand Over (Agent Collaboration):** Pinch the pulsing violet Agent Orb on your right. The deterministic planner evaluates energy curves, fixed constraints, urgency, and block capacities. It places the unassigned tasks one by one (0.5s intervals) while showing real-time 3D reason chips (e.g. `"Fixed time"`, `"Urgent → first"`, `"09:00–12:00 full → next"`).
3. **Take Back (Fluid Control):** Disagree with the agent? Simply reach out and move any agent-placed task to a different block. It instantly promotes to a user pin, and the agent re-plans only the affected tasks without disrupting your schedule.

---

## ⚡ Technical Highlights

- **100% Hands-Only Experience:** No controllers, no virtual laser pointers, no pinch keyboards. Fully driven by Meta Quest natural hand tracking via Meta Immersive Web SDK (`@immersive-web/sdk` 1.1).
- **Zero Downloaded Assets:** All 3D geometry (tokens, drop zones, orbs, status cards) is generated procedurally with Three.js. Labels use high-DPI canvas textures. Audio uses the WebAudio API with procedural synthesizer nodes. **Instant load under 1 second.**
- **Deterministic Pure Planner:** No unpredictable LLMs, no hallucinated schedules, and zero network latency. The scheduler is a pure functional engine with 34 automated unit tests covering constraints, energy alignment, and capacity bounds.
- **Seated Ergonomic Design:** Calibrated for desk work. Everything is positioned in a 100-degree arc within a 60 cm reach radius, tilted 15 degrees upward to eliminate neck strain.
- **Stable 60 FPS in Passthrough AR:** Lightweight footprint and zero asset overhead guarantee smooth 60 FPS performance on Meta Quest 3 and Quest 3S.

---

## 📂 Repository Structure

```
.
├── README.md               # Main project documentation
├── LICENSE                 # Project License
├── index.html              # WebXR entry point with Enter AR overlay
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration with HTTPS support
├── vitest.config.ts        # Unit test runner configuration
├── iwsdk.config.json       # Meta Immersive Web SDK config
└── src/
    ├── planner/            # Pure deterministic scheduling engine
    │   ├── plan.ts         # Core scheduling algorithm
    │   ├── plan.test.ts    # 34 Vitest unit tests
    │   ├── content.ts      # Default morning tasks & metadata
    │   ├── diff.ts         # Schedule delta calculation
    │   └── types.ts        # Data models (Task, Block, Pin, PlanResult)
    ├── scene/              # WebXR 3D scene & interaction systems
    │   ├── layout.ts       # Seated arc coordinates & ergonomic spacing
    │   ├── rig.ts          # IWSDK components, tokens, drop zones, agent orb
    │   ├── planner-system.ts # Agentic loop, staged placing, take-back
    │   ├── labels.ts       # Canvas procedural typography textures
    │   ├── commands.ts     # State inspection & emulator command bridge
    │   └── enter-ar.ts     # WebXR session request & capability checks
    ├── feedback/           # Multimodal sensory feedback
    │   ├── sounds.ts       # Procedural WebAudio synth (grab, snap, agent, end)
    │   ├── chips.ts        # 3D reason chips displaying agent logic
    │   ├── hint.ts         # Visual onboarding ghost marker (no text)
    │   └── end-card.ts     # "Day planned" card & reset button
    └── index.ts            # App bootstrap and IWSDK initialization
```

---

## 🛠️ Local Development & Testing

### Prerequisites
- Node.js 20+
- `pnpm` 9+ (recommended) or `npm`

### Setup & Run
```bash
# Install dependencies
pnpm install

# Run the test suite (34 passing unit tests)
pnpm test

# Start the local development server (with HTTPS for WebXR)
pnpm dev

# Build for production
pnpm build
```

### Testing WebXR Hands-Only in Desktop Browser
1. Install the [Immersive Web Early Adopter (IWER)](https://chrome.google.com/webstore) Chrome extension.
2. In Chrome DevTools, open the **WebXR** tab.
3. Select **Meta Quest 3** as the device.
4. Enable **Hand Tracking** (under Input).
5. Open `https://localhost:5173`, click **Enter AR**, and use the emulator controls to test pinch, drag, drop, and agent interactions.

### Testing on Meta Quest 3 / Quest 3S
1. Put on your Meta Quest headset.
2. Open the **Meta Quest Browser**.
3. Visit [https://pin-and-plan.vercel.app](https://pin-and-plan.vercel.app).
4. Tap **Enter AR** and place your hands in front of you.

---

## 🧪 Testing the Engine

The scheduling engine is fully decoupled from WebXR and tested with Vitest:

```bash
pnpm test
```

Test coverage includes:
- Fixed-time task placement (e.g. 09:30 standup).
- High-energy task alignment with morning peak blocks.
- Urgency-based ordering and priority resolution.
- Capacity constraints (block overflow handling).
- User pin preservation and immutable locking.
- Re-planning delta calculations for take-back interactions.

---

## 📜 License

MIT License
