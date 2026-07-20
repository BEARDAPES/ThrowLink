import { Link } from 'react-router'

const DART_RING = `conic-gradient(
  var(--color-cream) 0deg 22.5deg, var(--color-ink-2) 22.5deg 45deg,
  var(--color-cream) 45deg 67.5deg, var(--color-ink-2) 67.5deg 90deg,
  var(--color-cream) 90deg 112.5deg, var(--color-ink-2) 112.5deg 135deg,
  var(--color-cream) 135deg 157.5deg, var(--color-ink-2) 157.5deg 180deg,
  var(--color-cream) 180deg 202.5deg, var(--color-ink-2) 202.5deg 225deg,
  var(--color-cream) 225deg 247.5deg, var(--color-ink-2) 247.5deg 270deg,
  var(--color-cream) 270deg 292.5deg, var(--color-ink-2) 292.5deg 315deg,
  var(--color-cream) 315deg 337.5deg, var(--color-ink-2) 337.5deg 360deg
)`

const PILLARS = [
  {
    title: '調整・予約を一元化',
    body: '日程調整も予約管理も、個別のDMやメモ書きから解放。店舗もプレイヤーも、システム上で完結します。',
  },
  {
    title: '自分の力で集客する',
    body: 'オファーが決まれば告知文を自動生成。SNSへワンタップで投稿でき、受け身だった集客が主体的な営業ツールに変わります。',
  },
  {
    title: '実績は、偽装できない数字で',
    body: '被依頼回数や延べ動員数は、システムを通した実績として自動で積み上がります。店舗間だけで共有されるクローズドな評価も。',
  },
]

export function HomePage() {
  return (
    <div className="bg-ink font-tl-sans">
      <section className="relative isolate overflow-hidden flex flex-col items-center justify-center text-center min-h-screen px-6">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] max-w-none rounded-full opacity-[0.06]"
          style={{ background: DART_RING }}
        />
        <div className="relative">
          <p className="font-tl-mono text-xs text-chalk-dim tracking-[0.2em] mb-4 uppercase">
            ThrowLink
          </p>
          <h1 className="font-display text-4xl sm:text-6xl font-bold uppercase tracking-wide text-chalk mb-6 max-w-2xl">
            投げた矢は、まっすぐ繋がる。
          </h1>
          <p className="text-[15px] sm:text-base leading-loose text-chalk-dim max-w-md mx-auto mb-10">
            プロソフトダーツプレイヤーと店舗を繋ぐ、イベント・集客管理システム。
            日程調整も告知も実績も、これ一本で。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/sign-in"
              className="font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-6 py-3 rounded-sm hover:opacity-90 transition-opacity"
            >
              プレイヤー・ファンとして始める
            </Link>
            <Link
              to="/sign-in"
              className="font-tl-mono text-sm font-semibold tracking-wide text-chalk border border-brass px-6 py-3 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors"
            >
              店舗として始める
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-brass/35 px-6 py-20">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-10">
          {PILLARS.map((pillar) => (
            <div key={pillar.title}>
              <h2 className="font-display text-lg font-semibold text-chalk uppercase tracking-wide mb-3">
                {pillar.title}
              </h2>
              <p className="text-sm leading-loose text-chalk-dim">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-brass/35 px-6 py-8 text-center">
        <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">ThrowLink</p>
      </footer>
    </div>
  )
}
