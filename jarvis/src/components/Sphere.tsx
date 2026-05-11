'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SphereState, SphereStateConfig } from '@/types';

const STATE_CONFIGS: Record<SphereState, SphereStateConfig> = {
  resting:     { bpm: 60,  colorCore: [1.0, 0.70, 0.20], colorGlow: [1.0, 0.45, 0.00], glowIntensity: 0.40, displacement: 0.018, plasmaSpeed: 0.25, scale: 1.00 },
  attentive:   { bpm: 75,  colorCore: [1.0, 0.75, 0.22], colorGlow: [1.0, 0.50, 0.00], glowIntensity: 0.55, displacement: 0.022, plasmaSpeed: 0.38, scale: 1.02 },
  listening:   { bpm: 68,  colorCore: [1.0, 0.82, 0.30], colorGlow: [0.95,0.60, 0.08], glowIntensity: 0.50, displacement: 0.010, plasmaSpeed: 0.18, scale: 0.97 },
  thinking:    { bpm: 82,  colorCore: [1.0, 0.72, 0.18], colorGlow: [1.0, 0.50, 0.02], glowIntensity: 0.75, displacement: 0.035, plasmaSpeed: 0.65, scale: 1.04 },
  speaking:    { bpm: 72,  colorCore: [1.0, 0.80, 0.28], colorGlow: [1.0, 0.55, 0.05], glowIntensity: 0.62, displacement: 0.028, plasmaSpeed: 0.48, scale: 1.01 },
  alert_amber: { bpm: 90,  colorCore: [1.0, 0.58, 0.08], colorGlow: [1.0, 0.35, 0.00], glowIntensity: 0.92, displacement: 0.030, plasmaSpeed: 0.55, scale: 1.06 },
  alert_red:   { bpm: 120, colorCore: [1.0, 0.30, 0.05], colorGlow: [0.85,0.10, 0.00], glowIntensity: 1.00, displacement: 0.040, plasmaSpeed: 0.70, scale: 1.08 },
  working:     { bpm: 78,  colorCore: [0.7, 0.50, 0.15], colorGlow: [0.65,0.35, 0.00], glowIntensity: 0.30, displacement: 0.040, plasmaSpeed: 0.80, scale: 0.88 },
};

const PLASMA_VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorldPosition;
  uniform float uTime; uniform float uDisplacement;
  void main() {
    vUv = uv; vNormal = normalize(normalMatrix * normal);
    float wave = sin(position.x*4.0+uTime*1.2)*sin(position.y*3.5+uTime*0.9)*sin(position.z*4.2+uTime*1.5);
    vec3 displaced = position + normal * wave * uDisplacement;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const PLASMA_FRAG = /* glsl */ `
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorldPosition;
  uniform float uTime; uniform float uBPM; uniform vec3 uColorCore; uniform vec3 uColorGlow;
  uniform float uGlowIntensity; uniform float uPlasmaSpeed; uniform vec3 uCameraPosition;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.5;}return v;}
  void main(){
    vec3 viewDir=normalize(uCameraPosition-vWorldPosition);
    float fresnel=pow(1.0-max(dot(normalize(vNormal),viewDir),0.0),1.8);
    float t=uTime*uPlasmaSpeed; vec2 uv=vUv*3.5;
    float pA=fbm(uv+vec2(t*0.4,t*0.3)); float pB=fbm(uv-vec2(t*0.3,t*0.22)+pA*0.8);
    float plasma=pA*0.55+pB*0.45;
    float beatPeriod=60.0/uBPM;
    float pulse=pow(max(sin(uTime*6.28318/beatPeriod),0.0),0.6)*0.35+0.65;
    vec3 color=mix(uColorCore,uColorGlow,fresnel*0.65+plasma*0.35);
    float brightness=((1.0-fresnel)*1.6+fresnel*uGlowIntensity*(0.6+pulse*0.4)+plasma*0.5*uGlowIntensity)*pulse;
    float alpha=clamp(mix(0.92,0.55,fresnel)+plasma*0.06,0.0,1.0);
    gl_FragColor=vec4(color*brightness,alpha);
  }
`;

const GLOW_VERT = /* glsl */ `
  varying vec3 vNormal; varying vec3 vWorldPosition;
  void main(){vNormal=normalize(normalMatrix*normal);vec4 w=modelMatrix*vec4(position,1.0);vWorldPosition=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}
`;

const GLOW_FRAG = /* glsl */ `
  varying vec3 vNormal; varying vec3 vWorldPosition;
  uniform vec3 uColor; uniform float uIntensity; uniform float uTime; uniform float uBPM; uniform vec3 uCameraPosition;
  void main(){
    vec3 viewDir=normalize(uCameraPosition-vWorldPosition);
    float fresnel=pow(1.0-max(dot(normalize(vNormal),viewDir),0.0),2.5);
    float pulse=sin(uTime*6.28318/(60.0/uBPM))*0.5+0.5;
    gl_FragColor=vec4(uColor*(1.2+pulse*0.4),fresnel*uIntensity*(0.4+pulse*0.6));
  }
`;

function PlasmaSphere({ config }: { config: SphereStateConfig }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uTime:{value:0}, uBPM:{value:config.bpm},
    uColorCore:{value:new THREE.Color(...config.colorCore)},
    uColorGlow:{value:new THREE.Color(...config.colorGlow)},
    uGlowIntensity:{value:config.glowIntensity}, uDisplacement:{value:config.displacement},
    uPlasmaSpeed:{value:config.plasmaSpeed}, uCameraPosition:{value:new THREE.Vector3(0,0,5)},
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[]);
  useFrame(({clock,camera})=>{
    uniforms.uTime.value=clock.getElapsedTime();
    uniforms.uCameraPosition.value.copy(camera.position);
    const l=(a:number,b:number,t:number)=>a+(b-a)*t;
    uniforms.uBPM.value=l(uniforms.uBPM.value,config.bpm,0.05);
    uniforms.uGlowIntensity.value=l(uniforms.uGlowIntensity.value,config.glowIntensity,0.04);
    uniforms.uDisplacement.value=l(uniforms.uDisplacement.value,config.displacement,0.04);
    uniforms.uPlasmaSpeed.value=l(uniforms.uPlasmaSpeed.value,config.plasmaSpeed,0.04);
    uniforms.uColorCore.value.lerp(new THREE.Color(...config.colorCore),0.04);
    uniforms.uColorGlow.value.lerp(new THREE.Color(...config.colorGlow),0.04);
    if(meshRef.current){
      meshRef.current.scale.lerp(new THREE.Vector3(config.scale,config.scale,config.scale),0.05);
      meshRef.current.rotation.y+=0.002; meshRef.current.rotation.x+=0.001;
    }
  });
  return (<mesh ref={meshRef}><sphereGeometry args={[1,128,128]}/><shaderMaterial vertexShader={PLASMA_VERT} fragmentShader={PLASMA_FRAG} uniforms={uniforms} transparent depthWrite={false}/></mesh>);
}

function GlowSphere({ config }: { config: SphereStateConfig }) {
  const uniforms = useMemo(() => ({
    uColor:{value:new THREE.Color(...config.colorGlow)}, uIntensity:{value:config.glowIntensity},
    uTime:{value:0}, uBPM:{value:config.bpm}, uCameraPosition:{value:new THREE.Vector3(0,0,5)},
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[]);
  useFrame(({clock,camera})=>{
    uniforms.uTime.value=clock.getElapsedTime();
    uniforms.uCameraPosition.value.copy(camera.position);
    uniforms.uColor.value.lerp(new THREE.Color(...config.colorGlow),0.04);
    uniforms.uBPM.value+=(config.bpm-uniforms.uBPM.value)*0.05;
    uniforms.uIntensity.value+=(config.glowIntensity-uniforms.uIntensity.value)*0.04;
  });
  return (<mesh scale={[1.35,1.35,1.35]}><sphereGeometry args={[1,32,32]}/><shaderMaterial vertexShader={GLOW_VERT} fragmentShader={GLOW_FRAG} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide}/></mesh>);
}

export default function Sphere({ state, onClick, size=260 }: { state:SphereState; onClick:()=>void; size?:number }) {
  const config = STATE_CONFIGS[state];
  return (
    <div onClick={onClick} className="cursor-pointer select-none" style={{width:size,height:size}} aria-label="Jarvis — toque para falar" role="button" tabIndex={0} onKeyDown={(e)=>e.key==='Enter'&&onClick()}>
      <Canvas camera={{position:[0,0,3.2],fov:50}} gl={{alpha:true,antialias:true}} style={{background:'transparent'}}>
        <GlowSphere config={config}/>
        <PlasmaSphere config={config}/>
      </Canvas>
    </div>
  );
}
