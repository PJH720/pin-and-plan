import {
  Color,
  DoubleSide,
  ShaderMaterial,
} from '@iwsdk/core';
import { PALETTE } from './tokens.js';

export interface OrbUniforms {
  [uniform: string]: { value: number | Color };
  uTime: { value: number };
  /** 0 = calm idle, 0.58 = ready pulse, 1.0 = active planning. */
  uActivity: { value: number };
  /** 0 = sunlit opal/amber, 1 = settled botanical sage. */
  uDone: { value: number };
  uCoreColor: { value: Color };
  uPearlColor: { value: Color };
  uWarmColor: { value: Color };
  uRimColor: { value: Color };
  uDoneColor: { value: Color };
}

const ORB_VERTEX = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = normalize(position);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ORB_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uActivity;
  uniform float uDone;
  uniform vec3 uCoreColor;
  uniform vec3 uPearlColor;
  uniform vec3 uWarmColor;
  uniform vec3 uRimColor;
  uniform vec3 uDoneColor;

  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vec3 N = normalize(vNormalView);
    vec3 V = normalize(vViewDir);
    float ndotv = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.3);

    // Natural daylight directional shading (matches sunlit window from upper-left)
    vec3 sunDir = normalize(vec3(-0.48, 0.68, 0.55));
    float diff = clamp(dot(N, sunDir) * 0.5 + 0.5, 0.0, 1.0);
    vec3 H = normalize(sunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 64.0) * 0.72;

    // Gentle organic internal opal refraction swirl
    float speed = mix(0.65, 2.8, uActivity);
    float t = uTime * speed;
    float swirl = 0.5 + 0.5 * (
      sin(vLocalPos.y * 4.0 + vLocalPos.x * 2.6 + t) * 0.55 +
      cos(vLocalPos.z * 3.8 - vLocalPos.y * 3.0 - t * 0.7) * 0.45
    );

    vec3 activeAccent = mix(uWarmColor, uDoneColor, uDone);
    vec3 baseTone = mix(uCoreColor, uPearlColor, diff * 0.85 + 0.12);
    vec3 col = mix(baseTone, activeAccent, swirl * (0.28 + uActivity * 0.45));

    // Crisp sunlit glass rim + warm top-left specular catchlight
    col = mix(col, uRimColor, fresnel * (0.48 + uActivity * 0.25));
    col += vec3(1.0, 0.99, 0.96) * spec;

    gl_FragColor = vec4(col, 0.96);
  }
`;

/**
 * Procedural GLSL Frosted Opal / Pearl Glass Orb material.
 * Tactile sunlit studio shading—zero neon glow, zero downloaded textures, stereo-WebXR safe.
 */
export function createOrbMaterial(): {
  readonly material: ShaderMaterial;
  readonly uniforms: OrbUniforms;
} {
  const uniforms: OrbUniforms = {
    uTime: { value: 0 },
    uActivity: { value: 0 },
    uDone: { value: 0 },
    uCoreColor: { value: new Color(PALETTE.orbCore) },
    uPearlColor: { value: new Color(PALETTE.orbPearl) },
    uWarmColor: { value: new Color(PALETTE.orbWarm) },
    uRimColor: { value: new Color(PALETTE.orbRim) },
    uDoneColor: { value: new Color(PALETTE.orbDone) },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: ORB_VERTEX,
    fragmentShader: ORB_FRAGMENT,
    transparent: true,
    toneMapped: false,
  });
  return { material, uniforms };
}

export interface HaloUniforms {
  [uniform: string]: { value: number | Color };
  uTime: { value: number };
  uOpacity: { value: number };
  uColor: { value: Color };
}

const HALO_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HALO_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv * 2.0 - 1.0;
    float dist = length(centered);
    float angle = atan(centered.y, centered.x);
    // Crisp architectural hairline ring rather than blurry neon fog
    float ring = smoothstep(0.76, 0.81, dist) * (1.0 - smoothstep(0.84, 0.89, dist));
    float sweep = 0.65 + 0.35 * sin(angle * 2.0 - uTime * 2.0);
    float alpha = ring * sweep * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/**
 * Refined hairline light ring around the Agent Orb for subtle state feedback.
 */
export function createOrbHaloMaterial(): {
  readonly material: ShaderMaterial;
  readonly uniforms: HaloUniforms;
} {
  const uniforms: HaloUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0.4 },
    uColor: { value: new Color('#f2e6d5') },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  return { material, uniforms };
}
