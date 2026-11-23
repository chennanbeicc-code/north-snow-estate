import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Weather } from './useEstateWeather'
import { stations } from './atlas'
import { EstatePhoto, type Shot, type View, type Business } from './EstatePhoto'
import { SceneSettings, SettingsLabel } from './SceneSettings'
import { sceneAudio, unlockAudio, refreshAudio, musicNote } from './sceneAudio'
import { installBrushPointer } from './brushPointer'
import './style.css'

const Bedroom = lazy(() => import('./Bedroom'))
function App(){
  useEffect(()=>installBrushPointer(document),[])
  const [area,setArea]=useState<'yard'|'bedroom'|'hall'>('yard')
  const [weather,setWeather]=useState<Weather>('day'),[menu,setMenu]=useState(false)
  const [music,setMusic]=useState(()=>{try{return localStorage.getItem('north.music')!=='off'}catch{return true}})
  const toggleMusic=()=>setMusic(v=>!v)
  useEffect(()=>{
    const unlock=()=>unlockAudio()
    window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock)
    document.addEventListener('visibilitychange',refreshAudio)
    return ()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);document.removeEventListener('visibilitychange',refreshAudio)}
  },[])
  useEffect(()=>{sceneAudio(area==='bedroom'?'bedroom':'yard',music);try{localStorage.setItem('north.music',music?'on':'off')}catch{}},[area,music])
  const inside=area==='bedroom'
  const [still,setStill]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [house,setHouse]=useState(true),[oil,setOil]=useState(true)
  const [shot,setShot]=useState<Shot>({view:'yard',sequence:0})
  const [business,setBusiness]=useState<Business>('closed')
  const [wellAwake,setWellAwake]=useState(false)
  const completeOpening=useCallback(()=>setBusiness('open'),[])
  const returnToEntrance=useCallback(()=>{
    setBusiness('closed')
    setShot(prev=>prev.view==='yard'?prev:{view:'yard',sequence:prev.sequence+1})
  },[])
  const look=(view:View)=>{
    if(business==='opening')completeOpening()
    setShot(prev=>({view,sequence:prev.sequence+1}))
  }
  const [entry,setEntry]=useState<number|null>(null)
  const journal=useRef<HTMLDialogElement>(null),locationHeading=useRef<HTMLHeadingElement>(null),first=useRef(true)
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)')
    const sync=()=>setStill(media.matches);media.addEventListener('change',sync)
    return ()=>media.removeEventListener('change',sync)
  },[])
  useEffect(()=>{if(first.current){first.current=false;return}locationHeading.current?.focus({preventScroll:true})},[area])
  function travel(destination:typeof area){setArea(destination)}
  function open(index:number|null){setEntry(index);journal.current?.showModal();journal.current?.scrollTo(0,0)}
  if(inside)return <Suspense fallback={<main className="interior"><p className="fallback">正在进入卧室…</p></main>}><Bedroom music={music} toggleMusic={toggleMusic} house={house} onLight={()=>setHouse(v=>!v)} onReturn={complete=>{setWellAwake(complete);travel('yard')}}/></Suspense>
  return <main className={area==='hall'?'hall':still?'exterior still-yard':'exterior'}>
    {area==='hall'?<section className="hall-notice" aria-label="一层大厅装修告示">
      <span role="img" aria-label="憨厚地咧嘴笑">😁</span>
      <h1 ref={locationHeading} tabIndex={-1}>客官您好，</h1>
      <p>一层大厅正处于装修期。</p>
      <button onClick={()=>travel('yard')}>回到山庄</button>
    </section>:<><div className="scene"><EstatePhoto wellAwake={wellAwake} weather={weather} shot={shot} still={still} house={house} oil={oil} business={business} onOpen={()=>setBusiness('opening')} onOpened={completeOpening} onZoomOutToEntrance={returnToEntrance} onEnter={travel}/></div>
    <div className="vignette" aria-hidden="true"/></>}
    <header><div className="brand"><i aria-hidden="true"/>North<span>/</span><small>个人档案</small></div>
      <nav><button onClick={()=>open(null)}><span className="index-icon" aria-hidden="true"/>简历索引</button>{area==='yard'&&<button aria-haspopup="dialog" onClick={()=>setMenu(true)}><SettingsLabel/></button>}</nav></header>
    {area!=='hall'&&<><section className={'cover '+(shot.view==='yard'?'':'away')}><span className="eyebrow">NORTH · 个人空间</span>
        <h1 ref={locationHeading} tabIndex={-1} >雪落山庄</h1>
        <p aria-live="polite">{business==='open'?'山庄营业中':business==='opening'?'山庄开门迎客…':<>踏雪过桥，推门入屋。<br/>从这里走进 North 的故事。</>}</p>

      </section>
    <footer className="yard-footer"><span className="drag-hint">拖动查看 · 滚轮缩放</span>
      <div className="dock" aria-label="庭院视角与灯光">
        <div className="dock-group" aria-label="视角">{([['yard','庭院'],['water','溪畔'],['table','亭下']] as const).map(([v,label])=><button key={v} aria-pressed={shot.view===v} onClick={()=>look(v)}>{label}</button>)}</div>
        <div className="dock-group weather-picks" role="group" aria-label="天气">{([['day','日','白天'],['night','夜','夜晚'],['snow','雪','雪景']] as const).map(([mode,label,name])=><button key={mode} aria-label={name} aria-pressed={weather===mode} onClick={()=>setWeather(mode)}>{label}</button>)}</div>
        <div className="dock-group lighting"><button aria-pressed={house} onClick={()=>setHouse(!house)}><i/>房屋灯光</button><button aria-pressed={oil} onClick={()=>setOil(!oil)}><i/>餐桌油灯</button></div>
      </div>

    </footer></>}
    {menu&&<SceneSettings close={()=>setMenu(false)} musicNote={musicNote('yard')} rows={[
      {label:'环境动态',enabled:!still,toggle:()=>setStill(v=>!v)},
      {label:'配乐',enabled:music,toggle:toggleMusic}]}/>}
    <dialog ref={journal} aria-labelledby="journal-title" onClick={e=>{if(e.target===journal.current)journal.current.close()}}>
      <div className="paper"><div className="sheet-top"><span>NORTH / FIELD NOTES</span><button aria-label="关闭" onClick={()=>journal.current?.close()}>×</button></div>
      <h2 id="journal-title">{entry===null?'简历索引':stations[entry].object}</h2>
      {entry===null?<div className="contents">{stations.map((s,i)=><button key={s.en} onClick={()=>setEntry(i)}><span>{s.title}</span><small>{s.object}</small></button>)}</div>:<article><small>{stations[entry].en}</small><h3>{stations[entry].title}</h3><p>{stations[entry].detail}</p><button className="contents-link" onClick={()=>setEntry(null)}>返回简历索引</button></article>}</div>
    </dialog>
  </main>
}
createRoot(document.getElementById('root')!).render(<App/>)
