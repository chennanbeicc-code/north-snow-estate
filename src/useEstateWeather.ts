import { useLayoutEffect, useRef, type RefObject } from 'react'

export type Weather = 'day' | 'night' | 'snow'
export type WeatherLight = { night:number; snow:number }

const width=1671, height=941
const smooth=(v:number)=>v*v*(3-2*v)
const clamp=(v:number)=>Math.max(0,Math.min(1,v))

// Seeded in photograph coordinates, so panning, zooming or stopping the wind
// never respawns the snow. Depth governs speed, radius and lateral drift.
function snowField(){
  let seed=1911
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  return Array.from({length:480},()=>{
    const depth=random()**1.6
    return {x:random()*width,y:random()*height,depth,phase:random()*6.28,arrival:random()}
  })
}
const flakes=snowField()
// Openings between the pavilion posts; leave the oil lamp and teapot in front of the snow.
const openings='M0 130L56 148 112 180 168 221 168 688 0 730Z M272 231L339 215 387 180 480 171 480 158 528 158 528 172 1140 172 1140 157 1191 157 1191 178 1286 184 1330 210 1398 232 1398 684 272 684Z M1503 231L1540 191 1603 158 1671 124 1671 728 1503 688Z M770 685L781 661 788 616 806 616 815 657 829 685Z M907 685Q925 650 968 665L990 685Z'

function drawSnow(ctx:CanvasRenderingContext2D, intensity:number, time:number, aperture:Path2D|null){
  ctx.clearRect(0,0,width,height)
  if(intensity<=0)return
  ctx.save()
  if(aperture)ctx.clip(aperture,'evenodd')
  ctx.fillStyle='#f5f8ff'
  for(const f of flakes){
    const fade=clamp((intensity-f.arrival*.92)/.08)
    if(!fade)continue
    const d=f.depth
    const y=(f.y+time*(22+74*d))%(height+12)-6
    const sway=(3+9*d)*Math.sin(time*(.34+.17*d)+f.phase)+5*Math.sin(y*.006+f.phase)
    const x=(f.x+time*(5+18*d)+sway+width)%(width+12)-6
    ctx.globalAlpha=fade*(.3+.52*d)
    const size=.78+1.95*d*d
    ctx.beginPath()
    ctx.ellipse(x,y,size,size*(1.08+.35*d),-.17,0,2*Math.PI)
    ctx.fill()
  }
  ctx.restore()
}

export function useEstateWeather(weather:Weather, still:boolean, pavilion:boolean,
  viewport:RefObject<HTMLDivElement|null>, repaint:RefObject<()=>void>){
  const snowCanvas=useRef<HTMLCanvasElement>(null)
  const light=useRef<WeatherLight>({night:Number(weather==='night'),snow:Number(weather==='snow')})
  const snowTime=useRef(0)
  useLayoutEffect(()=>{
    const root=viewport.current!,ctx=snowCanvas.current?.getContext('2d')
    const aperture=pavilion?new Path2D(openings):null
    const from={...light.current}
    const target={night:Number(weather==='night'),snow:Number(weather==='snow')}
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration=reduced?450:Math.max(900,Math.abs(from.night-target.night)*5000,Math.abs(from.snow-target.snow)*6100)
    let frame=0,elapsed=0,previous=performance.now(),lastPaint=-Infinity,needsClear=true
    const transitioning=from.night!==target.night||from.snow!==target.snow
    function draw(now:number){
      frame=0
      if(document.hidden)return
      const dt=Math.max(0,now-previous);previous=now
      elapsed+=dt
      const t=transitioning?clamp(elapsed/duration):1,k=smooth(t)
      const night=t===1?target.night:from.night+(target.night-from.night)*k
      const snow=t===1?target.snow:from.snow+(target.snow-from.snow)*k
      if(t<1||light.current.night!==night||light.current.snow!==snow||lastPaint===-Infinity){
        light.current={night,snow}
        root.style.setProperty('--night',night.toFixed(4))
        root.style.setProperty('--overcast',snow.toFixed(4))
        root.style.setProperty('--afterglow',(Math.sin(Math.PI*night)*(1-snow)).toFixed(4))
        root.style.setProperty('--sun-height',(5+night*24).toFixed(2)+'%')
        repaint.current()
      }
      if(!still)snowTime.current+=Math.min(dt,100)/1000
      if(ctx&&(snow>0||needsClear)&&(now-lastPaint>=32||t===1&&(still||snow===0))){
        drawSnow(ctx,smooth(clamp((snow-.075)/.925)),snowTime.current,aperture)
        needsClear=snow>0
        lastPaint=now
      }
      if(t<1||(!still&&snow>0))frame=requestAnimationFrame(draw)
    }
    function wake(){
      cancelAnimationFrame(frame);previous=performance.now()
      if(!document.hidden)draw(previous)
    }
    wake()
    document.addEventListener('visibilitychange',wake)
    return ()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',wake)}
  },[weather,still,pavilion,viewport,repaint])
  return {light,snowCanvas}
}
