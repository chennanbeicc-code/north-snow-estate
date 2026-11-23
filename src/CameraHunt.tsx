import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { InkFarewell } from './InkFarewell'
import { installBrushPointer } from './brushPointer'
import bedsideCamera from './bedside-camera.webp'
import { albumAudio, soundCue } from './sceneAudio'
import './camera-hunt.css'

export type CameraStep = 'tucked' | 'falling' | 'floor' | 'celebrating' | 'seeking' | 'found' | 'ready'
const storageKey = 'north.snow-study.camera.v1'

export function readCameraStep(): CameraStep {
  try {
    const step = localStorage.getItem(storageKey)
    if (step === 'floor' || step === 'seeking' || step === 'found' || step === 'ready') return step
  } catch { /* The hunt also works without browser storage. */ }
  return 'tucked'
}

export function saveCameraStep(step: CameraStep) {
  // A reload during either animation resumes with its result.
  const checkpoint = step === 'falling' ? 'floor' : step === 'celebrating' ? 'seeking' : step
  try { localStorage.setItem(storageKey, checkpoint) } catch { /* Play continues in memory. */ }
}

type Props = {
  step: CameraStep
  advance: (next: CameraStep) => void
  reduced: boolean
  hidden: boolean
}

export function CameraHunt({step, advance, reduced, hidden}: Props) {
  const pillow = useRef<HTMLButtonElement>(null)
  const album = useRef<HTMLDialogElement>(null)
  const [screen, setScreen] = useState<'off'|'camera'|'album'|'farewell'>('off')
  const albumOpen = screen === 'album'
  const removeAlbumPointer = useRef<(()=>void)|null>(null)
  useEffect(()=>()=>{removeAlbumPointer.current?.();removeAlbumPointer.current=null},[albumOpen])
  const closeCamera = useCallback(() => album.current?.close(), [])
  function returnToRoom() {
    if (albumOpen) setScreen('farewell')
    else closeCamera()
  }
  const inserted=step==='ready'
  useEffect(()=>{albumAudio(albumOpen);return ()=>albumAudio(false)},[albumOpen])
  const celebration = useRef<HTMLDialogElement>(null)
  const focusPillow = useRef(false)
  useEffect(() => {
    if (step === 'falling' && reduced) advance('floor')
    if (step === 'seeking' && focusPillow.current && !hidden) {
      focusPillow.current = false
      pillow.current?.focus({preventScroll:true})
    }
    if (step !== 'celebrating') return
    const dialog = celebration.current
    dialog?.showModal()
    const timer = window.setTimeout(() => advance('seeking'), reduced ? 950 : 1750)
    return () => { window.clearTimeout(timer); dialog?.close() }
  }, [step, reduced, hidden, advance])

  useEffect(()=>{
    if (step!=='falling'||reduced||hidden)return
    const hit=window.setTimeout(()=>soundCue('card'),860+1050*.77)
    return ()=>window.clearTimeout(hit)
  },[step,reduced,hidden])

  return <div className="camera-hunt" hidden={hidden}>
    {step === 'falling' && <span className="secret-card falling" aria-hidden="true"
      onAnimationEnd={event => {
        if (event.target === event.currentTarget && event.animationName === 'card-drop') advance('floor')
      }}><span className="sd-shell"/></span>}
    {step === 'floor' && <button type="button" className="secret-card floor" aria-label="拾起地上的内存卡"
      onClick={event => { focusPillow.current = event.detail === 0; soundCue('fireworks'); advance('celebrating') }}>
      <span className="sd-shell" aria-hidden="true"/>
    </button>}
    {step === 'celebrating' && <dialog ref={celebration} className="camera-discovery"
      aria-label="触发彩蛋" onCancel={event => { event.preventDefault(); advance('seeking') }}>
      {!reduced && <div className="discovery-sky" aria-hidden="true">
        {['amber','silver','copper'].map(color => <div key={color} className={'discovery-burst '+color}>
          {Array.from({length:14}, (_,i) => <i key={i} style={{
            '--angle': (i * 360 / 14)+'deg', '--radius': (i % 2 ? 54 : 79)+'px'
          } as CSSProperties}/>)}
        </div>)}
      </div>}
      <strong>触发彩蛋</strong>
    </dialog>}
    {(step === 'seeking' || step === 'found' || inserted) &&
      <button type="button" ref={pillow} className={'pillow-secret '+(inserted?'found':step)}
        aria-label={step === 'seeking' ? '查看发光的枕头' : '打开照相机'}
        aria-haspopup={step === 'seeking' ? undefined : 'dialog'}
        onClick={() => {
          if (step === 'seeking') advance('found')
          else {
            album.current?.showModal()
            setScreen('camera')
          }
        }}>
        {step !== 'seeking' && <img src={bedsideCamera} alt=""/>}
      </button>}
    <dialog ref={album} className={screen==='farewell'?'album-farewell':albumOpen?'camera-album':'camera-album camera-boot'} aria-label={screen==='farewell'?'相册卷末寄语':albumOpen?'North 的生活相册':'照相机主屏幕'}
      onCancel={event => {
        // Escape inside the album belongs to its photo viewer and chapter navigation.
        if (document.activeElement?.tagName === 'IFRAME') event.preventDefault()
        else if (albumOpen) { event.preventDefault(); returnToRoom() }
      }}
      onClose={() => {
        setScreen('off')
        pillow.current?.focus({preventScroll:true})
      }}>
      {screen==='farewell' && <InkFarewell kind="album" onFinish={closeCamera}/>}
      {screen==='camera'&&<section className="camera-monitor">
        <div className="camera-readout"><span>PLAYBACK</span><span aria-label="电量充足">▰ ▰ ▰</span></div>
        <div className="camera-message"><i className="card-outline" aria-hidden="true">SD</i>
          <h2>欢迎来到不被定义的North空间！</h2><p>{inserted?'内存卡已就绪。':'缺少内存卡，请插入刚拾起的内存卡。'}</p>
          <button onClick={()=>{if(!inserted)advance('ready');setScreen('album')}}>{inserted?'进入相册':'插入内存卡'}</button></div>
      </section>}
      {albumOpen && <iframe title="North 的生活相册" src={import.meta.env.BASE_URL + 'life-album/index.html'}
        onLoad={event => {
          const frame=event.currentTarget
          removeAlbumPointer.current?.()
          if(frame.contentDocument)removeAlbumPointer.current=installBrushPointer(frame.contentDocument,!reduced)
          frame.focus({preventScroll:true})
        }}/>}
      {screen!=='farewell'&&<footer><button type="button" onClick={returnToRoom}>‹　返回卧室</button></footer>}
    </dialog>
  </div>
}
