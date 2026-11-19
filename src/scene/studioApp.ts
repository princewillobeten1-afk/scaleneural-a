import {
  FINISH_PRESETS,
  type CameraPresetId,
  type FinishPresetId,
  type SceneThemeMode,
} from './presets';
import { createStudioScene } from './studioScene';

const STORAGE_KEY = 'sn-theme';

const SUN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
const MOON_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function readTheme(): SceneThemeMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }
}

function initStudio() {
  const mount = document.getElementById('sceneMount');
  if (!mount) return;

  const root = document.documentElement;
  const themeButton = document.getElementById('theme');
  const selectionLabel = document.getElementById('selectionLabel');
  const selectionSummary = document.getElementById('selectionSummary');
  const explodeInput = document.getElementById('explodeRange') as HTMLInputElement | null;
  const explodeValue = document.getElementById('explodeValue');
  const toggleMotionBtn = document.getElementById('toggleMotion');
  const resetViewBtn = document.getElementById('resetView');
  const dockEl = document.getElementById('studioDock');
  const collapseBtn = document.getElementById('dockCollapse');

  let activeTheme: SceneThemeMode = readTheme();
  const initialPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isPaused = initialPaused;

  const controller = createStudioScene({
    container: mount,
    initialTheme: activeTheme,
    initialFinish: 'titanium',
    onSelect: (info) => {
      if (selectionLabel) selectionLabel.textContent = info.label;
      if (selectionSummary) selectionSummary.textContent = info.summary;
    },
  });

  const syncTheme = (mode: SceneThemeMode, persist: boolean) => {
    activeTheme = mode;
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Ignore restricted storage
      }
    }
    if (themeButton) {
      const next = mode === 'light' ? 'dark' : 'light';
      const label = next === 'light' ? 'Switch to light mode' : 'Switch to dark mode';
      themeButton.setAttribute('aria-label', label);
      themeButton.setAttribute('title', label);
      themeButton.setAttribute('aria-pressed', String(mode === 'light'));
      themeButton.innerHTML = mode === 'light' ? MOON_ICON : SUN_ICON;
    }
    controller.setTheme(mode);
  };

  syncTheme(activeTheme, false);

  themeButton?.addEventListener('click', () => {
    syncTheme(activeTheme === 'light' ? 'dark' : 'light', true);
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      syncTheme(event.newValue === 'light' ? 'light' : 'dark', false);
    }
  });

  // Exploded view slider
  explodeInput?.addEventListener('input', () => {
    const pct = Number(explodeInput.value) || 0;
    if (explodeValue) explodeValue.textContent = `${pct}%`;
    controller.setExplode(pct / 100);
  });

  // Camera view pills
  const camButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-cam]')
  );
  camButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = (btn.dataset.cam || 'overview') as CameraPresetId;
      camButtons.forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
      controller.setCameraPreset(preset);
    });
  });

  // Material finish swatches
  const finishButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-finish]')
  );
  finishButtons.forEach((btn) => {
    const finishId = (btn.dataset.finish || 'titanium') as FinishPresetId;
    const preset = FINISH_PRESETS[finishId];
    if (preset) {
      btn.style.setProperty('--swatch', preset.swatch);
    }
    btn.addEventListener('click', () => {
      finishButtons.forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
      controller.setFinish(finishId);
    });
  });

  // Play / Pause animation toggle
  const syncMotionButton = () => {
    if (!toggleMotionBtn) return;
    toggleMotionBtn.textContent = isPaused ? 'Play' : 'Pause';
    toggleMotionBtn.setAttribute('aria-pressed', String(isPaused));
  };
  syncMotionButton();

  toggleMotionBtn?.addEventListener('click', () => {
    isPaused = !isPaused;
    controller.setPaused(isPaused);
    syncMotionButton();
  });

  // Reset view & explode
  resetViewBtn?.addEventListener('click', () => {
    if (explodeInput) explodeInput.value = '0';
    if (explodeValue) explodeValue.textContent = '0%';
    camButtons.forEach((b) =>
      b.classList.toggle('active', b.dataset.cam === 'overview')
    );
    controller.resetView();
  });

  // Collapsible Zen Mode dock (button + 'H' shortcut)
  const setDockCollapsed = (collapsed: boolean) => {
    if (!dockEl || !collapseBtn) return;
    dockEl.classList.toggle('collapsed', collapsed);
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    collapseBtn.textContent = collapsed ? '▴ Show Controls' : '▾ Hide Controls';
  };

  collapseBtn?.addEventListener('click', () => {
    if (!dockEl) return;
    setDockCollapsed(!dockEl.classList.contains('collapsed'));
  });

  window.addEventListener('keydown', (event) => {
    if (
      event.key.toLowerCase() === 'h' &&
      !(event.target instanceof HTMLInputElement) &&
      !(event.target instanceof HTMLTextAreaElement)
    ) {
      if (!dockEl) return;
      setDockCollapsed(!dockEl.classList.contains('collapsed'));
    }
  });

  window.addEventListener('beforeunload', () => {
    controller.dispose();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudio);
} else {
  initStudio();
}
