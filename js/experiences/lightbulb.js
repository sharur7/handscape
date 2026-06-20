// Light Bulb experience.
// Gestures:
//   • Pinch the hanging CHAIN and pull DOWN, then release  -> toggle light on/off
//   • Pinch the BULB and TWIST your hand                    -> quickly unscrew; it drops
//   • Open palm when the socket is empty                    -> fit a fresh bulb
import * as THREE from "three";
import { sfx } from "../sfx.js";

export function createLightBulb(ctx) {
  const { mount } = ctx;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.insertBefore(renderer.domElement, mount.firstChild);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  scene.fog = new THREE.Fog(0x05070c, 9, 18);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.6, 6.4);
  camera.lookAt(0, 0.4, 0);

  scene.add(new THREE.AmbientLight(0x33405a, 0.6));
  const fill = new THREE.DirectionalLight(0x8aa0c0, 0.5);
  fill.position.set(3, 5, 4); scene.add(fill);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 1, metalness: 0 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), wallMat); back.position.z = -6; scene.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), wallMat.clone());
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -5, 0); scene.add(floor);

  // ---------- ceiling mount + cord (anchored at the top of the view) ----------
  const CEIL_Y = 2.6, SOCKET_Y = 1.25;
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 0.6, roughness: 0.5 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 0.4), ceilMat);
  bar.position.set(0, CEIL_Y + 0.05, 0); scene.add(bar);   // a ceiling beam spanning the top
  const mountPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.16, 28), ceilMat);
  mountPlate.position.set(0, CEIL_Y, 0); scene.add(mountPlate);
  const cordMat = new THREE.MeshStandardMaterial({ color: 0x0e1116, roughness: 0.9 });
  const cordLen = CEIL_Y - (SOCKET_Y + 0.3);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, cordLen, 12), cordMat);
  cord.position.set(0, (CEIL_Y + SOCKET_Y + 0.3) / 2, 0); scene.add(cord);

  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.5, 0.66, 24),
    new THREE.MeshStandardMaterial({ color: 0x20242c, metalness: 0.85, roughness: 0.35 }));
  socket.position.set(0, SOCKET_Y + 0.18, 0); scene.add(socket);

  // ---------- bulb group ----------
  const bulbGroup = new THREE.Group(); scene.add(bulbGroup);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff6df, transparent: true, opacity: 0.16,
    roughness: 0.03, metalness: 0, transmission: 0.95, thickness: 0.5, ior: 1.45,
    emissive: 0xffb347, emissiveIntensity: 0, side: THREE.DoubleSide, depthWrite: false
  });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 48), glassMat);
  glass.scale.set(1, 1.2, 1); glass.position.y = -0.05; bulbGroup.add(glass);

  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.95, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.5, 24), brass);
  base.position.y = 0.95; bulbGroup.add(base);
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.026, 8, 24), brass);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.78 + i * 0.11; bulbGroup.add(ring);
  }

  const GC = -0.05;
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), coreMat); core.position.y = GC; bulbGroup.add(core);
  const filMat = new THREE.MeshBasicMaterial({ color: 0xffcf87 });
  const filament = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 32), filMat);
  filament.position.y = GC; filament.rotation.x = Math.PI / 2.5; bulbGroup.add(filament);
  const bulbLight = new THREE.PointLight(0xffcf8a, 0, 24, 2); bulbLight.position.y = GC; bulbGroup.add(bulbLight);
  const halo = makeHalo(); halo.position.y = GC; bulbGroup.add(halo);

  // ---------- pull chain (anchored to the ceiling too) ----------
  const chainX = 1.5;
  const AY = CEIL_Y, HANDLE_REST = 0.45, L0 = AY - HANDLE_REST;
  const chainMat = new THREE.MeshStandardMaterial({ color: 0xb9b9c0, metalness: 0.9, roughness: 0.4 });
  const anchor = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), chainMat);
  anchor.position.set(chainX, AY, 0); scene.add(anchor);
  const chainLine = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, L0, 8), chainMat);
  chainLine.position.set(chainX, (AY + HANDLE_REST) / 2, 0); scene.add(chainLine);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), chainMat);
  handle.position.set(chainX, HANDLE_REST, 0); scene.add(handle);

  // ---------- state ----------
  let lightOn = false, lightLevel = 0;
  let insertion = 1, posY = 0, vy = 0, prevRot = null;
  let mode = "idle";
  let chainStartY = 0, chainPullY = 0, refitOpen = 0, crashed = false;
  const REMOVE_GAIN = 0.32;     // ~half a turn of twisting and it drops fast
  const SLIDE = 0.15;           // small slide out of the socket before it drops

  const v = new THREE.Vector3();
  const project = (obj) => { obj.getWorldPosition(v).project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; };
  const pdist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  ctx.setHint("Pinch the <b>chain</b> &amp; pull down to switch on. Pinch the <b>bulb</b> and twist to unscrew it.");

  function update(frame) {
    const dt = frame.dt, cur = frame.cursor;

    if (cur.present && mode !== "removed") {
      const overBulb = pdist(cur, project(glass)) < 0.16;
      const overChain = pdist(cur, project(handle)) < 0.13;
      if (cur.pinch && mode === "idle") {
        if (overChain) { mode = "chain"; chainStartY = chainPullY = cur.y; }
        else if (overBulb && insertion > 0.02) { mode = "bulb"; prevRot = cur.rotation; }
      }
      if (mode === "chain") {
        if (cur.pinch) {
          chainPullY = cur.y;
          const pull = Math.min(Math.max(0, chainPullY - chainStartY) * 3.5, 0.9);
          handle.position.y = HANDLE_REST - pull;
          chainLine.scale.y = (L0 + pull) / L0;
          chainLine.position.y = (AY + HANDLE_REST - pull) / 2;
        } else {
          if (chainPullY - chainStartY > 0.06) { lightOn = !lightOn; sfx.tickTock(); if (lightOn) sfx.lampOn(); }
          handle.position.y = HANDLE_REST; chainLine.scale.y = 1; chainLine.position.y = (AY + HANDLE_REST) / 2;
          mode = "idle";
        }
      } else if (mode === "bulb") {
        if (cur.pinch) {
          let d = cur.rotation - prevRot;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          prevRot = cur.rotation;
          // only real TWISTING counts — ignore tiny jitter / pure up-down hand motion
          if (Math.abs(d) > 0.04) {
            bulbGroup.rotation.y += d;
            insertion = clamp(insertion - Math.abs(d) * REMOVE_GAIN, 0, 1);
            if (insertion <= 0.001) { mode = "removed"; lightOn = false; vy = 0; sfx.pop(); }
          }
        } else mode = "idle";
      }
    }

    if (mode === "removed") {
      vy -= 22 * dt; posY += vy * dt;          // straight drop
      if (!crashed && posY < -4.5) { crashed = true; sfx.glass(); }
      bulbGroup.rotation.z += dt * 2.2; bulbGroup.rotation.x += dt * 1.1;
      glassMat.opacity = Math.max(0, glassMat.opacity - dt * 0.04);
      const palm = frame.hands.find(h => h.openness > 0.65 && !h.pinch.active);
      refitOpen = palm ? refitOpen + dt : 0;
      ctx.setHint("Socket is empty — hold an <b>open palm</b> to fit a fresh bulb.");
      if (posY < -7 && refitOpen > 0.7) {
        posY = 0; vy = 0; insertion = 1; glassMat.opacity = 0.16;
        bulbGroup.rotation.set(0, 0, 0); refitOpen = 0; crashed = false; mode = "refit";
      }
    } else {
      const target = -(1 - insertion) * SLIDE;
      posY += (target - posY) * Math.min(1, dt * 12);
      if (mode === "refit") { ctx.setHint("Pinch the <b>chain</b> &amp; pull to switch on. Pinch the <b>bulb</b> and twist to remove."); if (cur.present) mode = "idle"; }
    }
    bulbGroup.position.y = posY;

    const wantOn = lightOn && insertion > 0.8 && mode !== "removed";
    lightLevel += ((wantOn ? 1 : 0) - lightLevel) * Math.min(1, dt * 8);
    bulbLight.intensity = lightLevel * 4.2;
    glassMat.emissiveIntensity = lightLevel * 1.7;
    coreMat.opacity = lightLevel * 0.9;
    filMat.color.setHex(lightLevel > 0.5 ? 0xffe6a8 : 0xffcf87);
    halo.material.opacity = lightLevel * 0.85;
    halo.scale.setScalar(3.2 + lightLevel * 1.8);
    scene.fog.color.setRGB(0.02 + lightLevel * 0.05, 0.027 + lightLevel * 0.035, 0.047 + lightLevel * 0.02);

    ctx.setTag(mode === "removed" ? "fell out" : (wantOn ? "ON" : (lightOn ? "no contact" : "OFF")));
    renderer.render(scene, camera);
  }

  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function dispose() {
    renderer.dispose(); renderer.domElement.remove();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
  }
  return { update, resize, dispose };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function makeHalo() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,210,130,0.9)"); grad.addColorStop(0.4, "rgba(255,180,90,0.35)"); grad.addColorStop(1, "rgba(255,180,90,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(mat); s.scale.set(3.2, 3.2, 1); return s;
}
