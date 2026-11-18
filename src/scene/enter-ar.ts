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
].join(';');

/**
 * Page button that starts the AR session. In the headset browser a hand pinch
 * on it is the click, so no controller is needed.
 */
export function mountEnterArControl(world: World): void {
  if (!world.xrEnabled) {
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Enter AR';
  button.style.cssText = BUTTON_STYLE;
  button.addEventListener('click', () => {
    unlockAudio();
    world.launchXR();
  });
  world.visibilityState.subscribe((state) => {
    button.hidden = state !== VisibilityState.NonImmersive;
  });
  document.body.append(button);
}
