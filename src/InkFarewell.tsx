import { useEffect, type CSSProperties } from 'react'
import './ink-farewell.css'

const albumLines = [
  '恭喜你全部探索完成', '并发现了彩蛋！',
  '此间风雪已停，', '前路山海可期。', '愿君此生，', '自在如风，', '所愿皆成。',
]
const wellLines = [
  '隐藏彩蛋',
  '江湖那么大，', '你我不过萍水相逢。',
  '但既然你来了，', '便祝你此后山河无恙，', '岁岁安康。',
  '若有缘，', '我们江湖再见~',
]

export function InkFarewell({ kind, onFinish }: { kind: 'album' | 'well'; onFinish: () => void }) {
  const album = kind === 'album'
  const lines = album ? albumLines : wellLines
  const text = lines.join('')
  const pace = album ? 72 : 100
  const disperseAt = (text.length - 1) * pace + (album ? 5600 : 6100)
  useEffect(() => {
    const timer = window.setTimeout(onFinish, disperseAt + 1350)
    return () => window.clearTimeout(timer)
  }, [disperseAt, onFinish])

  let index = 0
  return <div className={'ink-farewell ink-' + kind} style={{'--disperse-at':disperseAt+'ms'} as CSSProperties}>
    <div className="ink-leaf">
      <span className="ink-transcript" role="status">{text}</span>
      <div className="ink-columns" aria-hidden="true">
        {lines.map((line, column) => <span key={line} className={'ink-column'+(album && column < 2 ? ' dedication' : '')+(!album && column===0 ? ' well-inscription' : '')}>
          {Array.from(line, char => {
            const i = index++
            return <span className="ink-glyph" key={i} style={{
              '--arrive': (i * pace) + 'ms',
              '--drift-x': (Math.sin(i * 2.4) * 22) + 'px',
              '--drift-y': (-9 - (i % 5) * 3) + 'px',
              '--turn': (Math.cos(i * 1.7) * 12) + 'deg',
              '--linger': ((i % 5) * 55) + 'ms',
            } as CSSProperties}>{char}</span>
          })}
        </span>)}
      </div>
      {album && <button className="ink-close" onClick={onFinish} autoFocus>收卷</button>}
    </div>
  </div>
}
