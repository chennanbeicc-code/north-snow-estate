import stylesheet from './brush-pointer.css?url'

export function installBrushPointer(doc: Document, motionAllowed = true) {
  const win = doc.defaultView
  if (!win) return () => {}
  const style = doc.createElement('link')
  style.rel = 'stylesheet'
  style.href = new URL(stylesheet, import.meta.url).href
  doc.head.append(style)
  doc.documentElement.classList.add('north-brush')

  const fine = win.matchMedia('(any-hover: hover) and (any-pointer: fine)')
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)')
  const layer = doc.createElement('div')
  layer.className = 'brush-atmosphere'
  layer.setAttribute('aria-hidden','true')
  const light = doc.createElement('i')
  light.className = 'brush-light'
  layer.append(light)
  const wisps = Array.from({length: 12}, () => {
    const wisp = doc.createElement('i')
    wisp.className = 'brush-wisp'
    layer.append(wisp)
    return wisp
  })
  let x=0, y=0, previousX=0, previousY=0, lastWisp=0, frame=0, count=0
  let visible=false
  function clear() {
    win!.cancelAnimationFrame(frame)
    frame=0; visible=false
    layer.remove()
    for (const wisp of wisps) wisp.getAnimations().forEach(anim=>anim.cancel())
  }
  function paint(time:number) {
    frame=0
    light.style.transform='translate('+x+'px,'+y+'px)'
    const dx=x-previousX, dy=y-previousY
    const distance=Math.hypot(dx,dy)
    if (!visible || distance>180) {
      visible=true; previousX=x; previousY=y; lastWisp=time
      return
    }
    if (distance<5 || time-lastWisp<30) return
    const wisp=wisps[count++ % wisps.length]
    const twist=count%2===0?1:-1
    const angle=Math.atan2(dy,dx)*180/Math.PI
    const startX=x-dx*.35,startY=y-dy*.35
    const start='translate('+startX+'px,'+startY+'px) rotate('+angle+'deg)'
    const end='translate('+(startX-dy/distance*twist*7)+'px,'+(startY+dx/distance*twist*5-10)+'px) rotate('+(angle+twist*18)+'deg)'
    wisp.getAnimations().forEach(anim=>anim.cancel())
    wisp.animate([{transform:start+' scale(.62)',opacity:.62},{transform:end+' scale(1.45)',opacity:0}],
      {duration:520,easing:'ease-out'})
    previousX=x; previousY=y; lastWisp=time
  }
  function move(event:PointerEvent) {
    const target=event.target as Element|null
    if (event.pointerType!=='mouse' || !fine.matches || !motionAllowed || reduced.matches || doc.hidden ||
        doc.getElementById('root')?.firstElementChild?.matches('.still-stage, .still-yard') ||
        target?.closest('textarea,input:not([type=range]),[contenteditable=true],iframe')) {
      if (layer.isConnected) clear()
      return
    }
    // Native dialogs sit above the page. Attach to the active dialog so its controls
    // remain visible and interactive through the same pointer effect.
    const host=target?.closest('dialog[open]') || doc.body
    if (layer.parentElement!==host) {clear();host.append(layer)}
    x=event.clientX; y=event.clientY
    if (!frame) frame=win!.requestAnimationFrame(paint)
  }
  function leave(event:PointerEvent) { if (!event.relatedTarget || (event.relatedTarget as Element).tagName==='IFRAME') clear() }
  doc.addEventListener('pointermove',move,{passive:true,capture:true})
  doc.addEventListener('pointerout',leave,true)
  doc.addEventListener('visibilitychange',clear)
  doc.addEventListener('close',clear,true)
  win.addEventListener('blur',clear)
  reduced.addEventListener('change',clear)
  return () => {
    clear();style.remove();doc.documentElement.classList.remove('north-brush')
    doc.removeEventListener('pointermove',move,true)
    doc.removeEventListener('pointerout',leave,true)
    doc.removeEventListener('visibilitychange',clear)
    doc.removeEventListener('close',clear,true)
    win.removeEventListener('blur',clear)
    reduced.removeEventListener('change',clear)
  }
}
