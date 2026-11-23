import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, PlaneGeometry, RepeatWrapping } from 'three'
import { Kit, canvasTexture, range, seeded } from './courtyardMesh'
import type { Point } from './atlas'

const riverX=(z:number)=>-7.30+.86*Math.sin(z*.30)+.025*z
const channelWidth=(z:number)=>1.18+.23*Math.cos(z*.42)
const trailX=(z:number)=>-.98-1.58*Math.sin((z-4.45)*.36)-.13*(z-4.45)
function ground(x:number,z:number){
  const edge=Math.abs(x-riverX(z))-channelWidth(z)
  const bank=Math.min(1,Math.max(0,(edge+.48)/.86))
  const far=Math.min(1,Math.max(0,(Math.hypot(x,z)-15)/11))
  return -.62+.62*bank+far*(.66+.58*Math.sin(x*.28+z*.15)*Math.cos(z*.38)) *bank
}
function terrain(){
  const rnd=seeded(412),positions:number[]=[],color:number[]=[],indices:number[]=[]
  const count=161,step=.75,uv:number[]=[]
  const moss=new Color('#717c50'),soil=new Color('#756346'),rock=new Color('#918675')
  for(let j=0;j<count;j++)for(let i=0;i<count;i++){
    const x=(i-count/2)*step,z=(j-count/2)*step,edge=Math.abs(x-riverX(z))-channelWidth(z)
    positions.push(x,ground(x,z),z);uv.push(x/3.8,z/3.8)
    const c=moss.clone().lerp(soil,.44+.24*Math.sin(x*.93+z*.42)+.19*Math.sin(z*.64))
    if(edge<.55)c.lerp(rock,.68)
    if(z>4 && Math.abs(x-trailX(z))<1)c.lerp(soil,.85)
    c.multiplyScalar(.84+rnd()*.23);color.push(c.r,c.g,c.b)
    if(i<count-1&&j<count-1){const a=j*count+i;indices.push(a,a+count,a+1,a+1,a+count,a+count+1)}
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('color',new Float32BufferAttribute(color,3));g.setIndex(indices);g.computeVertexNormals()
  g.setAttribute('uv',new Float32BufferAttribute(uv,2))
  const cover=canvasTexture(256,256,c=>{
    c.fillStyle='#d4d0bb';c.fillRect(0,0,256,256)
    for(let i=0;i<18500;i++){
      const x=rnd()*256,y=rnd()*256,light=rnd()>.48
      c.fillStyle=light?'rgba(241,237,199,.40)':'rgba(58,65,42,.42)'
      c.fillRect(x,y,.5+rnd()*3,.45+rnd()*1.6)
      if(i%9===0){c.strokeStyle='rgba(86,70,42,.43)';c.beginPath();c.moveTo(x,y);c.lineTo(x+5*rnd(),y+4*rnd());c.stroke()}
    }
  });cover.wrapS=cover.wrapT=RepeatWrapping
  const mesh=new Mesh(g,new MeshLambertMaterial({vertexColors:true,map:cover}));mesh.receiveShadow=true;return mesh
}
function creek(){
  const verts:number[]=[],colors:number[]=[],idx:number[]=[],a=new Color('#607e76'),b=new Color('#a5afa0')
  for(let i=0;i<=240;i++){
    const z=-60+i*.5
    for(let j=0;j<5;j++){
      const x=riverX(z)+(j/2-1)*(channelWidth(z)+.22)
      verts.push(x,-.22,z)
      const col=a.clone().lerp(b,.24+.21*Math.sin(z*.61+j*.77));colors.push(col.r,col.g,col.b)
    }
    if(i<240)for(let j=0;j<4;j++){const n=i*5+j;idx.push(n,n+5,n+1,n+1,n+5,n+6)}
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(verts,3));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setIndex(idx)
  const time={value:0},mat=new MeshBasicMaterial({vertexColors:true})
  mat.onBeforeCompile=s=>{
    s.uniforms.uStreamTime=time
    s.vertexShader='varying vec2 vRiver;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRiver=position.xz;')
    s.fragmentShader='varying vec2 vRiver;uniform float uStreamTime;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat wav=sin(vRiver.y*17.0+sin(vRiver.x*3.4+vRiver.y*1.5)*3.0-uStreamTime*1.05);float fleck=smoothstep(.84,1.0,wav)*smoothstep(.3,.92,sin(vRiver.x*7.2+vRiver.y*.9));diffuseColor.rgb*=.87+.085*wav; diffuseColor.rgb+=vec3(.20,.17,.09)*fleck;')
  }
  return {mesh:new Mesh(g,mat),time}
}

type Card={x:number;y:number;z:number;w:number;h:number;turn:number;tint:number}
type Plant='fir'|'crown'|'fern'|'flowers'|'meadow'
function foliageMap(type:Plant,seed:number){
  const rnd=seeded(seed)
  const w=type==='fir'?384:256,h=type==='fir'?768:256
  return canvasTexture(w,h,c=>{
    function line(x:number,y:number,ex:number,ey:number,color:string,width:number){
      c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.strokeStyle=color;c.lineWidth=width;c.stroke()
    }
    function leaf(x:number,y:number,rx:number,ry:number,a:number,col:string){
      c.beginPath();c.ellipse(x,y,rx,ry,a,0,Math.PI*2);c.fillStyle=col;c.fill()
    }
    if(type==='fir'){
      line(192,765,195,15,'#675542',7)
      // Layered whorls have drooping branchlets and uneven tips.
      for(let level=0;level<91;level++){
        const t=level/91,y=666-t*638,spread=(156*Math.pow(1-t,.72)+3)*(.78+rnd()*.28)
        for(const sign of [-1,1]){
          const len=spread*(.72+rnd()*.32),tipY=y+len*(.14+rnd()*.30)
          line(193,y,193+sign*len,tipY,'#58593e',1.7)
          for(let j=0;j<37;j++){
            const u=j/37,px=193+sign*u*len,py=y+(tipY-y)*u
            const sub=(1-u*.71)*(.6+rnd()*.9)*(4+14*(1-t))
            for(let n=0;n<4;n++){
              const ex=px+sign*(sub*.5+rnd()*9),ey=py+sub*(.6+rnd())-rnd()*10
              line(px,py,ex,ey,['#494e38','#5d6248','#767957','#8a8964','#555d43'][Math.floor(rnd()*5)],1.6+rnd()*1.8)
            }
          }
        }
      }
    }else if(type==='crown'){
      for(let i=0;i<3200;i++){
        const a=rnd()*Math.PI*2,rr=Math.sqrt(rnd()),x=Math.cos(a)*rr,y=Math.sin(a)*rr
        if(rr>.70+.17*Math.sin(5*a)+.11*Math.cos(3*a)+rnd()*.14)continue
        leaf(128+x*115,128+y*110,2+rnd()*4,1.4+rnd()*2.7,rnd()*6,['#686645','#747c50','#838659','#969363','#586244'][Math.floor(rnd()*5)])
      }
    }else if(type==='fern'){
      for(let j=0;j<15;j++){
        const a=(j/14)*2.76-1.38,len=80+rnd()*140
        let lastX=128,lastY=250
        for(let i=1;i<=23;i++){
          const t=i/23, x=128+Math.sin(a)*len*t*.72,y=250-Math.cos(a*.68)*len*t+60*t*t
          line(lastX,lastY,x,y,'#98945e',1.8)
          const s=Math.sin(Math.PI*t)*9+.7
          for(const sign of [-1,1])leaf(x+sign*s*.75,y+2,s*1.34,1.7+t,-sign*.52+a*.16,j%3?'#78864e':'#969f61')
          lastX=x;lastY=y
        }
      }
    }else{
      for(let i=0;i<55;i++){
        const x=32+rnd()*192, top=39+rnd()*133+Math.abs(x-128)*.57,ex=x+(x-128)*.22+(rnd()-.5)*48
        c.beginPath();c.moveTo(128+(x-128)*.40,255);c.quadraticCurveTo(x,top+30,ex,top);c.quadraticCurveTo(x+8,top+44,129+(x-128)*.42,255);c.fillStyle=['#848653','#8b9358','#636e44'][i%3];c.fill()
        if(type==='flowers'&&i%7===0){for(let n=0;n<6;n++){const a=n*Math.PI/3;leaf(ex+Math.cos(a)*6,top+Math.sin(a)*6,6,3.7,a,i%3?'#fff0ce':'#e3bdce')}leaf(ex,top,2.5,2.5,0,'#cba14c')}
      }
    }
  })
}
function cards(type:Plant,items:Card[],seed:number){
  const map=foliageMap(type,seed), mat=new MeshLambertMaterial({map,alphaTest:.40,side:DoubleSide,depthWrite:true})
  const mesh=new InstancedMesh(new PlaneGeometry(),mat,items.length),obj=new Object3D()
  items.forEach((v,i)=>{
    obj.position.set(v.x,v.y+v.h/2,v.z);obj.rotation.set(0,v.turn,0);obj.scale.set(v.w,v.h,1);obj.updateMatrix()
    mesh.setMatrixAt(i,obj.matrix);mesh.setColorAt(i,new Color().setScalar(v.tint))
  })
  mesh.castShadow=type==='fir'||type==='crown';mesh.receiveShadow=!mesh.castShadow;return mesh
}

export function woodland(){
  const k=new Kit(),r=seeded(781),group=new Group(), creekPart=creek()
  group.add(terrain(),creekPart.mesh)
  const firs:Card[]=[], crowns:Card[]=[], ferns:Card[]=[], flowers:Card[]=[],meadow:Card[]=[]
  function plant(list:Card[],x:number,y:number,z:number,w:number,h:number,count=2){
    const start=r()*Math.PI,tint=.72+r()*.31
    for(let n=0;n<count;n++)list.push({x,y,z,w,h,turn:start+n*Math.PI/count,tint})
  }
  for(let ring=0;ring<4;ring++){
    const n=38+ring*14
    for(let i=0;i<n;i++){
      const a=(i+r()*.55)/n*Math.PI*2,rad=18+ring*7+r()*3
      const x=Math.sin(a)*rad,z=Math.cos(a)*rad
      if(z>11&&z<32&&Math.abs(x)<11)continue
      const h=9+r()*7
      plant(firs,x,ground(x,z),z,h*(.44+r()*.13),h,3)
    }
  }
  for(const [x,z,h] of [[-5.8,-5.3,11],[3.0,-7,12],[10,-4,11],[-11,1,11],[11.5,3,10],[-4,-10,14]])plant(firs,x,ground(x,z),z,h*.50,h,3)
  function oak(x:number,z:number,h:number){
    const y=ground(x,z),fork:Point=[x+.15,y+h*.47,z]
    k.beam([x,y,z],fork,h*.072,h*.067,'#534834',true)
    for(let j=0;j<7;j++){
      const a=j*2.4,rad=h*(.15+r()*.12)
      const end:Point=[x+Math.cos(a)*rad,y+h*(.67+r()*.18),z+Math.sin(a)*rad]
      k.beam(fork,end,h*.032,h*.030,'#64513c',true)
      for(let q=0;q<4;q++){const xx=end[0]+(r()-.5)*h*.22,zz=end[2]+(r()-.5)*h*.22
        plant(crowns,xx,end[1]-h*.12+r()*h*.14,zz,h*.42,h*.35,3)}
    }
  }
  for(const [x,z,h] of [[-9,7,12.5],[10,8,13],[-5,-7,10],[10,-6,10],[-13,-1,12],[14,0,12],[-13,15,13],[13,19,14],[-8,27,14],[7,32,12]])oak(x,z,h)
  for(let i=0;i<2100;i++){
    const x=(r()-.5)*40,z=r()*37-15,edge=Math.abs(x-riverX(z))-channelWidth(z)
    if(edge<.18 || (Math.abs(x)<3.55&&z>-2.7&&z<4.5) || (x>3.02&&x<9.2&&z>-3.1&&z<2.8) || (z>4.2&&Math.abs(x-trailX(z))<.88) || (x>1.0&&x<7.1&&z>4.8&&z<11.7) || (Math.hypot(x+4.7,z-3.1)<1.55) || (Math.abs(z-4.1)<.85 && x<-5.6&&x>-10.8))continue
    const h=.14+r()*.48, type=i%9===0?flowers:i%5===0?ferns:meadow
    plant(type,x,ground(x,z)-.015,z,h*(type===ferns?1.85:1.3),h,2)
    if(i%21===0)k.put('rock',[x,ground(x,z)+.04,z],[.26+r()*.4,.20+r()*.18,.4],'#8a8875',[0,r()*6,0])
  }
  for(let i=0;i<40;i++){
    const z=4.6+i*.49,x=trailX(z)
    k.put('rock',[x+(r()-.5)*.19,ground(x,z)+.047,z],[.77+r()*.36,.15,.49+r()*.20],i%3?'#ac9e7f':'#9c947e',[0,r()*.7,0])
  }
  // Single flattened log spanning both banks; the walking surface is continuous.
  const cz=4.1,cx=riverX(cz)
  k.beam([cx-2.06,.16,cz],[cx+2.06,.16,cz],.68,.68,'#7e6244',true)
  k.box([cx,.51,cz],[4.08,.075,.48],'#9c7b51')
  for(const side of [-1,1]){
    k.put('rock',[cx+side*1.90,.12,cz],[.85,.45,1.05],'#918976')
    for(let j=0;j<2;j++){const x=cx+side*(2.27+j*.35);k.put('rock',[x,ground(x,cz)+.10+(1-j)*.10,cz],[.66,.24+(1-j)*.17,.77],'#9f9880')}
  }
  for(const side of [-1,1])for(let i=0;i<58;i++){
    const z=-17+r()*37,x=riverX(z)+side*(channelWidth(z)+r()*.25)
    k.put('rock',[x,ground(x,z)+.07,z],[.17+r()*.56,.18+r()*.27,.19+r()*.63],'#93907c',[0,r()*6,0])
  }
  // Clusters follow the path and banks, leaving an open strip for walking.
  for(const [x,z,spread] of [[-3.50,6.60,.65],[-5.35,8.70,.63],[-3.80,10.0,.78],[.65,8.4,.48],[.0,11.9,.78],[7.19,7.25,.52],[7.39,11.4,.62],[-2.55,3.92,.30]]){
    for(let i=0;i<15;i++){
      const xx=x+(r()-.5)*spread*2,zz=z+(r()-.5)*spread*2,h=.37+r()*.32
      if(Math.abs(xx-trailX(zz))<.82)continue
      plant(i%3?flowers:ferns,xx,ground(xx,zz)-.01,zz,h*(i%3?1.0:2.05),h,2)
    }
  }
  for(const [x,z] of [[-3.62,5],[3.54,3.3],[-6.1,3.6]]){
    k.box([x,.72,z],[.095,1.44,.095],'#66503a')
    k.box([x,1.41,z],[.33,.06,.33],'#423e31')
    k.put('box',[x,1.61,z],[.205,.33,.205],'#ffe6a3',[0,0,0],'house')
    k.put('cone',[x,1.86,z],[.44,.24,.44],'#494a3e')
    for(const dx of [-.11,.11])for(const dz of [-.11,.11])k.box([x+dx,1.61,z+dz],[.026,.36,.026],'#4a4032')
  }
  // Six distinct crop beds flank the open path.
  for(let col=0;col<2;col++)for(let row=0;row<3;row++){
    const x=2.42+col*2.53,z=5.60+row*2.12
    k.box([x,.09,z],[1.86,.18,1.59],'#524435',[0,0,0],'rough')
    for(const sign of [-1,1]){k.box([x+sign*.98,.15,z],[.085,.3,1.80],'#9e7854');k.box([x,.15,z+sign*.85],[2.04,.30,.08],'#977452')}
    for(let i=0;i<4;i++)for(let j=0;j<3;j++){
      const xx=x-.67+i*.43,zz=z-.48+j*.49
      for(let q=0;q<5;q++){const a=q*1.257;k.put('leaf',[xx+Math.sin(a)*.115,.30,zz+Math.cos(a)*.115],[.16,.40,.075],row===0?'#8d9557':'#6e8652',[Math.cos(a)*.58,a,Math.sin(a)*.58])}
      if(col===1&&row!==1)k.put('ball',[xx,.30,zz],[.19,.19,.19],row===2?'#c68b42':'#a84e36')
    }
  }
  const wx=-4.68,wz=3.08
  for(let row=0;row<4;row++)for(let n=0;n<13;n++){
    const a=(n+row%2*.5)*2*Math.PI/13
    k.box([wx+Math.sin(a)*.69,row*.22+.11,wz+Math.cos(a)*.69],[.36,.207,.26],row%2?'#a0987f':'#888472',[0,a,0],'rough')
  }
  k.put('post',[wx,.25,wz],[1.12,.03,1.12],'#35453e')
  for(const dx of [-.89,.89])k.box([wx+dx,1.14,wz],[.14,2.28,.15],'#76563b')
  k.beam([wx-.91,1.42,wz],[wx+.91,1.42,wz],.12,.12,'#6c503a',true)
  k.beam([wx,1.40,wz],[wx,.69,wz],.026,.026,'#ad9465',true)
  for(const s of [-1,1])k.box([wx,2.37,wz+s*.40],[2.45,.13,.98],'#676753',[s*.38,0,0])
  k.put('pot',[wx+.91,.20,wz+.48],[.43,.39,.43],'#827b66');k.put('ring',[wx+.91,.45,wz+.48],[.42,.42,.38],'#635e50')
  k.finish();group.add(k.root)
  const trees=new Group();trees.add(cards('fir',firs,132),cards('crown',crowns,231));group.add(trees)
  group.add(cards('fern',ferns,53),cards('flowers',flowers,64),cards('meadow',meadow,83))
  return {group,trees,time:creekPart.time}
}
