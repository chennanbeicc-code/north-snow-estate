import { BoxGeometry, BufferGeometry, CylinderGeometry, DodecahedronGeometry, Euler, ExtrudeGeometry, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, MeshBasicMaterial, PlaneGeometry, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector3, Color, CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three'
import type { Material } from 'three'
import type { Point } from './atlas'

export function seeded(seed:number){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}}
export const range=(count:number)=>Array.from({length:count},(_,i)=>i)
export function canvasTexture(width:number,height:number,draw:(c:CanvasRenderingContext2D)=>void){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  draw(canvas.getContext('2d')!)
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map
}
function surface(wood:boolean){
  const rnd=seeded(wood?41:83)
  const map=canvasTexture(128,128,c=>{
    c.fillStyle='#e8e5d9';c.fillRect(0,0,128,128)
    for(let i=0;i<3500;i++){
      c.fillStyle=rnd()>.5?'rgba(60,46,29,.12)':'rgba(255,255,249,.22)'
      c.fillRect(rnd()*128,rnd()*128,wood?2+rnd()*31:1+rnd()*2,.4+rnd()*1.3)
    }
  });map.wrapS=map.wrapT=RepeatWrapping;return map
}
export type Kind='box'|'rock'|'leaf'|'post'|'cone'|'pot'|'ball'|'ring'|'plane'|'gable'
type Finish='wood'|'rough'|'metal'|'glass'|'house'|'oil'
type Entry={matrix:Matrix4;color:Color}
export class Kit {
  readonly root=new Group()
  readonly rnd=seeded(1437)
  private batches=new Map<string,{kind:Kind;finish:Finish;entries:Entry[]}>()
  private geometry=new Map<Kind,BufferGeometry>()
  readonly houseGlow=new MeshBasicMaterial({color:'#ffe0a1',toneMapped:false})
  readonly oilGlow=new MeshBasicMaterial({color:'#ffe6a0',toneMapped:false})
  private woodMap=surface(true)
  private roughMap=surface(false)
  private finishes:Record<Finish,Material>={
    wood:new MeshLambertMaterial({map:this.woodMap}),rough:new MeshLambertMaterial({map:this.roughMap}),metal:new MeshLambertMaterial(),
    glass:new MeshLambertMaterial({color:'#f0dba8',transparent:true,opacity:.27,depthWrite:false}),
    house:this.houseGlow,oil:this.oilGlow
  }
  put(kind:Kind,p:Point,s:Point,color:string,r:Point=[0,0,0],finish:Finish='rough'){
    this.place(kind,p,s,color,new Quaternion().setFromEuler(new Euler(...r)),finish)
  }
  box(p:Point,s:Point,color:string,r:Point=[0,0,0],finish:Finish='wood'){this.put('box',p,s,color,r,finish)}
  beam(a:Point,b:Point,w:number,d:number,color:string,round=false){
    const start=new Vector3(...a),end=new Vector3(...b),dir=end.clone().sub(start)
    const q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),dir.clone().normalize())
    this.place(round?'post':'box',start.lerp(end,.5).toArray(),[w,dir.length(),d],color,q,'wood')
  }
  private place(kind:Kind,p:Point,s:Point,color:string,q:Quaternion,finish:Finish){
    const key=kind+'/'+finish
    if(!this.batches.has(key))this.batches.set(key,{kind,finish,entries:[]})
    this.batches.get(key)!.entries.push({matrix:new Matrix4().compose(new Vector3(...p),q,new Vector3(...s)),color:new Color(color)})
  }
  private shape(kind:Kind):BufferGeometry{
    if(!this.geometry.has(kind)){
      let g:BufferGeometry
      switch(kind){
        case 'box':g=new BoxGeometry();break
        case 'rock':g=new DodecahedronGeometry(.54);break
        case 'leaf':g=new IcosahedronGeometry(.53);break
        case 'post':g=new CylinderGeometry(.5,.5,1,12);break
        case 'cone':g=new CylinderGeometry(.04,.5,1,12);break
        case 'pot':g=new CylinderGeometry(.5,.34,1,12);break
        case 'ball':g=new SphereGeometry(.5,12,8);break
        case 'ring':g=new TorusGeometry(.45,.05,6,20);break
        case 'plane':g=new PlaneGeometry();break
        case 'gable':{
          const shape=new Shape();shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(0,.5);shape.closePath()
          g=new ExtrudeGeometry(shape,{depth:1,bevelEnabled:false}).translate(0,0,-.5);break
        }
      }
      this.geometry.set(kind,g)
    }
    return this.geometry.get(kind)!
  }
  finish(){
    for(const {kind,finish,entries} of this.batches.values()){
      const mesh=new InstancedMesh(this.shape(kind),this.finishes[finish],entries.length)
      entries.forEach((v,i)=>{mesh.setMatrixAt(i,v.matrix);mesh.setColorAt(i,v.color)})
      mesh.castShadow=finish==='wood'||finish==='rough';mesh.receiveShadow=mesh.castShadow;this.root.add(mesh)
    }
    this.batches.clear()
  }
}
export function disposeScene(group:Group){
  const gs=new Set<BufferGeometry>(),ms=new Set<Material>()
  group.traverse(o=>{if(o instanceof Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);if(o instanceof InstancedMesh)o.dispose()}})
  for(const g of gs)g.dispose()
  for(const m of ms){if('map' in m && m.map instanceof CanvasTexture)m.map.dispose();m.dispose()}
}
