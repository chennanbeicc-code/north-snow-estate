import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, Group, MathUtils, PerspectiveCamera, PointLight, SpriteMaterial, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { canvasTexture, disposeScene } from './courtyardMesh'
import { cottage, houseOrigin, pavilion, pavilionOrigin, porchLight, tableLight } from './courtyardBuildings'
import { woodland } from './woodland'
import { doorPoint, type Point } from './atlas'
import type { Pin } from './World'

export type View='yard'|'table'|'water'
export type Shot={view:View;sequence:number}
const shots:Record<View,{eye:Point;aim:Point;mobile:Point}>={
  yard:{eye:[1.60,4.38,21.6],aim:[.1,1.63,1.25],mobile:[1.25,5.3,25.5]},
  table:{eye:[10.3,2.68,7.55],aim:[4.76,1.82,.30],mobile:[6.55,2.60,8.7]},
  water:{eye:[-11.18,2.32,9.30],aim:[-4.65,1.13,2.24],mobile:[-13.28,3.06,12.6]}
}
function Camera({shot,onPins,building}:{shot:Shot;onPins:(v:Pin[])=>void;building:Group}){
  const {size,camera,gl,invalidate}=useThree()
  useLayoutEffect(()=>{
    const cam=camera as PerspectiveCamera,compact=size.width/size.height<.85
    const view=shots[shot.view], target=new Vector3(...view.aim)
    cam.fov=compact?46:43
    cam.position.set(...(compact?view.mobile:view.eye));cam.lookAt(target);cam.updateProjectionMatrix()
    const orbit=new OrbitControls(cam,gl.domElement)
    orbit.target.copy(target);orbit.enablePan=false;orbit.enableDamping=false;orbit.rotateSpeed=.53
    orbit.minDistance=shot.view==='yard'?10:3;orbit.maxDistance=compact?31:28
    orbit.minPolarAngle=.32;orbit.maxPolarAngle=Math.PI*.475
    const door=building.localToWorld(new Vector3(...doorPoint))
    const sync=()=>{
      cam.updateMatrixWorld()
      const p=door.clone().project(cam)
      const visible=cam.position.z>4&&Math.abs(cam.position.x)<8&&Math.abs(p.x)<.93&&Math.abs(p.y)<.88&&p.z<1&&shot.view==='yard'
      onPins(visible?[{left:(p.x+1)*50,top:(1-p.y)*50}]:[])
      invalidate()
    }
    orbit.addEventListener('change',sync);orbit.update();sync()
    return ()=>{orbit.removeEventListener('change',sync);orbit.dispose()}
  },[camera,gl,size.width,size.height,shot,onPins,invalidate,building])
  return null
}
// Keep text at native resolution. Only adjust the WebGL buffer after sustained slow frames.
function ResolutionBudget({active}:{active:boolean}){
  const {gl,setDpr,viewport}=useThree(), samples=useRef({count:0,time:0})
  useEffect(()=>{samples.current={count:0,time:0}},[active])
  useFrame((_,dt)=>{
    if(!active||document.hidden||dt>.25)return
    const s=samples.current; s.count++;s.time+=dt
    if(s.count<24)return
    const ms=1000*s.time/s.count, current=gl.getPixelRatio()
    if(ms>18.8&&current>.70)setDpr(Math.max(.70,current-.15))
    if(ms<12.3&&current<viewport.initialDpr)setDpr(Math.min(viewport.initialDpr,current+.08))
    s.count=0;s.time=0
  })
  return null
}
function haloMap(){
  return canvasTexture(96,96,c=>{const g=c.createRadialGradient(48,48,1,48,48,48);g.addColorStop(0,'rgba(255,220,130,.88)');g.addColorStop(.18,'rgba(255,184,78,.40)');g.addColorStop(.50,'rgba(255,155,59,.11)');g.addColorStop(1,'rgba(255,130,50,0)');c.fillStyle=g;c.fillRect(0,0,96,96)})
}
function Glow({position,size,level}:{position:Point;size:number;level:React.RefObject<number>}){
  const mat=useMemo(()=>new SpriteMaterial({map:haloMap(),transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false}),[])
  useFrame(()=>{mat.opacity=level.current*.72})
  useEffect(()=>()=>{mat.map?.dispose();mat.dispose()},[mat])
  return <sprite position={position} scale={[size,size,1]} material={mat}/>
}
export function Outdoor({still,house,oil,shot,onPins}:{still:boolean;house:boolean;oil:boolean;shot:Shot;onPins:(v:Pin[])=>void}){
  const {gl,invalidate}=useThree()
  const scene=useMemo(()=>{
    const woods=woodland(),home=cottage(),dining=pavilion(),root=new Group()
    home.root.position.set(...houseOrigin);dining.root.position.set(...pavilionOrigin)
    root.add(woods.group)
    return {woods,home,dining,root}
  },[])
  const entryLamp=useRef<PointLight>(null),tableLamp=useRef<PointLight>(null),interiorLamp=useRef<PointLight>(null)
  const homeLevel=useRef(house?1:0),oilLevel=useRef(oil?1:0)
  const palette=useMemo(()=>({cold:new Color('#303838'),hot:new Color('#ffcf80'),wick:new Color('#ffe5a0')}),[])
  useLayoutEffect(()=>{gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;invalidate()
    return ()=>{gl.shadowMap.autoUpdate=true}
  },[gl,invalidate])
  useEffect(()=>{invalidate()},[house,oil,still,invalidate])
  useEffect(()=>()=>{disposeScene(scene.root);disposeScene(scene.home.root);disposeScene(scene.dining.root)},[scene])
  useFrame(({clock},dt)=>{
    homeLevel.current=MathUtils.damp(homeLevel.current,house?1:0,8,dt)
    oilLevel.current=MathUtils.damp(oilLevel.current,oil?1:0,7,dt)
    const h=homeLevel.current,o=oilLevel.current
    scene.home.houseGlow.color.copy(palette.cold).lerp(palette.hot,h)
    scene.dining.oilGlow.color.copy(palette.cold).lerp(palette.wick,o)
    const size=scene.home.root.matrixWorld.getMaxScaleOnAxis()
    const tableSize=scene.dining.root.matrixWorld.getMaxScaleOnAxis()
    if(entryLamp.current){entryLamp.current.distance=5.5*size;entryLamp.current.intensity=18*h*size*size}
    if(interiorLamp.current){interiorLamp.current.distance=4*size;interiorLamp.current.intensity=9*h*size*size}
    if(tableLamp.current){tableLamp.current.distance=4.2*tableSize;tableLamp.current.intensity=9*o*tableSize*tableSize}
    if(!still){
      scene.woods.time.value=clock.elapsedTime
      scene.woods.trees.rotation.z=.0008*Math.sin(clock.elapsedTime*.61)
    }
    if(still&&(Math.abs(h-Number(house))>.001||Math.abs(o-Number(oil))>.001))invalidate()
  })
  return <>
    <Camera shot={shot} onPins={onPins} building={scene.home.root}/>
    <ResolutionBudget active={!still}/>
    <fogExp2 attach="fog" args={['#b0a798',.029]}/>
    <hemisphereLight args={['#edeedf','#81795f',1.18]}/>
    <directionalLight position={[-15,14,-6]} intensity={2.05} color="#ffe6bb" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={18} shadow-camera-bottom={-16} shadow-camera-far={55} shadow-normalBias={.035} shadow-bias={-.00035}/>
    <primitive object={scene.root}/>
    <primitive object={scene.home.root}>
      <pointLight ref={entryLamp} position={[porchLight[0],porchLight[1],porchLight[2]+.16]} distance={5.5} color="#ffba70"/>
      <pointLight ref={interiorLamp} position={[1.25,1.7,2.36]} distance={4} color="#ffd08a"/>
      <Glow position={porchLight} size={1.29} level={homeLevel}/>
      <Glow position={[1.21,1.84,2.30]} size={1.8} level={homeLevel}/>
    </primitive>
    <primitive object={scene.dining.root}><pointLight ref={tableLamp} position={tableLight} distance={4.2} color="#ffc16b"/>
      <Glow position={[tableLight[0],1.35,tableLight[2]]} size={.89} level={oilLevel}/>
    </primitive>
  </>
}
