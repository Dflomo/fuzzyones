/** Playground entry: wires the core engine to the browser host, renderer, audio and inspector. */
import './ui/playground.css';
import { Buddy } from './core/buddy';
import { DEFAULT_SPECIES, SPECIES, speciesById } from './core/creature/species';
import { classifyElement, ELEMENT_STYLE } from './core/evolution/elements';
import { Progression } from './core/evolution/progression';
import { BrowserHost } from './browser/host';
import { loadSave, writeSave } from './browser/storage';
import { WebAudioPort } from './browser/webAudio';
import { CanvasRenderer, type Theme } from './rendering/canvasRenderer';
import { Inspector } from './ui/inspector';

const save = loadSave();
const audio = new WebAudioPort();
const buddy = new Buddy({ audio, discovered: save.discovered, spawnX: Math.min(innerWidth * 0.3, 240) });
// Growth owns the base species and current form; it resolves the body the buddy wears.
const growth = new Progression(buddy, speciesById(save.species ?? '') ?? DEFAULT_SPECIES, save.growth);
const persist = () => {
  save.growth = growth.state;
  save.species = growth.base.id;
  writeSave(save);
};

let simTime = 0;
// The playground is our own page, so the buddy may read it.
const host = new BrowserHost(buddy, () => simTime, { inspectText: true });
const renderer = new CanvasRenderer(document.getElementById('stage') as HTMLCanvasElement);
const resize = () => renderer.resize(innerWidth, innerHeight, devicePixelRatio);
resize();
addEventListener('resize', resize);

// Persistence and progression bookkeeping, driven purely by the event stream.
buddy.bus.on((e) => {
  if (e.type === 'new_behavior_discovered') {
    save.discovered = [...buddy.discovered];
    writeSave(save);
  }
  if (e.type === 'word_eaten' || e.type === 'buddy_evolved') persist();
});
const inspector = new Inspector(buddy);
setInterval(() => {
  inspector.tick();
  inspector.renderGrowth(growth.status());
}, 300);
setInterval(persist, 5000);

// Audio may only start after a gesture.
const unlock = () => audio.unlock();
addEventListener('pointerdown', unlock, true);
addEventListener('keydown', unlock, true);

// Theme tokens for canvas text.
let theme: Theme = { ink: '#1c2331', paper: '#fff', accent: '#d94f78' };
const readTheme = () => {
  const cs = getComputedStyle(document.documentElement);
  theme = { ink: cs.getPropertyValue('--ink').trim() || theme.ink, paper: cs.getPropertyValue('--paper').trim() || theme.paper, accent: cs.getPropertyValue('--accent').trim() || theme.accent };
};
readTheme();
setInterval(readTheme, 1500);

// Pantry chips: drag onto Puff, or tap to toss.
const PANTRY = ['ember', 'chili pepper', 'raindrop', 'ocean', 'mushroom', 'pebble', 'breeze', 'feather', 'sunbeam', 'honey', 'midnight', 'riddle', 'thunder', 'quarterly synergy', 'an entire wheel of cheese'];
const pantry = document.getElementById('pantry')!;
for (const w of PANTRY) {
  const chip = document.createElement('span');
  chip.className = 'chip';
  const el = classifyElement(w);
  chip.innerHTML = `<i style="background:${el ? ELEMENT_STYLE[el].tint : 'transparent'}"></i>${w}`;
  chip.title = el ? `Counts toward ${ELEMENT_STYLE[el].name}` : 'No element';
  chip.draggable = true;
  chip.tabIndex = 0;
  chip.setAttribute('role', 'button');
  chip.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('text/plain', w);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  });
  const toss = () => {
    const r = chip.getBoundingClientRect();
    const sx = r.left + r.width / 2;
    const sy = r.top;
    buddy.effects.push({ text: w, x: sx, y: sy, vx: (buddy.c.x - sx) / 0.5, vy: (buddy.c.y - sy) / 0.5 - 200, gravity: 800, life: 0.5, maxLife: 0.5, size: 13, bubble: true, accent: false });
    buddy.after(0.5, () => buddy.feed(w));
  };
  chip.addEventListener('click', toss);
  chip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toss();
    }
  });
  pantry.appendChild(chip);
}

// Controls.
const $ = (id: string) => document.getElementById(id) as HTMLButtonElement;
$('bSound').onclick = () => {
  audio.enabled = !audio.enabled;
  $('bSound').setAttribute('aria-pressed', String(audio.enabled));
  $('bSound').textContent = audio.enabled ? 'Sound on' : 'Sound off';
  if (audio.enabled) {
    audio.unlock();
    audio.play('chirp');
  }
};
$('bMode').onclick = () => {
  const next = buddy.mode === 'dynamic' ? 'knowledge_hungry' : 'dynamic';
  buddy.setMode(next);
  $('bMode').textContent = next === 'dynamic' ? 'Mode: Dynamic' : 'Mode: Knowledge-hungry';
  $('bMode').setAttribute('aria-pressed', String(next !== 'dynamic'));
};
$('bHide').onclick = () => {
  const hide = !buddy.c.hidden;
  if (hide) {
    buddy.setHidden(true);
    buddy.emit('buddy_dismissed');
  } else {
    buddy.call();
    buddy.emit('buddy_returned');
  }
  $('bHide').textContent = hide ? 'Show buddy' : 'Hide buddy';
};
$('bCall').onclick = () => {
  buddy.call();
  $('bHide').textContent = 'Hide buddy';
  buddy.emit('buddy_called');
};

$('bGrow').onclick = () => {
  growth.fastForward();
  audio.unlock();
};
$('bReset').onclick = () => {
  growth.reset();
  persist();
  inspector.renderGrowth(growth.status());
};

// Species picker: swap the base species; stage, elements, mood and discoveries carry over.
const speciesEl = document.getElementById('species')!;
const renderSpecies = () => {
  const cur = growth.base;
  document.getElementById('bstage')!.textContent = cur.tagline;
  speciesEl.innerHTML = '';
  for (const sp of SPECIES) {
    const b = document.createElement('button');
    b.setAttribute('aria-pressed', String(sp.id === cur.id));
    b.innerHTML = `<i style="background:${sp.palette.fur}"></i>${sp.name}`;
    b.onclick = () => {
      growth.setBase(sp);
      persist();
      inspector.renderGrowth(growth.status());
      audio.unlock();
      audio.play('chirp');
      renderSpecies();
    };
    speciesEl.appendChild(b);
  }
};
renderSpecies();

// Main loop.
buddy.emit('buddy_arrived', { species: growth.base.id, stage: growth.state.stage });
inspector.renderGrowth(growth.status());
let last = performance.now();
const frame = (ts: number) => {
  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;
  simTime += dt;
  const world = host.snapshot();
  buddy.update(world, dt);
  growth.tick();
  renderer.draw(buddy.c, buddy.effects, world, buddy.now, theme, buddy.activityLabel);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
