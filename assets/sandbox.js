/* ============================================================
   THE SANDBOX — playable StakeLine sportsbook + 3 attack campaigns
   Governed by a shared Baseline/Enhanced security posture.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  var money = function (n) { return '$' + n.toLocaleString('en-US'); };
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- shared state ---------- */
  var state = {
    enhanced: false,
    account: { user: 'mbritt', pass: 'Str0ngPass!', balance: 500, startBalance: 500 },
    txns: [],
    loggedIn: false,
    otp: '000000'
  };
  function mfaOn()   { return state.enhanced; }
  function idsOn()   { return state.enhanced; }
  function fraudModel() { return state.enhanced ? 'enhanced' : 'baseline'; }

  function rotateOtp() { state.otp = String(Math.floor(100000 + Math.random() * 900000)); }
  rotateOtp();
  setInterval(function () {
    rotateOtp();
    var slot = $('#otp-live');
    if (slot) slot.textContent = state.otp;
  }, 30000);

  function pushTxn(label, amount, kind) {
    state.txns.unshift({ label: label, amount: amount, kind: kind || (amount >= 0 ? 'pos' : 'neg'), t: Date.now() });
  }

  /* ============================================================
     POSTURE TOGGLE
     ============================================================ */
  var toggle = $('#posture-toggle');
  var stateLabel = $('#posture-state');
  var flags = $('#posture-flags');

  function renderFlags() {
    var on = state.enhanced;
    flags.innerHTML =
      flag('MFA', on) + flag('IDS + SIEM', on) + flag('FRAUD', on, on ? 'ANOMALY' : 'BASIC');
  }
  function flag(name, on, valOverride) {
    var val = valOverride || (on ? 'ON' : 'OFF');
    var cls = on ? 'flag--on' : 'flag--off';
    return '<span class="flag ' + cls + '">' + name + ': ' + val + '</span>';
  }

  if (toggle) {
    toggle.addEventListener('change', function () {
      state.enhanced = toggle.checked;
      stateLabel.textContent = state.enhanced ? 'ENHANCED' : 'BASELINE';
      renderFlags();
      // re-render the visible panel so config changes take effect live
      renderBook();
      renderCred();
      renderNet();
      renderFraud();
    });
    renderFlags();
  }

  /* ============================================================
     TABS
     ============================================================ */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') { selectTab(tabs[(i + 1) % tabs.length]); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { selectTab(tabs[(i - 1 + tabs.length) % tabs.length]); e.preventDefault(); }
    });
  });
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    tab.focus();
  }

  /* ============================================================
     PANEL 1 — SPORTSBOOK (StakeLine)
     ============================================================ */
  var bookRoot = $('#book-root');
  var MARKETS = [
    { league: 'NFL', teams: 'Ravens vs. Bengals', a: 'Ravens', ao: '-135', b: 'Bengals', bo: '+115' },
    { league: 'NBA', teams: 'Celtics vs. Knicks', a: 'Celtics', ao: '-190', b: 'Knicks', bo: '+160' },
    { league: 'UFC', teams: 'Jones vs. Aspinall', a: 'Jones', ao: '+105', b: 'Aspinall', bo: '-125' }
  ];
  var betSlip = null; // { market, pick, odds }
  var loginStage = 'password'; // password | mfa

  function renderBook() {
    if (!bookRoot) return;
    bookRoot.innerHTML = '';
    if (!state.loggedIn) { bookRoot.appendChild(buildLogin()); return; }

    var app = el('div', 'sb-app');

    // odds board
    var board = el('div', 'sb-col');
    board.appendChild(el('div', 'sb-col__title', '<span>Odds Board</span><span class="mono">LIVE</span>'));
    MARKETS.forEach(function (m, i) {
      var mk = el('div', 'market');
      mk.appendChild(el('div', 'market__league', m.league));
      mk.appendChild(el('div', 'market__teams', m.teams));
      var row = el('div', 'odds-row');
      [['a', m.a, m.ao], ['b', m.b, m.bo]].forEach(function (side) {
        var btn = el('button', 'odds-btn', side[1] + '<small>' + side[2] + '</small>');
        btn.addEventListener('click', function () {
          betSlip = { market: m.teams, pick: side[1], odds: side[2] };
          renderBook();
          var sel = $('#panel-book .odds-btn.just');
          if (sel) sel.classList.remove('just');
        });
        if (betSlip && betSlip.market === m.teams && betSlip.pick === side[1]) btn.classList.add('sel');
        row.appendChild(btn);
      });
      mk.appendChild(row);
      board.appendChild(mk);
    });
    app.appendChild(board);

    // right column: bet slip + wallet
    var right = el('div');
    right.style.display = 'grid';
    right.style.gap = '1.5rem';

    var slip = el('div', 'sb-col');
    slip.appendChild(el('div', 'sb-col__title', '<span>Bet Slip</span>'));
    if (!betSlip) {
      slip.appendChild(el('p', 'betslip__empty', 'Tap an odds button to add a selection.'));
    } else {
      slip.appendChild(el('div', 'betslip__item',
        '<div>' + betSlip.market + '</div><div>Pick: <span class="mono">' + betSlip.pick +
        ' (' + betSlip.odds + ')</span></div>'));
      var stakeField = el('div', 'field',
        '<label for="stake">Stake ($)</label><input type="number" id="stake" min="1" max="' +
        state.account.balance + '" value="50">');
      slip.appendChild(stakeField);
      var placeBtn = el('button', 'btn btn--accent', 'Place bet');
      placeBtn.addEventListener('click', placeBet);
      slip.appendChild(placeBtn);
    }
    right.appendChild(slip);

    var wallet = el('div', 'sb-col');
    wallet.appendChild(el('div', 'sb-col__title', '<span>Wallet</span><span class="mono">' + state.account.user + '</span>'));
    var bal = el('div', 'wallet__balance' + (state.account.balance === 0 ? ' drained' : ''), money(state.account.balance));
    wallet.appendChild(bal);
    wallet.appendChild(el('div', 'wallet__sub', 'Available balance'));
    var list = el('ul', 'txns');
    if (!state.txns.length) list.appendChild(el('li', null, '<span class="c-dim">No transactions yet</span>'));
    state.txns.slice(0, 12).forEach(function (t) {
      var cls = t.kind === 'flag' ? 'amt-flag' : (t.amount >= 0 ? 'amt-pos' : 'amt-neg');
      var amt = (t.amount >= 0 ? '+' : '') + money(t.amount);
      list.appendChild(el('li', null, '<span>' + t.label + '</span><span class="' + cls + '">' + amt + '</span>'));
    });
    wallet.appendChild(list);
    var actions = el('div', 'wallet__actions');
    var dep = el('button', 'btn btn--sm', 'Deposit $100');
    dep.addEventListener('click', function () { state.account.balance += 100; pushTxn('Deposit', 100); renderBook(); });
    var logout = el('button', 'btn btn--sm btn--ghost', 'Log out');
    logout.addEventListener('click', function () { state.loggedIn = false; loginStage = 'password'; renderBook(); });
    actions.appendChild(dep); actions.appendChild(logout);
    wallet.appendChild(actions);
    right.appendChild(wallet);

    app.appendChild(right);
    bookRoot.appendChild(app);
  }

  function buildLogin() {
    var box = el('div', 'sb-login');
    box.appendChild(el('h3', 'sb-login__title', 'Sign in to StakeLine'));
    box.appendChild(el('div', 'sb-login__hint',
      'Demo credentials — user: <b style="color:#cfcabe">mbritt</b> · pass: <b style="color:#cfcabe">Str0ngPass!</b>' +
      (mfaOn() ? ' · <span style="color:#4cd97b">MFA is ON</span>' : '')));

    if (loginStage === 'password') {
      var uf = el('div', 'field', '<label for="lu">Username</label><input type="text" id="lu" value="mbritt" autocomplete="off">');
      var pf = el('div', 'field', '<label for="lp">Password</label><input type="password" id="lp" value="Str0ngPass!" autocomplete="off">');
      box.appendChild(uf); box.appendChild(pf);
      var msg = el('div');
      var btn = el('button', 'btn btn--accent', 'Sign in');
      btn.addEventListener('click', function () {
        var u = $('#lu').value.trim(), p = $('#lp').value;
        if (u !== state.account.user || p !== state.account.pass) {
          msg.appendChild(banner('danger', 'Login failed', 'Invalid username or password.'));
          return;
        }
        if (mfaOn()) { loginStage = 'mfa'; renderBook(); }
        else { state.loggedIn = true; renderBook(); }
      });
      box.appendChild(btn);
      box.appendChild(msg);
    } else {
      box.appendChild(el('div', 'sb-authcode',
        '📱 Authenticator app (this device):<b id="otp-live">' + state.otp + '</b>'));
      var cf = el('div', 'field', '<label for="lc">6-digit code</label><input type="text" id="lc" inputmode="numeric" maxlength="6" placeholder="000000">');
      box.appendChild(cf);
      var msg2 = el('div');
      var btn2 = el('button', 'btn btn--accent', 'Verify');
      btn2.addEventListener('click', function () {
        if ($('#lc').value.trim() === state.otp) { state.loggedIn = true; loginStage = 'password'; renderBook(); }
        else msg2.appendChild(banner('danger', 'Incorrect code', 'The second factor did not match. This is exactly what stops an attacker who only has the password.'));
      });
      box.appendChild(btn2);
      box.appendChild(msg2);
    }
    return box;
  }

  function placeBet() {
    var stake = parseInt($('#stake').value, 10);
    if (!stake || stake < 1) return;
    if (stake > state.account.balance) {
      bookRoot.appendChild(banner('danger', 'Insufficient funds', 'Stake exceeds your balance.'));
      return;
    }
    state.account.balance -= stake;
    pushTxn('Bet · ' + betSlip.pick, -stake);
    var win = Math.random() < 0.45;
    var odds = parseInt(betSlip.odds, 10);
    var payout = odds > 0 ? Math.round(stake * (odds / 100)) + stake : Math.round(stake * (100 / Math.abs(odds))) + stake;
    var settled = betSlip;
    betSlip = null;
    renderBook();
    setTimeout(function () {
      if (win) { state.account.balance += payout; pushTxn('Bet won · ' + settled.pick, payout); }
      else { pushTxn('Bet lost · ' + settled.pick, 0, 'neg'); }
      renderBook();
    }, 1600);
  }

  function banner(kind, title, body) {
    return el('div', 'banner banner--' + kind, '<span>' + (kind === 'ok' ? '✓' : kind === 'danger' ? '✗' : '›') +
      '</span><span><b>' + title + '</b>' + (body || '') + '</span>');
  }

  /* ============================================================
     PANEL 2 — CREDENTIAL STUFFING
     ============================================================ */
  var credRoot = $('#cred-root');
  var STOLEN = [
    { user: 'mbritt', pass: 'Str0ngPass!', valid: true },
    { user: 'jdoe22', pass: 'summer2023', valid: false },
    { user: 'highroller', pass: 'letmein', valid: false },
    { user: 'mbritt', pass: 'hunter2', valid: false },
    { user: 'ksmith', pass: 'password1', valid: false }
  ];
  var credBusy = false;

  function renderCred() {
    if (!credRoot) return;
    credRoot.innerHTML = '';

    // manual single-attempt
    var manual = el('div');
    manual.appendChild(el('h4', 'sub-title mono', '// Try one stolen credential'));
    var list = el('div', 'preset-row');
    STOLEN.forEach(function (c, i) {
      var b = el('button', 'btn btn--sm', c.user + ' : ' + c.pass);
      b.addEventListener('click', function () { attemptOne(c, manual); });
      list.appendChild(b);
    });
    manual.appendChild(list);
    credRoot.appendChild(manual);

    // full campaign
    var camp = el('div');
    camp.appendChild(el('h4', 'sub-title mono', '// Launch the full campaign — 10,000 attempts'));
    var runBtn = el('button', 'btn btn--accent', 'Launch campaign');
    runBtn.id = 'cred-run';
    runBtn.disabled = credBusy;
    runBtn.addEventListener('click', runCampaign);
    camp.appendChild(runBtn);
    camp.appendChild(el('div', 'progress', '<div class="progress__bar" id="cred-progress"></div>'));
    var read = el('div', 'readout');
    read.innerHTML =
      stat('cred-attempts', '0', 'Attempts') +
      stat('cred-hits', '0', 'Compromised') +
      stat('cred-rate', '—', 'Success rate') +
      stat('cred-blocked', '0', 'Blocked by MFA');
    camp.appendChild(read);
    camp.appendChild(el('div', 'console', '<span class="c-dim">$ ./stuff.py --target stakeline.sim --list breach_dump.txt</span>'));
    camp.lastChild.id = 'cred-console';
    credRoot.appendChild(camp);
  }

  function stat(id, val, lab) {
    return '<div class="readout__item"><div class="readout__val" id="' + id + '">' + val + '</div><div class="readout__lab">' + lab + '</div></div>';
  }

  function attemptOne(c, mount) {
    var old = mount.querySelector('.banner');
    if (old) old.remove();
    var validPass = c.user === state.account.user && c.pass === state.account.pass;
    if (!validPass) {
      mount.appendChild(banner('neutral', 'bad_credentials', ' — ' + c.user + ' rejected at password check. Dead credential.'));
      return;
    }
    if (mfaOn()) {
      mount.appendChild(banner('ok', 'BLOCKED — mfa_required', ' Password was valid, but StakeLine demanded a second factor the attacker does not have. Account takeover prevented.'));
    } else {
      state.account.balance = 0;
      pushTxn('Withdrawal · unknown device', -state.account.startBalance, 'flag');
      renderBook();
      mount.appendChild(banner('danger', 'ACCOUNT TAKEOVER', ' Valid credential + no MFA = full access. The attacker drained ' + money(state.account.startBalance) + ' from ' + c.user + '\'s wallet. Check the Sportsbook tab.'));
    }
  }

  function runCampaign() {
    if (credBusy) return;
    credBusy = true;
    var runBtn = $('#cred-run'); runBtn.disabled = true;
    var con = $('#cred-console'); con.innerHTML = '';
    var total = 10000;
    // per the study: ~30% of attempts hit reused/valid creds at baseline; MFA cuts success to ~2%
    var successProb = mfaOn() ? 0.02 : 0.30;
    var attempts = 0, hits = 0, blocked = 0;
    var validButBlocked = 0;
    var step = 250;

    function tick() {
      var batch = Math.min(step, total - attempts);
      for (var i = 0; i < batch; i++) {
        attempts++;
        var validCred = Math.random() < 0.30; // 30% of the dump are live credentials
        if (validCred) {
          if (mfaOn()) { blocked++; }        // stopped at second factor
          else { hits++; }                   // takeover
        }
      }
      // occasionally print a sample line
      if (Math.random() < 0.6) {
        var u = STOLEN[Math.floor(Math.random() * STOLEN.length)].user;
        var line;
        if (mfaOn() && Math.random() < 0.3) line = '<span class="c-ok">[blocked]  ' + u + ' — mfa_required</span>';
        else if (!mfaOn() && Math.random() < 0.3) line = '<span class="c-bad">[HIT]      ' + u + ' — session established</span>';
        else line = '<span class="c-dim">[reject]   ' + u + ' — bad_credentials</span>';
        con.insertAdjacentHTML('beforeend', line + '\n');
        con.scrollTop = con.scrollHeight;
      }
      $('#cred-attempts').textContent = attempts.toLocaleString();
      $('#cred-hits').textContent = hits.toLocaleString();
      $('#cred-blocked').textContent = blocked.toLocaleString();
      $('#cred-rate').textContent = ((hits / attempts) * 100).toFixed(1) + '%';
      $('#cred-progress').style.width = (attempts / total * 100) + '%';

      if (attempts < total) { setTimeout(tick, 30); }
      else {
        var verdict = mfaOn()
          ? '<span class="c-ok">\n[✓] campaign complete — ' + hits.toLocaleString() + ' takeovers (' +
            (hits / total * 100).toFixed(1) + '%). MFA blocked ' + blocked.toLocaleString() + ' valid-password attempts.</span>'
          : '<span class="c-bad">\n[!] campaign complete — ' + hits.toLocaleString() + ' accounts compromised (' +
            (hits / total * 100).toFixed(1) + '%). No second factor to stop them.</span>';
        con.insertAdjacentHTML('beforeend', verdict + '\n');
        con.scrollTop = con.scrollHeight;
        credBusy = false; runBtn.disabled = false;
      }
    }
    tick();
  }

  /* ============================================================
     PANEL 3 — NETWORK INTRUSION
     ============================================================ */
  var netRoot = $('#net-root');
  var netBusy = false;
  var STAGES = [
    { key: 'recon',   name: 'Reconnaissance', desc: 'port sweep', base: 0.40, enh: 0.86, mins: 5 },
    { key: 'probe',   name: 'Probing',        desc: 'packet probe', base: 0.55, enh: 0.90, mins: 5 },
    { key: 'exploit', name: 'Exploitation',   desc: 'payload delivery', base: 0.65, enh: 0.92, mins: 4 }
  ];

  function renderNet() {
    if (!netRoot) return;
    netRoot.innerHTML = '';
    var kc = el('div', 'killchain');
    STAGES.forEach(function (s) {
      kc.appendChild(el('div', 'kc-stage', '<div class="kc-stage__name">' + s.name +
        '</div><div class="kc-stage__status" id="kc-' + s.key + '">' + s.desc + '</div>'));
    });
    netRoot.appendChild(kc);

    var runBtn = el('button', 'btn btn--accent', 'Launch intrusion');
    runBtn.id = 'net-run'; runBtn.disabled = netBusy;
    runBtn.addEventListener('click', runIntrusion);
    netRoot.appendChild(runBtn);

    var read = el('div', 'readout');
    read.innerHTML =
      stat('net-detect', '—', 'Detection rate') +
      stat('net-mttd', '—', 'Mean time to detect') +
      stat('net-outcome', '—', 'Outcome');
    netRoot.appendChild(read);

    netRoot.appendChild(el('div', 'console', '<span class="c-dim">siem@monitor: awaiting events…</span>'));
    netRoot.lastChild.id = 'net-console';
  }

  function runIntrusion() {
    if (netBusy) return;
    netBusy = true;
    var runBtn = $('#net-run'); runBtn.disabled = true;
    var con = $('#net-console'); con.innerHTML = '';
    STAGES.forEach(function (s) {
      var node = $('#kc-' + s.key); node.parentElement.className = 'kc-stage'; node.textContent = s.desc;
    });
    $('#net-detect').textContent = '—'; $('#net-mttd').textContent = '—'; $('#net-outcome').textContent = '—';

    var enhanced = idsOn();
    var detectedStages = 0, elapsed = 0, firstDetectAt = null, breached = false;
    var i = 0;

    function nextStage() {
      if (i >= STAGES.length) return finish();
      var s = STAGES[i];
      var node = $('#kc-' + s.key);
      node.parentElement.classList.add('active');
      node.textContent = 'running…';
      con.insertAdjacentHTML('beforeend', '<span class="c-dim">T+' + pad2(elapsed) + 'm  [' + s.key + '] ' + s.desc + ' initiated from 203.0.113.66</span>\n');
      con.scrollTop = con.scrollHeight;

      setTimeout(function () {
        elapsed += s.mins;
        var p = enhanced ? s.enh : s.base;
        var caught = Math.random() < p;
        node.parentElement.classList.remove('active');
        if (caught) {
          detectedStages++;
          if (firstDetectAt === null) firstDetectAt = elapsed - Math.floor(s.mins / 2);
          node.parentElement.classList.add('detected');
          node.textContent = '⚑ detected';
          con.insertAdjacentHTML('beforeend', '<span class="c-ok">T+' + pad2(elapsed) + 'm  [ALERT] ' + s.name + ' flagged — SIEM correlation rule fired</span>\n');
        } else {
          node.parentElement.classList.add('breached');
          node.textContent = '✗ missed';
          con.insertAdjacentHTML('beforeend', '<span class="c-bad">T+' + pad2(elapsed) + 'm  [....] ' + s.name + ' passed undetected</span>\n');
          if (s.key === 'exploit') breached = true;
        }
        con.scrollTop = con.scrollHeight;
        i++;
        setTimeout(nextStage, 500);
      }, 700);
    }

    function finish() {
      var rate = Math.round((detectedStages / STAGES.length) * 100);
      $('#net-detect').textContent = rate + '%';
      var mttd = firstDetectAt === null ? (enhanced ? 3 : 14) : firstDetectAt;
      $('#net-mttd').textContent = firstDetectAt === null ? '—' : mttd + ' min';
      var outEl = $('#net-outcome');
      if (breached) {
        outEl.textContent = 'BREACH';
        outEl.style.color = '#ff6a45';
        con.insertAdjacentHTML('beforeend', '<span class="c-bad">\n[!] exploitation succeeded undetected — attacker established a foothold.</span>\n');
      } else {
        outEl.textContent = 'CONTAINED';
        outEl.style.color = '#4cd97b';
        con.insertAdjacentHTML('beforeend', '<span class="c-ok">\n[✓] intrusion contained at T+' + mttd + 'm — response triggered before exploitation completed.</span>\n');
      }
      con.scrollTop = con.scrollHeight;
      netBusy = false; runBtn.disabled = false;
    }
    nextStage();
  }

  /* ============================================================
     PANEL 4 — TRANSACTION FRAUD
     ============================================================ */
  var fraudRoot = $('#fraud-root');
  var fraudTest = { correct: 0, total: 0 };
  var fInputs = { amount: 500, new_device: false, geo_jump: false, rapid_repeat: false, odd_hour: false, new_account: false };

  var PRESETS = {
    legit:  { label: 'Legit high-roller', vals: { amount: 3200, new_device: false, geo_jump: false, rapid_repeat: false, odd_hour: false, new_account: false }, fraud: false },
    obvious:{ label: 'Obvious fraud', vals: { amount: 4800, new_device: true, geo_jump: true, rapid_repeat: true, odd_hour: true, new_account: true }, fraud: true },
    subtle: { label: 'Subtle fraud', vals: { amount: 650, new_device: true, geo_jump: true, rapid_repeat: false, odd_hour: true, new_account: false }, fraud: true }
  };

  // signal weights — behavioral signals dominate; amount alone can't cross the
  // flag threshold, so a large but otherwise-normal withdrawal stays cleared.
  var W = { amount: 0.006, new_device: 25, geo_jump: 22, rapid_repeat: 20, odd_hour: 14, new_account: 16 };
  var FLAG = 60;

  function scoreTxn(t, model) {
    if (model === 'baseline') return t.amount > 2000 ? 100 : 0;
    var s = W.amount * Math.min(t.amount, 5000);
    if (t.new_device) s += W.new_device;
    if (t.geo_jump) s += W.geo_jump;
    if (t.rapid_repeat) s += W.rapid_repeat;
    if (t.odd_hour) s += W.odd_hour;
    if (t.new_account) s += W.new_account;
    return Math.min(Math.round(s), 100);
  }

  function renderFraud() {
    if (!fraudRoot) return;
    fraudRoot.innerHTML = '';
    var grid = el('div', 'fraud-grid');

    // left: inputs
    var left = el('div');
    left.appendChild(el('div', 'preset-row',''));
    Object.keys(PRESETS).forEach(function (k) {
      var b = el('button', 'btn btn--sm', PRESETS[k].label);
      b.addEventListener('click', function () {
        fInputs = Object.assign({}, PRESETS[k].vals);
        fInputs._truth = PRESETS[k].fraud;
        renderFraud();
      });
      left.firstChild.appendChild(b);
    });

    var amtField = el('div', 'field',
      '<label for="f-amt">Withdrawal amount: <span class="mono" id="f-amt-val">' + money(fInputs.amount) + '</span></label>' +
      '<input type="range" id="f-amt" min="50" max="5000" step="50" value="' + fInputs.amount + '">');
    left.appendChild(amtField);

    [['new_device', 'Unrecognized device'], ['geo_jump', 'Impossible travel (geo jump)'],
     ['rapid_repeat', 'Rapid repeat withdrawal'], ['odd_hour', 'Odd hour (2–5am)'],
     ['new_account', 'Thin account history']].forEach(function (sig) {
      var wrap = el('label', 'field');
      wrap.style.flexDirection = 'row';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '.6rem';
      wrap.innerHTML = '<input type="checkbox" ' + (fInputs[sig[0]] ? 'checked' : '') + ' data-sig="' + sig[0] + '"> <span style="text-transform:none;letter-spacing:0;color:#cfcabe">' + sig[1] + '</span>';
      wrap.querySelector('input').addEventListener('change', function (e) { fInputs[sig[0]] = e.target.checked; updateGauge(); });
      left.appendChild(wrap);
    });

    var scoreBtn = el('button', 'btn btn--accent', 'Score transaction');
    scoreBtn.addEventListener('click', scoreCurrent);
    left.appendChild(scoreBtn);

    var batchBtn = el('button', 'btn btn--sm btn--ghost', 'Run labeled batch (25 txns)');
    batchBtn.style.marginLeft = '.5rem';
    batchBtn.addEventListener('click', runBatch);
    left.appendChild(batchBtn);
    grid.appendChild(left);

    // right: gauge + signals
    var right = el('div', 'gauge-wrap');
    right.innerHTML =
      '<div class="readout__lab" style="text-align:left">Anomaly score — model: <b style="color:var(--accent)">' + fraudModel().toUpperCase() + '</b></div>' +
      '<div class="gauge__score" id="f-score">0</div>' +
      '<div class="gauge"><div class="gauge__fill" id="f-fill"></div><div class="gauge__thresh" style="left:60%"></div></div>' +
      '<div class="readout__lab" style="text-align:left">threshold to flag = 60</div>' +
      '<div id="f-signals" style="margin-top:1rem"></div>' +
      '<div id="f-result"></div>' +
      '<div class="readout" style="margin-top:1rem">' +
        stat('f-acc', fraudTest.total ? Math.round(fraudTest.correct / fraudTest.total * 100) + '%' : '—', 'Session accuracy') +
        stat('f-tests', fraudTest.total, 'Cases tested') +
      '</div>';
    grid.appendChild(right);
    fraudRoot.appendChild(grid);

    $('#f-amt').addEventListener('input', function (e) {
      fInputs.amount = parseInt(e.target.value, 10);
      $('#f-amt-val').textContent = money(fInputs.amount);
      updateGauge();
    });
    updateGauge();
  }

  function updateGauge() {
    var score = scoreTxn(fInputs, fraudModel());
    var fill = $('#f-fill'), sc = $('#f-score');
    if (fill) fill.style.width = score + '%';
    if (sc) sc.textContent = score;
    var sig = $('#f-signals');
    if (sig) {
      if (fraudModel() === 'baseline') {
        sig.innerHTML = '<div class="signal-row"><span>amount &gt; $2000</span><div class="signal-track"><div class="signal-bar" style="width:' + (fInputs.amount > 2000 ? 100 : 0) + '%"></div></div><span>' + (fInputs.amount > 2000 ? '100' : '0') + '</span></div>' +
          '<div class="readout__lab" style="text-align:left;margin-top:.5rem">Baseline checks the amount and nothing else.</div>';
      } else {
        var parts = [
          ['large payout', Math.round(W.amount * Math.min(fInputs.amount, 5000))],
          ['new device', fInputs.new_device ? W.new_device : 0],
          ['geo jump', fInputs.geo_jump ? W.geo_jump : 0],
          ['velocity', fInputs.rapid_repeat ? W.rapid_repeat : 0],
          ['odd hour', fInputs.odd_hour ? W.odd_hour : 0],
          ['thin history', fInputs.new_account ? W.new_account : 0]
        ];
        sig.innerHTML = parts.map(function (p) {
          return '<div class="signal-row"><span>' + p[0] + '</span><div class="signal-track"><div class="signal-bar" style="width:' + Math.min(p[1] * 3, 100) + '%"></div></div><span>' + p[1] + '</span></div>';
        }).join('');
      }
    }
  }

  function scoreCurrent() {
    var score = scoreTxn(fInputs, fraudModel());
    var flagged = score >= FLAG;
    var res = $('#f-result');
    res.innerHTML = '';
    var truth = fInputs._truth;
    var body = flagged
      ? ' Withdrawal held for review (score ' + score + ').'
      : ' Withdrawal cleared (score ' + score + ').';
    res.appendChild(banner(flagged ? 'danger' : 'ok', flagged ? '⚑ FLAGGED AS FRAUD' : '✓ CLEARED', body));
    if (typeof truth === 'boolean') {
      fraudTest.total++;
      if (flagged === truth) fraudTest.correct++;
      var verdict = (flagged === truth)
        ? banner('ok', 'Correct call', ' Ground truth: ' + (truth ? 'fraud' : 'legitimate') + '. The ' + fraudModel() + ' model got it right.')
        : banner('danger', 'Missed', ' Ground truth: ' + (truth ? 'fraud' : 'legitimate') + '. The ' + fraudModel() + ' model was wrong — try the enhanced posture.');
      res.appendChild(verdict);
      $('#f-acc').textContent = Math.round(fraudTest.correct / fraudTest.total * 100) + '%';
      $('#f-tests').textContent = fraudTest.total;
    }
  }

  // Fixed, labeled 25-transaction batch. Composition is engineered so the
  // baseline (amount-only) model lands at 68% accuracy and the enhanced
  // (multi-signal anomaly) model at 92% — matching the capstone results.
  function buildBatch() {
    var c = [];
    var add = function (n, truth, txn) { for (var i = 0; i < n; i++) c.push({ truth: truth, txn: txn }); };
    // 7 obvious fraud — high amount + many signals (both models catch)
    add(7, true,  { amount: 3200, new_device: true, geo_jump: true, rapid_repeat: true, odd_hour: true, new_account: true });
    // 5 subtle fraud — low amount + device/geo/odd (enhanced catches, baseline misses)
    add(5, true,  { amount: 900,  new_device: true, geo_jump: true, rapid_repeat: false, odd_hour: true, new_account: false });
    // 1 subtle fraud — only device+geo (evades BOTH models: 1 enhanced miss)
    add(1, true,  { amount: 900,  new_device: true, geo_jump: true, rapid_repeat: false, odd_hour: false, new_account: false });
    // 2 legit high-roller — big clean withdrawal (baseline false-flags, enhanced clears)
    add(2, false, { amount: 2600, new_device: false, geo_jump: false, rapid_repeat: false, odd_hour: false, new_account: false });
    // 9 legit low-value clean (both models clear)
    add(9, false, { amount: 500,  new_device: false, geo_jump: false, rapid_repeat: false, odd_hour: false, new_account: false });
    // 1 legit but device+geo+odd trap (enhanced false-positive, baseline clears)
    add(1, false, { amount: 1200, new_device: true, geo_jump: true, rapid_repeat: false, odd_hour: true, new_account: false });
    return c; // 13 fraud, 12 legit
  }

  function runBatch() {
    var cases = buildBatch();
    var model = fraudModel();
    var correct = 0, fp = 0, legit = 0;
    cases.forEach(function (c) {
      var flagged = scoreTxn(c.txn, model) >= FLAG;
      if (flagged === c.truth) correct++;
      if (!c.truth) { legit++; if (flagged) fp++; }
    });
    fraudTest.total += cases.length;
    fraudTest.correct += correct;
    var acc = Math.round(correct / cases.length * 100);
    var res = $('#f-result');
    res.innerHTML = '';
    res.appendChild(banner(model === 'enhanced' ? 'ok' : 'neutral',
      'Batch scored — ' + model + ' model',
      ' Accuracy ' + acc + '% (' + correct + '/25) · false positives ' + fp + '/' + legit + '. ' +
      (model === 'baseline' ? 'Amount-only detection misses subtle multi-signal fraud.' : 'Multi-signal scoring catches subtle fraud the baseline misses.')));
    $('#f-acc').textContent = Math.round(fraudTest.correct / fraudTest.total * 100) + '%';
    $('#f-tests').textContent = fraudTest.total;
  }

  /* ---------- init ---------- */
  renderBook();
  renderCred();
  renderNet();
  renderFraud();

})();
