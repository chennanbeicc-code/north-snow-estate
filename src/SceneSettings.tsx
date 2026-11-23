import { useEffect, useRef } from 'react'

export function SettingsLabel() {
  return <><span className="settings-gear" aria-hidden="true">⚙</span>设置</>
}

type Toggle = { label:string; enabled:boolean; toggle:()=>void; disabled?:boolean }
export function SceneSettings({ rows, close, musicNote }: { rows:Toggle[]; close:()=>void; musicNote?:string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog className="scene-settings" ref={dialog} aria-label="设置" onClose={close}
    onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close()}}>
    <div className="settings-panel">
      <div className="settings-heading"><h2>设置</h2><button aria-label="关闭设置" onClick={()=>dialog.current?.close()}>×</button></div>
      {rows.map(row=><button className="settings-row" role="switch" aria-checked={row.enabled}
        aria-label={row.label} key={row.label} disabled={row.disabled} onClick={row.toggle}>
        <span>{row.label}</span><i aria-hidden="true"/></button>)}
      {musicNote&&<small className="sound-note">{musicNote}</small>}
    </div>
  </dialog>
}
