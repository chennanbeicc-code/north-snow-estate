// Sound only starts after a visitor gesture. All scene audio goes through one output.
type Area = 'yard' | 'bedroom'
const tracks:Record<Area,string> = {
  yard:new URL('./audio/yard.mp3',import.meta.url).href,
  bedroom:new URL('./audio/bedroom.mp3',import.meta.url).href,
}
let ctx:AudioContext|null=null, out:DynamicsCompressorNode|null=null
let scene:Area='yard', enabled=true, album=false, epoch=0
let voice:{source:AudioBufferSourceNode; gain:GainNode}|null=null
const clips = new Map<Area,Promise<AudioBuffer>>()
export function musicNote(area:Area) {
  return area==='yard'?'陈悦 ·《绿野仙踪》':'变奏的梦想 ·《江上清风游》'
}

async function sync(){
  const version=++epoch, context=ctx
  if(!context||!out)return
  if(voice){
    const {source,gain}=voice;voice=null
    if(typeof gain.gain.cancelAndHoldAtTime==='function')gain.gain.cancelAndHoldAtTime(context.currentTime)
    else {const level=gain.gain.value;gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setValueAtTime(level,context.currentTime)}
    const end=context.currentTime+(album ? .06 : .48)
    gain.gain.linearRampToValueAtTime(0,end);source.stop(end+.02)
    source.onended=()=>{source.disconnect();gain.disconnect()}
  }
  const area=scene,url=tracks[area]
  if(!enabled||album||document.hidden||!url)return
  if(!clips.has(area))clips.set(area,fetch(url).then(res=>{if(!res.ok)throw Error(String(res.status));return res.arrayBuffer()})
    .then(bytes=>context.decodeAudioData(bytes)))
  try{
    const clip=await clips.get(area)
    if(!clip||version!==epoch||!out)return
    const source=context.createBufferSource(), gain=context.createGain()
    source.buffer=clip;source.loop=true
    gain.gain.value=0;source.connect(gain).connect(out);source.start()
    gain.gain.linearRampToValueAtTime(1,context.currentTime+1.15);voice={source,gain}
  }catch{clips.delete(area)}
}
export function unlockAudio(){
  if(!ctx){
    ctx=new AudioContext();out=ctx.createDynamicsCompressor()
    out.threshold.value=-17;out.ratio.value=8;out.knee.value=5;out.connect(ctx.destination)
    void sync()
  }
  if(ctx.state==='suspended')void ctx.resume().catch(()=>{})
}
export function sceneAudio(area:Area,on:boolean){
  scene=area;enabled=on;void sync()
}
export function albumAudio(active:boolean){if(album!==active){album=active;void sync()}}
export function refreshAudio(){void sync()}

type Cue = 'card'|'fireworks'|'paper'|'seal'|'book'|'frame'|'lid'|'folder'

export function soundCue(kind:Cue){
  const context=ctx,output=out
  if(!context||!output||context.state!=='running'||document.hidden||album)return
  function burst(delay:number,length:number,hz:number,amp:number,friction=false){
    if(!context||!output)return
    const noise=context.createBuffer(1,Math.ceil(length*context.sampleRate),context.sampleRate)
    const data=noise.getChannelData(0)
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain()
    const t=context.currentTime+delay
    filter.type=friction?'bandpass':'lowpass'
    filter.frequency.setValueAtTime(hz,t)
    filter.frequency.exponentialRampToValueAtTime(hz*(friction ? .66 : .38),t+length)
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(amp,t+(friction?length*.28:.006));gain.gain.exponentialRampToValueAtTime(.0001,t+length)
    source.buffer=noise;source.connect(filter).connect(gain).connect(output);source.start(t)
    source.onended=()=>{source.disconnect();gain.disconnect();filter.disconnect()}
  }
  function knock(delay:number,hz:number,amp:number) {
    if(!context||!output)return
    const source=context.createOscillator(),gain=context.createGain(),t=context.currentTime+delay
    source.type='triangle'
    source.frequency.setValueAtTime(hz,t);source.frequency.exponentialRampToValueAtTime(hz*.56,t+.12)
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(amp,t+.005);gain.gain.exponentialRampToValueAtTime(.0001,t+.16)
    source.connect(gain).connect(output);source.start(t);source.stop(t+.17)
    source.onended=()=>{source.disconnect();gain.disconnect()}
  }
  switch(kind){
    case 'paper': // Leading edge lifts, the sheet flexes, then brushes the desk.
      burst(0,.15,2950,.13,true);burst(.07,.19,4300,.085,true);burst(.18,.12,1900,.065,true);break
    case 'seal':
      burst(0,.18,3300,.11,true);burst(.10,.10,4700,.065,true);break
    case 'book':
      burst(0,.18,1400,.14,true);knock(.13,175,.085);break
    case 'frame':
      knock(0,360,.055);burst(.025,.19,1100,.10,true);knock(.21,265,.075);break
    case 'lid':
      knock(0,730,.04);burst(.065,.24,920,.12,true);knock(.25,145,.10);break
    case 'folder':
      burst(0,.23,1850,.13,true);burst(.12,.14,3100,.08,true);break
    case 'card':
      burst(0,.061,3300,.11);burst(.088,.043,2450,.055);burst(.16,.03,1900,.025);break
    case 'fireworks':
      for(const at of [0,.23,.47]){burst(at,.30,1050,.12);burst(at+.05,.21,3100,.045);burst(at+.13,.11,3600,.024)}
  }
}
