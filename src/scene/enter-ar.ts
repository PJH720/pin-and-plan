import { VisibilityState, type World } from '@iwsdk/core';
import { unlockAudio } from '../feedback/sounds.js';

const BUTTON_STYLE = [
  'position:fixed',
  'left:50%',
  'bottom:8%',
  'transform:translateX(-50%)',
  'padding:28px 64px',
  'font:600 32px system-ui,sans-serif',
  'color:#ffffff',
  'background:#5b46e0',
  'border:0',
  'border-radius:999px',
  'cursor:pointer',
  'z-index:10',
  'box-shadow:0 8px 30px rgba(91,70,224,0.35)',
  'transition:transform 0.15s ease, opacity 0.15s ease',
].join(';');

const NOTICE_STYLE = [
  'position:fixed',
  'left:50%',
  'bottom:calc(8% + 108px)',
  'transform:translateX(-50%)',
  'width:min(90vw, 520px)',
  'padding:20px 24px',
  'background:rgba(18, 20, 28, 0.92)',
  'backdrop-filter:blur(12px)',
  '-webkit-backdrop-filter:blur(12px)',
  'border:1px solid rgba(255,255,255,0.14)',
  'border-radius:16px',
  'color:#f1f5f9',
  'font:400 14px/1.55 system-ui,-apple-system,sans-serif',
  'box-shadow:0 16px 40px rgba(0,0,0,0.45)',
  'z-index:10',
  'box-sizing:border-box',
].join(';');

function createUnsupportedNotice(): HTMLDivElement {
  const card = document.createElement('div');
  card.style.cssText = NOTICE_STYLE;
  card.hidden = true;
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:600;font-size:15px;color:#ffffff;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#fbbf24;"></span>
      WebXR Passthrough AR Not Detected
    </div>
    <p style="margin:0 0 12px 0;color:#cbd5e1;">
      <strong>Pin &amp; Plan</strong> is a seated, hands-only WebXR (<code>immersive-ar</code>) experience. Standard desktop and mobile browsers cannot start an AR hand-tracking session natively.
    </p>
    <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px 14px;margin-bottom:12px;color:#e2e8f0;font-size:13px;">
      <div style="margin-bottom:6px;"><strong>How to try it:</strong></div>
      <div style="margin-bottom:4px;">• <strong>Meta Quest 3 / 3S:</strong> Open this URL in <strong>Meta Quest Browser</strong> and tap <strong>Enter AR</strong>.</div>
      <div>• <strong>Desktop Chrome:</strong> Enable the <strong>Immersive Web Emulator (IWER)</strong> extension → DevTools → <strong>WebXR</strong> tab → select <strong>Meta Quest 3</strong> with <strong>Hand Tracking</strong>.</div>
    </div>
    <div style="display:flex;gap:14px;font-size:13px;font-weight:500;">
      <a href="https://youtu.be/hPLJEprhNcc" target="_blank" rel="noopener noreferrer" style="color:#a78bfa;text-decoration:none;">Watch Demo Video (YouTube) ↗</a>
      <a href="https://github.com/PJH720/pin-and-plan" target="_blank" rel="noopener noreferrer" style="color:#94a3b8;text-decoration:none;">GitHub Repo ↗</a>
    </div>
  `;
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
 * On unsupported standard browsers, displays clear English instructions for
 * Meta Quest Browser or the Chrome IWER emulator.
 */
export function mountEnterArControl(world: World): void {
  if (!world.xrEnabled) {
    return;
  }

  const notice = createUnsupportedNotice();
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Enter AR';
  button.style.cssText = BUTTON_STYLE;

  let arSupported = true;
  void isImmersiveArSupported().then((supported) => {
    arSupported = supported;
    if (!supported && world.visibilityState.value === VisibilityState.NonImmersive) {
      notice.hidden = false;
      button.style.opacity = '0.78';
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
          { transform: 'translateX(-50%) translateY(0)' },
          { transform: 'translateX(-50%) translateY(-4px)' },
          { transform: 'translateX(-50%) translateY(0)' },
        ],
        { duration: 240, easing: 'ease-out' },
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
    button.hidden = !isNonImmersive;
    notice.hidden = !isNonImmersive || arSupported;
  });

  document.body.append(notice, button);
}
