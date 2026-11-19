import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
} from '@iwsdk/core';
import { PALETTE } from './tokens.js';

export interface OrbUniforms {
  [uniform: string]: { value: number | Color };
  uTime: { value: number };
  /** 0 = calm idle, 0.5 = ready pulse, 1.0 = active thinking. */
  uActivity: { value: number };
  /** 0 = indigo-violet, 1 = settled emerald-violet. */
  uDone: { value: number };
  uCoreColor: { value: Color };
  uMidColor: { value: Color };
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
  uniform vec3 uMidColor;
  uniform vec3 uRimColor;
  uniform vec3 uDoneColor;

  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vec3 N = normalize(vNormalView);
    vec3 V = normalize(vViewDir);
    float ndotv = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.2);

    float speed = mix(1.1, 3.8, uActivity);
    float t = uTime * speed;

    // Flowing organic aurora ribbons across the sphere surface
    float band1 = sin(vLocalPos.y * 5.2 + vLocalPos.x * 3.1 + t);
    float band2 = cos(vLocalPos.z * 4.5 - vLocalPos.y * 3.8 - t * 0.78);
    float ribbon = 0.5 + 0.5 * (band1 * 0.55 + band2 * 0.45);

    // Subtle upper-left studio specular highlight for glass orb volume
    vec3 lightDir = normalize(vec3(-0.35, 0.72, 0.60));
    vec3 H = normalize(lightDir + V);
    float spec = pow(max(dot(N, H), 0.0), 42.0) * 0.65;

    vec3 activeMid = mix(uMidColor, uDoneColor, uDone * 0.65);
    vec3 activeRim = mix(uRimColor, uDoneColor, uDone * 0.8);

    vec3 col = mix(uCoreColor, activeMid, ribbon * (0.55 + uActivity * 0.35));
    col += activeRim * fresnel * (0.85 + uActivity * 0.55);
    col += vec3(1.0) * spec;

    // Inner luminous core bloom
    float coreGlow = pow(ndotv, 3.2) * (0.22 + uActivity * 0.25);
    col += mix(uMidColor, vec3(1.0), 0.45) * coreGlow;

    gl_FragColor = vec4(col, 0.96);
  }
`;

/**
 * Procedural GLSL Fresnel Aurora Glass Orb material.
 * Zero downloaded assets, single draw call, stereo-WebXR safe.
 */
export function createOrbMaterial(): {
  readonly material: ShaderMaterial;
  readonly uniforms: OrbUniforms;
} {
  const uniforms: OrbUniforms = {
    uTime: { value: 0 },
    uActivity: { value: 0 },
    uDone: { value: 0 },
    uCoreColor: { value: new Color('#2e1f6e') },
    uMidColor: { value: new Color(PALETTE.orbViolet) },
    uRimColor: { value: new Color(PALETTE.orbCyan) },
    uDoneColor: { value: new Color(PALETTE.orbEmerald) },
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
    float ring = smoothstep(0.58, 0.78, dist) * (1.0 - smoothstep(0.84, 1.0, dist));
    float sweep = 0.62 + 0.38 * sin(angle * 2.0 - uTime * 2.6);
    float alpha = ring * sweep * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/**
 * Thin glowing orbital halo around the Agent Orb for state-machine feedback.
 */
export function createOrbHaloMaterial(): {
  readonly material: ShaderMaterial;
  readonly uniforms: HaloUniforms;
} {
  const uniforms: HaloUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0.45 },
    uColor: { value: new Color('#a5b4fc') },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  });
  return { material, uniforms };
}
