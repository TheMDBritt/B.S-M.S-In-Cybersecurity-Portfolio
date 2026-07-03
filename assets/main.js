/* Malcolm D. Britt — capstone site interactions */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ TERMINAL TYPING ============ */
  var termLines = [
    { text: '$ ./run-capstone --target sportsbook-sim --mode layered-defense', cls: '' },
    { text: '[+] environment online — 5 VMs · app / db / client / monitoring / logging', cls: 't-ok' },
    { text: '[!] scenario 1: credential stuffing — 10,000 attempts ... MFA holds (30% → 2%)', cls: 't-warn' },
    { text: '[!] scenario 2: network intrusion — recon/probe/exploit ... IDS+SIEM MTTD 14m → 3m', cls: 't-warn' },
    { text: '[!] scenario 3: transaction fraud — payout manipulation ... accuracy 68% → 92%', cls: 't-warn' },
    { text: '[+] mapped to NIST CSF + MITRE ATT&CK — 7 techniques mitigated', cls: 't-ok' },
    { text: '[✓] VERDICT: LAYERED DEFENSE HOLDS.', cls: 't-accent' }
  ];

  var term = document.getElementById('terminal-output');
  if (term) {
    if (reduceMotion) {
      termLines.forEach(function (l) { appendLine(l, true); });
    } else {
      typeLines(0);
    }
  }

  function appendLine(line, instant) {
    var span = document.createElement('span');
    if (line.cls) span.className = line.cls;
    span.textContent = line.text + '\n';
    term.appendChild(span);
    return span;
  }

  function typeLines(i) {
    if (i >= termLines.length) return;
    var line = termLines[i];
    var span = document.createElement('span');
    if (line.cls) span.className = line.cls;
    term.appendChild(span);
    var pos = 0;
    var speed = line.text.charAt(0) === '$' ? 28 : 10;
    (function tick() {
      pos += 1 + Math.floor(Math.random() * 2);
      if (pos >= line.text.length) {
        span.textContent = line.text + '\n';
        setTimeout(function () { typeLines(i + 1); }, 220);
        return;
      }
      span.textContent = line.text.slice(0, pos);
      setTimeout(tick, speed);
    })();
  }

  /* ============ COUNT-UP STATS ============ */
  var counters = document.querySelectorAll('.count');
  if ('IntersectionObserver' in window && counters.length) {
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || seen.has(e.target)) return;
        seen.add(e.target);
        runCounter(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { io.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = c.getAttribute('data-count'); });
  }

  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduceMotion) { el.textContent = target; return; }
    var dur = 1100, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ============ CHARTS ============ */
  /* Baseline = cobalt #2B50C8, Enhanced = accent #E62E00 — palette validated
     (lightness band, chroma floor, CVD separation, contrast vs #FFFFFF). */
  var chartData = [
    {
      title: 'Credential attack success',
      note: 'share of 10,000 attempts that compromised an account · lower is better',
      unit: '%', max: 100, baseline: 30, enhanced: 2,
      delta: '−93% compromises',
      tip: 'MFA blocked stolen-credential logins: 3,000 of 10,000 attempts succeeded at baseline, ~200 with MFA enforced.'
    },
    {
      title: 'Intrusion detection rate',
      note: 'share of malicious events identified · higher is better',
      unit: '%', max: 100, baseline: 54, enhanced: 89,
      delta: '+35 points',
      tip: 'Snort/Suricata correlated through Elastic SIEM caught scanning, probing, and exploitation the firewall missed.'
    },
    {
      title: 'Mean time to detect',
      note: 'minutes from intrusion to alert · lower is better',
      unit: ' min', max: 15, baseline: 14, enhanced: 3,
      delta: '11 min less dwell time',
      tip: 'Faster detection denies attackers the time to escalate privileges, pivot, and exfiltrate.'
    },
    {
      title: 'Fraud detection accuracy',
      note: 'fraudulent transactions correctly flagged · higher is better',
      unit: '%', max: 100, baseline: 68, enhanced: 92,
      delta: '+24 points',
      tip: 'Anomaly scoring on wager patterns, payout behavior, and location shifts caught manipulation the baseline missed.'
    },
    {
      title: 'Fraud detection time',
      note: 'minutes to flag a fraudulent transaction · lower is better',
      unit: ' min', max: 7, baseline: 6, enhanced: 2,
      delta: '67% faster',
      tip: 'Fraud flagged in under two minutes — before funds leave the platform.'
    },
    {
      title: 'False positive rate',
      note: 'legitimate activity incorrectly flagged · tradeoff',
      unit: '%', max: 10, baseline: 3, enhanced: 5,
      delta: '+2 pts — accepted tradeoff',
      tip: 'Tighter fraud detection flagged slightly more legitimate activity — an accepted cost given the accuracy gained.'
    }
  ];

  var chartsRoot = document.getElementById('charts');
  var tooltip = document.getElementById('tooltip');

  if (chartsRoot) {
    chartData.forEach(function (d) { chartsRoot.appendChild(buildChart(d)); });
    if ('IntersectionObserver' in window && !reduceMotion) {
      var seenCharts = new WeakSet();
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || seenCharts.has(e.target)) return;
          seenCharts.add(e.target);
          fillBars(e.target);
          cio.unobserve(e.target);
        });
      }, { threshold: 0.35 });
      chartsRoot.querySelectorAll('.chart').forEach(function (c) { cio.observe(c); });
    } else {
      chartsRoot.querySelectorAll('.chart').forEach(fillBars);
    }
  }

  function buildChart(d) {
    var fig = document.createElement('figure');
    fig.className = 'chart';
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('aria-label',
      d.title + '. Baseline ' + d.baseline + d.unit.trim() + ', enhanced ' + d.enhanced + d.unit.trim() + '. ' + d.tip);
    fig.dataset.tip = d.tip;

    fig.innerHTML =
      '<h4 class="chart__title">' + d.title + '</h4>' +
      '<p class="chart__note">' + d.note + '</p>' +
      row('Baseline', d.baseline, d) +
      row('Enhanced', d.enhanced, d) +
      '<p class="chart__delta">' + d.delta + '</p>';

    fig.addEventListener('mouseenter', function (ev) { showTip(fig, ev); });
    fig.addEventListener('mousemove', function (ev) { moveTip(ev); });
    fig.addEventListener('mouseleave', hideTip);
    fig.addEventListener('focus', function () { showTipAtEl(fig); });
    fig.addEventListener('blur', hideTip);
    return fig;
  }

  function row(label, value, d) {
    var pct = Math.max((value / d.max) * 100, 1.5);
    var cls = label === 'Baseline' ? 'baseline' : 'enhanced';
    var inLabel = pct > 85 ? ' chart__bar--in' : '';
    return (
      '<div class="chart__row">' +
        '<span class="chart__rowlabel">' + label + '</span>' +
        '<div class="chart__track">' +
          '<div class="chart__bar chart__bar--' + cls + inLabel + '" data-w="' + pct + '">' +
            '<span class="chart__val">' + value + d.unit + '</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function fillBars(chart) {
    chart.querySelectorAll('.chart__bar').forEach(function (bar, i) {
      var w = bar.getAttribute('data-w') + '%';
      if (reduceMotion) { bar.style.width = w; return; }
      setTimeout(function () { bar.style.width = w; }, i * 140);
    });
  }

  /* tooltip */
  function showTip(el, ev) {
    if (!tooltip || !el.dataset.tip) return;
    tooltip.innerHTML = '<b>' + el.querySelector('.chart__title').textContent + '</b><br>' + el.dataset.tip;
    tooltip.hidden = false;
    if (ev) moveTip(ev);
  }
  function showTipAtEl(el) {
    if (!tooltip || !el.dataset.tip) return;
    var r = el.getBoundingClientRect();
    tooltip.innerHTML = '<b>' + el.querySelector('.chart__title').textContent + '</b><br>' + el.dataset.tip;
    tooltip.hidden = false;
    tooltip.style.left = Math.max(8, r.left) + 'px';
    tooltip.style.top = Math.max(8, r.top - tooltip.offsetHeight - 10) + 'px';
  }
  function moveTip(ev) {
    if (!tooltip || tooltip.hidden) return;
    var x = ev.clientX + 16, y = ev.clientY + 16;
    var tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    if (x + tw > window.innerWidth - 8) x = ev.clientX - tw - 12;
    if (y + th > window.innerHeight - 8) y = ev.clientY - th - 12;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
  function hideTip() { if (tooltip) tooltip.hidden = true; }

  /* ============ ATT&CK CARDS ============ */
  var techniques = [
    { tactic: 'Initial Access', id: 'T1078', name: 'Valid Accounts',
      desc: 'Use of stolen credentials to gain access to user accounts.',
      control: 'Multi-factor authentication' },
    { tactic: 'Credential Access', id: 'T1110', name: 'Brute Force',
      desc: 'Automated credential guessing at scale — 10,000 attempts per trial.',
      control: 'Login throttling + MFA' },
    { tactic: 'Reconnaissance', id: 'T1595', name: 'Active Scanning',
      desc: 'Network probing for open ports and exposed services.',
      control: 'IDS alerting on abnormal scanning' },
    { tactic: 'Defense Evasion', id: 'T1539', name: 'Web Session Cookie Theft',
      desc: 'Attempts to steal session tokens and hijack authenticated sessions.',
      control: 'TLS encryption + secure session handling' },
    { tactic: 'Persistence', id: 'T1098', name: 'Account Manipulation',
      desc: 'Changing account recovery and credential settings to keep access.',
      control: 'MFA + alerts on profile changes' },
    { tactic: 'Exfiltration', id: 'T1041', name: 'Exfil Over Web Protocol',
      desc: 'Moving stolen data out through normal web ports to blend in.',
      control: 'IDS detection + SIEM correlation' },
    { tactic: 'Impact', id: 'T1565', name: 'Data Manipulation',
      desc: 'Modifying transaction values and bet outcomes for financial gain.',
      control: 'Fraud monitoring + anomaly detection' }
  ];

  var cardsRoot = document.getElementById('attack-cards');
  if (cardsRoot) {
    techniques.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML =
        '<span class="card__tactic">' + t.tactic + '</span>' +
        '<span class="card__id">' + t.id + '</span>' +
        '<span class="card__name">' + t.name + '</span>' +
        '<span class="card__body" hidden>' + t.desc +
          '<span class="card__mit" style="display:block"><b>Mitigated by:</b> ' + t.control + '</span>' +
        '</span>' +
        '<span class="card__hint">[ tap to expand ]</span>';
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        btn.querySelector('.card__body').hidden = open;
        btn.querySelector('.card__hint').textContent = open ? '[ tap to expand ]' : '[ tap to close ]';
      });
      cardsRoot.appendChild(btn);
    });
  }

  /* ============ TICKER: duplicate content for seamless loop ============ */
  var ticker = document.getElementById('ticker-track');
  if (ticker) ticker.innerHTML += ticker.innerHTML;

})();
