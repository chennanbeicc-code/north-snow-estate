import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { InkFarewell } from './InkFarewell'
import wellArt from './estate-well.webp'

import { EstateNature, closedPhoto, openPhoto, pavilionPhoto, nightPhoto, type PhotoCamera } from './EstateNature'

import { useEstateWeather, type Weather } from './useEstateWeather'

export type Business = 'closed' | 'opening' | 'open'
export type View = 'yard' | 'water' | 'table'
export type Shot = { view: View; sequence: number }
const operatingView = {x:667,y:546,zoom:2.7}
const width = 1671, height = 941
type Position = { x: number; y: number }
const presets = {
  yard: { x: width / 2, y: height / 2, zoom: 1 },
  water: { x: 630, y: 783, zoom: 2.25 },
  table: { x: width / 2, y: height / 2, zoom: 1.08 },
}
const windows = [
  [216, 411, 191, 48], [215, 510, 192, 51],
  [433, 400, 126, 48], [570, 399, 141, 46], [726, 399, 131, 48],
  [436, 510, 114, 52], [934, 411, 135, 49], [935, 509, 129, 52],
]
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

type Props = { wellAwake:boolean; weather:Weather; shot: Shot; still: boolean; house: boolean; oil: boolean; business:Business; onOpen:()=>void; onOpened:()=>void; onZoomOutToEntrance:()=>void; onEnter: (destination:'bedroom'|'hall') => void }
export function EstatePhoto({ wellAwake, weather, shot, still, house, oil, business, onOpen, onOpened, onZoomOutToEntrance, onEnter }: Props) {
  const viewport = useRef<HTMLDivElement>(null)
  const picture = useRef<HTMLDivElement>(null)
  const ornaments = useRef<HTMLDivElement>(null)
  const entrances = useRef<HTMLDivElement>(null)
  const repaint = useRef<()=>void>(()=>{})
  const camera = useRef<PhotoCamera|null>(null)
  const pavilion = shot.view==='table'
  const {light,snowCanvas}=useEstateWeather(weather,still,pavilion,viewport,repaint)
  const landing=useRef<{shot:Shot;zoom:number}|null>(null)
  const [loaded,setLoaded]=useState(false)
  const [reading,setReading]=useState(false)
  const finishReading=useCallback(()=>setReading(false),[])
  const roomDoor=useRef<HTMLButtonElement>(null)
  const restoreFocus=useRef(false)
  useLayoutEffect(()=>{
    if(business==='open'&&restoreFocus.current){roomDoor.current?.focus({preventScroll:true});restoreFocus.current=false}
  },[business])
  useLayoutEffect(() => {
    const frame = viewport.current!, layer = picture.current!
    const pointers = new Map<number, Position>()
    let scale = 1, fit = 1, offsetX = 0, offsetY = 0, fw = 0, fh = 0
    let animation=0
    const draw = () => {
      const w = width * scale, h = height * scale
      offsetX = w > fw ? clamp(offsetX, fw - w, 0) : (fw - w) / 2
      offsetY = h > fh ? clamp(offsetY, fh - h, 0) : (fh - h) / 2
      layer.style.transform = 'translate3d(' + offsetX + 'px,' + offsetY + 'px,0) scale(' + scale + ')'
      ornaments.current!.style.transform=layer.style.transform
      ornaments.current!.style.setProperty('--photo-scale', String(scale))
      const entry=entrances.current
      if(entry){
        const point=business==='closed'?[1360,688]:[647,542]
        entry.style.left=Math.round(offsetX+point[0]*scale)+'px'
        entry.style.top=Math.round(offsetY+point[1]*scale)+'px'
      }
      camera.current={scale,x:offsetX,y:offsetY,width:fw,height:fh}
      repaint.current()
    }
    const reset = () => {
      fw = frame.clientWidth; fh = frame.clientHeight
      if (!fw || !fh) return
      fit = Math.min(fw / width, fh / height)
      cancelAnimationFrame(animation)
      const preset = business!=='closed'&&shot.view==='yard' ? operatingView : presets[shot.view]
      const start=camera.current
      let goal=fit*preset.zoom
      if (shot.view==='table') goal=Math.max(goal,Math.min(fh/height,fit*2.8))
      if (preset===operatingView) goal=Math.max(goal,Math.min(5*fit,fh/height))
      if (business==='opening'&&start){
        goal=Math.max(goal,Math.min(5*fit,start.scale*1.16))
        landing.current={shot,zoom:goal/fit}
      } else if (business==='open'&&landing.current?.shot===shot){
        goal=fit*landing.current.zoom
      }
      const endX=fw/2-preset.x*goal,endY=fh/2-preset.y*goal
      if(business==='opening'&&start&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
        const begin=performance.now()
        const step=(now:number)=>{
          const t=clamp((now-begin)/1560,0,1)
          const eased=t*t*(3-2*t)
          scale=start.scale+(goal-start.scale)*eased
          offsetX=start.x+(endX-start.x)*eased;offsetY=start.y+(endY-start.y)*eased
          draw()
          if(t<1)animation=requestAnimationFrame(step)
          else onOpened()
        }
        animation=requestAnimationFrame(step)
      } else {
        scale=goal;offsetX=endX;offsetY=endY;draw()
        if(business==='opening')onOpened()
      }
    }
    const magnify = (value: number, p: Position) => {
      const next = clamp(value, fit, fit * 5)
      if (value < scale && next === fit && (business !== 'closed' || shot.view !== 'yard')) {
        cancelAnimationFrame(animation)
        landing.current=null
        restoreFocus.current=false
        onZoomOutToEntrance()
      }
      offsetX = p.x - (p.x - offsetX) * next / scale
      offsetY = p.y - (p.y - offsetY) * next / scale
      scale = next
    }
    const local = (e: MouseEvent): Position => {
      const rect = frame.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? fh : 1)
      const requestedScale=scale * Math.exp(-clamp(delta, -300, 300) * .0025)
      if(business==='opening' && (delta<=0 || requestedScale>fit))return
      magnify(requestedScale, local(e)); draw()
    }
    const down = (e: PointerEvent) => {
      if (business==='opening' || e.button !== 0 || (e.target as HTMLElement).closest('button')) return
      pointers.set(e.pointerId, local(e))
      frame.setPointerCapture(e.pointerId); frame.classList.add('dragging')
    }
    const gesture = () => {
      const [a, b] = pointers.values()
      return b ? { x: (a.x+b.x)/2, y: (a.y+b.y)/2, span: Math.max(1, Math.hypot(a.x-b.x,a.y-b.y)) }
        : { ...a, span: 0 }
    }
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      const before = gesture()
      pointers.set(e.pointerId, local(e))
      const after = gesture()
      if (before.span && after.span) magnify(scale * after.span / before.span, before)
      else if (scale <= fit + .00001 && (Math.abs(after.x-before.x)+Math.abs(after.y-before.y)>1)) magnify(fit*1.2,before)
      offsetX += after.x - before.x; offsetY += after.y - before.y; draw()
    }
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (!pointers.size) frame.classList.remove('dragging')
    }
    reset()
    const resize=new ResizeObserver(()=>{if(frame.clientWidth!==fw||frame.clientHeight!==fh)reset()})
    resize.observe(frame)
    frame.addEventListener('wheel', wheel, { passive: false })
    frame.addEventListener('pointerdown',down); frame.addEventListener('pointermove',move)
    frame.addEventListener('lostpointercapture',up); frame.addEventListener('pointerup',up); frame.addEventListener('pointercancel',up)
    return () => {
      cancelAnimationFrame(animation);resize.disconnect()
      for(const id of pointers.keys()) if(frame.hasPointerCapture(id)) frame.releasePointerCapture(id)
      frame.classList.remove('dragging')
      frame.removeEventListener('wheel',wheel); frame.removeEventListener('pointerdown',down); frame.removeEventListener('pointermove',move)
      frame.removeEventListener('lostpointercapture',up); frame.removeEventListener('pointerup',up); frame.removeEventListener('pointercancel',up)
    }
  }, [shot,business,onOpened,onZoomOutToEntrance])
  return <div className={'photo-viewport'+(reading?' is-reading':'')} data-weather={weather} ref={viewport} style={{'--estate-photo':'url("'+(pavilion?pavilionPhoto:business==='closed'?closedPhoto:openPhoto)+'")','--night-photo':'url("'+(pavilion?pavilionPhoto:nightPhoto)+'")'} as CSSProperties}>
    {reading && createPortal(<InkFarewell kind="well" onFinish={finishReading}/>, document.body)}
    <div className="estate-picture" ref={picture}>
      <img className="estate-original" src={closedPhoto} width={width} height={height} alt="雪落山庄正门。雪山下的双层木楼前，木桥横跨溪流，右侧是山庄牌楼与凉亭。" draggable={false}/>
      <img className={'estate-trading-photo'+(business==='closed'?'':' visible')} src={openPhoto} width={width} height={height} onLoad={()=>setLoaded(true)} alt={business==='closed'?'':'雪落山庄营业中，堂前摆出了桌椅，酒旗挂在门旁。'} draggable={false}/>
      {!pavilion&&<img className="night-original" src={nightPhoto} alt="" width={width} height={height} draggable={false}/>}
      {pavilion&&<img className="pavilion-original" src={pavilionPhoto} width={width} height={height} alt="坐在凉亭的石桌前，木桥通向溪对岸的山庄牌楼，门柱旁悬着一对灯笼。" draggable={false}/>}
    </div>
    <EstateNature light={light} house={house} open={business!=='closed'} still={still} pavilion={pavilion} camera={camera} repaint={repaint}/>
    <div className="estate-ornaments" ref={ornaments}>
      <svg width="0" height="0" style={{position:'absolute'}} focusable="false" aria-hidden="true"><defs>
        <filter id="moonlit-wood" colorInterpolationFilters="sRGB"><feComponentTransfer result="graded">
          <feFuncR type="gamma" amplitude=".78" exponent="1.28" offset=".002"/>
          <feFuncG type="gamma" amplitude=".82" exponent="1.2" offset=".008"/>
          <feFuncB type="gamma" amplitude=".96" exponent="1.04" offset=".022"/>
        </feComponentTransfer><feFlood floodColor="white" style={{floodOpacity:'var(--night,0)'}} result="weight"/>
          <feComposite in="graded" in2="weight" operator="in"/><feComposite in2="SourceGraphic" operator="atop"/>
        </filter>
      </defs></svg>
      {!pavilion&&<img className="estate-bridge" src={new URL('./estate-bridge.webp',import.meta.url).href} width={417} height={258} alt="" draggable={false}/>}
      {!pavilion&&<div className="estate-well">
        <img className="well-art" src={wellArt} alt="" draggable={false}/>
        {wellAwake&&<>
          <img className={'well-glint'+(still?' still':'')} src={wellArt} alt="" draggable={false}/>
          <button className="well-bucket" type="button" aria-label="井上的木桶" onClick={()=>setReading(true)}/>
        </>}
      </div>}
      {!pavilion&&
      <div className="window-lights" style={{opacity:house?1:0}} aria-hidden="true">{windows.map(([x,y,w,h])=><i key={x+','+y} style={{left:x,top:y,width:w,height:h}}/>)}</div>}
      <i className={'pavilion-light'+(pavilion?' inside-pavilion':'')} aria-hidden="true" style={{opacity:oil?1:0}}/>
      <div className={'weather-light'+(pavilion?' under-roof':'')}><i className="sunset-wash"/><i className="storm-veil"/></div>
      <canvas ref={snowCanvas} className="estate-snow" aria-hidden="true" width={width} height={height}/>
    </div>
    <div className="estate-entrances" ref={entrances}>
      {shot.view==='yard'&&business==='closed'&&<button className="door-pin gate-entry" aria-label="进入游戏" disabled={!loaded} onClick={()=>{restoreFocus.current=true;onOpen()}}><i aria-hidden="true"/><span>进入游戏</span></button>}
      {shot.view==='yard'&&business==='open'&&<div className="estate-destinations" role="group" aria-label="主楼入口">
        <button ref={roomDoor} className="estate-entry" onClick={()=>onEnter('bedroom')}>进入卧室</button>
        <button className="estate-entry" onClick={()=>onEnter('hall')}>进入大厅</button>
      </div>}
    </div>
  </div>
}
