import { VisibilityState, type World } from '@iwsdk/core';
import { unlockAudio } from '../feedback/sounds.js';

const HEADER_STYLE = [
  'position:fixed',
  'top:18px',
  'left:50%',
  'transform:translateX(-50%)',
  'width:min(92vw, 880px)',
  'display:flex',
  'align-items:center',
  'justify-content:space-between',
  'gap:12px',
  'padding:10px 16px',
  'background:rgba(255,255,255,0.72)',
  'backdrop-filter:blur(16px)',
  '-webkit-backdrop-filter:blur(16px)',
  'border:1px solid rgba(15,23,42,0.08)',
  'border-radius:999px',
  'box-shadow:0 4px 20px rgba(15,23,42,0.06)',
  'box-sizing:border-box',
  'z-index:10',
].join(';');

const DOCK_WRAPPER_STYLE = [
  'position:fixed',
  'left:50%',
  'bottom:22px',
  'transform:translateX(-50%)',
  'display:flex',
  'flex-direction:column',
  'align-items:center',
  'gap:10px',
  'width:min(92vw, 540px)',
  'z-index:10',
].join(';');

const NOTICE_CARD_STYLE = [
  'width:100%',
  'padding:14px 18px',
  'background:rgba(255,255,255,0.82)',
  'backdrop-filter:blur(20px)',
  '-webkit-backdrop-filter:blur(20px)',
  'border:1px solid rgba(15,23,42,0.09)',
  'border-radius:18px',
  'box-shadow:0 12px 32px rgba(15,23,42,0.08)',
  'color:#1e293b',
  'font-size:13px',
  'line-height:1.5',
  'box-sizing:border-box',
].join(';');

const DOCK_STYLE = [
  'display:inline-flex',
  'align-items:center',
  'gap:8px',
  'padding:6px',
  'background:rgba(255,255,255,0.86)',
  'backdrop-filter:blur(16px)',
  '-webkit-backdrop-filter:blur(16px)',
  'border:1px solid rgba(15,23,42,0.08)',
  'border-radius:999px',
  'box-shadow:0 8px 24px rgba(15,23,42,0.1)',
].join(';');

const BUTTON_STYLE = [
  'padding:12px 30px',
  'font:600 15px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif',
  'letter-spacing:-0.01em',
  'color:#ffffff',
  'background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)',
  'border:0',
  'border-radius:999px',
  'cursor:pointer',
  'box-shadow:0 4px 14px rgba(79,70,229,0.35)',
  'transition:transform 0.15s ease,opacity 0.15s ease,box-shadow 0.15s ease',
].join(';');

const SECONDARY_LINK_STYLE = [
  'padding:10px 16px',
  'font:500 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif',
  'color:#334155',
  'text-decoration:none',
  'border-radius:999px',
  'background:rgba(15,23,42,0.04)',
  'transition:background 0.15s ease',
].join(';');

function createHeader(): {
  root: HTMLDivElement;
  statusPill: HTMLSpanElement;
} {
  const root = document.createElement('div');
  root.style.cssText = HEADER_STYLE;

  const brand = document.createElement('div');
  brand.style.cssText =
    'display:flex;align-items:center;gap:10px;min-width:0;';
  brand.innerHTML = `
    <span style="width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 0 10px rgba(99,102,241,0.5);flex-shrink:0;"></span>
    <span style="font-weight:700;font-size:15px;color:#0f172a;letter-spacing:-0.02em;white-space:nowrap;">Pin &amp; Plan</span>
    <span style="color:#cbd5e1;font-size:13px;">|</span>
    <span style="font-size:13px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Hands-Only WebXR Morning Planner</span>
  `;

  const statusPill = document.createElement('span');
  statusPill.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:6px',
    'padding:5px 11px',
    'border-radius:999px',
    'font-size:12px',
    'font-weight:600',
    'white-space:nowrap',
    'flex-shrink:0',
    'background:rgba(15,23,42,0.05)',
    'color:#475569',
  ].join(';');
  statusPill.textContent = 'Checking WebXR…';

  root.append(brand, statusPill);
  return { root, statusPill };
}

function createUnsupportedNotice(): HTMLDivElement {
  const card = document.createElement('div');
  card.style.cssText = NOTICE_CARD_STYLE;
  card.hidden = true;
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:7px;font-weight:600;font-size:13.5px;color:#0f172a;">
        <span style="width:7px;height:7px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></span>
        WebXR Passthrough AR requires a headset or emulator
      </div>
      <button type="button" data-dismiss aria-label="Dismiss notice" style="border:0;background:transparent;color:#94a3b8;font-size:16px;line-height:1;cursor:pointer;padding:2px 4px;">×</button>
    </div>
    <p style="margin:0 0 8px 0;color:#475569;font-size:12.5px;">
      This app runs in <code>immersive-ar</code> with natural hand tracking. Standard desktop &amp; mobile browsers cannot start AR sessions directly.
    </p>
    <div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:#334155;">
      <span><strong>Quest 3 / 3S:</strong> Open in Meta Quest Browser</span>
      <span><strong>Desktop Chrome:</strong> Enable IWER Extension (Quest 3 + Hand Tracking)</span>
    </div>
  `;
  const dismiss = card.querySelector('[data-dismiss]') as HTMLButtonElement;
  dismiss.addEventListener('click', () => {
    card.hidden = true;
  });
  return card;
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

/**
 * Page button that starts the AR session. In the headset browser a hand pinch
 * on it is the click, so no controller is needed.
 * Presents a sleek, non-intrusive HUD framing the 3D scene and clear English
 * instructions on standard browsers that lack immersive-ar support.
 */
export function mountEnterArControl(world: World): void {
  if (!world.xrEnabled) {
    return;
  }

  const header = createHeader();
  const wrapper = document.createElement('div');
  wrapper.style.cssText = DOCK_WRAPPER_STYLE;

  const notice = createUnsupportedNotice();
  const dock = document.createElement('div');
  dock.style.cssText = DOCK_STYLE;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Enter AR';
  button.style.cssText = BUTTON_STYLE;

  const demoLink = document.createElement('a');
  demoLink.href = 'https://youtu.be/hPLJEprhNcc';
  demoLink.target = '_blank';
  demoLink.rel = 'noopener noreferrer';
  demoLink.textContent = 'Watch Demo ↗';
  demoLink.style.cssText = SECONDARY_LINK_STYLE;

  const repoLink = document.createElement('a');
  repoLink.href = 'https://github.com/PJH720/pin-and-plan';
  repoLink.target = '_blank';
  repoLink.rel = 'noopener noreferrer';
  repoLink.textContent = 'GitHub ↗';
  repoLink.style.cssText = SECONDARY_LINK_STYLE;

  dock.append(button, demoLink, repoLink);
  wrapper.append(notice, dock);

  let arSupported = true;
  void isImmersiveArSupported().then((supported) => {
    arSupported = supported;
    if (supported) {
      header.statusPill.style.background = 'rgba(16,185,129,0.12)';
      header.statusPill.style.color = '#047857';
      header.statusPill.innerHTML =
        '<span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>WebXR AR Ready';
    } else {
      header.statusPill.style.background = 'rgba(245,158,11,0.12)';
      header.statusPill.style.color = '#b45309';
      header.statusPill.innerHTML =
        '<span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;"></span>Headset / IWER Required';
      if (world.visibilityState.value === VisibilityState.NonImmersive) {
        notice.hidden = false;
        button.style.opacity = '0.82';
      }
    }
  });

  button.addEventListener('click', async () => {
    unlockAudio();
    const supported = await isImmersiveArSupported();
    arSupported = supported;
    if (!supported) {
      notice.hidden = false;
      notice.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-4px)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 220, easing: 'ease-out' },
      );
      return;
    }

    try {
      world.launchXR();
    } catch {
      notice.hidden = false;
    }
  });

  world.visibilityState.subscribe((state) => {
    const isNonImmersive = state === VisibilityState.NonImmersive;
    header.root.hidden = !isNonImmersive;
    wrapper.hidden = !isNonImmersive;
    if (isNonImmersive && !arSupported) {
      notice.hidden = false;
    }
  });

  document.body.append(header.root, wrapper);
}
