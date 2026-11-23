/// <reference types="vite/client" />
import { useEffect, useRef, type RefObject } from 'react'
import fragment from './estateNature.frag?raw'
import type { WeatherLight } from './useEstateWeather'
import { estateMotion } from './estateMotion'

export const closedPhoto = new URL('./snow-estate.png', import.meta.url).href
export const openPhoto = new URL('./snow-estate-open.png', import.meta.url).href
export const pavilionPhoto = new URL('./estate-pavilion.webp', import.meta.url).href
export const nightPhoto = new URL('./snow-estate-night.png', import.meta.url).href
const assets = [
  closedPhoto, openPhoto, new URL('./estate-motion-mask.png', import.meta.url).href,
  new URL('./estate-koi.png', import.meta.url).href, new URL('./estate-restoration.png', import.meta.url).href,
  new URL('./estate-cloud-detail.webp', import.meta.url).href, pavilionPhoto, nightPhoto,
]
const samplers = ['closedScene','openScene','masks','fishAtlas','restoration','mistDetail','pavilionScene','nightScene']
export type PhotoCamera = { scale:number; x:number; y:number; width:number; height:number }
const vertex = `
attribute vec2 point;
uniform vec4 photoWindow;
varying vec2 uv;
void main(){
  vec2 screen=vec2(point.x*.5+.5,.5-point.y*.5);
  uv=photoWindow.xy+screen*photoWindow.zw;
  gl_Position=vec4(point,0.,1.);
}`

async function loadImage(url:string){
  const image=new Image()
  image.src=url
  await image.decode()
  return image
}

type Props={
  camera: RefObject<PhotoCamera|null>; repaint: RefObject<()=>void>
  open:boolean; still:boolean; pavilion:boolean; light:RefObject<WeatherLight>; house:boolean
}
export function EstateNature({camera,repaint,open,still,pavilion,light,house}:Props){
  const canvas=useRef<HTMLCanvasElement>(null)
  const settings=useRef({open,still,pavilion,house})
  useEffect(()=>{settings.current={open,still,pavilion,house};repaint.current()},[open,still,pavilion,house,repaint])

  useEffect(()=>{
    const node=canvas.current!
    const options:WebGLContextAttributes={alpha:false,antialias:true,depth:false,stencil:false}
    const modern=node.getContext('webgl2',options)
    const context=modern??node.getContext('webgl',options)
    if(!context)return
    const gl=context
    const maxViewport=gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)')
    let resolution:MediaQueryList
    let stopped=false,ready=false,frame=0,last=0,blend=Number(settings.current.open)
    const textures:WebGLTexture[]=[],shaders:WebGLShader[]=[]
    const uniforms:Record<string,WebGLUniformLocation|null>={}
    const program=gl.createProgram(),buffer=gl.createBuffer()
    const motion=estateMotion()

    function schedule(){
      if(ready&&!stopped&&!document.hidden&&!frame)frame=requestAnimationFrame(draw)
    }
    function draw(now:number){
      frame=0
      const c=camera.current
      if(!ready||!c||document.hidden)return
      const dpr=Math.min(devicePixelRatio||1,2,maxViewport[0]/c.width,maxViewport[1]/c.height)
      const w=Math.max(1,Math.round(c.width*dpr)),h=Math.max(1,Math.round(c.height*dpr))
      if(node.width!==w||node.height!==h){node.width=w;node.height=h}
      gl.viewport(0,0,w,h)
      // Restrict fragment work to the visible part of the photo, including when letterboxed.
      const left=Math.max(0,Math.round(c.x*dpr)),top=Math.max(0,Math.round(c.y*dpr))
      const right=Math.min(w,Math.round((c.x+1671*c.scale)*dpr))
      const bottom=Math.min(h,Math.round((c.y+941*c.scale)*dpr))
      gl.scissor(left,h-bottom,Math.max(0,right-left),Math.max(0,bottom-top))
      node.style.clipPath='inset('+top/dpr+'px '+(w-right)/dpr+'px '+(h-bottom)/dpr+'px '+left/dpr+'px)'
      const sw=1671*c.scale,sh=941*c.scale
      gl.uniform4f(uniforms.photoWindow,-c.x/sw,-c.y/sh,c.width/sw,c.height/sh)
      gl.uniform1f(uniforms.detailStrength,Math.min(.42,Math.max(0,(c.scale*dpr-1)*.27)))
      gl.uniform1f(uniforms.inPavilion,Number(settings.current.pavilion))
      gl.uniform1f(uniforms.nightMode,light.current.night)
      gl.uniform1f(uniforms.litHouse,Number(settings.current.house))
      const dt=last?Math.min(.1,(now-last)/1000):0
      last=now
      if(!settings.current.still)motion.update(dt)
      const target=Number(settings.current.open)
      const step=reducedMotion.matches?1:dt/1.05
      blend+=Math.sign(target-blend)*Math.min(Math.abs(target-blend),step)
      gl.uniform4fv(uniforms['fishPose[0]'],motion.pose)
      gl.uniform2fv(uniforms['fishStroke[0]'],motion.strokes)
      gl.uniform4fv(uniforms.lanternSwing,motion.swing)
      gl.uniform1f(uniforms.skyTravel,motion.skyTravel)
      gl.uniform1f(uniforms.clockTime,motion.time)
      gl.uniform1f(uniforms.business,blend)
      gl.drawArrays(gl.TRIANGLES,0,3)
      node.style.opacity='1'
      if(!settings.current.still||blend!==target)schedule()
    }
    function wake(){if(!frame)last=0;schedule()}
    function watchDpr(){
      resolution?.removeEventListener('change',watchDpr)
      resolution=matchMedia('(resolution: '+devicePixelRatio+'dppx)')
      resolution.addEventListener('change',watchDpr)
      wake()
    }
    function lost(event:Event){
      event.preventDefault();ready=false;node.style.opacity='0';cancelAnimationFrame(frame);frame=0
    }
    async function init(){
      const images=await Promise.all(assets.map(loadImage))
      if(stopped||!program||!buffer)return
      const vs=modern?'#version 300 es\n'+vertex.replace('attribute','in').replace('varying','out'):vertex
      const fs=modern?'#version 300 es\n'+fragment.replace('varying vec2 uv;', 'in vec2 uv; out vec4 color;').replaceAll('gl_FragColor','color').replaceAll('texture2D','texture'):fragment
      for(const [type,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]] as const){
        const shader=gl.createShader(type)!
        shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader)
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)??'Estate shader failed')
        gl.attachShader(program,shader)
      }
      gl.linkProgram(program)
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??'Estate program failed')
      gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer)
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW)
      const pos=gl.getAttribLocation(program,'point')
      gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0)
      const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic')
      const maximum=anisotropy?gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT):1
      images.forEach((image,i)=>{
        const texture=gl.createTexture()!
        textures.push(texture);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture)
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image)
        const photo=i===0||i===1||i>=6
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,modern&&photo?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR)
        if(modern&&photo)gl.generateMipmap(gl.TEXTURE_2D)
        if(anisotropy&&photo)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,maximum)
        gl.uniform1i(gl.getUniformLocation(program,samplers[i]),i)
      })
      for(const name of ['photoWindow','detailStrength','inPavilion','nightMode','litHouse','clockTime','business','fishPose[0]','fishStroke[0]','lanternSwing','skyTravel']){
        uniforms[name]=gl.getUniformLocation(program,name)
      }
      gl.enable(gl.SCISSOR_TEST);ready=true;wake()
    }
    repaint.current=wake
    watchDpr()
    node.addEventListener('webglcontextlost',lost)
    document.addEventListener('visibilitychange',wake)
    init().catch(error=>console.warn('山庄动态渲染不可用',error))
    return ()=>{
      stopped=true;repaint.current=()=>{};cancelAnimationFrame(frame)
      resolution.removeEventListener('change',watchDpr)
      document.removeEventListener('visibilitychange',wake);node.removeEventListener('webglcontextlost',lost)
      textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s))
      gl.deleteBuffer(buffer);gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  },[camera,repaint,light])
  return <canvas ref={canvas} className="estate-nature" aria-hidden="true"/>
}