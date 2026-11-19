import { VisibilityState, type World } from '@iwsdk/core';
import { unlockAudio } from '../feedback/sounds.js';
import { TASKS } from '../planner/content.js';
import type { PlannerSnapshot, PlannerSystem } from '../scene/planner-system.js';

const POPOVER_ID = 'xr-setup-guide';

let cachedDisplayTransitionSupport: boolean | undefined;

/**
 * Probes whether discrete `display` transitions actually hold `display: block`
 * during exit (avoids Firefox false-positive on CSS.supports).
 */
function canTransitionDisplay(): boolean {
  if (cachedDisplayTransitionSupport !== undefined) {
    return cachedDisplayTransitionSupport;
  }
  if (
    typeof window === 'undefined' ||
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    document.body === null
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  void getComputedStyle(probe).display;
  probe.style.display = 'none';
  cachedDisplayTransitionSupport = getComputedStyle(probe).display === 'block';
  probe.remove();
  return cachedDisplayTransitionSupport;
}

function supportsTopLayerExit(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.CSS?.supports?.('overlay', 'auto')) &&
    canTransitionDisplay()
  );
}

function hasNativePopover(): boolean {
  return (
    typeof HTMLElement !== 'undefined' &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover')
  );
}

async function isImmersiveArSupported(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.xr) {
    return false;
  }
  try {
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

function openGuidePopover(popover: HTMLElement): void {
  if (hasNativePopover()) {
    if (!popover.matches(':popover-open')) {
      popover.showPopover();
    }
    return;
  }
  popover.setAttribute('data-fallback-open', '');
  popover.hidden = false;
}

async function closeGuidePopover(popover: HTMLElement): Promise<void> {
  if (!hasNativePopover()) {
    popover.removeAttribute('data-fallback-open');
    popover.hidden = true;
    return;
  }
  if (!popover.matches(':popover-open')) {
    return;
  }
  if (!supportsTopLayerExit()) {
    popover.setAttribute('data-closing', '');
    const animations = popover.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    }
    if (!popover.hasAttribute('data-closing')) {
      return;
    }
    popover.removeAttribute('data-closing');
  }
  popover.hidePopover();
}

function hintForPhase(snapshot: PlannerSnapshot, arSupported: boolean): string {
  if (arSupported) {
    return 'Tap Enter AR to plan your morning hands-only in passthrough';
  }
  if (snapshot.phase === 'agent') {
    return 'Agent scheduling remaining tasks with live reason chips…';
  }
  if (snapshot.phase === 'done') {
    return 'Day planned — drag any task to another block to take back & re-plan';
  }
  if (snapshot.phase === 'pinning') {
    return 'Pinned! Click the glowing violet orb on the right to hand over the rest';
  }
  return 'Interactive Preview: Drag any task onto a time block, or click the glowing orb';
}

/**
 * Mounts the sleek, content-first Spatial Web HUD (compact top bar, bottom
 * frosted dock, and on-demand native popover AR Setup Guide).
 * Automatically hidden inside WebXR sessions so passthrough AR stays 100% pure.
 */
export function mountHud(world: World, planner: PlannerSystem): () => void {
  const nativePopover = hasNativePopover();

  // 1. Compact single-row top header
  const header = document.createElement('header');
  header.className = 'hud-header';
  header.innerHTML = `
    <div class="hud-brand">
      <span class="hud-orb-dot" aria-hidden="true"></span>
      <span class="hud-title">Pin &amp; Plan</span>
      <span class="hud-sep" aria-hidden="true">|</span>
      <span class="hud-progress" data-progress>0 / ${TASKS.length} scheduled</span>
    </div>
    <span class="hud-status" data-status>
      <span class="hud-status-dot" aria-hidden="true"></span>
      <span data-status-label>Checking WebXR…</span>
    </span>
  `;

  const progressEl = header.querySelector('[data-progress]') as HTMLSpanElement;
  const statusEl = header.querySelector('[data-status]') as HTMLSpanElement;
  const statusLabelEl = header.querySelector(
    '[data-status-label]',
  ) as HTMLSpanElement;

  // 2. Native on-demand top-layer Popover for WebXR / IWER setup instructions
  const popover = document.createElement('aside');
  popover.id = POPOVER_ID;
  popover.className = 'hud-popover';
  popover.setAttribute('aria-labelledby', 'xr-guide-title');
  if (nativePopover) {
    popover.setAttribute('popover', 'auto');
  } else {
    popover.hidden = true;
  }
  popover.innerHTML = `
    <div class="hud-popover-head">
      <h2 id="xr-guide-title" class="hud-popover-title">
        <span class="hud-orb-dot" aria-hidden="true"></span>
        WebXR Passthrough AR Setup
      </h2>
      <button type="button" class="hud-popover-close" data-close aria-label="Close guide">×</button>
    </div>
    <p class="hud-popover-lead">
      <strong>Pin &amp; Plan</strong> uses hands-only WebXR (<code>immersive-ar</code>). You can already drag tokens and click the Agent Orb right here in Desktop Preview, or launch full Passthrough AR:
    </p>
    <ul class="hud-popover-steps">
      <li class="hud-popover-step">
        <strong>Meta Quest 3 / 3S:</strong> Open this URL in <strong>Meta Quest Browser</strong> and pinch <strong>Enter AR</strong>.
      </li>
      <li class="hud-popover-step">
        <strong>Desktop Chrome (Emulator):</strong> Install the <strong>Immersive Web Emulator (IWER)</strong> extension → open DevTools <strong>WebXR</strong> tab → choose <strong>Meta Quest 3</strong> with <strong>Hand Tracking</strong> → click <strong>Enter AR</strong>.
      </li>
    </ul>
    <div class="hud-popover-footer">
      <span style="color:var(--ink-muted);">Zero controllers · 60 cm seated reach</span>
      <div class="hud-popover-links">
        <a href="https://youtu.be/hPLJEprhNcc" target="_blank" rel="noopener noreferrer">Demo Video ↗</a>
        <a href="https://github.com/PJH720/pin-and-plan" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
      </div>
    </div>
  `;

  const closeBtn = popover.querySelector('[data-close]') as HTMLButtonElement;
  closeBtn.addEventListener('click', () => {
    void closeGuidePopover(popover);
  });

  // 3. Compact bottom floating dock
  const dockWrap = document.createElement('div');
  dockWrap.className = 'hud-dock-wrap';

  const hintEl = document.createElement('p');
  hintEl.className = 'hud-hint';
  hintEl.textContent =
    'Interactive Preview: Drag any task onto a time block, or click the glowing orb';

  const dock = document.createElement('nav');
  dock.className = 'hud-dock';
  dock.setAttribute('aria-label', 'Workspace controls');

  const enterButton = document.createElement('button');
  enterButton.type = 'button';
  enterButton.className = 'hud-btn-primary';
  enterButton.textContent = 'Enter AR';

  const guideButton = document.createElement('button');
  guideButton.type = 'button';
  guideButton.className = 'hud-btn-ghost';
  guideButton.textContent = 'AR Guide';
  if (nativePopover) {
    guideButton.setAttribute('popovertarget', POPOVER_ID);
  } else {
    guideButton.addEventListener('click', () => {
      if (popover.hasAttribute('data-fallback-open')) {
        void closeGuidePopover(popover);
      } else {
        openGuidePopover(popover);
      }
    });
  }

  const demoLink = document.createElement('a');
  demoLink.className = 'hud-btn-ghost';
  demoLink.href = 'https://youtu.be/hPLJEprhNcc';
  demoLink.target = '_blank';
  demoLink.rel = 'noopener noreferrer';
  demoLink.textContent = 'Demo ↗';

  const repoLink = document.createElement('a');
  repoLink.className = 'hud-btn-ghost';
  repoLink.href = 'https://github.com/PJH720/pin-and-plan';
  repoLink.target = '_blank';
  repoLink.rel = 'noopener noreferrer';
  repoLink.textContent = 'GitHub ↗';

  dock.append(enterButton, guideButton, demoLink, repoLink);
  dockWrap.append(dock);

  let arSupported = false;
  let latestSnapshot: PlannerSnapshot = window.__planner;

  const refreshText = (): void => {
    const placed = latestSnapshot.placements.length;
    const pinned = Object.keys(latestSnapshot.pins).length;
    progressEl.textContent =
      latestSnapshot.phase === 'done'
        ? 'Day planned · 6 / 6'
        : pinned > 0
          ? `${placed} / ${TASKS.length} scheduled · ${pinned} pinned`
          : `${placed} / ${TASKS.length} scheduled`;
    hintEl.textContent = hintForPhase(latestSnapshot, arSupported);
  };

  void isImmersiveArSupported().then((supported) => {
    arSupported = supported;
    if (supported) {
      statusEl.dataset.state = 'ready';
      statusLabelEl.textContent = 'WebXR AR Ready';
    } else {
      statusEl.dataset.state = 'preview';
      statusLabelEl.textContent = 'Desktop Preview · AR on Quest / IWER';
    }
    refreshText();
  });

  enterButton.addEventListener('click', async () => {
    unlockAudio();
    const supported = await isImmersiveArSupported();
    arSupported = supported;
    if (!supported) {
      openGuidePopover(popover);
      return;
    }
    try {
      world.launchXR();
    } catch {
      openGuidePopover(popover);
    }
  });

  const unsubscribePlanner = planner.subscribe((snapshot) => {
    latestSnapshot = snapshot;
    refreshText();
  });

  const unsubscribeVisibility = world.visibilityState.subscribe((state) => {
    const isNonImmersive = state === VisibilityState.NonImmersive;
    header.hidden = !isNonImmersive;
    hintEl.hidden = !isNonImmersive;
    dockWrap.hidden = !isNonImmersive;
    if (!isNonImmersive) {
      void closeGuidePopover(popover);
    }
  });

  document.body.append(header, hintEl, dockWrap, popover);

  return () => {
    unsubscribePlanner();
    unsubscribeVisibility();
    header.remove();
    hintEl.remove();
    dockWrap.remove();
    popover.remove();
  };
}
