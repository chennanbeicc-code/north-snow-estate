import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, ExtrudeGeometry, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, MeshLambertMaterial, Object3D, PerspectiveCamera, Shape, Vector3 } from 'three'
import { bedroom, type Piece, type Shape as Kind } from './models'
import { roomPoints } from './atlas'



export type Pin = {left:number;top:number}
function primitive(kind:Kind){
  let base:BufferGeometry
  switch(kind){
    case 'box': base=new BoxGeometry();break
    case 'pine': base=new ConeGeometry(.5,1,7);break
    case 'grass': base=new ConeGeometry(.5,1,3);break
    case 'stone': base=new DodecahedronGeometry(.55);break
    case 'disc': base=new CylinderGeometry(.5,.5,1,12);break
    case 'ball': base=new IcosahedronGeometry(.55);break
    case 'gable': {
      const end=new Shape();end.moveTo(-.5,-.5);end.lineTo(0,.5);end.lineTo(.5,-.5);end.closePath()
      base=new ExtrudeGeometry(end,{depth:1,bevelEnabled:false}).translate(0,0,-.5)
      break
    }
  }
  const geometry=base.index?base.toNonIndexed():base
  if(base!==geometry)base.dispose()
  geometry.computeVertexNormals()
  const normal=geometry.getAttribute('normal'),colors=[]
  for(let i=0;i<normal.count;i++){
    const v=.53+Math.max(0,normal.getY(i))*.36+Math.max(0,normal.getZ(i))*.18+Math.max(0,-normal.getX(i))*.09
    colors.push(v,v*.99,v*.94)
  }
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3))
  return geometry
}
function Batch({kind,parts,lit=false,shimmer=false}:{kind:Kind;parts:Piece[];lit?:boolean;shimmer?:boolean}){
  const ref=useRef<InstancedMesh>(null)
  const geometry=useMemo(()=>primitive(kind),[kind])
  const material=useMemo(()=>new MeshLambertMaterial({vertexColors:!lit,toneMapped:false}),[lit])
  useFrame(({clock})=>{
    if(lit)material.color.setScalar(shimmer ? .94+.06*Math.sin(clock.elapsedTime*1.8) : 1)
  })
  useEffect(()=>()=>{geometry.dispose();material.dispose()},[geometry,material])
  useLayoutEffect(()=>{
    const mesh=ref.current!,matrix=new Object3D(),color=new Color()
    parts.forEach((p,i)=>{
      matrix.position.set(...p.p);matrix.scale.set(...p.s);matrix.rotation.set(...p.r);matrix.updateMatrix()
      mesh.setMatrixAt(i,matrix.matrix);mesh.setColorAt(i,color.set(p.color))
    })
    mesh.instanceMatrix.needsUpdate=true
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true
    mesh.computeBoundingSphere()
  },[parts])
  return <instancedMesh ref={ref} args={[geometry,material,parts.length]}/>
}
function Pieces({parts,lit=false,shimmer=false}:{parts:Piece[];lit?:boolean;shimmer?:boolean}){
  const batches=useMemo(()=>{
    const groups=new Map<Kind,Piece[]>()
    for(const p of parts){if(!groups.has(p.shape))groups.set(p.shape,[]);groups.get(p.shape)!.push(p)}
    return Array.from(groups)
  },[parts])
  return <>{batches.map(([kind,items])=><Batch key={kind} parts={items} kind={kind} lit={lit} shimmer={shimmer}/>)}</>
}
function Room(){const parts=useMemo(bedroom,[]);return <Pieces parts={parts}/>}
function RoomLayout({onPins}:{onPins:(pins:Pin[])=>void}){
  const {size,camera,invalidate}=useThree()
  useLayoutEffect(()=>{
    const cam=camera as PerspectiveCamera, aspect=size.width/size.height
    cam.position.set(.1,2.76,Math.max(9.1,12.6/aspect)-2.7)
    cam.lookAt(-.15,1.58,-1.05);cam.fov=43;cam.aspect=aspect
    cam.updateProjectionMatrix();cam.updateMatrixWorld()
    onPins(roomPoints.map(p=>{const v=new Vector3(...p).project(cam);return {left:(v.x+1)*50,top:(1-v.y)*50}}))
    invalidate()
  },[size,camera,onPins,invalidate])
  return null
}
type WorldProps={house:boolean;onPins:(pins:Pin[])=>void}
export function World({onPins,house}:WorldProps){
  return <Canvas shadows frameloop="demand" dpr={[1,1.5]} gl={{antialias:true,alpha:true}} camera={{near:.1,far:140}}>
    <RoomLayout onPins={onPins}/><fog attach="fog" args={['#50473a',15,45]}/>
    <ambientLight intensity={.65}/><hemisphereLight args={['#cadcde','#5a5345',.6]}/>
    <pointLight position={[.5,3.5,.50]} intensity={house?45:0} color="#ffd598" distance={11}/><Room/>
  </Canvas>
}
