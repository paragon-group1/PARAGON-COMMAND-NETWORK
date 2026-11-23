(function(){
"use strict";

const $ = id => document.getElementById(id);
const site = $('site'), boot = $('boot'), logEl = $('log');
const title = $('title'), titlebox = $('titlebox'), gwrap = $('gwrap');
const enterBtn = $('enterBtn'), closeBtn = $('closeBtn'), editBtn = $('editBtn');
const hudClock = $('hudClock'), latEl = $('lat');

/* ---------- reloj ---------- */
function hudTick(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  hudClock.textContent = p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
  if(Math.random() < .15) latEl.textContent = (7+Math.floor(Math.random()*19))+' ms';
}
hudTick(); setInterval(hudTick,1000);

/* ---------- respaldo del emblema ---------- */
document.querySelectorAll('img[data-fb]').forEach(img=>{
  img.addEventListener('error', ()=>{
    if(img.dataset.tried){ img.classList.add('missing'); return; }
    img.dataset.tried = '1';
    img.src = img.dataset.fb;
  });
});

/* ---------- audio ---------- */
const A = {ctx:null, master:null, comp:null, verb:null, verbGain:null, noise:null, ok:false};
function makeImpulse(ctx, dur){
  const len = Math.floor(ctx.sampleRate*dur), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for(let c=0;c<2;c++){
    const d = b.getChannelData(c);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len,2.6);
  }
  return b;
}
function initAudio(){
  if(A.ctx){ if(A.ctx.state==='suspended'){ try{A.ctx.resume();}catch(e){} } return; }
  try{
    const C = window.AudioContext || window.webkitAudioContext; if(!C) return;
    A.ctx = new C();
    A.master = A.ctx.createGain(); A.master.gain.value = 1;
    A.comp = A.ctx.createDynamicsCompressor();
    A.comp.threshold.value = -18; A.comp.ratio.value = 4; A.comp.knee.value = 6;
    A.comp.attack.value = .003; A.comp.release.value = .15;
    A.master.connect(A.comp); A.comp.connect(A.ctx.destination);
    A.verb = A.ctx.createConvolver(); A.verb.buffer = makeImpulse(A.ctx,.6);
    A.verbGain = A.ctx.createGain(); A.verbGain.gain.value = .22;
    A.verb.connect(A.verbGain); A.verbGain.connect(A.comp);
    const len = Math.floor(A.ctx.sampleRate*.4);
    A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = A.noise.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    A.ok = true;
    if(A.ctx.state==='suspended') A.ctx.resume();
  }catch(e){ A.ok = false; }
}
function play(fn){ if(!A.ok || !A.ctx) return; try{ fn(A.ctx, A.master); }catch(e){} }
function kill(list){ return ()=>{ try{ for(const n of list) n.disconnect(); }catch(e){} }; }
function srcNoise(ctx){ const s = ctx.createBufferSource(); s.buffer = A.noise; return s; }

const SFX = {
  stdout(){ play((ctx,out)=>{
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type='square'; o.frequency.value = 1800;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 6000;
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(.03,t+.001);
    g.gain.exponentialRampToValueAtTime(.0001,t+.008);
    const vg = ctx.createGain(); vg.gain.value = .05;
    o.connect(lp); lp.connect(g); g.connect(vg); vg.connect(out);
    o.start(t); o.stop(t+.02); o.onended = kill([o,lp,g,vg]);
  }); },
  granted(){ play((ctx,out)=>{
    const t = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.08,t+.02); g.gain.linearRampToValueAtTime(0,t+.14);
    g.connect(out);
    [660,1320].forEach((f,i)=>{
      const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = f;
      const eg = ctx.createGain(); eg.gain.value = i ? .6 : 1;
      o.connect(eg); eg.connect(g); o.start(t); o.stop(t+.15); o.onended = kill([o,eg]);
    });
    setTimeout(kill([g]),300);
  }); },
  theme(){ play((ctx,out)=>{
    const t0 = ctx.currentTime+.02;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(400,t0); lp.frequency.exponentialRampToValueAtTime(4000,t0+.9);
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t0);
    g.gain.linearRampToValueAtTime(.1,t0+.03);
    g.gain.setValueAtTime(.1,t0+.3);
    g.gain.exponentialRampToValueAtTime(.0001,t0+1.05);
    lp.connect(g); g.connect(out); g.connect(A.verb);
    [110,165].forEach(f=>{
      const o = ctx.createOscillator(); o.type='sawtooth'; o.frequency.value = f;
      o.connect(lp); o.start(t0); o.stop(t0+1.1); o.onended = kill([o]);
    });
    const n = srcNoise(ctx), bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(200,t0+.3); bp.frequency.exponentialRampToValueAtTime(6000,t0+.9);
    const ng = ctx.createGain(); ng.gain.setValueAtTime(.0001,t0+.3);
    ng.gain.linearRampToValueAtTime(.07,t0+.36); ng.gain.exponentialRampToValueAtTime(.0001,t0+.9);
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.random()*1.6-.8;
    n.connect(bp); bp.connect(ng); ng.connect(pan); pan.connect(out); pan.connect(A.verb);
    n.start(t0+.3); n.stop(t0+.92); n.onended = kill([n,bp,ng,pan]);
    const sub = ctx.createOscillator(); sub.type='sine'; sub.frequency.value = 55;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(.0001,t0+1);
    sg.gain.linearRampToValueAtTime(.16,t0+1.02); sg.gain.exponentialRampToValueAtTime(.0001,t0+1.4);
    sub.connect(sg); sg.connect(out); sub.start(t0+1); sub.stop(t0+1.45); sub.onended = kill([sub,sg]);
    [880,1320].forEach((f,i)=>{
      const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.setValueAtTime(.0001,t0+1.5+i*.14);
      og.gain.linearRampToValueAtTime(.05,t0+1.52+i*.14);
      og.gain.exponentialRampToValueAtTime(.0001,t0+1.68+i*.14);
      o.connect(og); og.connect(out); og.connect(A.verb);
      o.start(t0+1.5+i*.14); o.stop(t0+1.7+i*.14); o.onended = kill([o,og]);
    });
    setTimeout(kill([lp,g]),2400);
  }); },
  expand(){ play((ctx,out)=>{
    const t = ctx.currentTime;
    const n = srcNoise(ctx), bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(300,t); bp.frequency.exponentialRampToValueAtTime(3000,t+.2);
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(.06,t+.03); g.gain.exponentialRampToValueAtTime(.0001,t+.2);
    n.connect(bp); bp.connect(g); g.connect(out);
    n.start(t); n.stop(t+.22); n.onended = kill([n,bp,g]);
  }); },
  key(){ play((ctx,out)=>{
    const t = ctx.currentTime;
    const n = srcNoise(ctx), g1 = ctx.createGain(); g1.gain.setValueAtTime(.0001,t);
    g1.gain.linearRampToValueAtTime(.035,t+.001); g1.gain.exponentialRampToValueAtTime(.0001,t+.006);
    n.connect(g1); g1.connect(out); n.start(t); n.stop(t+.008); n.onended = kill([n,g1]);
    const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = 900;
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(.0001,t);
    g2.gain.linearRampToValueAtTime(.04,t+.001); g2.gain.exponentialRampToValueAtTime(.0001,t+.006);
    o.connect(g2); g2.connect(out); o.start(t); o.stop(t+.008); o.onended = kill([o,g2]);
  }); },
  enter(){ play((ctx,out)=>{
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = 520;
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(.06,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+.05);
    o.connect(g); g.connect(out); o.start(t); o.stop(t+.06); o.onended = kill([o,g]);
  }); },
  denied(){ play((ctx,out)=>{
    const t = ctx.currentTime;
    [[220,0],[180,.06]].forEach(([f,d])=>{
      const o = ctx.createOscillator(); o.type='square'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t+d);
      g.gain.linearRampToValueAtTime(.05,t+d+.004);
      g.gain.exponentialRampToValueAtTime(.0001,t+d+.06);
      o.connect(g); g.connect(out); o.start(t+d); o.stop(t+d+.07); o.onended = kill([o,g]);
    });
  }); },
  alarm(){ play((ctx,out)=>{
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type='square'; o.frequency.value = 440;
    const lfo = ctx.createOscillator(); lfo.type='square'; lfo.frequency.value = 8;
    const lg = ctx.createGain(); lg.gain.value = 70;
    lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(.05,t+.01);
    g.gain.setValueAtTime(.05,t+.35); g.gain.exponentialRampToValueAtTime(.0001,t+.4);
    o.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t+.42); lfo.stop(t+.42);
    o.onended = kill([o,lfo,lg,g]);
  }); }
};

/* ---------- log de arranque ---------- */
const LOG = [
"Welcome to PARAGON STRIKE DIVISION!",
"vm_page_bootstrap: 987323 free pages and 53061 wired pages",
"kext submap [0xffffff7f8072e000 - 0xffffff8000000000], kernel text [0xffffff8000200000 - 0xffffff800072e000]",
"zone leak detection enabled",
"standard timeslicing quantum is 10000 us",
"mig_table_max_displ = 72",
"TSC Deadline Timer supported and enabled",
"PARAGONACPICPU: ProcessorId=1 LocalApicId=0 Enabled",
"PARAGONACPICPU: ProcessorId=2 LocalApicId=2 Enabled",
"PARAGONACPICPU: ProcessorId=3 LocalApicId=1 Enabled",
"PARAGONACPICPU: ProcessorId=4 LocalApicId=3 Enabled",
"PARAGONACPICPU: ProcessorId=5 LocalApicId=255 Disabled",
"PARAGONACPICPU: ProcessorId=6 LocalApicId=255 Disabled",
"PARAGONACPICPU: ProcessorId=7 LocalApicId=255 Disabled",
"PARAGONACPICPU: ProcessorId=8 LocalApicId=255 Disabled",
"calling mpo_policy_init for TMSafetyNet",
"Security policy loaded: Safety net for Rollback (TMSafetyNet)",
"calling mpo_policy_init for Sandbox",
"Security policy loaded: Seatbelt sandbox policy (Sandbox)",
"calling mpo_policy_init for Quarantine",
"Security policy loaded: Quarantine policy (Quarantine)",
"verify: checking kernel signature (xnu-1699.22.73~1)",
"verify: kernel text hash 0x9f3c...a71d OK",
"verify: sealed system volume SHA-256 verified",
"verify: loading trust cache (214 entries)",
"verify: kext com.paragon.paragonFSCompressionTypeZlib validado",
"verify: kext com.paragon.paragonTrololoBootScreen validado",
"verify: sandbox profile 'boot' compilado",
"verify: entitlement de plataforma aceptado",
"verify: secure enclave handshake iniciado",
"verify: secure enclave attestation 0x7d21c4f9 OK",
"verify: cadena de confianza completa",
"verify: montando /dev/disk0s2 en modo lectura",
"verify: fsck_paragon: journal replay 0 pendientes",
"verify: APFS snapshot 0x4a91e2 sellado",
"verify: root hash coincide con sello de arranque",
"verify: cargando tabla de particiones GUID",
"verify: firma de arranque validada (EK-2048)",
"verify: politica de cuarentena activa",
"verify: canal IPC con kernel establecido",
"verify: asignando puerto de depuracion 0x1f4",
"verify: reloj monotonico sincronizado",
"verify: entropia inicial 4096 bits recogida",
"verify: driver de red wl0 registrado",
"verify: verificacion de integridad completada",
"Copyright (c) 1982, 1986, 1989, 1991, 1993, 2015",
"The Regents of the University of Adelaide. All rights reserved.",
"HN_ Framework successfully initialized",
"using 16384 buffer headers and 10240 cluster IO buffer headers",
"IOAPIC: Version 0x20 Vectors 64:87",
"ACPI: System State [S0 S3 S4 S5] (S3)",
"PFM64 0xf10000000, 0xf0000000",
"[ PCI configuration begin ]",
"PARAGONIntelCPUPowerManagement: Turbo Ratios 0046",
"PARAGONIntelCPUPowerManagement: (built 13:08:12 Jun 18 2011) initialization complete",
"console relocated to 0xf10000000",
"PCI configuration changed (bridge=16 device=4 cardbus=0)",
"[ PCI configuration end, bridges 12 devices 16 ]",
"mbinit: done [64 MB total pool size, (42/21) split]",
"Pthread support ABORTS when sync kernel primitives misused",
"com.paragon.paragonFSCompressionTypeZlib kmod start",
"com.paragon.paragonTrololoBootScreen kmod start",
"com.paragon.paragonFSCompressionTypeZlib load succeeded",
"com.paragon.paragonFSCompressionTypeDataless load succeeded",
"PARAGONIntelCPUPowerManagementClient: ready",
"BTCOEXIST off",
"wl0: Broadcom BCM4331 802.11 Wireless Interface",
"5.100.98.75",
"FireWire (OHCI) Lucent ID 5901 built-in now active, GUID c82a14fffee4a086; max speed s800.",
"rooting via boot-uuid from /chosen: F5670083-AC74-33D3-8361-AC1977EE4AA2",
'Waiting on <dict ID="0"><key>IOProviderClass</key><string ID="1">',
'IOResources</string><key>IOResourceMatch</key><string ID="2">boot-uuid-media</string></dict>',
"Got boot device = IOService:/PARAGONACPIPlatformExpert/PCI0@0/PARAGONACPIPCI/SATA@1F,2/",
"PARAGONIntelPchSeriesAHCI/PRT0@0/IOAHCIDevice@0/PARAGONAHCIDiskDriver/SarahI@sTheBestDriverIOAHCIBlockStorageDevice/IOBlockStorageDriver/",
"PARAGON SSD TS128C Media/IOGUIDPartitionScheme/Customer@2",
"BSD root: disk0s2, major 14, minor 2",
"Kernel is LP64",
"IOThunderboltSwitch::i2cWriteDWord - status = 0xe00002ed",
"IOThunderboltSwitch::i2cWriteDWord - status = 0x00000000",
"IOThunderboltSwitch::i2cWriteDWord - status = 0xe00002ed",
"IOThunderboltSwitch::i2cWriteDWord - status = 0xe00002ed",
"PARAGONUSBMultitouchDriver::checkStatus - received Status Packet, Payload 2: device was reinitialized",
"MottIsAScrub::checkstatus - true, Mott::Scrub",
"[IOBluetoothHCIController::setConfigState] calling registerService",
"AirPort_Brcm4331: Ethernet address e4:ce:8f:46:18:d2",
"IO80211Controller::dataLinkLayerAttachComplete():  adding PARAGONEFINVRAM notification",
"IO80211Interface::efiNVRAMPublished():",
"Created virtif 0xffffff800c32ee00 p2p0",
"BCM5701Enet: Ethernet address c8:2a:14:57:a4:7a",
"Previous Shutdown Cause: 3",
"NTFS driver 3.8 [Flags: R/W].",
"NTFS volume name BOOTCAMP, version 3.1.",
"DSMOS has arrived",
"en1: 802.11d country code set to 'US'.",
"en1: Supported channels 1 2 3 4 5 6 7 8 9 10 11 36 40 44 48 52 56 60 64 100 104 108 112 116 120 124 128 132 136 140 149 153 157 161 165",
"m_thebest",
"MacAuthEvent en1   Auth result for: 00:60:64:1e:e9:e4  MAC AUTH succeeded",
"MacAuthEvent en1   Auth result for: 00:60:64:1e:e9:e4 Unsolicited  Auth",
"wlEvent: en1 en1 Link UP",
"AirPort: Link Up on en1",
"en1: BSSID changed to 00:60:64:1e:e9:e4",
"virtual bool IOHIDEventSystemUserClient::initWithTask(task*, void*, UInt32):",
"Client task not privileged to open IOHIDSystem for mapping memory (e00002c1)",
"Boot Complete"
];
const LAST = LOG.length - 1;

/* ---------- tramo de verificación (se localiza solo) ---------- */
const V_START = LOG.findIndex(l => l.startsWith('verify: '));
let V_END = V_START;
if(V_START >= 0){
  while(LOG[V_END + 1] && LOG[V_END + 1].startsWith('verify: ')) V_END++;
}

function delayFor(i){
  if(i === 0 || i === 1) return Math.pow(1-(i/1000),3)*25;
  if(i === 2) return 500;
  if(V_START >= 0 && i >= V_START - 1){
    if(i === V_START) return 260;
    if(i > V_START && i <= V_END) return 50 + ((i*29) % 60);
    if(i === V_END + 1) return 320;
    if(i >= V_END + 2 && i <= V_END + 4) return 30;
    if(i === V_END + 5) return 400;
    if(i === V_END + 22) return 300;
    if(i >= V_END + 6 && i <= LAST - 3) return 25;
    if(i === LAST - 2 || i === LAST - 1) return 300;
    if(i === LAST) return 25;
  }
  if(i >= 5 && i <= 20) return 30;
  return Math.pow(1-(i/1000),3)*25;
}

function printLine(txt){
  const d = document.createElement('div');
  d.textContent = txt;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

/* ---------- HUD de verificación ---------- */
const bootHud = $('bootHud'), bootChips = $('bootChips'), bhPct = $('bhPct'), bhTitle = $('bhTitle');
const CHIPS = [
  'NÚCLEO SEGURO','FIRMA DE ARRANQUE','SANDBOX','INTEGRIDAD KEXT',
  'CANAL CIFRADO','RAÍZ VERIFICADA','MONTAJE SSD','RED ENLAZADA','SISTEMAS EN LÍNEA'
];
const chipEls = [];
const CHIP_AT = {};
if(V_START >= 0 && V_END > V_START){
  CHIPS.forEach((_, k)=>{
    CHIP_AT[V_START + 1 + Math.round(k * (V_END - V_START - 1) / (CHIPS.length - 1))] = k;
  });
}

function buildBootHud(){
  bootChips.textContent = '';
  chipEls.length = 0;
  bhPct.textContent = '00%';
  bhTitle.textContent = 'Verificación de sistemas';
  bootHud.classList.remove('done');
  CHIPS.forEach(t=>{
    const d = document.createElement('div');
    d.className = 'bchip';
    d.appendChild(document.createElement('i'));
    d.appendChild(document.createTextNode(t));
    bootChips.appendChild(d);
    chipEls.push(d);
  });
}

function hudPct(i){
  const span = V_END - V_START;
  if(span <= 0) return;
  const p = Math.max(0, Math.min(100, Math.round(((i - V_START) / span) * 100)));
  bhPct.textContent = String(p).padStart(2,'0') + '%';
  if(p >= 100){
    bhPct.textContent = '100%';
    bhTitle.textContent = 'Sistemas en línea verificados';
    bootHud.classList.add('done');
  }
}

/* ---------- glitch ---------- */
const TITLE_TXT = 'PARAGON STRIKE DIVISION';
let glitchOn = false;
const bands = [], chans = [], noises = [];

function buildGlitch(){
  if(gwrap.childElementCount) return;
  const r = document.createElement('div'); r.className = 'gch w'; r.textContent = TITLE_TXT;
  const c = document.createElement('div'); c.className = 'gch k'; c.textContent = TITLE_TXT;
  gwrap.appendChild(r); gwrap.appendChild(c); chans.push(r, c);
  for(let i=0;i<6;i++){ const b = document.createElement('div'); b.className = 'gband'; b.textContent = TITLE_TXT; gwrap.appendChild(b); bands.push(b); }
  for(let i=0;i<3;i++){ const n = document.createElement('div'); n.className = 'gnoise'; gwrap.appendChild(n); noises.push(n); }
}
function glitchFrame(){
  if(glitchOn){
    for(let i=0;i<bands.length;i++){
      const top = Math.random()*100, h = 4+Math.random()*14;
      bands[i].style.clipPath = 'inset('+top+'% 0 '+(100-top-h)+'% 0)';
      bands[i].style.transform = 'translateX('+((Math.random()*48-24)|0)+'px)';
    }
    chans[0].style.transform = 'translateX(-4px)';
    chans[1].style.transform = 'translateX(4px)';
    for(let i=0;i<noises.length;i++){
      noises[i].style.top = (Math.random()*100)+'%';
      noises[i].style.transform = 'translateX('+((Math.random()*60-30)|0)+'px)';
    }
  }
  requestAnimationFrame(glitchFrame);
}
requestAnimationFrame(glitchFrame);

function startGlitch(){ buildGlitch(); glitchOn = true; }
function stopGlitch(){
  glitchOn = false;
  for(const b of bands){ b.style.clipPath = 'inset(0)'; b.style.transform = 'none'; }
  for(const c of chans) c.style.transform = 'none';
}

/* ---------- timers ---------- */
const timers = [], intervals = [];
function setT(fn, ms){ const id = setTimeout(()=>{ try{ fn(); }catch(e){} }, ms); timers.push(id); return id; }
function setI(fn, ms){ const id = setInterval(()=>{ try{ fn(); }catch(e){} }, ms); intervals.push(id); return id; }
function clearAll(){
  timers.forEach(clearTimeout); timers.length = 0;
  intervals.forEach(clearInterval); intervals.length = 0;
}

/* ---------- arranque ---------- */
let booting = false;
function startBoot(){
  if(booting) return;
  booting = true;
  boot.classList.add('on');
  boot.classList.remove('title-phase');
  boot.setAttribute('aria-hidden','false');
  logEl.textContent = '';
  buildBootHud();
  logEl.style.display = 'block';
  title.style.display = 'none';
  titlebox.className = '';
  stopGlitch();
  let i = 0;
  (function step(){
    if(!booting) return;
    if(i > LAST){ setT(phase2, 300); return; }
    printLine(LOG[i]);
    if(i === 2) printLine('PARAGON STRIKE DIVISION Kernel version 4.0.0 boot at '+new Date().toString()+'; root:xnu-1699.22.73~1/RELEASE_X86_64');
    if(i === LAST) SFX.granted(); else SFX.stdout();
    if(i >= V_START && i <= V_END) hudPct(i);
    const ci = CHIP_AT[i];
    if(ci !== undefined){ chipEls[ci].classList.add('ok'); SFX.key(); }
    const d = delayFor(i);
    i++;
    setT(step, d);
  })();
}

function phase2(){
  booting = false;
  logEl.style.display = 'none';
  logEl.textContent = '';
  SFX.theme();
  boot.classList.add('title-phase');
  title.style.display = 'flex';
  setT(()=>{ titlebox.classList.add('visible'); }, 400);
  setT(()=>{ titlebox.classList.add('filled'); }, 600);
  setT(()=>{ titlebox.classList.add('bordered'); }, 700);
  setT(()=>{ titlebox.classList.remove('filled','bordered'); titlebox.classList.add('glitch'); startGlitch(); }, 1000);
  setT(()=>{ titlebox.classList.remove('glitch'); stopGlitch(); }, 1500);
  setT(()=>{ title.style.display = 'none'; phase3(); }, 2500);
}

function phase3(){
  boot.classList.remove('on');
  boot.classList.remove('title-phase');
  boot.setAttribute('aria-hidden','true');
  site.classList.add('on');
  site.setAttribute('aria-hidden','false');
  site.scrollTop = 0;
  SFX.expand();
  requestAnimationFrame(()=>{ site.style.clipPath = 'inset(0 0 0 0)'; });
  startHero();
}

/* ---------- login ---------- */
const loginEl = $('login'), loginForm = $('loginForm'), loginBox = $('loginBox');
const lgUser = $('lgUser'), lgPass = $('lgPass'), lgSubmit = $('lgSubmit');
const lgCancel = $('lgCancel'), lgMsg = $('lgMsg'), lgTries = $('lgTries'), lgState = $('lgState');

const CREDS = { strike:'paragon2026' };
const MAX_TRIES = 3;
let loginOpen = false, tries = 0, busy = false, lockIv = null, lastSubmit = 0;
let open = false, authed = false;

const focusUser = () => { try{ lgUser.focus({preventScroll:true}); }catch(e){} };
const focusPass = () => { try{ lgPass.focus({preventScroll:true}); }catch(e){} };

function openLogin(){
  if(loginOpen || open) return;
  loginOpen = true; tries = 0; busy = false;
  initAudio(); SFX.enter();
  lgMsg.textContent = ''; lgMsg.classList.remove('err');
  lgTries.textContent = '0'; lgState.textContent = 'ESPERANDO';
  lgUser.value = ''; lgPass.value = '';
  lgUser.disabled = lgPass.disabled = lgSubmit.disabled = false;
  loginEl.classList.add('show');
  loginEl.setAttribute('aria-hidden','false');
  try{ enterBtn.blur(); }catch(e){}
  requestAnimationFrame(()=>{ focusUser(); setTimeout(focusUser,60); });
}
function closeLogin(){
  loginOpen = false; busy = false;
  if(lockIv){ clearInterval(lockIv); lockIv = null; }
  loginEl.classList.remove('show');
  loginEl.setAttribute('aria-hidden','true');
}
function denyLogin(msg){
  tries++; lgTries.textContent = tries;
  lgMsg.textContent = msg; lgMsg.classList.add('err');
  SFX.denied();
  loginBox.classList.remove('deny');
  void loginBox.offsetWidth;
  loginBox.classList.add('deny');
  lgPass.value = '';
  if(tries >= MAX_TRIES){
    busy = true; lgState.textContent = 'BLOQUEADO';
    lgUser.disabled = lgPass.disabled = lgSubmit.disabled = true;
    let left = 5;
    lgMsg.textContent = 'Demasiados intentos. Reintenta en '+left+' s.';
    lockIv = setInterval(()=>{
      left--;
      if(left <= 0){
        clearInterval(lockIv); lockIv = null; busy = false; tries = 0;
        lgUser.disabled = lgPass.disabled = lgSubmit.disabled = false;
        lgTries.textContent = '0'; lgState.textContent = 'ESPERANDO';
        lgMsg.textContent = ''; lgMsg.classList.remove('err');
        focusUser();
      } else {
        lgMsg.textContent = 'Demasiados intentos. Reintenta en '+left+' s.';
      }
    },1000);
    return;
  }
  focusPass();
}
function submitLogin(){
  if(busy || !loginOpen) return;
  const now = Date.now();
  if(now - lastSubmit < 80) return;
  lastSubmit = now;
  const u = lgUser.value.trim().toLowerCase();
  const p = lgPass.value.trim();
  if(!u){ denyLogin('Falta el operador.'); return; }
  if(!p){ denyLogin('Falta la clave.'); return; }
  if(Object.prototype.hasOwnProperty.call(CREDS,u) && CREDS[u] === p){
    authed = true; tries = 0; busy = true; lgSubmit.disabled = true;
    lgState.textContent = 'CONCEDIDO';
    lgMsg.classList.remove('err');
    lgMsg.textContent = 'Acceso concedido · abriendo canal...';
    SFX.granted();
    setTimeout(()=>{ busy = false; closeLogin(); enter(); }, 620);
  } else {
    denyLogin('Credenciales inválidas.');
  }
}

loginForm.addEventListener('submit', e => { e.preventDefault(); submitLogin(); });
loginEl.addEventListener('mousedown', e => { if(e.target === loginEl) focusUser(); });
lgCancel.addEventListener('click', ()=>{ closeLogin(); enterBtn.focus(); });

/* ---------- entrar / salir ---------- */
function enter(){
  if(open || !authed) return;
  open = true;
  initAudio();
  document.body.classList.add('locked');
  toggleFS();
  startBoot();
}

function exit(){
  if(!open) return;
  open = false; authed = false; tries = 0;
  booting = false;
  clearAll();
  closeLogin();
  setEdit(false);
  stopHero();
  stopGlitch();
  boot.classList.remove('on');
  boot.classList.remove('title-phase');
  boot.setAttribute('aria-hidden','true');
  title.style.display = 'none';
  titlebox.className = '';
  logEl.textContent = '';
  bootHud.classList.remove('done');
  document.body.classList.remove('menu-open');
  SFX.denied();
  site.style.clipPath = 'inset(0 50% 0 50%)';
  setTimeout(()=>{ site.classList.remove('on'); site.setAttribute('aria-hidden','true'); }, 560);
  document.body.classList.remove('locked');
  enterBtn.focus();
}

enterBtn.addEventListener('click', openLogin);
closeBtn.addEventListener('click', exit);

function toggleFS(){
  const d = document.documentElement;
  try{
    if(!document.fullscreenElement){
      (d.requestFullscreen || d.webkitRequestFullscreen || function(){}).call(d);
    }
  }catch(e){}
}

document.addEventListener('keydown', e => {
  if(loginOpen){
    if(e.key === 'Escape'){ e.preventDefault(); closeLogin(); enterBtn.focus(); return; }
    if(e.key === 'Enter'){ e.preventDefault(); submitLogin(); }
    return;
  }
  if(!open){
    if(e.key === 'Enter'){ e.preventDefault(); openLogin(); }
    return;
  }
  if(e.key === 'Escape') exit();
});

/* ---------- menú / búsqueda ---------- */
const burger = $('burger');
burger.addEventListener('click', ()=>{
  const on = document.body.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', on ? 'true' : 'false');
  SFX.key();
});
document.querySelectorAll('.site-navigation__link').forEach(b=>{
  if(b.tagName !== 'BUTTON') return;
  b.addEventListener('click', ()=>{
    if(window.innerWidth > 900) return;
    const li = b.parentElement;
    const was = li.classList.contains('open');
    document.querySelectorAll('.site-navigation__item.open').forEach(x=>x.classList.remove('open'));
    if(!was) li.classList.add('open');
  });
});
$('searchBtn').addEventListener('click', ()=>{
  const box = $('searchBox');
  box.classList.toggle('on');
  if(box.classList.contains('on')) box.querySelector('input').focus();
});

/* ---------- hero ---------- */
const track = $('heroTrack'), slides = Array.from(track.children), dots = $('heroDots');
let idx = 0, autoT = null;

slides.forEach((_, i)=>{
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', 'slide '+(i+1));
  b.addEventListener('click', ()=> go(i, true));
  dots.appendChild(b);
});

function paint(){
  track.style.transform = 'translateX(-'+(idx*100)+'%)';
  Array.from(dots.children).forEach((d,i)=> d.classList.toggle('on', i === idx));
  slides.forEach((s,i)=>{
    const v = s.querySelector('video');
    if(!v) return;
    if(i === idx){ v.play().catch(()=>{}); } else { v.pause(); }
  });
}
function go(i, manual){
  idx = (i + slides.length) % slides.length;
  paint();
  if(manual) restartAuto();
}
function restartAuto(){ clearInterval(autoT); autoT = setInterval(()=> go(idx + 1), 7000); }
function startHero(){ paint(); restartAuto(); }
function stopHero(){ clearInterval(autoT); }

$('heroPrev').addEventListener('click', ()=> go(idx-1, true));
$('heroNext').addEventListener('click', ()=> go(idx+1, true));

document.querySelectorAll('.hero-listing__video-toggle').forEach(btn=>{
  const v = btn.parentElement.querySelector('video');
  if(!v) return;
  btn.addEventListener('click', ()=>{
    if(v.paused){ v.play(); btn.classList.remove('is-active'); }
    else { v.pause(); btn.classList.add('is-active'); }
  });
});

let sx = 0, sy = 0;
track.addEventListener('touchstart', e=>{ sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive:true});
track.addEventListener('touchend', e=>{
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(idx + (dx < 0 ? 1 : -1), true);
}, {passive:true});

/* ---------- carrusel destacados ---------- */
const featList = $('featList');
let fIdx = 0;
const step = () => featList.firstElementChild.getBoundingClientRect().width + 18;
function fMove(dir){
  const vis = Math.max(1, Math.floor(featList.parentElement.clientWidth / step()));
  const max = Math.max(0, featList.children.length - vis);
  fIdx = Math.min(max, Math.max(0, fIdx + dir));
  featList.style.transform = 'translateX(-'+(fIdx * step())+'px)';
  SFX.key();
}
$('featNext').addEventListener('click', ()=> fMove(1));
$('featPrev').addEventListener('click', ()=> fMove(-1));

/* ---------- modo edición ---------- */
let edit = false;
function setEdit(v){
  edit = v;
  site.classList.toggle('edit', v);
  editBtn.classList.toggle('act', v);
  editBtn.textContent = v ? 'DONE' : 'EDIT';
}
editBtn.addEventListener('click', ()=> setEdit(!edit));

let dbP = null;
function db(){
  if(dbP) return dbP;
  dbP = new Promise((res, rej)=>{
    const r = indexedDB.open('paragon-cr', 1);
    r.onupgradeneeded = ()=> r.result.createObjectStore('m');
    r.onsuccess = ()=> res(r.result);
    r.onerror = ()=> rej(r.error);
  });
  return dbP;
}
async function save(k, blob){
  try{ (await db()).transaction('m','readwrite').objectStore('m').put(blob, k); }catch(e){}
}
async function loadAll(){
  try{
    const d = await db();
    return await new Promise(res=>{
      const tx = d.transaction('m','readonly'), st = tx.objectStore('m');
      const gv = st.getAll(), gk = st.getAllKeys();
      tx.oncomplete = ()=> res(gk.result.map((k,i)=>[k, gv.result[i]]));
      tx.onerror = ()=> res([]);
    });
  }catch(e){ return []; }
}
function paintSlot(slot, blob){
  if(!slot || !blob) return;
  const old = slot.querySelector('img,video');
  const url = URL.createObjectURL(blob);
  const el = (blob.type || '').startsWith('video')
    ? Object.assign(document.createElement('video'), {autoplay:true, loop:true, muted:true, playsInline:true})
    : document.createElement('img');
  el.src = url;
  if(el.tagName === 'IMG') el.alt = '';
  if(old) old.remove();
  slot.insertBefore(el, slot.firstChild);
  if(old && old.src && old.src.startsWith('blob:')) URL.revokeObjectURL(old.src);
}

document.querySelectorAll('.media-slot').forEach(slot=>{
  const key = slot.dataset.slot;
  const btn = slot.querySelector('.slot-add');
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,video/*';
  input.hidden = true;
  slot.appendChild(input);

  btn.addEventListener('click', e => { e.stopPropagation(); input.click(); });
  input.addEventListener('change', ()=>{
    const f = input.files && input.files[0];
    if(!f) return;
    paintSlot(slot, f); save(key, f);
  });

  slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag'); });
  slot.addEventListener('dragleave', ()=> slot.classList.remove('drag'));
  slot.addEventListener('drop', e => {
    e.preventDefault(); slot.classList.remove('drag');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(!f) return;
    paintSlot(slot, f); save(key, f);
  });
});

loadAll().then(list=>{
  list.forEach(([k, blob])=>{
    paintSlot(document.querySelector('.media-slot[data-slot="'+k+'"]'), blob);
  });
});

/* ---------- varios ---------- */
let rt = null;
window.addEventListener('resize', ()=>{
  clearTimeout(rt);
  rt = setTimeout(()=>{ fIdx = 0; featList.style.transform = 'none'; }, 160);
});
document.addEventListener('visibilitychange', ()=>{
  if(!A.ok || !A.ctx) return;
  try{ document.hidden ? A.ctx.suspend() : A.ctx.resume(); }catch(e){}
});

})();
