import {
    d as E,
    c as k,
    b as i,
    i as h,
    e as l,
    h as e,
    t as o,
    k as D,
    _ as A,
    r as S,
    F as V,
    j as z,
    w as O,
    o as U,
    a as Q,
    f as I,
    g as C,
    q as M,
    x as F,
    m as $,
    l as L,
    p as R,
    y as J,
    v as j
} from './index-B71WFFrY.js';
import { b as B, c as W, B as N, a as q, u as K, t as X, g as Y } from './Button-CNSxvtKi.js';
import { D as Z, S as ee } from './SearchInput-BXn_6cZ3.js';
import { M as te } from './Modal-7iVHFP_0.js';
import { i as se, L as H } from './index-B-ioSKa-.js';
const ae = ['title'],
    le = { class: 'label' },
    re = E({
        __name: 'FlakinessIndicator',
        props: {
            passRate: {},
            recentRuns: {},
            failureCount: {},
            size: { default: 'md' },
            showLabel: { type: Boolean, default: !0 }
        },
        setup(r) {
            const u = r,
                d = k(() => u.passRate < 100 && u.passRate > 0),
                p = k(() => 100 - u.passRate),
                f = k(() =>
                    p.value < 10
                        ? 'severity-low'
                        : p.value < 30
                          ? 'severity-medium'
                          : 'severity-high'
                ),
                b = k(() => `size-${u.size}`),
                x = k(() => (u.showLabel ? `${Math.round(u.passRate)}%` : '')),
                c = k(
                    () =>
                        `Flaky: ${u.failureCount}/${u.recentRuns} recent runs failed (${Math.round(u.passRate)}% pass rate)`
                );
            return (g, y) =>
                d.value
                    ? (l(),
                      i(
                          'div',
                          {
                              key: 0,
                              class: D(['flakiness-indicator', b.value, f.value]),
                              title: c.value
                          },
                          [
                              y[0] || (y[0] = e('span', { class: 'icon' }, '⚠️', -1)),
                              e('span', le, o(x.value), 1)
                          ],
                          10,
                          ae
                      ))
                    : h('', !0);
        }
    }),
    oe = A(re, [['__scopeId', 'data-v-3adf74bd']]),
    ne = { class: 'stack-trace-container' },
    ie = { key: 0, class: 'stack-trace-header' },
    ue = { class: 'icon' },
    de = { key: 1, class: 'stack-trace' },
    ce = E({
        __name: 'ErrorStackTrace',
        props: {
            stackTrace: {},
            language: { default: 'java' },
            collapsible: { type: Boolean, default: !1 },
            initialLines: { default: 10 }
        },
        setup(r) {
            const u = r,
                d = S(!u.collapsible),
                p = S(!1),
                f = k(() =>
                    u.stackTrace
                        .split(
                            `
`
                        )
                        .filter(v => v.trim())
                ),
                b = k(() =>
                    !u.collapsible || p.value ? f.value : f.value.slice(0, u.initialLines)
                ),
                x = k(() => f.value.length > u.initialLines),
                c = k(() => f.value.length - u.initialLines),
                g = v => {
                    const m = v.trim();
                    if (u.language === 'java') {
                        if (m.startsWith('at '))
                            return !m.includes('org.junit') &&
                                !m.includes('org.testng') &&
                                !m.includes('java.lang') &&
                                !m.includes('sun.reflect') &&
                                !m.includes('org.springframework')
                                ? 'frame user-code'
                                : 'frame framework-code';
                        if (m.startsWith('Caused by:')) return 'caused-by';
                        if (m.startsWith('...')) return 'ellipsis';
                    }
                    if (u.language === 'python') {
                        if (m.startsWith('File "')) return 'frame user-code';
                        if (m.includes('Traceback')) return 'traceback-header';
                    }
                    return u.language === 'javascript' && m.startsWith('at ')
                        ? m.includes('node_modules')
                            ? 'frame framework-code'
                            : 'frame user-code'
                        : 'frame';
                },
                y = () => {
                    navigator.clipboard.writeText(u.stackTrace);
                };
            return (v, m) => (
                l(),
                i('div', ne, [
                    r.collapsible
                        ? (l(),
                          i('div', ie, [
                              e(
                                  'button',
                                  {
                                      onClick: m[0] || (m[0] = T => (d.value = !d.value)),
                                      class: 'expand-button'
                                  },
                                  [
                                      e('span', ue, o(d.value ? '▼' : '▶'), 1),
                                      e(
                                          'span',
                                          null,
                                          o(d.value ? 'Collapse' : 'Expand') + ' Stack Trace',
                                          1
                                      )
                                  ]
                              ),
                              e(
                                  'button',
                                  { onClick: y, class: 'copy-button', title: 'Copy to clipboard' },
                                  ' 📋 Copy '
                              )
                          ]))
                        : h('', !0),
                    !r.collapsible || d.value
                        ? (l(),
                          i('div', de, [
                              (l(!0),
                              i(
                                  V,
                                  null,
                                  z(
                                      b.value,
                                      (T, w) => (l(), i('pre', { key: w, class: D(g(T)) }, o(T), 3))
                                  ),
                                  128
                              )),
                              r.collapsible && x.value
                                  ? (l(),
                                    i(
                                        'button',
                                        {
                                            key: 0,
                                            onClick: m[1] || (m[1] = T => (p.value = !p.value)),
                                            class: 'show-more-button'
                                        },
                                        o(p.value ? 'Show Less' : `Show ${c.value} More Lines`),
                                        1
                                    ))
                                  : h('', !0)
                          ]))
                        : h('', !0)
                ])
            );
        }
    }),
    ve = A(ce, [['__scopeId', 'data-v-ec9f3ba8']]),
    me = { class: 'history-chart-container' },
    fe = { key: 0, class: 'empty-state' },
    pe = E({
        __name: 'HistoryChart',
        props: { data: {} },
        setup(r) {
            const u = r,
                d = S();
            let p = null;
            const f = k(() => u.data && u.data.length > 0),
                b = k(() => {
                    if (!u.data) return { dates: [], statuses: [], durations: [] };
                    const g = [...u.data].sort(
                        (y, v) => new Date(y.timestamp).getTime() - new Date(v.timestamp).getTime()
                    );
                    return {
                        dates: g.map(y => new Date(y.timestamp).toLocaleDateString()),
                        statuses: g.map(y =>
                            y.status === 'passed'
                                ? 1
                                : y.status === 'failed'
                                  ? -1
                                  : y.status === 'error'
                                    ? -2
                                    : 0
                        ),
                        durations: g.map(y => y.duration),
                        runs: g
                    };
                }),
                x = () => {
                    if (!d.value || !f.value) return;
                    const g = document.documentElement.getAttribute('data-theme') === 'dark';
                    p = se(d.value);
                    const y = () => {
                            const t = getComputedStyle(document.documentElement);
                            return {
                                success: t.getPropertyValue('--success-color').trim() || '#10b981',
                                error: t.getPropertyValue('--error-color').trim() || '#ef4444',
                                warning: t.getPropertyValue('--warning-color').trim() || '#f59e0b',
                                text: t.getPropertyValue('--text-primary').trim() || '#111827',
                                textSecondary:
                                    t.getPropertyValue('--text-secondary').trim() || '#6b7280',
                                border: t.getPropertyValue('--border-color').trim() || '#e5e7eb'
                            };
                        },
                        v = y(),
                        m = b.value.dates.length,
                        w =
                            m === 1
                                ? '60%'
                                : m <= 3
                                  ? '50%'
                                  : m <= 5
                                    ? '40%'
                                    : m <= 10
                                      ? '30%'
                                      : m <= 20
                                        ? '60%'
                                        : '80%',
                        _ = {
                            backgroundColor: 'transparent',
                            tooltip: {
                                trigger: 'axis',
                                backgroundColor: g ? '#1f2937' : '#ffffff',
                                borderColor: v.border,
                                textStyle: { color: v.text },
                                formatter: t => {
                                    const a = t[0].dataIndex,
                                        n = b.value.runs?.[a];
                                    if (!n) return '';
                                    const P = n.status,
                                        G = (n.duration * 1e3).toFixed(0) + 'ms';
                                    return `<div style="padding: 0.5rem;">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">${t[0].name}</div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="color: ${P === 'passed' ? v.success : v.error};">●</span>
            <span>Status: ${P}</span>
          </div>
          <div>Duration: ${G}</div>
        </div>`;
                                }
                            },
                            grid: {
                                left: '3%',
                                right: '4%',
                                bottom: '15%',
                                top: '10%',
                                containLabel: !0
                            },
                            xAxis: {
                                type: 'category',
                                data: b.value.dates,
                                boundaryGap: !0,
                                axisLine: { lineStyle: { color: v.border } },
                                axisLabel: { color: v.textSecondary, fontSize: 11, rotate: 45 }
                            },
                            yAxis: [
                                {
                                    type: 'value',
                                    name: 'Status',
                                    position: 'left',
                                    min: -2.5,
                                    max: 1.5,
                                    interval: 1,
                                    axisLine: { lineStyle: { color: v.border } },
                                    axisLabel: {
                                        color: v.textSecondary,
                                        fontSize: 11,
                                        formatter: t =>
                                            t === 1
                                                ? 'Pass'
                                                : t === 0
                                                  ? 'Skip'
                                                  : t === -1
                                                    ? 'Fail'
                                                    : t === -2
                                                      ? 'Error'
                                                      : ''
                                    },
                                    splitLine: { lineStyle: { color: v.border, opacity: 0.3 } }
                                },
                                {
                                    type: 'value',
                                    name: 'Duration (s)',
                                    position: 'right',
                                    axisLine: { lineStyle: { color: v.border } },
                                    axisLabel: {
                                        color: v.textSecondary,
                                        fontSize: 11,
                                        formatter: '{value}s'
                                    },
                                    splitLine: { show: !1 }
                                }
                            ],
                            series: [
                                {
                                    name: 'Status',
                                    type: 'line',
                                    yAxisIndex: 0,
                                    data: b.value.statuses,
                                    symbol: 'circle',
                                    symbolSize: 8,
                                    itemStyle: {
                                        color: t => {
                                            const a = t.value;
                                            return a === 1
                                                ? v.success
                                                : a === -1
                                                  ? v.error
                                                  : a === -2
                                                    ? v.warning
                                                    : v.textSecondary;
                                        }
                                    },
                                    lineStyle: { width: 2, color: v.text, opacity: 0.3 },
                                    areaStyle: {
                                        color: new H(0, 0, 0, 1, [
                                            { offset: 0, color: 'rgba(16, 185, 129, 0.2)' },
                                            { offset: 0.5, color: 'rgba(156, 163, 175, 0.1)' },
                                            { offset: 1, color: 'rgba(239, 68, 68, 0.2)' }
                                        ])
                                    }
                                },
                                {
                                    name: 'Duration',
                                    type: 'bar',
                                    yAxisIndex: 1,
                                    data: b.value.durations,
                                    itemStyle: {
                                        color: new H(0, 0, 0, 1, [
                                            { offset: 0, color: 'rgba(59, 130, 246, 0.8)' },
                                            { offset: 1, color: 'rgba(59, 130, 246, 0.3)' }
                                        ]),
                                        borderRadius: [4, 4, 0, 0]
                                    },
                                    barWidth: w,
                                    barCategoryGap: '20%'
                                }
                            ]
                        };
                    (p.setOption(_),
                        new MutationObserver(() => {
                            if (p) {
                                const t = y();
                                p.setOption({
                                    tooltip: {
                                        backgroundColor:
                                            document.documentElement.getAttribute('data-theme') ===
                                            'dark'
                                                ? '#1f2937'
                                                : '#ffffff',
                                        textStyle: { color: t.text }
                                    },
                                    xAxis: {
                                        axisLine: { lineStyle: { color: t.border } },
                                        axisLabel: { color: t.textSecondary }
                                    },
                                    yAxis: [
                                        {
                                            axisLine: { lineStyle: { color: t.border } },
                                            axisLabel: { color: t.textSecondary },
                                            splitLine: { lineStyle: { color: t.border } }
                                        },
                                        {
                                            axisLine: { lineStyle: { color: t.border } },
                                            axisLabel: { color: t.textSecondary }
                                        }
                                    ]
                                });
                            }
                        }).observe(document.documentElement, {
                            attributes: !0,
                            attributeFilter: ['data-theme']
                        }));
                },
                c = () => {
                    p?.resize();
                };
            return (
                O(
                    () => u.data,
                    () => {
                        p && f.value && (p.dispose(), x());
                    },
                    { deep: !0 }
                ),
                U(() => {
                    f.value && (x(), window.addEventListener('resize', c));
                }),
                Q(() => {
                    (p?.dispose(), window.removeEventListener('resize', c));
                }),
                (g, y) => (
                    l(),
                    i('div', me, [
                        f.value
                            ? (l(),
                              i(
                                  'div',
                                  { key: 1, ref_key: 'chartRef', ref: d, class: 'chart' },
                                  null,
                                  512
                              ))
                            : (l(),
                              i('div', fe, [
                                  ...(y[0] ||
                                      (y[0] = [e('p', null, 'No history data available', -1)]))
                              ]))
                    ])
                )
            );
        }
    }),
    ye = A(pe, [['__scopeId', 'data-v-f6b70191']]),
    be = { class: 'flex items-center justify-between w-full' },
    ge = { class: 'flex-1 min-w-0' },
    he = { class: 'text-xl font-semibold truncate' },
    _e = { class: 'text-sm text-secondary mt-1' },
    ke = { class: 'flex items-center gap-2 ml-4' },
    xe = { class: 'tabs-container' },
    Se = { class: 'tabs-nav' },
    Ce = ['onClick'],
    Te = { class: 'tab-content' },
    $e = { key: 0, class: 'loading-state' },
    we = { key: 1, class: 'error-state' },
    Le = { class: 'error-message' },
    De = { key: 2 },
    Me = { class: 'tab-panel' },
    Re = { class: 'info-grid' },
    Ne = { class: 'info-item' },
    Ee = { class: 'info-item' },
    Ae = { class: 'value' },
    Fe = { class: 'info-item' },
    Ie = { class: 'value' },
    Ve = { class: 'info-item' },
    ze = { class: 'value' },
    Be = { key: 0, class: 'flakiness-summary' },
    Pe = { class: 'stability-stats' },
    je = { class: 'stat' },
    We = { class: 'stat-value' },
    qe = { class: 'stat' },
    He = { class: 'stat-value' },
    Oe = { class: 'stat' },
    Ue = { class: 'stat-value' },
    Ge = { class: 'tab-panel' },
    Qe = { key: 0, class: 'failure-details' },
    Je = { class: 'error-header' },
    Ke = { key: 0, class: 'error-type-badge' },
    Xe = { key: 0, class: 'error-message-box' },
    Ye = { key: 1, class: 'stack-trace-section' },
    Ze = { key: 1, class: 'empty-state' },
    et = { class: 'tab-panel' },
    tt = { key: 0, class: 'history-section' },
    st = { class: 'history-chart' },
    at = { class: 'history-table' },
    lt = { class: 'run-id' },
    rt = { key: 1, class: 'empty-state' },
    ot = { class: 'tab-panel' },
    nt = { class: 'metadata-section' },
    it = { class: 'metadata-grid' },
    ut = { class: 'metadata-item' },
    dt = { class: 'code-value' },
    ct = { class: 'metadata-item' },
    vt = { class: 'code-value' },
    mt = { key: 0, class: 'metadata-item' },
    ft = { class: 'code-value' },
    pt = { key: 1, class: 'metadata-item' },
    yt = { class: 'code-value' },
    bt = { class: 'modal-footer' },
    gt = E({
        __name: 'TestDetailsModal',
        props: {
            open: { type: Boolean },
            testId: {},
            testName: {},
            status: {},
            duration: {},
            errorMessage: {},
            errorType: {},
            stackTrace: {},
            className: {},
            lastRun: {},
            ciMetadata: {}
        },
        emits: ['close'],
        setup(r, { emit: u }) {
            const d = r,
                p = u,
                f = S('overview'),
                b = S(!1),
                x = S(null),
                c = S(null),
                g = S([]),
                y = [
                    { id: 'overview', label: 'Overview' },
                    { id: 'failure', label: 'Failure Details' },
                    { id: 'history', label: 'History' },
                    { id: 'metadata', label: 'Metadata' }
                ],
                v = k(() => {
                    const _ = d.status?.toLowerCase();
                    return _ === 'passed'
                        ? 'status-passed'
                        : _ === 'failed'
                          ? 'status-failed'
                          : _ === 'error'
                            ? 'status-error'
                            : 'status-skipped';
                });
            O(
                () => d.open,
                async _ => {
                    _ && d.testId && (await m());
                }
            );
            const m = async () => {
                    ((b.value = !0), (x.value = null));
                    try {
                        const [_, s] = await Promise.all([
                            q.getTestFlakiness(d.testId).catch(() => null),
                            q.getTestHistory(d.testId).catch(() => ({ runs: [] }))
                        ]);
                        ((c.value = _), (g.value = s.runs || []));
                    } catch (_) {
                        ((x.value = 'Failed to load test details'),
                            console.error('Error loading test details:', _));
                    } finally {
                        b.value = !1;
                    }
                },
                T = () => {
                    (p('close'), (f.value = 'overview'));
                },
                w = () => {
                    const _ = [
                        `Test: ${d.testName}`,
                        `Status: ${d.status}`,
                        d.errorType && `Error Type: ${d.errorType}`,
                        d.errorMessage &&
                            `
Error Message:
${d.errorMessage}`,
                        d.stackTrace &&
                            `
Stack Trace:
${d.stackTrace}`
                    ].filter(Boolean).join(`
`);
                    navigator.clipboard.writeText(_);
                };
            return (_, s) => (
                l(),
                I(
                    te,
                    { open: r.open, onClose: T, size: 'xl' },
                    {
                        header: C(() => [
                            e('div', be, [
                                e('div', ge, [
                                    e('h2', he, o(r.testName), 1),
                                    e('p', _e, o(r.className || 'Unknown suite'), 1)
                                ]),
                                e('div', ke, [
                                    e('span', { class: D(['badge', v.value]) }, o(r.status), 3),
                                    c.value
                                        ? (l(),
                                          I(
                                              oe,
                                              {
                                                  key: 0,
                                                  'pass-rate': c.value.pass_rate,
                                                  'recent-runs': c.value.total_runs,
                                                  'failure-count': c.value.recent_failures
                                              },
                                              null,
                                              8,
                                              ['pass-rate', 'recent-runs', 'failure-count']
                                          ))
                                        : h('', !0)
                                ])
                            ])
                        ]),
                        footer: C(() => [
                            e('div', bt, [
                                L(
                                    N,
                                    { variant: 'secondary', onClick: T },
                                    {
                                        default: C(() => [
                                            ...(s[20] || (s[20] = [R('Close', -1)]))
                                        ]),
                                        _: 1
                                    }
                                ),
                                r.errorMessage
                                    ? (l(),
                                      I(
                                          N,
                                          { key: 0, onClick: w },
                                          {
                                              default: C(() => [
                                                  ...(s[21] || (s[21] = [R(' Copy Error ', -1)]))
                                              ]),
                                              _: 1
                                          }
                                      ))
                                    : h('', !0)
                            ])
                        ]),
                        default: C(() => [
                            e('div', xe, [
                                e('div', Se, [
                                    (l(),
                                    i(
                                        V,
                                        null,
                                        z(y, t =>
                                            e(
                                                'button',
                                                {
                                                    key: t.id,
                                                    class: D([
                                                        'tab-button',
                                                        { active: f.value === t.id }
                                                    ]),
                                                    onClick: a => (f.value = t.id)
                                                },
                                                o(t.label),
                                                11,
                                                Ce
                                            )
                                        ),
                                        64
                                    ))
                                ]),
                                e('div', Te, [
                                    b.value
                                        ? (l(),
                                          i('div', $e, [
                                              ...(s[0] ||
                                                  (s[0] = [
                                                      e('div', { class: 'spinner' }, null, -1),
                                                      e('p', null, 'Loading test details...', -1)
                                                  ]))
                                          ]))
                                        : x.value
                                          ? (l(), i('div', we, [e('p', Le, o(x.value), 1)]))
                                          : (l(),
                                            i('div', De, [
                                                M(
                                                    e(
                                                        'div',
                                                        Me,
                                                        [
                                                            e('div', Re, [
                                                                e('div', Ne, [
                                                                    s[1] ||
                                                                        (s[1] = e(
                                                                            'label',
                                                                            null,
                                                                            'Status',
                                                                            -1
                                                                        )),
                                                                    e(
                                                                        'span',
                                                                        {
                                                                            class: D([
                                                                                'value',
                                                                                v.value
                                                                            ])
                                                                        },
                                                                        o(r.status),
                                                                        3
                                                                    )
                                                                ]),
                                                                e('div', Ee, [
                                                                    s[2] ||
                                                                        (s[2] = e(
                                                                            'label',
                                                                            null,
                                                                            'Duration',
                                                                            -1
                                                                        )),
                                                                    e(
                                                                        'span',
                                                                        Ae,
                                                                        o(
                                                                            r.duration
                                                                                ? $(B)(
                                                                                      r.duration *
                                                                                          1e3
                                                                                  )
                                                                                : 'N/A'
                                                                        ),
                                                                        1
                                                                    )
                                                                ]),
                                                                e('div', Fe, [
                                                                    s[3] ||
                                                                        (s[3] = e(
                                                                            'label',
                                                                            null,
                                                                            'Last Run',
                                                                            -1
                                                                        )),
                                                                    e(
                                                                        'span',
                                                                        Ie,
                                                                        o(
                                                                            r.lastRun
                                                                                ? $(W)(r.lastRun)
                                                                                : 'N/A'
                                                                        ),
                                                                        1
                                                                    )
                                                                ]),
                                                                e('div', Ve, [
                                                                    s[4] ||
                                                                        (s[4] = e(
                                                                            'label',
                                                                            null,
                                                                            'Test Suite',
                                                                            -1
                                                                        )),
                                                                    e(
                                                                        'span',
                                                                        ze,
                                                                        o(r.className || 'N/A'),
                                                                        1
                                                                    )
                                                                ])
                                                            ]),
                                                            c.value
                                                                ? (l(),
                                                                  i('div', Be, [
                                                                      s[8] ||
                                                                          (s[8] = e(
                                                                              'h3',
                                                                              null,
                                                                              'Stability',
                                                                              -1
                                                                          )),
                                                                      e('div', Pe, [
                                                                          e('div', je, [
                                                                              e(
                                                                                  'span',
                                                                                  We,
                                                                                  o(
                                                                                      c.value
                                                                                          .pass_rate
                                                                                  ) + '%',
                                                                                  1
                                                                              ),
                                                                              s[5] ||
                                                                                  (s[5] = e(
                                                                                      'span',
                                                                                      {
                                                                                          class: 'stat-label'
                                                                                      },
                                                                                      'Pass Rate',
                                                                                      -1
                                                                                  ))
                                                                          ]),
                                                                          e('div', qe, [
                                                                              e(
                                                                                  'span',
                                                                                  He,
                                                                                  o(
                                                                                      c.value
                                                                                          .total_runs
                                                                                  ),
                                                                                  1
                                                                              ),
                                                                              s[6] ||
                                                                                  (s[6] = e(
                                                                                      'span',
                                                                                      {
                                                                                          class: 'stat-label'
                                                                                      },
                                                                                      'Total Runs',
                                                                                      -1
                                                                                  ))
                                                                          ]),
                                                                          e('div', Oe, [
                                                                              e(
                                                                                  'span',
                                                                                  Ue,
                                                                                  o(
                                                                                      c.value
                                                                                          .recent_failures
                                                                                  ),
                                                                                  1
                                                                              ),
                                                                              s[7] ||
                                                                                  (s[7] = e(
                                                                                      'span',
                                                                                      {
                                                                                          class: 'stat-label'
                                                                                      },
                                                                                      'Recent Failures',
                                                                                      -1
                                                                                  ))
                                                                          ])
                                                                      ])
                                                                  ]))
                                                                : h('', !0)
                                                        ],
                                                        512
                                                    ),
                                                    [[F, f.value === 'overview']]
                                                ),
                                                M(
                                                    e(
                                                        'div',
                                                        Ge,
                                                        [
                                                            r.errorMessage || r.errorType
                                                                ? (l(),
                                                                  i('div', Qe, [
                                                                      e('div', Je, [
                                                                          s[9] ||
                                                                              (s[9] = e(
                                                                                  'h3',
                                                                                  null,
                                                                                  'Error Information',
                                                                                  -1
                                                                              )),
                                                                          r.errorType
                                                                              ? (l(),
                                                                                i(
                                                                                    'span',
                                                                                    Ke,
                                                                                    o(r.errorType),
                                                                                    1
                                                                                ))
                                                                              : h('', !0)
                                                                      ]),
                                                                      r.errorMessage
                                                                          ? (l(),
                                                                            i('div', Xe, [
                                                                                s[10] ||
                                                                                    (s[10] = e(
                                                                                        'h4',
                                                                                        null,
                                                                                        'Error Message',
                                                                                        -1
                                                                                    )),
                                                                                e(
                                                                                    'pre',
                                                                                    null,
                                                                                    o(
                                                                                        r.errorMessage
                                                                                    ),
                                                                                    1
                                                                                )
                                                                            ]))
                                                                          : h('', !0),
                                                                      r.stackTrace
                                                                          ? (l(),
                                                                            i('div', Ye, [
                                                                                s[11] ||
                                                                                    (s[11] = e(
                                                                                        'h4',
                                                                                        null,
                                                                                        'Stack Trace',
                                                                                        -1
                                                                                    )),
                                                                                L(
                                                                                    ve,
                                                                                    {
                                                                                        'stack-trace':
                                                                                            r.stackTrace,
                                                                                        collapsible:
                                                                                            !0
                                                                                    },
                                                                                    null,
                                                                                    8,
                                                                                    ['stack-trace']
                                                                                )
                                                                            ]))
                                                                          : h('', !0)
                                                                  ]))
                                                                : (l(),
                                                                  i('div', Ze, [
                                                                      ...(s[12] ||
                                                                          (s[12] = [
                                                                              e(
                                                                                  'p',
                                                                                  null,
                                                                                  'No failure details available - test passed or no error data recorded',
                                                                                  -1
                                                                              )
                                                                          ]))
                                                                  ]))
                                                        ],
                                                        512
                                                    ),
                                                    [[F, f.value === 'failure']]
                                                ),
                                                M(
                                                    e(
                                                        'div',
                                                        et,
                                                        [
                                                            g.value && g.value.length > 0
                                                                ? (l(),
                                                                  i('div', tt, [
                                                                      e(
                                                                          'h3',
                                                                          null,
                                                                          'Test Execution History (Last ' +
                                                                              o(g.value.length) +
                                                                              ' Runs)',
                                                                          1
                                                                      ),
                                                                      e('div', st, [
                                                                          L(
                                                                              ye,
                                                                              { data: g.value },
                                                                              null,
                                                                              8,
                                                                              ['data']
                                                                          )
                                                                      ]),
                                                                      e('div', at, [
                                                                          e('table', null, [
                                                                              s[13] ||
                                                                                  (s[13] = e(
                                                                                      'thead',
                                                                                      null,
                                                                                      [
                                                                                          e(
                                                                                              'tr',
                                                                                              null,
                                                                                              [
                                                                                                  e(
                                                                                                      'th',
                                                                                                      null,
                                                                                                      'Date'
                                                                                                  ),
                                                                                                  e(
                                                                                                      'th',
                                                                                                      null,
                                                                                                      'Status'
                                                                                                  ),
                                                                                                  e(
                                                                                                      'th',
                                                                                                      null,
                                                                                                      'Duration'
                                                                                                  ),
                                                                                                  e(
                                                                                                      'th',
                                                                                                      null,
                                                                                                      'Run ID'
                                                                                                  )
                                                                                              ]
                                                                                          )
                                                                                      ],
                                                                                      -1
                                                                                  )),
                                                                              e('tbody', null, [
                                                                                  (l(!0),
                                                                                  i(
                                                                                      V,
                                                                                      null,
                                                                                      z(
                                                                                          g.value.slice(
                                                                                              0,
                                                                                              10
                                                                                          ),
                                                                                          t => (
                                                                                              l(),
                                                                                              i(
                                                                                                  'tr',
                                                                                                  {
                                                                                                      key: t.run_id
                                                                                                  },
                                                                                                  [
                                                                                                      e(
                                                                                                          'td',
                                                                                                          null,
                                                                                                          o(
                                                                                                              $(
                                                                                                                  W
                                                                                                              )(
                                                                                                                  t.timestamp
                                                                                                              )
                                                                                                          ),
                                                                                                          1
                                                                                                      ),
                                                                                                      e(
                                                                                                          'td',
                                                                                                          null,
                                                                                                          [
                                                                                                              e(
                                                                                                                  'span',
                                                                                                                  {
                                                                                                                      class: D(
                                                                                                                          [
                                                                                                                              'status-badge',
                                                                                                                              t.status
                                                                                                                          ]
                                                                                                                      )
                                                                                                                  },
                                                                                                                  o(
                                                                                                                      t.status
                                                                                                                  ),
                                                                                                                  3
                                                                                                              )
                                                                                                          ]
                                                                                                      ),
                                                                                                      e(
                                                                                                          'td',
                                                                                                          null,
                                                                                                          o(
                                                                                                              $(
                                                                                                                  B
                                                                                                              )(
                                                                                                                  t.duration *
                                                                                                                      1e3
                                                                                                              )
                                                                                                          ),
                                                                                                          1
                                                                                                      ),
                                                                                                      e(
                                                                                                          'td',
                                                                                                          lt,
                                                                                                          o(
                                                                                                              t.run_id.slice(
                                                                                                                  0,
                                                                                                                  8
                                                                                                              )
                                                                                                          ),
                                                                                                          1
                                                                                                      )
                                                                                                  ]
                                                                                              )
                                                                                          )
                                                                                      ),
                                                                                      128
                                                                                  ))
                                                                              ])
                                                                          ])
                                                                      ])
                                                                  ]))
                                                                : (l(),
                                                                  i('div', rt, [
                                                                      ...(s[14] ||
                                                                          (s[14] = [
                                                                              e(
                                                                                  'p',
                                                                                  null,
                                                                                  'No historical data available',
                                                                                  -1
                                                                              )
                                                                          ]))
                                                                  ]))
                                                        ],
                                                        512
                                                    ),
                                                    [[F, f.value === 'history']]
                                                ),
                                                M(
                                                    e(
                                                        'div',
                                                        ot,
                                                        [
                                                            e('div', nt, [
                                                                s[19] ||
                                                                    (s[19] = e(
                                                                        'h3',
                                                                        null,
                                                                        'Test Metadata',
                                                                        -1
                                                                    )),
                                                                e('div', it, [
                                                                    e('div', ut, [
                                                                        s[15] ||
                                                                            (s[15] = e(
                                                                                'label',
                                                                                null,
                                                                                'Test Name',
                                                                                -1
                                                                            )),
                                                                        e(
                                                                            'span',
                                                                            dt,
                                                                            o(r.testName),
                                                                            1
                                                                        )
                                                                    ]),
                                                                    e('div', ct, [
                                                                        s[16] ||
                                                                            (s[16] = e(
                                                                                'label',
                                                                                null,
                                                                                'Class/Suite',
                                                                                -1
                                                                            )),
                                                                        e(
                                                                            'span',
                                                                            vt,
                                                                            o(r.className || 'N/A'),
                                                                            1
                                                                        )
                                                                    ]),
                                                                    r.ciMetadata
                                                                        ? (l(),
                                                                          i('div', mt, [
                                                                              s[17] ||
                                                                                  (s[17] = e(
                                                                                      'label',
                                                                                      null,
                                                                                      'Build Number',
                                                                                      -1
                                                                                  )),
                                                                              e(
                                                                                  'span',
                                                                                  ft,
                                                                                  o(
                                                                                      r.ciMetadata
                                                                                          .build_number ||
                                                                                          'N/A'
                                                                                  ),
                                                                                  1
                                                                              )
                                                                          ]))
                                                                        : h('', !0),
                                                                    r.ciMetadata
                                                                        ? (l(),
                                                                          i('div', pt, [
                                                                              s[18] ||
                                                                                  (s[18] = e(
                                                                                      'label',
                                                                                      null,
                                                                                      'Branch',
                                                                                      -1
                                                                                  )),
                                                                              e(
                                                                                  'span',
                                                                                  yt,
                                                                                  o(
                                                                                      r.ciMetadata
                                                                                          .branch ||
                                                                                          'N/A'
                                                                                  ),
                                                                                  1
                                                                              )
                                                                          ]))
                                                                        : h('', !0)
                                                                ])
                                                            ])
                                                        ],
                                                        512
                                                    ),
                                                    [[F, f.value === 'metadata']]
                                                )
                                            ]))
                                ])
                            ])
                        ]),
                        _: 1
                    },
                    8,
                    ['open']
                )
            );
        }
    }),
    ht = A(gt, [['__scopeId', 'data-v-bd7d84a7']]),
    _t = { class: 'test-cases' },
    kt = { class: 'page-header' },
    xt = { class: 'header-actions' },
    St = { class: 'filters-grid' },
    Ct = { class: 'filter-group' },
    Tt = { class: 'filter-group' },
    $t = { class: 'filter-group' },
    wt = ['value'],
    Lt = { class: 'filter-group align-end' },
    Dt = { class: 'test-name' },
    Mt = { key: 0, class: 'test-meta' },
    Rt = { key: 0, class: 'meta-info' },
    Nt = { key: 1, class: 'meta-info suite' },
    Et = { key: 1, class: 'error-preview' },
    At = { class: 'duration' },
    Ft = E({
        __name: 'TestCases',
        setup(r) {
            const u = J(),
                d = K(),
                p = S(''),
                f = S(''),
                b = S(''),
                x = S(!1),
                c = S(null),
                g = [
                    { key: 'status', label: 'Status', sortable: !0 },
                    { key: 'name', label: 'Test Name', sortable: !0 },
                    { key: 'time', label: 'Duration', sortable: !0 }
                ],
                y = k(() => {
                    const t = new Set();
                    return (
                        d.cases.forEach(a => {
                            a.suite_name && t.add(a.suite_name);
                        }),
                        Array.from(t).sort()
                    );
                }),
                v = k(() => {
                    let t = [...d.cases];
                    if (p.value) {
                        const a = p.value.toLowerCase();
                        t = t.filter(
                            n =>
                                n.name?.toLowerCase().includes(a) ||
                                n.classname?.toLowerCase().includes(a)
                        );
                    }
                    return (
                        f.value && (t = t.filter(a => a.status === f.value)),
                        b.value && (t = t.filter(a => a.suite_name === b.value)),
                        t
                    );
                }),
                m = k(() => !!(p.value || f.value || b.value)),
                T = () => {
                    ((p.value = ''), (f.value = ''), (b.value = ''));
                },
                w = async () => {
                    try {
                        const t = u.query.run_id ? { run_id: u.query.run_id } : {};
                        await d.fetchCases(t);
                    } catch (t) {
                        console.error('Failed to load test cases:', t);
                    }
                },
                _ = t => {
                    ((c.value = t), (x.value = !0));
                },
                s = () => {
                    x.value = !1;
                };
            return (
                U(() => {
                    w();
                }),
                (t, a) => (
                    l(),
                    i('div', _t, [
                        e('div', kt, [
                            a[6] || (a[6] = e('h1', null, 'Test Cases', -1)),
                            e('div', xt, [
                                L(
                                    N,
                                    { onClick: w, loading: $(d).loading, variant: 'secondary' },
                                    {
                                        default: C(() => [
                                            ...(a[4] || (a[4] = [R(' Refresh ', -1)]))
                                        ]),
                                        _: 1
                                    },
                                    8,
                                    ['loading']
                                ),
                                L(
                                    N,
                                    { onClick: a[0] || (a[0] = n => t.$router.push('/runs')) },
                                    {
                                        default: C(() => [
                                            ...(a[5] || (a[5] = [R(' View Test Runs ', -1)]))
                                        ]),
                                        _: 1
                                    }
                                )
                            ])
                        ]),
                        L(
                            Z,
                            {
                                columns: g,
                                data: v.value,
                                loading: $(d).loading,
                                'row-clickable': !0,
                                onRowClick: _
                            },
                            {
                                filters: C(() => [
                                    e('div', St, [
                                        e('div', Ct, [
                                            a[7] || (a[7] = e('label', null, 'Search', -1)),
                                            L(
                                                ee,
                                                {
                                                    modelValue: p.value,
                                                    'onUpdate:modelValue':
                                                        a[1] || (a[1] = n => (p.value = n)),
                                                    placeholder: 'Search test names...'
                                                },
                                                null,
                                                8,
                                                ['modelValue']
                                            )
                                        ]),
                                        e('div', Tt, [
                                            a[9] || (a[9] = e('label', null, 'Status', -1)),
                                            M(
                                                e(
                                                    'select',
                                                    {
                                                        'onUpdate:modelValue':
                                                            a[2] || (a[2] = n => (f.value = n)),
                                                        class: 'filter-select'
                                                    },
                                                    [
                                                        ...(a[8] ||
                                                            (a[8] = [
                                                                e(
                                                                    'option',
                                                                    { value: '' },
                                                                    'All Statuses',
                                                                    -1
                                                                ),
                                                                e(
                                                                    'option',
                                                                    { value: 'passed' },
                                                                    '✓ Passed',
                                                                    -1
                                                                ),
                                                                e(
                                                                    'option',
                                                                    { value: 'failed' },
                                                                    '✗ Failed',
                                                                    -1
                                                                ),
                                                                e(
                                                                    'option',
                                                                    { value: 'error' },
                                                                    '⚠ Error',
                                                                    -1
                                                                ),
                                                                e(
                                                                    'option',
                                                                    { value: 'skipped' },
                                                                    '⊘ Skipped',
                                                                    -1
                                                                )
                                                            ]))
                                                    ],
                                                    512
                                                ),
                                                [[j, f.value]]
                                            )
                                        ]),
                                        e('div', $t, [
                                            a[11] || (a[11] = e('label', null, 'Suite', -1)),
                                            M(
                                                e(
                                                    'select',
                                                    {
                                                        'onUpdate:modelValue':
                                                            a[3] || (a[3] = n => (b.value = n)),
                                                        class: 'filter-select'
                                                    },
                                                    [
                                                        a[10] ||
                                                            (a[10] = e(
                                                                'option',
                                                                { value: '' },
                                                                'All Suites',
                                                                -1
                                                            )),
                                                        (l(!0),
                                                        i(
                                                            V,
                                                            null,
                                                            z(
                                                                y.value,
                                                                n => (
                                                                    l(),
                                                                    i(
                                                                        'option',
                                                                        { key: n, value: n },
                                                                        o(n),
                                                                        9,
                                                                        wt
                                                                    )
                                                                )
                                                            ),
                                                            128
                                                        ))
                                                    ],
                                                    512
                                                ),
                                                [[j, b.value]]
                                            )
                                        ]),
                                        e('div', Lt, [
                                            m.value
                                                ? (l(),
                                                  I(
                                                      N,
                                                      {
                                                          key: 0,
                                                          onClick: T,
                                                          variant: 'secondary',
                                                          size: 'sm'
                                                      },
                                                      {
                                                          default: C(() => [
                                                              ...(a[12] ||
                                                                  (a[12] = [
                                                                      R(' Clear Filters ', -1)
                                                                  ]))
                                                          ]),
                                                          _: 1
                                                      }
                                                  ))
                                                : h('', !0)
                                        ])
                                    ])
                                ]),
                                'cell-status': C(({ row: n }) => [
                                    e(
                                        'span',
                                        { class: D(['status-badge', n.status]) },
                                        o($(Y)(n.status || '')) + ' ' + o(n.status),
                                        3
                                    )
                                ]),
                                'cell-name': C(({ row: n }) => [
                                    e('div', Dt, [
                                        e('strong', null, o(n.name), 1),
                                        n.classname || n.suite_name
                                            ? (l(),
                                              i('div', Mt, [
                                                  n.classname
                                                      ? (l(), i('span', Rt, o(n.classname), 1))
                                                      : h('', !0),
                                                  n.suite_name
                                                      ? (l(), i('span', Nt, o(n.suite_name), 1))
                                                      : h('', !0)
                                              ]))
                                            : h('', !0),
                                        n.error_message
                                            ? (l(),
                                              i('div', Et, o($(X)(n.error_message || '', 100)), 1))
                                            : h('', !0)
                                    ])
                                ]),
                                'cell-time': C(({ value: n }) => [
                                    e('span', At, o($(B)((n || 0) * 1e3)), 1)
                                ]),
                                _: 1
                            },
                            8,
                            ['data', 'loading']
                        ),
                        L(
                            ht,
                            {
                                open: x.value,
                                'test-id': c.value?.id || '',
                                'test-name': c.value?.name || '',
                                status: c.value?.status || 'passed',
                                duration: c.value?.time,
                                'error-message': c.value?.error_message,
                                'error-type': c.value?.error_type,
                                'stack-trace': c.value?.result?.stack_trace,
                                'class-name': c.value?.classname || c.value?.suite_name,
                                'last-run': c.value?.timestamp,
                                'ci-metadata': c.value?.run_ci_metadata,
                                onClose: s
                            },
                            null,
                            8,
                            [
                                'open',
                                'test-id',
                                'test-name',
                                'status',
                                'duration',
                                'error-message',
                                'error-type',
                                'stack-trace',
                                'class-name',
                                'last-run',
                                'ci-metadata'
                            ]
                        )
                    ])
                )
            );
        }
    }),
    Wt = A(Ft, [['__scopeId', 'data-v-6c951f95']]);
export { Wt as default };
