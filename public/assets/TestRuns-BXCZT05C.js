import {
    d as M,
    r as f,
    c as k,
    o as P,
    b as o,
    h as a,
    l as _,
    g as n,
    m as R,
    u as A,
    e as l,
    p as h,
    t as r,
    k as $,
    i,
    q as y,
    v as S,
    F as q,
    j as z,
    s as T,
    f as E,
    _ as I
} from './index-B71WFFrY.js';
import { u as H, B as C, c as J } from './Button-CNSxvtKi.js';
import { D as Q, S as w } from './SearchInput-BXn_6cZ3.js';
const G = { class: 'test-runs' },
    K = { class: 'page-header' },
    O = { class: 'header-actions' },
    W = { class: 'filters-grid' },
    X = { class: 'filter-group' },
    Y = { class: 'filter-group' },
    Z = ['value'],
    ee = { class: 'filter-group' },
    te = { class: 'filter-group' },
    ae = { class: 'filter-group' },
    se = { class: 'filter-group align-end' },
    le = { class: 'run-name' },
    oe = { key: 0, class: 'run-meta' },
    re = { key: 0, class: 'meta-tag' },
    ne = { key: 1, class: 'meta-tag branch' },
    ue = { key: 2, class: 'meta-tag build' },
    ie = { class: 'timestamp' },
    de = { key: 0, class: 'summary-badges' },
    me = { class: 'badge passed' },
    ce = { class: 'badge failed' },
    pe = { key: 0, class: 'badge error' },
    ve = { key: 1, class: 'badge skipped' },
    fe = { key: 1, class: 'no-data' },
    _e = { key: 0, class: 'success-rate' },
    ye = { key: 1, class: 'no-data' },
    be = M({
        __name: 'TestRuns',
        setup(ge) {
            const j = A(),
                d = H(),
                m = f(''),
                c = f(''),
                u = f(''),
                p = f(''),
                v = f(''),
                V = [
                    { key: 'name', label: 'Run Name', sortable: !0 },
                    { key: 'timestamp', label: 'Date', sortable: !0 },
                    { key: 'total', label: 'Total Tests', sortable: !0 },
                    { key: 'summary', label: 'Results', sortable: !1 },
                    { key: 'rate', label: 'Success Rate', sortable: !0 }
                ],
                F = k(() => {
                    const s = new Set();
                    return (
                        d.runs.forEach(e => {
                            e.ci_metadata?.job_name && s.add(e.ci_metadata.job_name);
                        }),
                        Array.from(s).sort()
                    );
                }),
                x = k(() => {
                    let s = [...d.runs];
                    if (m.value) {
                        const e = m.value.toLowerCase();
                        s = s.filter(
                            t =>
                                t.name?.toLowerCase().includes(e) ||
                                t.ci_metadata?.job_name?.toLowerCase().includes(e) ||
                                t.ci_metadata?.branch?.toLowerCase().includes(e) ||
                                t.id?.toLowerCase().includes(e)
                        );
                    }
                    if (
                        (c.value && (s = s.filter(e => e.ci_metadata?.job_name === c.value)),
                        u.value &&
                            (s = s.filter(e => {
                                if (!e.summary) return !1;
                                const t =
                                        (e.summary.failed || 0) > 0 || (e.summary.errors || 0) > 0,
                                    g = b(e);
                                return u.value === 'passed'
                                    ? g === 100
                                    : u.value === 'failed'
                                      ? t
                                      : u.value === 'mixed'
                                        ? g > 0 && g < 100
                                        : !0;
                            })),
                        p.value)
                    ) {
                        const e = new Date(p.value);
                        s = s.filter(t => new Date(t.timestamp) >= e);
                    }
                    if (v.value) {
                        const e = new Date(v.value);
                        (e.setHours(23, 59, 59, 999),
                            (s = s.filter(t => new Date(t.timestamp) <= e)));
                    }
                    return s;
                }),
                N = k(() => !!(m.value || c.value || u.value || p.value || v.value)),
                b = s =>
                    !s.summary || s.summary.total === 0
                        ? 0
                        : Math.round((s.summary.passed / s.summary.total) * 100),
                B = s =>
                    s === 100
                        ? 'rate-perfect'
                        : s >= 80
                          ? 'rate-good'
                          : s >= 50
                            ? 'rate-medium'
                            : 'rate-poor',
                L = () => {
                    ((m.value = ''),
                        (c.value = ''),
                        (u.value = ''),
                        (p.value = ''),
                        (v.value = ''));
                },
                U = s => {
                    (d.setCurrentRun(s), j.push(`/cases?run_id=${s.id}`));
                },
                D = async () => {
                    try {
                        await d.fetchRuns({ limit: 100 });
                    } catch (s) {
                        console.error('Failed to load test runs:', s);
                    }
                };
            return (
                P(() => {
                    D();
                }),
                (s, e) => (
                    l(),
                    o('div', G, [
                        a('div', K, [
                            e[9] || (e[9] = a('h1', null, 'Test Runs', -1)),
                            a('div', O, [
                                _(
                                    C,
                                    { onClick: D, loading: R(d).loading, variant: 'secondary' },
                                    {
                                        default: n(() => [
                                            ...(e[7] || (e[7] = [h(' Refresh ', -1)]))
                                        ]),
                                        _: 1
                                    },
                                    8,
                                    ['loading']
                                ),
                                _(
                                    C,
                                    { onClick: e[0] || (e[0] = t => s.$router.push('/upload')) },
                                    {
                                        default: n(() => [
                                            ...(e[8] || (e[8] = [h(' Upload New Results ', -1)]))
                                        ]),
                                        _: 1
                                    }
                                )
                            ])
                        ]),
                        _(
                            Q,
                            {
                                columns: V,
                                data: x.value,
                                loading: R(d).loading,
                                'row-clickable': !0,
                                onRowClick: e[6] || (e[6] = t => U(t))
                            },
                            {
                                filters: n(() => [
                                    a('div', W, [
                                        a('div', X, [
                                            e[10] || (e[10] = a('label', null, 'Search', -1)),
                                            _(
                                                w,
                                                {
                                                    modelValue: m.value,
                                                    'onUpdate:modelValue':
                                                        e[1] || (e[1] = t => (m.value = t)),
                                                    placeholder: 'Search by name, job, branch...'
                                                },
                                                null,
                                                8,
                                                ['modelValue']
                                            )
                                        ]),
                                        a('div', Y, [
                                            e[12] || (e[12] = a('label', null, 'Project/Job', -1)),
                                            y(
                                                a(
                                                    'select',
                                                    {
                                                        'onUpdate:modelValue':
                                                            e[2] || (e[2] = t => (c.value = t)),
                                                        class: 'filter-select'
                                                    },
                                                    [
                                                        e[11] ||
                                                            (e[11] = a(
                                                                'option',
                                                                { value: '' },
                                                                'All Projects',
                                                                -1
                                                            )),
                                                        (l(!0),
                                                        o(
                                                            q,
                                                            null,
                                                            z(
                                                                F.value,
                                                                t => (
                                                                    l(),
                                                                    o(
                                                                        'option',
                                                                        { key: t, value: t },
                                                                        r(t),
                                                                        9,
                                                                        Z
                                                                    )
                                                                )
                                                            ),
                                                            128
                                                        ))
                                                    ],
                                                    512
                                                ),
                                                [[S, c.value]]
                                            )
                                        ]),
                                        a('div', ee, [
                                            e[14] || (e[14] = a('label', null, 'Status', -1)),
                                            y(
                                                a(
                                                    'select',
                                                    {
                                                        'onUpdate:modelValue':
                                                            e[3] || (e[3] = t => (u.value = t)),
                                                        class: 'filter-select'
                                                    },
                                                    [
                                                        ...(e[13] ||
                                                            (e[13] = [
                                                                a(
                                                                    'option',
                                                                    { value: '' },
                                                                    'All',
                                                                    -1
                                                                ),
                                                                a(
                                                                    'option',
                                                                    { value: 'passed' },
                                                                    'Passed',
                                                                    -1
                                                                ),
                                                                a(
                                                                    'option',
                                                                    { value: 'failed' },
                                                                    'Failed',
                                                                    -1
                                                                ),
                                                                a(
                                                                    'option',
                                                                    { value: 'mixed' },
                                                                    'Mixed',
                                                                    -1
                                                                )
                                                            ]))
                                                    ],
                                                    512
                                                ),
                                                [[S, u.value]]
                                            )
                                        ]),
                                        a('div', te, [
                                            e[15] || (e[15] = a('label', null, 'Date Range', -1)),
                                            y(
                                                a(
                                                    'input',
                                                    {
                                                        'onUpdate:modelValue':
                                                            e[4] || (e[4] = t => (p.value = t)),
                                                        type: 'date',
                                                        class: 'filter-input',
                                                        placeholder: 'From'
                                                    },
                                                    null,
                                                    512
                                                ),
                                                [[T, p.value]]
                                            )
                                        ]),
                                        a('div', ae, [
                                            e[16] || (e[16] = a('label', null, 'To', -1)),
                                            y(
                                                a(
                                                    'input',
                                                    {
                                                        'onUpdate:modelValue':
                                                            e[5] || (e[5] = t => (v.value = t)),
                                                        type: 'date',
                                                        class: 'filter-input',
                                                        placeholder: 'To'
                                                    },
                                                    null,
                                                    512
                                                ),
                                                [[T, v.value]]
                                            )
                                        ]),
                                        a('div', se, [
                                            N.value
                                                ? (l(),
                                                  E(
                                                      C,
                                                      {
                                                          key: 0,
                                                          onClick: L,
                                                          variant: 'secondary',
                                                          size: 'sm'
                                                      },
                                                      {
                                                          default: n(() => [
                                                              ...(e[17] ||
                                                                  (e[17] = [
                                                                      h(' Clear Filters ', -1)
                                                                  ]))
                                                          ]),
                                                          _: 1
                                                      }
                                                  ))
                                                : i('', !0)
                                        ])
                                    ])
                                ]),
                                'cell-name': n(({ row: t }) => [
                                    a('div', le, [
                                        a(
                                            'strong',
                                            null,
                                            r(t.name || `Run ${t.id?.slice(0, 8)}`),
                                            1
                                        ),
                                        t.ci_metadata
                                            ? (l(),
                                              o('div', oe, [
                                                  t.ci_metadata.job_name
                                                      ? (l(),
                                                        o('span', re, r(t.ci_metadata.job_name), 1))
                                                      : i('', !0),
                                                  t.ci_metadata.branch
                                                      ? (l(),
                                                        o(
                                                            'span',
                                                            ne,
                                                            ' 🌿 ' + r(t.ci_metadata.branch),
                                                            1
                                                        ))
                                                      : i('', !0),
                                                  t.ci_metadata.build_number
                                                      ? (l(),
                                                        o(
                                                            'span',
                                                            ue,
                                                            ' #' + r(t.ci_metadata.build_number),
                                                            1
                                                        ))
                                                      : i('', !0)
                                              ]))
                                            : i('', !0)
                                    ])
                                ]),
                                'cell-timestamp': n(({ value: t }) => [
                                    a('span', ie, r(R(J)(t)), 1)
                                ]),
                                'cell-summary': n(({ row: t }) => [
                                    t.summary
                                        ? (l(),
                                          o('div', de, [
                                              a('span', me, '✓ ' + r(t.summary.passed), 1),
                                              a('span', ce, '✗ ' + r(t.summary.failed), 1),
                                              t.summary.errors
                                                  ? (l(),
                                                    o('span', pe, '⚠ ' + r(t.summary.errors), 1))
                                                  : i('', !0),
                                              t.summary.skipped
                                                  ? (l(),
                                                    o('span', ve, '⊘ ' + r(t.summary.skipped), 1))
                                                  : i('', !0)
                                          ]))
                                        : (l(), o('span', fe, 'No data'))
                                ]),
                                'cell-total': n(({ row: t }) => [
                                    a('strong', null, r(t.summary?.total || 0), 1)
                                ]),
                                'cell-rate': n(({ row: t }) => [
                                    t.summary && t.summary.total > 0
                                        ? (l(),
                                          o('div', _e, [
                                              a('span', { class: $(B(b(t))) }, r(b(t)) + '% ', 3)
                                          ]))
                                        : (l(), o('span', ye, '-'))
                                ]),
                                _: 1
                            },
                            8,
                            ['data', 'loading']
                        )
                    ])
                )
            );
        }
    }),
    Ce = I(be, [['__scopeId', 'data-v-4b436f14']]);
export { Ce as default };
