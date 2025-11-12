import {
    d as y,
    c as v,
    w as h,
    f as p,
    T as k,
    l as C,
    A as B,
    g as _,
    e as t,
    b as s,
    i as a,
    h as d,
    t as b,
    z as c,
    B as w,
    k as O,
    _ as z
} from './index-B71WFFrY.js';
const M = { class: 'modal-header' },
    $ = { key: 0, class: 'modal-title' },
    N = { class: 'modal-body' },
    T = { key: 0, class: 'modal-footer' },
    V = y({
        __name: 'Modal',
        props: {
            open: { type: Boolean },
            title: { default: void 0 },
            size: { default: 'md' },
            closeOnOverlay: { type: Boolean, default: !0 },
            hideClose: { type: Boolean, default: !1 }
        },
        emits: ['close'],
        setup(e, { emit: r }) {
            const l = e,
                m = r,
                f = v(() => ['modal-content', `modal-${l.size}`]),
                n = () => {
                    m('close');
                },
                u = () => {
                    l.closeOnOverlay && n();
                };
            return (
                h(
                    () => l.open,
                    o => {
                        o
                            ? (document.body.style.overflow = 'hidden')
                            : (document.body.style.overflow = '');
                    }
                ),
                (o, i) => (
                    t(),
                    p(k, { to: 'body' }, [
                        C(
                            B,
                            { name: 'modal-fade' },
                            {
                                default: _(() => [
                                    e.open
                                        ? (t(),
                                          s('div', { key: 0, class: 'modal-overlay', onClick: u }, [
                                              d(
                                                  'div',
                                                  {
                                                      class: O(f.value),
                                                      onClick:
                                                          i[0] || (i[0] = w(() => {}, ['stop']))
                                                  },
                                                  [
                                                      d('div', M, [
                                                          e.title
                                                              ? (t(), s('h3', $, b(e.title), 1))
                                                              : a('', !0),
                                                          e.hideClose
                                                              ? a('', !0)
                                                              : (t(),
                                                                s(
                                                                    'button',
                                                                    {
                                                                        key: 1,
                                                                        class: 'modal-close',
                                                                        onClick: n
                                                                    },
                                                                    '×'
                                                                ))
                                                      ]),
                                                      d('div', N, [
                                                          c(o.$slots, 'default', {}, void 0, !0)
                                                      ]),
                                                      o.$slots.footer
                                                          ? (t(),
                                                            s('div', T, [
                                                                c(
                                                                    o.$slots,
                                                                    'footer',
                                                                    {},
                                                                    void 0,
                                                                    !0
                                                                )
                                                            ]))
                                                          : a('', !0)
                                                  ],
                                                  2
                                              )
                                          ]))
                                        : a('', !0)
                                ]),
                                _: 3
                            }
                        )
                    ])
                )
            );
        }
    }),
    S = z(V, [['__scopeId', 'data-v-daf55dc9']]);
export { S as M };
