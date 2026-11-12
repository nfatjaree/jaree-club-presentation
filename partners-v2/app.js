(() => {
  'use strict';
  const copy = JSON.parse(document.getElementById('presentation-copy').textContent);
  const byId = id => document.getElementById(id);
  const chapters = [...document.querySelectorAll('.chapter')];
  const params = new URLSearchParams(location.search);
  const methods = copy.benefit.methods;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let method = methods.find(item => item.id === params.get('example')) || methods[0];
  let step = [0, 1, 2, 3].includes(Number(params.get('step'))) ? Number(params.get('step')) : 0;
  let stage = [0, 1, 2, 3].includes(Number(params.get('stage'))) ? Number(params.get('stage')) : 0;
  let userPaused = params.get('motion') === 'off';
  let paused = reduced.matches || userPaused;
  let scenario = copy.scenarios.items.find(item => item.id === params.get('scenario')) || copy.scenarios.items[0];
  let scrollAnimation = null;
  let current = 0;
  let framePending = false;
  let navigationTarget = null;
  const menu = document.querySelector('.chapter-menu');
  const tabs = [...document.querySelectorAll('[data-method]')];
  const stages = [...document.querySelectorAll('[data-stage]')];
  const symbol = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const graphics = {
    digital: '<div class="note-sheet"><span></span><span></span><div><i></i><i></i><i></i></div><span></span></div>',
    venue: '<div class="space-window"><i></i><i></i><i></i></div><div class="space-desk"></div>',
    experience: '<div class="service-disc"><svg aria-hidden="true"><use href="#i-spark"/></svg></div>'
  };
  const graphicClasses = {digital:'notion-graphic', venue:'space-graphic', experience:'service-graphic'};

  function stateParams() {
    const next = new URLSearchParams();
    if (method.id !== 'digital') next.set('example', method.id);
    if (step) next.set('step', String(step));
    if (stage) next.set('stage', String(stage));
    if (userPaused) next.set('motion', 'off');
    if (scenario.id !== 'verify') next.set('scenario', scenario.id);
    return next.toString();
  }
  function languageLink() {
    const url = new URL(copy.ui.alternate, location.href);
    url.search = stateParams();
    url.hash = chapters[current].id;
    byId('language-switch').href = url.href;
  }
  function saveState() {
    const query = stateParams();
    history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
    languageLink();
  }
  function setMotion(value) {
    paused = value;
    document.documentElement.classList.toggle('motion-paused', paused);
    byId('motion-toggle').setAttribute('aria-pressed', String(paused));
    byId('motion-toggle').setAttribute('aria-label', paused ? copy.ui.play : copy.ui.pause);
    byId('motion-toggle').querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
    byId('motion-label').textContent = reduced.matches ? copy.ui.reducedMotion : (paused ? copy.ui.play : copy.ui.pause);
    byId('motion-toggle').disabled = reduced.matches;
    if (reduced.matches) byId('motion-toggle').setAttribute('aria-label',copy.ui.reducedMotion);
    if (paused) { document.getAnimations().forEach(animation => animation.cancel()); cancelScroll(); }
  }
  function updateProgress() {
    const marker = Math.min(innerHeight * .32, 300);
    let index = 0;
    chapters.forEach((section, i) => { if (section.getBoundingClientRect().top <= marker) index = i; });
    if (navigationTarget !== null) {
      const targetTop = chapters[navigationTarget].getBoundingClientRect().top;
      if (targetTop >= 0 && targetTop <= 110) navigationTarget = null;
      else index = navigationTarget;
    }
    setCurrent(index);
    framePending = false;
  }
  function setCurrent(index) {
    current = index;
    byId('current-number').textContent = String(index + 1).padStart(2, '0');
    byId('current-title').textContent = copy.nav[index];
    byId('progress-fill').style.width = `${(index + 1) / chapters.length * 100}%`;
    byId('previous').disabled = index === 0;
    byId('next-chapter').disabled = index === chapters.length - 1;
    menu.querySelectorAll('nav a').forEach((link,i) => {
      if (i === index) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    languageLink();
    framePending = false;
  }
  function navigate(target, push = true) {
    if (!target) return;
    if (push && location.hash !== `#${target.id}`) history.pushState(null, '', `${location.pathname}${location.search}#${target.id}`);
    const index = chapters.indexOf(target);
    if (index >= 0) { navigationTarget = index; setCurrent(index); }
    scrollToChapter(target);
    const heading = target.querySelector('h1,h2') || target;
    heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
    menu.open = false;
  }
  function cancelScroll() {
    if (scrollAnimation !== null) cancelAnimationFrame(scrollAnimation);
    scrollAnimation = null;
  }
  function scrollToChapter(target) {
    cancelScroll();
    const start = scrollY;
    const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const end = Math.max(0, Math.min(start + target.getBoundingClientRect().top - offset, document.documentElement.scrollHeight - innerHeight));
    if (paused) { window.scrollTo({top:end,behavior:'instant'}); return; }
    const begun = performance.now();
    function move(now) {
      const progress = Math.min((now - begun) / 520, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo({top:start + (end - start) * eased,behavior:'instant'});
      if (progress < 1) scrollAnimation = requestAnimationFrame(move);
      else {
        scrollAnimation = null; navigationTarget = null; updateProgress();
        target.querySelectorAll(':scope > .reveal').forEach((el,i) => el.animate([{opacity:.65,transform:'translateY(9px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*35,easing:'ease-out'}));
      }
    }
    scrollAnimation = requestAnimationFrame(move);
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (target) {
      event.preventDefault();
      if (link.dataset.showcase) { method = methods.find(item => item.id === link.dataset.showcase) || methods[0]; step = 0; renderMethod(); renderVerification(); saveState(); }
      navigate(target);
    }
  }));
  byId('previous').addEventListener('click', () => navigate(chapters[current - 1]));
  byId('next-chapter').addEventListener('click', () => navigate(chapters[current + 1]));
  addEventListener('scroll', () => {
    if (!framePending) { framePending = true; requestAnimationFrame(updateProgress); }
  }, {passive:true});
  addEventListener('resize', updateProgress);
  addEventListener('wheel', () => { cancelScroll(); navigationTarget = null; }, {passive:true});
  addEventListener('touchstart', () => { cancelScroll(); navigationTarget = null; }, {passive:true});
  document.addEventListener('keydown', event => { if (event.key === 'Escape') menu.open = false; });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
  byId('motion-toggle').addEventListener('click', () => { userPaused = !userPaused; setMotion(reduced.matches || userPaused); saveState(); });
  reduced.addEventListener('change', event => { setMotion(event.matches || userPaused); saveState(); });
  byId('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { byId('fullscreen').hidden = true; }
  });
  document.addEventListener('fullscreenchange', () => { const label = document.fullscreenElement ? copy.ui.exitFullscreen : copy.ui.fullscreen; byId('fullscreen').setAttribute('aria-label',label); byId('fullscreen-label').textContent = label; });

  const stagePanels = stages.map(tab => byId(tab.getAttribute('aria-controls')));

  function renderStage() {
    stages.forEach((tab, index) => {
      const selected = index === stage;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      stagePanels[index].hidden = !selected;
    });
  }
  function selectStage(index) {
    if (stage === index) return;
    stage = index;
    renderStage();
    saveState();
    if (!paused) stagePanels[index].animate([{opacity:.7,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:200,easing:'ease-out'});
  }
  stages.forEach((tab, index) => {
    tab.addEventListener('click', () => selectStage(index));
    tab.addEventListener('keydown', event => {
      const forward = copy.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const back = copy.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      let next;
      if (event.key === forward) next = (index + 1) % stages.length;
      if (event.key === back) next = (index + stages.length - 1) % stages.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = stages.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectStage(next);
        stages[next].focus();
      }
    });
  });

  const application = byId('application-model');
  const applicationFields = [...application.querySelectorAll('[data-application-field]')];
  const applicationSuggestions = [...application.querySelectorAll('[data-application-suggestion]')];
  const applySuggestions = byId('apply-application-suggestions');
  const applicationStatus = byId('application-model-status');
  application.addEventListener('change', () => {
    applySuggestions.disabled = !applicationSuggestions.some(input => input.checked);
  });
  applySuggestions.addEventListener('click', () => {
    const model = copy.join.examples.application;
    applicationSuggestions.forEach((suggestion, index) => {
      if (suggestion.checked) applicationFields[index].value = model.fields[index][1];
    });
    application.querySelector('details').open = false;
    applicationStatus.textContent = model.applied;
    applicationFields[0].focus();
  });

  function bindSignatureDemo() {
    const demo = byId('signature-demo');
    const canvas = demo.querySelector('canvas');
    const context = canvas.getContext('2d');
    const status = demo.querySelector('.signature-status');
    const text = copy.join.examples.signing;
    const buttons = Object.fromEntries(
      [...demo.querySelectorAll('[data-sign-action]')].map(button => [button.dataset.signAction, button]),
    );
    const tools = demo.querySelector('.signature-tools');
    if (!context) {
      buttons.sample.disabled = true;
      return;
    }

    context.strokeStyle = '#111112';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    let pointer = null;
    let lastPoint;
    let hasInk = false;
    let phase = 'draw';

    function render() {
      demo.dataset.ink = String(hasInk);
      demo.dataset.phase = phase;
      tools.hidden = phase !== 'draw';
      buttons.clear.disabled = !hasInk;
      buttons.sign.disabled = !hasInk;
      buttons.sign.hidden = phase !== 'draw';
      buttons.countersign.hidden = phase !== 'partner';
      buttons.reset.hidden = phase === 'draw';
      status.textContent = phase === 'partner' ? text.waiting : phase === 'complete' ? text.complete : '';
    }
    function clearInk() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      hasInk = false;
      render();
    }
    function point(event) {
      const bounds = canvas.getBoundingClientRect();
      return [
        (event.clientX - bounds.left) * canvas.width / bounds.width,
        (event.clientY - bounds.top) * canvas.height / bounds.height,
      ];
    }
    function begin(event) {
      if (phase !== 'draw' || pointer !== null || event.button !== 0) return;
      pointer = event.pointerId;
      canvas.setPointerCapture(pointer);
      lastPoint = point(event);
    }
    function draw(event) {
      if (pointer !== event.pointerId) return;
      const events = event.getCoalescedEvents?.();
      const stroke = (events?.length ? events : [event]).map(point);
      context.beginPath();
      context.moveTo(...lastPoint);
      for (const position of stroke) context.lineTo(...position);
      context.stroke();
      lastPoint = stroke.at(-1);
      if (!hasInk) {
        hasInk = true;
        render();
      }
    }
    function end(event) {
      if (pointer === event.pointerId) pointer = null;
    }
    canvas.addEventListener('pointerdown', begin);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', end);

    buttons.sample.addEventListener('click', () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.moveTo(155, 179);
      context.bezierCurveTo(232, 194, 336, 45, 379, 74);
      context.bezierCurveTo(414, 97, 307, 211, 372, 194);
      context.bezierCurveTo(437, 177, 477, 109, 513, 128);
      context.bezierCurveTo(544, 146, 502, 170, 555, 161);
      context.bezierCurveTo(597, 153, 639, 126, 715, 137);
      context.stroke();
      hasInk = true;
      render();
    });
    buttons.clear.addEventListener('click', () => {
      clearInk();
      buttons.sample.focus();
    });
    buttons.sign.addEventListener('click', () => {
      if (phase !== 'draw' || !hasInk) return;
      pointer = null;
      phase = 'partner';
      render();
      buttons.countersign.focus();
    });
    buttons.countersign.addEventListener('click', () => {
      if (phase !== 'partner') return;
      phase = 'complete';
      render();
      buttons.reset.focus();
    });
    buttons.reset.addEventListener('click', () => {
      phase = 'draw';
      clearInk();
      buttons.sample.focus();
    });
    render();
  }
  bindSignatureDemo();

  function renderMethod() {
    tabs.forEach(tab => {
      const selected = tab.dataset.method === method.id;
      tab.setAttribute('aria-selected',String(selected)); tab.tabIndex = selected ? 0 : -1;
    });
    byId('method-panel').setAttribute('aria-labelledby', `tab-${method.id}`);
    byId('offer-logo').src = `assets/${method.brand.toLowerCase()}.svg`;
    byId('offer-logo').alt = method.brand;
    byId('offer-brand').textContent = `${method.brand} / ${method.category}`;
    ['title','body','audience','method'].forEach(key => { byId(`offer-${key}`).textContent = method[key]; });
    byId('offer-limit').textContent = method.unit;
    byId('method-heading').textContent = method.heading;
    byId('method-note').textContent = method.note;
    byId('method-steps').replaceChildren(...method.steps.map((text,i) => {
      const li = document.createElement('li'); const number = document.createElement('span');
      number.textContent = String(i + 1); li.append(number,document.createTextNode(text)); return li;
    }));
    byId('offer-graphic').className = graphicClasses[method.id];
    byId('offer-graphic').innerHTML = graphics[method.id];
  }
  function chooseMethod(tab) {
    method = methods.find(item => item.id === tab.dataset.method);
    step = 0;
    renderMethod(); renderVerification(); saveState();
    if (!paused) byId('method-panel').animate([{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:200,easing:'ease-out'});
  }
  tabs.forEach((tab,i) => {
    tab.addEventListener('click', () => chooseMethod(tab));
    tab.addEventListener('keydown', event => {
      const forward = copy.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const back = copy.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      let index;
      if (event.key === forward) index = (i + 1) % tabs.length;
      if (event.key === back) index = (i - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = tabs.length - 1;
      if (index !== undefined) { event.preventDefault(); chooseMethod(tabs[index]); tabs[index].focus(); }
    });
  });
  function renderVerification() {
    const confirmed = step >= 2;
    const t = copy.trust;
    byId('verification-logo').src = `assets/${method.brand.toLowerCase()}.svg`;
    byId('verification-logo').alt = method.brand;
    byId('verification-place').textContent = method.place;
    byId('verification-token').textContent = `${method.brand} · ${method.token}`;
    byId('verification-title').textContent = [method.title,t.eligible,t.confirmed,t.repeated][step];
    byId('verification-body').textContent = [t.initial,method.verification,t.result,t.repeatNote][step];
    document.querySelector('.verification-symbol').innerHTML = symbol(step ? (confirmed ? 'check' : 'shield') : (method.id === 'venue' ? 'card' : 'key'));
    byId('verification-state').classList.toggle('verification-success',step > 0);
    byId('verification-detail').hidden = !confirmed;
    byId('verification-detail').replaceChildren();
    if (confirmed) {
      const remaining = document.createElement('span'); remaining.textContent = `${method.remainingLabel}: ${method.remaining}`;
      const reference = document.createElement('span'); const code = document.createElement('bdi');
      code.textContent = 'DEMO-025'; reference.append(`${t.reference} `, code);
      byId('verification-detail').append(remaining,reference);
    }
    byId('verify-button').hidden = confirmed;
    byId('verify-button').replaceChildren(document.createTextNode(step ? t.confirm : method.verify));
    byId('activity-link').hidden = !confirmed;
    byId('repeat-button').hidden = !confirmed;
    byId('repeat-button').disabled = step === 3;
    byId('verify-reset').hidden = step === 0;
    byId('metric-1').textContent = confirmed ? '25' : '24';
    byId('bar-value-5').textContent = confirmed ? '8' : '7';
    byId('bar-5').style.setProperty('--bar', confirmed ? '100%' : '87.5%');
    document.querySelector('.bar-chart').setAttribute('aria-label',`${copy.insights.chart}: 2, 3, 4, 3, 5, ${confirmed ? 8 : 7}`);
    byId('new-activity').hidden = !confirmed;
    const recorded = document.createElement('bdi'); recorded.textContent = `${method.brand} · DEMO-025`;
    byId('new-activity-detail').replaceChildren(recorded, ` · ${copy.insights.newRow}`);
  }
  byId('verify-button').addEventListener('click', () => {
    step = Math.min(step + 1, 2); renderVerification(); saveState();
    if (step === 2) byId('activity-link').focus({preventScroll:true});
  });
  byId('repeat-button').addEventListener('click', () => { step = 3; renderVerification(); saveState(); byId('activity-link').focus({preventScroll:true}); });
  byId('verify-reset').addEventListener('click', () => { step = 0; renderVerification(); saveState(); byId('verify-button').focus({preventScroll:true}); });

  const scenarioTabs = [...document.querySelectorAll('[data-scenario]')];
  function renderScenario() {
    scenarioTabs.forEach(tab => { const selected = tab.dataset.scenario === scenario.id; tab.setAttribute('aria-selected',String(selected)); tab.tabIndex = selected ? 0 : -1; });
    byId('scenario-panel').setAttribute('aria-labelledby',`scenario-tab-${scenario.id}`);
    byId('scenario-body').textContent = scenario.body;
    byId('scenario-direction').textContent = scenario.direction;
    byId('scenario-summary').textContent = scenario.summary;
    byId('scenario-flow').replaceChildren(...scenario.steps.map((text,i) => {
      const item = document.createElement('li');
      const number = document.createElement('span'); number.textContent = String(i + 1).padStart(2, '0');
      const label = document.createElement('b'); label.textContent = text;
      item.append(number, label); return item;
    }));
    byId('scenario-request').textContent = scenario.request;
    byId('scenario-response').textContent = scenario.response;
    byId('scenario-outcome').textContent = scenario.outcome;
    byId('scenario-detail').textContent = scenario.detail;
    document.querySelector('.api-base').hidden = scenario.id === 'issue';
  }
  function selectScenario(index) {
    scenario = copy.scenarios.items[index]; renderScenario(); saveState();
    if (!paused) {
      byId('scenario-body').animate([{opacity:.5},{opacity:1}],{duration:220});
      [...document.querySelectorAll('#scenario-flow li')].forEach((el,i) => el.animate([{opacity:.35,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*65,easing:'ease-out'}));
    }
  }
  scenarioTabs.forEach((tab,i) => {
    tab.addEventListener('click', () => selectScenario(i));
    tab.addEventListener('keydown', event => {
      const forward = copy.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      const back = copy.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      let index;
      if (event.key === forward || event.key === 'ArrowDown') index = (i+1)%scenarioTabs.length;
      if (event.key === back || event.key === 'ArrowUp') index = (i+scenarioTabs.length-1)%scenarioTabs.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = scenarioTabs.length-1;
      if (index !== undefined) { event.preventDefault(); selectScenario(index); scenarioTabs[index].focus(); }
    });
  });

  function restorePosition() {
    const target = document.getElementById(location.hash.slice(1));
    if (target && chapters.includes(target)) {
      target.scrollIntoView({behavior:'instant',block:'start'});
      navigationTarget = null;
      setCurrent(chapters.indexOf(target));
    }
  }
  addEventListener('popstate', () => {
    cancelScroll(); navigationTarget = null;
    const state = new URLSearchParams(location.search);
    method = methods.find(item => item.id === state.get('example')) || methods[0];
    step = [0,1,2,3].includes(Number(state.get('step'))) ? Number(state.get('step')) : 0;
    stage = [0,1,2,3].includes(Number(state.get('stage'))) ? Number(state.get('stage')) : 0;
    userPaused = state.get('motion') === 'off';
    scenario = copy.scenarios.items.find(item => item.id === state.get('scenario')) || copy.scenarios.items[0];
    setMotion(reduced.matches || userPaused); renderScenario();
    renderStage(); renderMethod(); renderVerification(); restorePosition();
  });
  setMotion(paused); renderScenario(); renderStage(); renderMethod(); renderVerification(); updateProgress();
  const openingHash = location.hash;
  if (openingHash) document.fonts.ready.then(() => { if (location.hash === openingHash) restorePosition(); });
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold:.04});
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    const visibility = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('in-view',entry.isIntersecting)), {threshold:0});
    chapters.forEach(element => visibility.observe(element));
  }
})();
