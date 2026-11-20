/* Touch controls for the Dust Yard games.
   On a phone or tablet this draws on-screen buttons over the game while it is being played
   (the page's #hud is showing and its #menu is hidden). Buttons press real key codes by sending
   keydown/keyup events, so each game keeps its own keyboard logic. A game can also hand in
   callbacks for things that aren't keys (looking around, firing).

   TOUCH.init({
     stick: { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', sprint:'ShiftLeft' },   // left-thumb joystick (optional)
     look:  (dx, dy) => {},                                                                // drag on the right half to look (optional)
     buttons: [ { label:'Fire', code:'KeyX' | down:fn, up:fn, x:'r1', y:'b1', size:'lg', look:true } ]
   })
   Positions: x is 'l<n>' or 'r<n>' (column from the left or right edge), y is 'b<n>' or 't<n>' (row from bottom or top). */
(function(){
  const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const isTouch = coarse || (navigator.maxTouchPoints > 1 && /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document);
  if(isTouch) document.documentElement.classList.add('touch');
  const send = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {code, key:code, bubbles:true, cancelable:true}));

  const css = `
  .tc{position:fixed;inset:0;z-index:4;pointer-events:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}
  .tc[hidden]{display:none}
  .tc .look{position:absolute;top:0;bottom:0;right:0;width:55%;pointer-events:auto;touch-action:none}
  .tc .b{position:absolute;pointer-events:auto;touch-action:none;display:grid;place-items:center;width:var(--s);height:var(--s);border-radius:50%;
    background:rgba(20,22,26,.22);border:1.5px solid rgba(255,255,255,.3);color:rgba(255,255,255,.85);font:700 11px/1.1 system-ui,-apple-system,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-align:center}
  .tc .b.on{background:rgba(255,120,40,.45);border-color:rgba(255,190,140,.9)}
  .tc .b.wide{border-radius:18px;width:calc(var(--s)*1.15);height:calc(var(--s)*1.5)}
  .tc .stick{position:absolute;left:calc(env(safe-area-inset-left,0px) + 18px);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);width:150px;height:150px;border-radius:50%;
    background:rgba(20,22,26,.3);border:2px solid rgba(255,255,255,.25);pointer-events:auto;touch-action:none}
  .tc .knob{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;background:rgba(255,255,255,.55)}
  .tc .rot{position:fixed;inset:0;display:none;place-items:center;background:rgba(8,9,11,.92);color:#fff;font:600 16px system-ui,sans-serif;text-align:center;padding:30px;pointer-events:auto}
  @media (orientation:portrait){ .tc .rot{display:grid} }
  .tc .fsh{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 54px);transform:translateX(-50%);max-width:80%;padding:8px 14px;border-radius:10px;
    background:rgba(8,9,11,.75);color:#fff;font:600 12px/1.35 system-ui,sans-serif;text-align:center;pointer-events:auto}
  `;

  function init(cfg){
    if(!isTouch) return null;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const layer = document.createElement('div'); layer.className = 'tc'; layer.hidden = true; document.body.appendChild(layer);
    // no pinch-zoom or double-tap zoom while playing
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => { if(!layer.hidden) e.preventDefault(); });

    // looking around: drag anywhere on the right half
    if(cfg.look){
      const area = document.createElement('div'); area.className = 'look'; layer.appendChild(area);
      dragLook(area, cfg.look);
    }
    // joystick
    let stickKeys = {};
    if(cfg.stick){
      const S = cfg.stick, el = document.createElement('div'); el.className = 'stick'; const knob = document.createElement('div'); knob.className = 'knob'; el.appendChild(knob); layer.appendChild(el);
      let id = null; const R = 60;
      const set = (code, on) => { if(!code || !!stickKeys[code] === on) return; stickKeys[code] = on; send(code, on); };
      const move = e => {
        const r = el.getBoundingClientRect(), cx = r.left + r.width/2, cy = r.top + r.height/2;
        let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if(d > R){ dx *= R/d; dy *= R/d; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        const nx = dx/R, ny = dy/R, dead = 0.3;
        set(S.up, ny < -dead); set(S.down, ny > dead); set(S.left, nx < -dead); set(S.right, nx > dead);
        set(S.sprint, ny < -0.92);
      };
      const end = () => { id = null; knob.style.transform = ''; for(const c in stickKeys) set(c, false); };
      el.addEventListener('pointerdown', e => { id = e.pointerId; cap(el, id); move(e); e.preventDefault(); });
      el.addEventListener('pointermove', e => { if(e.pointerId === id) move(e); });
      el.addEventListener('pointerup', e => { if(e.pointerId === id) end(); });
      el.addEventListener('pointercancel', e => { if(e.pointerId === id) end(); });
    }
    // buttons
    const btns = [];
    for(const B of cfg.buttons || []){
      const el = document.createElement('div'); el.className = 'b' + (B.wide ? ' wide' : ''); el.textContent = B.label;
      const s = B.size === 'lg' ? 92 : B.size === 'md' ? 58 : B.size === 'sm' ? 44 : 64; el.style.setProperty('--s', s + 'px');
      const col = +B.x.slice(1), row = +B.y.slice(1), gap = 12, unit = 78;
      const hx = `calc(env(safe-area-inset-${B.x[0] === 'l' ? 'left' : 'right'},0px) + ${18 + col*unit}px)`;
      const hy = `calc(env(safe-area-inset-${B.y[0] === 'b' ? 'bottom' : 'top'},0px) + ${14 + row*unit}px)`;
      el.style[B.x[0] === 'l' ? 'left' : 'right'] = hx; el.style[B.y[0] === 'b' ? 'bottom' : 'top'] = hy;
      layer.appendChild(el); btns.push(el);
      let id = null, lx = 0, ly = 0;
      const down = e => { id = e.pointerId; cap(el, id); lx = e.clientX; ly = e.clientY; el.classList.add('on');
        if(B.code) send(B.code, true); if(B.down) B.down(); if(navigator.vibrate && B.buzz) navigator.vibrate(10); e.preventDefault(); };
      const up = e => { if(e.pointerId !== id) return; id = null; el.classList.remove('on'); if(B.code) send(B.code, false); if(B.up) B.up(); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', e => { if(e.pointerId !== id || !B.look || !cfg.look) return; cfg.look(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; });
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    }
    // full screen: Android/iPad can do it on the first tap in landscape; iPhone Safari can't, so it gets a home-screen tip
    const de = document.documentElement, reqFS = de.requestFullscreen || de.webkitRequestFullscreen;
    const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
    const isFS = () => document.fullscreenElement || document.webkitFullscreenElement;
    const goFS = () => {
      if(standalone || isFS() || !reqFS || !matchMedia('(orientation:landscape)').matches) return;
      try{ const r = reqFS.call(de, {navigationUI:'hide'}); if(r && r.catch) r.catch(() => {}); }catch(e){}
    };
    document.addEventListener('pointerup', goFS, true);
    addEventListener('orientationchange', () => setTimeout(goFS, 300));
    if(!standalone && !reqFS && /iPhone|iPod/.test(navigator.userAgent)){
      let seen = false; try{ seen = localStorage.getItem('dy-fs-tip') === '1'; }catch(e){}
      if(!seen){
        const tip = document.createElement('div'); tip.className = 'fsh';
        tip.textContent = 'For full screen: tap Share, then "Add to Home Screen", and play from the icon. (Tap to hide)';
        layer.appendChild(tip);
        const hide = () => { tip.remove(); try{ localStorage.setItem('dy-fs-tip', '1'); }catch(e){} };
        tip.addEventListener('pointerdown', hide); setTimeout(hide, 9000);
      }
    }
    // portrait warning
    const rot = document.createElement('div'); rot.className = 'rot'; rot.textContent = 'Turn your phone sideways to play'; layer.appendChild(rot);

    // only while the game itself is on screen
    const hud = document.getElementById('hud'), menu = document.getElementById('menu');
    const tick = () => {
      const on = hud && !hud.hidden && !(menu && !menu.hidden) && (!cfg.visible || cfg.visible());
      if(layer.hidden === on){ layer.hidden = !on; if(!on){ for(const c in stickKeys) if(stickKeys[c]){ stickKeys[c] = false; send(c, false); } btns.forEach(b => b.classList.remove('on')); } }
      requestAnimationFrame(tick);
    };
    tick();
    return {layer};
  }
  function dragLook(area, fn){
    let id = null, lx = 0, ly = 0;
    area.addEventListener('pointerdown', e => { if(id !== null) return; id = e.pointerId; cap(area, id); lx = e.clientX; ly = e.clientY; e.preventDefault(); });
    area.addEventListener('pointermove', e => { if(e.pointerId !== id) return; fn(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; });
    const end = e => { if(e.pointerId === id) id = null; };
    area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
  }
  function cap(el, id){ try{ el.setPointerCapture(id); }catch(e){} }
    // home-screen web app runs full screen with no Safari bars
  if(isTouch){
    const m = (n, c) => { if(document.querySelector(`meta[name="${n}"]`)) return; const e = document.createElement('meta'); e.name = n; e.content = c; document.head.appendChild(e); };
    m('apple-mobile-web-app-capable', 'yes'); m('mobile-web-app-capable', 'yes'); m('apple-mobile-web-app-status-bar-style', 'black-translucent');
  }
  window.TOUCH = {isTouch, init, send};
})();
