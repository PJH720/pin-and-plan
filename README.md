# Pin & Plan 📌

> **Seated, hands-only WebXR morning planner in passthrough AR for Meta Quest 3 & Quest 3S — with interactive Desktop Preview.**  
> Built for the **Meta VR Start Developer Competition 2026** · *Productivity Track (New Experience Division)*

<p align="center">
  <img src="pin-and-plan-media/03-pinned-task-and-orb-pulse.png" alt="Pin & Plan — Hands-Only Meta Quest 3 Passthrough AR Morning Planner" width="92%" />
</p>

---

## 🔗 Quick Links

- 🚀 **Live WebXR App (with Desktop Preview):** [https://pin-and-plan.vercel.app](https://pin-and-plan.vercel.app)
- 🏆 **Devpost Project:** [https://devpost.com/software/pin-plan](https://devpost.com/software/pin-plan)
- 📺 **Demonstration Video:** [Watch on YouTube](https://youtu.be/hPLJEprhNcc) · [Local MP4](pin-and-plan-media/pin-and-plan-demo.mp4)

---

## 💡 Overview & The Interaction Loop

Traditional productivity tools break down in spatial computing when they replicate 2D floating windows or controller menus. **Pin & Plan** reimagines morning scheduling as a calm, architectural, tactile ritual right in your sunlit room via Meta Quest 3 passthrough AR.

Instead of an opaque AI black box that removes your autonomy, Pin & Plan uses a collaborative **"Pin → Hand Over → Take Back"** agentic loop:

```
[ 1. Pin ]                 [ 2. Hand Over ]                  [ 3. Take Back ]
Grab & drop 1–2       →    Pinch the frosted pearl      →    Move any placed task.
priority tasks onto        Agent Orb. It places the          It locks as your pin,
morning time blocks.       remaining tasks step-by-step      and the agent re-plans
                           with cream-paper XAI chips.       only affected tasks.
```

1. **Pin (User Agency):** Grab and drop your non-negotiable tasks (*Exercise*, *Deep work*, etc.) onto warm smoked-stone frosted glass time blocks (`09:00 – 12:00`, `13:00 – 18:00`, `19:00 – 21:00`, `22:00`). Hovering illuminates valid blocks in warm champagne (or signals clay-crimson if a block already holds 2 pins), and pinned tasks lock with a brushed-brass pin emblem.
2. **Hand Over (Agent Collaboration):** Pinch the tactile **Frosted Pearl-Opal Agent Orb** on your right. The deterministic scheduler evaluates fixed times, urgency, energy alignment, and block capacities—flying unassigned tasks along smooth 3D arcs (0.5 s apart) while displaying crisp warm-paper 3D reason chips (`"Fixed time"`, `"Urgent → first"`, `"09:00–12:00 full → next"`).
3. **Take Back (Fluid Control):** Disagree with the agent? Move any agent-placed task to another block. It promotes immediately to a user pin and the agent minimally re-plans only the affected tasks.

---

## 📸 Visual Walkthrough & Meta Quest 3 Passthrough Gallery

<table width="100%">
  <tr>
    <td width="50%" align="center">
      <img src="pin-and-plan-media/01-landing-enter-ar.png" width="100%" alt="01 Sunlit Desktop Preview & Enter AR" />
      <br /><b>01. Interactive Preview &amp; Enter AR</b><br /><sub>Procedural sunlit morning room backdrop, daylight glass HUD, and instant pointer preview</sub>
    </td>
    <td width="50%" align="center">
      <img src="pin-and-plan-media/02-passthrough-intro-and-hint.png" width="100%" alt="02 Meta Quest 3 Passthrough AR Intro" />
      <br /><b>02. Meta Quest 3 Passthrough AR</b><br /><sub>Real room passthrough with bare hands, smoked-stone panels, and onboarding hint</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="pin-and-plan-media/03-pinned-task-and-orb-pulse.png" width="100%" alt="03 Hand-Pinned Task & Pulsing Pearl Orb" />
      <br /><b>03. Hand-Pinned Task &amp; Inviting Pearl Orb</b><br /><sub>Brushed-brass pin locks your decision; frosted pearl orb pulses ready for hand-over</sub>
    </td>
    <td width="50%" align="center">
      <img src="pin-and-plan-media/04-agent-staged-reason-chips.png" width="100%" alt="04 Staged Agent Placement & Cream-Paper XAI Chips" />
      <br /><b>04. Staged Placement &amp; 3D XAI Chips</b><br /><sub>Parabolic flight arcs paired with warm cream-paper reason chips explaining each rule</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="pin-and-plan-media/05-day-planned-card-and-chips.png" width="100%" alt="05 Day Planned Completion in Quest 3 AR" />
      <br /><b>05. "Day Planned" Completion</b><br /><sub>Botanical sage glass banner and calm settled sage-pearl orb</sub>
    </td>
    <td width="50%" align="center">
      <img src="pin-and-plan-media/06-take-back-and-replan.png" width="100%" alt="06 Take Back & Minimal Replan in Quest 3 AR" />
      <br /><b>06. Take Back &amp; Minimal Re-Planning</b><br /><sub>Grab any scheduled task to override; earlier user pins always hold</sub>
    </td>
  </tr>
</table>

---

## ⚡ Technical Highlights

- **100% Hands-Only WebXR Verified on Meta Quest 3 Emulator (IWER) + Interactive Desktop Preview:** Built for Meta Quest 3/3S natural hand tracking via `@iwsdk/core` 1.1 (`immersive-ar`, `useHandPinchForGrab`, zero controllers). Verified end-to-end in Meta Quest 3 `sunlit_living_room` passthrough using tracked bare hands (`Pin → Hand Over → Take Back → Reset`). On standard desktop or mobile browsers without a headset, a responsive procedural sunlit morning room and pointer preview let anyone try the full loop immediately alongside a native `popover` AR setup guide.
- **Zero Downloaded External Assets & Quest 3 Performance Budget:** Every mesh, rounded smoked-stone panel (`512×728` mipmapped `CanvasTexture` with `LinearMipmapLinearFilter` & `anisotropy = 4`), procedural GLSL Frosted Pearl-Opal Agent Orb (`ShaderMaterial`), procedural Non-XR sunlit backdrop (auto-hidden in XR), and harmonic WebAudio sound cue is generated in code. Verified runtime telemetry in Quest 3 stereo XR: **40 total draw calls (~20 per eye)**, **0 shadow casters**, zero post-processing, and zero per-frame allocations.
- **Deterministic Pure Planner Engine:** Decoupled TypeScript scheduling & diffing core (`src/planner/`) with zero DOM/Three.js dependencies—verified by **40 automated Vitest tests** (34 scheduling/determinism cases + 6 spatial motion curve tests).
- **Seated Ergonomic Geometry:** Anchored to the user's head pose at session start within a 60 cm reach envelope (`±60°` arc, `≥ 12 cm` spacing between all grabbables to eliminate hand grip-space neighbor grabs).

---

## 📂 Repository Structure

```
.
├── README.md                   # Project overview & Quest 3 visual walkthrough
├── index.html                  # WebXR entry point
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
├── vitest.config.ts            # Unit test configuration
├── iwsdk.config.json           # Meta Immersive Web SDK configuration
├── pin-and-plan-media/         # Meta Quest 3 AR & Desktop Preview screenshots + demo MP4
└── src/
    ├── planner/                # Pure deterministic scheduling engine (0 DOM/3D imports)
    │   ├── plan.ts             # 4-pass deterministic scheduler
    │   ├── diff.ts             # Minimal delta calculator (moves vs. slides)
    │   ├── content.ts          # Morning blocks & task metadata
    │   ├── types.ts            # Core data models
    │   └── plan.test.ts        # 34 Vitest scheduling & determinism tests
    ├── design/                 # Unified Architectural Spatial + Web Design System
    │   ├── tokens.ts           # Warm daylight palette, typography, canvas & motion tokens
    │   ├── canvas.ts           # Mipmapped high-DPI rounded glass & vector UI renderer
    │   ├── shaders.ts          # Procedural GLSL Frosted Pearl-Opal Orb & halo shaders
    │   ├── motion.ts           # Allocation-free arcs, spring settles, shakes
    │   └── motion.test.ts      # 6 Vitest animation curve tests
    ├── scene/                  # WebXR 3D workspace & interaction systems
    │   ├── layout.ts           # 60 cm seated arc coordinates & spacing
    │   ├── rig.ts              # Smoked-stone panels, matte ceramic cards, pearl orb, tray
    │   ├── room-backdrop.ts    # Procedural Non-XR sunlit morning room (auto-hidden in XR)
    │   ├── planner-system.ts   # ECS state machine, staged queue, hover affordances
    │   ├── desktop-pointer.ts  # Non-XR pointer preview adapter (inert in WebXR)
    │   └── commands.ts         # Diff-driven scene command types
    ├── feedback/               # Multimodal XAI & audio feedback
    │   ├── chips.ts            # Pooled animated 3D cream-paper reason chips
    │   ├── end-card.ts         # Animated "Day planned" botanical sage banner
    │   ├── hint.ts             # Onboarding ghost arc + 4-state pearl orb animator
    │   └── sounds.ts           # Procedural harmonic WebAudio foley
    ├── ui/
    │   └── hud.ts              # Compact daylight header, dock & native top-layer AR popover
    ├── styles/
    │   └── hud.css             # Architectural warm-glass HUD, linear() spring, @starting-style
    └── index.ts                # Application bootstrap & responsive preview camera
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

# Run all 40 unit tests (planner + motion curves)
pnpm test

# Start the local development server
pnpm dev

# Type-check & build for production
pnpm exec tsc --noEmit && pnpm build
```

### Trying Pin & Plan
- **Meta Quest 3 / Quest 3S (Recommended — Hands-Only Passthrough AR):** Open [https://pin-and-plan.vercel.app](https://pin-and-plan.vercel.app) in **Meta Quest Browser** and pinch **Enter AR**.
- **Desktop Chrome Emulator (IWER):** Install the **Immersive Web Emulator (IWER)** extension → open DevTools **WebXR** tab → select **Meta Quest 3** with **Hand Tracking** → click **Enter AR**.
- **Desktop / Mobile Browser (Instant Preview):** Visit [https://pin-and-plan.vercel.app](https://pin-and-plan.vercel.app) and drag any task token onto a block, click the frosted pearl orb on the right, drag placed tasks to take back control, or click the reset button on the left.

---

## 📜 License

MIT License
