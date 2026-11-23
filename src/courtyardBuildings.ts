import { Kit, range } from './courtyardMesh'
import type { Point } from './atlas'

const oak='#56402f', dark='#3d2c25', honey='#986f47',iron='#414540',plaster='#e2c9a4'
const slates=['#505246','#5e5c4b','#66614e','#494d43','#756b54']
export const houseOrigin:Point=[0,0,0]
export const pavilionOrigin:Point=[6.05,0,.55]
export const porchLight:Point=[-1.88,2.16,2.56]
export const tableLight:Point=[-.64,1.68,0]
function tiles(k:Kit,x:number,eave:number,z:number,w:number,d:number,rise:number){
  const slope=Math.atan2(rise,w/2), length=Math.hypot(w/2,rise)
  const rows=Math.ceil(length/.38),cols=Math.ceil(d/.46)
  for(const side of [-1,1]){
    const rot:Point=[0,0,-side*slope]
    k.box([x+side*w/4,eave+rise/2,z],[length,.16,d],dark,rot)
    for(const row of range(rows)){
      const u=(row+.5)/rows
      for(const col of range(cols+1)){
        const start=Math.max(0,col-(row%2)*.5),end=Math.min(cols,col+1-(row%2)*.5)
        if(end<=start)continue
        k.box([x+side*u*w/2,eave+(1-u)*rise+.095,z-d/2+(start+end)*d/(cols*2)],[length/rows+.07,.085,(end-start)*d/cols-.012],slates[Math.floor(k.rnd()*slates.length)],rot,'rough')
      }
    }
    for(const front of [-1,1])k.beam([x,eave+rise,z+front*d/2],[x+side*w/2,eave,z+front*d/2],.14,.17,honey)
    k.beam([x+side*w/2,eave-.08,z-d/2],[x+side*w/2,eave-.08,z+d/2],.13,.13,iron,true)
  }
  k.box([x,eave+rise+.12,z],[.17,.13,d+.08],'#726a56')
}
function masonry(k:Kit,x:number,z:number,w:number,d:number,h:number){
  k.box([x,h/2,z],[w-.06,h,d-.06],'#776f5d',[0,0,0],'rough')
  for(const row of [0,1])for(const side of [-1,1]){
    for(const j of range(10))k.box([x-w/2+(j+.5)*w/10,h*(row+.5)/2,z+side*d/2],[w/10-.025,h/2-.018,.1],['#88816d','#a09a80','#716f5f'][(row+j)%3],[0,0,0],'rough')
    for(const j of range(7))k.box([x+side*w/2,h*(row+.5)/2,z-d/2+(j+.5)*d/7],[.1,h/2-.018,d/7-.02],'#8e8773',[0,0,0],'rough')
  }
}
function frontWindow(k:Kit,x:number,y:number,z:number,w:number,h:number){
  const face=z < -2 ? -1 : 1
  k.box([x,y,z],[w+.20,h+.19,.14],dark)
  k.box([x,y,z+face*.083],[w,h,.055],'#fff4de',[0,0,0],'house')
  for(const dx of [-1,0,1])k.box([x+dx*w/2,y,z+face*.13],[.061,h+.11,.09],oak)
  for(const dy of [-1,0,1])k.box([x,y+dy*h/2,z+face*.13],[w+.09,.058,.09],oak)
  k.box([x,y-h/2-.10,z+face*.12],[w+.38,.11,.33],honey)
}
function propPot(k:Kit,x:number,y:number,z:number,s:number){
  k.put('pot',[x,y+s*.37,z],[s,s*.74,s],'#a65f44')
  k.put('post',[x,y+s*.745,z],[s*1.04,s*.13,s*1.04],'#ae7559')
  for(let i=0;i<9;i++){const a=i*2.4;k.put('leaf',[x+Math.sin(a)*s*.25,y+s*(1+.05*(i%3)),z+Math.cos(a)*s*.25],[s*.27,s*.68,s*.25],i%2?'#61703d':'#79884c',[.46*Math.cos(a),a,.46*Math.sin(a)])}
}
function barrel(k:Kit,x:number,z:number,s:number){
  k.put('post',[x,.52*s,z],[.81*s,1.04*s,.81*s],honey)
  for(const y of [.13,.84,1.02])k.put('post',[x,y*s,z],[.84*s,.065*s,.84*s],iron)
  k.put('post',[x,1.045*s,z],[.72*s,.03*s,.72*s],'#816044')
}
export function cottage(){
  const k=new Kit()
  masonry(k,0,0,5.24,4.30,.58)
  k.box([0,1.82,0],[5.1,2.48,4.12],plaster,[0,0,0],'rough')
  k.put('gable',[0,3.97,0],[5.12,1.84,4.12],plaster)
  for(const side of [-1,1]){
    for(const x of [-2.49,-.94,.35,2.49])k.box([x,1.80,side*2.10],[.16,2.49,.15],oak)
    for(const y of [.67,2.96])k.box([0,y,side*2.11],[5.2,.15,.16],oak)
    k.beam([-2.46,3.04,side*2.12],[0,4.88,side*2.12],.12,.13,oak)
    k.beam([2.46,3.04,side*2.12],[0,4.88,side*2.12],.12,.13,oak)
    k.box([0,3.92,side*2.12],[.12,1.82,.13],oak)
    for(const z of [-1.97,.0,1.97])k.box([side*2.56,1.83,z],[.14,2.47,.15],oak)
    for(const y of [.67,2.96])k.box([side*2.56,y,0],[.14,.16,4.15],oak)
    k.box([side*2.61,1.87,.38],[.10,1.14,1.33],dark)
    k.box([side*2.67,1.87,.38],[.035,.96,1.14],'#ffe4bd',[0,0,0],'house')
    k.box([side*2.70,1.87,.38],[.05,1.02,.07],oak)
    k.box([side*2.70,1.87,.38],[.05,.07,1.17],oak)
    for(let i=0;i<9;i++)k.box([side*2.73,2.92,-2.05+i*.51],[.54,.11,.105],honey)
  }
  tiles(k,0,2.97,0,5.98,5.03,2.14)
  frontWindow(k,.77,1.85,-2.31,1.02,1.05)
  k.beam([2.98,2.89,-2.18],[2.71,2.58,-2.18],.095,.095,iron,true)
  k.beam([2.71,2.58,-2.18],[2.71,.20,-2.18],.095,.095,iron,true)
  k.box([-1.42,4.57,-1.03],[.68,1.79,.73],'#827363',[0,0,0],'rough')
  for(let i=0;i<7;i++)k.box([-1.42,3.87+i*.24,-1.03],[.70,.029,.75],'#b19f83',[0,0,0],'rough')
  k.box([-1.42,5.50,-1.03],[.88,.17,.93],'#534e45')
  // A projecting dormer cuts into the right slope and has its own little tiled roof.
  k.box([1.41,4.14,-.88],[1.08,.99,1.16],plaster)
  k.put('gable',[1.41,4.87,-.88],[1.09,.48,1.16],plaster)
  tiles(k,1.41,4.65,-.88,1.48,1.50,.59)
  frontWindow(k,1.41,4.28,-.267,.64,.63)
  frontWindow(k,1.21,1.83,2.13,1.19,1.15)
  k.box([-.98,1.56,2.16],[1.25,2.04,.18],dark)
  for(let i=0;i<6;i++)k.box([-1.43+i*.181,1.56,2.28],[.17,1.92,.07],i%2?honey:'#835f40')
  frontWindow(k,-.98,1.93,2.36,.53,.49)
  k.put('ball',[-.58,1.42,2.36],[.094,.094,.094],'#d8ad69')
  k.put('post',[0,3.91,2.16],[.60,.12,.60],oak,[Math.PI/2,0,0])
  k.put('post',[0,3.91,2.235],[.47,.055,.47],'#ffe5ba',[Math.PI/2,0,0],'house')
  k.box([0,3.91,2.28],[.045,.45,.06],dark);k.box([0,3.91,2.28],[.46,.045,.06],dark)
  masonry(k,0,2.87,5.62,1.57,.46)
  for(let i=0;i<18;i++)k.box([-2.68+i*.315,.50,2.87],[.30,.08,1.58],honey)
  for(const x of [-2.61,.08,2.61]){
    k.box([x,1.58,3.47],[.16,2.10,.16],oak)
    for(const dir of [-1,1])if(Math.abs(x+dir*.53)<2.72)k.beam([x,2.08,3.47],[x+dir*.53,2.60,3.47],.09,.10,oak)
  }
  k.box([0,2.65,3.47],[5.47,.17,.19],oak)
  k.box([0,2.83,2.87],[5.79,.17,1.91],'#4f5145',[.21,0,0])
  for(let i=0;i<14;i++)k.box([-2.76+i*.425,2.89,2.87],[.39,.10,1.89],slates[i%5],[.21,0,0],'rough')
  for(const y of [.72,1.39])k.beam([.08,y,3.47],[2.61,y,3.47],.09,.09,oak)
  for(let i=1;i<11;i++)k.box([.08+i*.23,1.05,3.47],[.048,.67,.06],oak)
  for(const x of [-2.61,2.61])for(const y of [.73,1.39])k.beam([x,y,2.10],[x,y,3.47],.08,.08,oak)
  for(let i=0;i<3;i++)k.box([-.98,.075*(i+1),4.36-i*.29],[1.74,.15*(i+1),.39],'#a79b81',[0,0,0],'rough')
  const [lx,ly,lz]=porchLight
  k.beam([lx,ly+.32,2.17],[lx,ly+.32,lz],.06,.06,iron)
  k.put('cone',[lx,ly+.23,lz],[.41,.19,.41],iron);k.put('box',[lx,ly,lz],[.22,.29,.22],'#ffe3aa',[0,0,0],'house')
  for(const dx of [-.12,.12])for(const dz of [-.12,.12])k.box([lx+dx,ly,lz+dz],[.025,.31,.025],iron)
  k.box([lx,ly-.18,lz],[.32,.06,.32],iron)
  barrel(k,-3.06,.93,.85);propPot(k,1.98,.53,3.03,.40)
  for(let r=0;r<3;r++)for(let i=0;i<5-r;i++)k.beam([-2.74,.14+r*.235,-1.61+i*.26+r*.13],[-3.50,.14+r*.235,-1.61+i*.26+r*.13],.27,.27,'#846340',true)
  k.finish();return k
}

export function pavilion(){
  const k=new Kit(), floor=.22, px=2.00,pz=1.63,beamY=2.90
  k.box([0,.10,0],[4.48,.20,3.74],'#8d8270',[0,0,0],'rough')
  for(let i=0;i<7;i++)for(let j=0;j<5;j++)k.box([(i-3)*.63,.206,(j-2)*.73],[.61,.028,.71],['#b2a38c','#bcaf98','#a49d89'][(i+j)%3],[0,0,0],'rough')
  for(const x of [-px,px])for(const z of [-pz,pz]){
    k.box([x,.32,z],[.37,.20,.37],'#8a8170',[0,0,0],'rough')
    k.box([x,(.42+beamY)/2,z],[.20,beamY-.42,.20],oak)
    k.beam([x,beamY-.68,z],[x-Math.sign(x)*.68,beamY,z],.13,.13,honey)
    k.beam([x,beamY-.68,z],[x,beamY,z-Math.sign(z)*.68],.13,.13,honey)
  }
  for(const x of [-px,px]){
    k.beam([x,beamY,-pz],[x,beamY,pz],.17,.20,oak)
    for(const y of [.52,1.0])k.beam([x,y,-pz],[x,y,pz],.08,.10,honey)
    k.box([x,.66,0],[.12,.88,.12],oak)
    for(let j=1;j<10;j++)k.box([x,.76,-pz+j*.326],[.047,.49,.05],oak)
  }
  for(const z of [-pz,pz]){
    k.beam([-px,beamY,z],[px,beamY,z],.18,.20,oak)
    k.beam([-px,beamY,z],[0,3.78,z],.13,.14,honey)
    k.beam([px,beamY,z],[0,3.78,z],.13,.14,honey)
  }
  tiles(k,0,2.93,0,4.65,3.94,1.0)
  function furniture(x:number,z:number,w:number,d:number,height:number){
    for(const sx of [-1,1])for(const sz of [-1,1])k.box([x+sx*(w/2-.14),floor+(height-.09)/2,z+sz*(d/2-.075)],[.10,height-.09,.10],oak)
    k.box([x,floor+height-.045,z],[w,.09,d],honey)
  }
  furniture(0,0,2.72,.87,.85)
  for(const z of [-.87,.87])furniture(0,z,2.79,.34,.45)
  const top=floor+.85
  k.box([.20,top+.012,0],[.54,.024,.90],'#bfb49a')
  for(const z of [-.448,.448])k.box([.20,top-.10,z],[.54,.215,.023],'#bcac8b')
  k.put('pot',[.68,top+.12,-.04],[.26,.24,.26],'#b8b9a1')
  k.put('ball',[.68,top+.25,-.04],[.20,.07,.20],'#d3cdb4')
  k.beam([.79,top+.13,-.04],[.92,top+.24,-.04],.069,.069,'#c2bfa7',true)
  k.put('ring',[.52,top+.15,-.04],[.18,.20,.16],'#9e9e83')
  for(const x of [.31,.99]){k.put('pot',[x,top+.06,.22],[.145,.11,.145],'#e0d8ba');k.put('post',[x,top+.119,.22],[.109,.009,.109],'#664c32')}
  k.put('pot',[.06,top+.046,-.18],[.42,.09,.38],'#8d7250')
  for(const [x,z] of [[-.07,-.15],[.07,-.22],[.14,-.10]])k.put('ball',[x,top+.12,z],[.14,.14,.14],'#bc6c36')
  k.put('pot',[1.11,top+.13,-.18],[.16,.26,.16],'#687d6e')
  for(let i=0;i<4;i++){const x=1.11+(i-1.5)*.054;k.beam([1.11,top+.23,-.18],[x,top+.44+i*.025,-.18],.014,.014,'#687347');k.put('ball',[x,top+.45+i*.025,-.18],[.10,.076,.10],'#d6bf98')}
  const [lx,,lz]=tableLight
  k.put('pot',[lx,top+.095,lz],[.32,.19,.32],iron)
  k.put('ball',[lx,top+.28,lz],[.29,.36,.29],'#ffffff',[0,0,0],'glass')
  k.put('post',[lx,top+.20,lz],[.04,.095,.04],'#423429')
  k.put('ball',[lx,top+.27,lz],[.08,.16,.08],'#fff6b6',[0,0,0],'oil')
  k.put('cone',[lx,top+.49,lz],[.28,.14,.28],iron)
  k.put('ring',[lx,top+.53,lz],[.32,.37,.28],iron)
  for(const side of [-1,1]){
    const x=side*2.61
    k.box([x,.24,0],[.49,.48,2.46],honey)
    k.box([x,.485,0],[.39,.035,2.32],'#4d4032')
    for(let j=0;j<9;j++)propPot(k,x,.5,-1+j*.25,.18)
  }
  const wx=.90,wz=-2.74
  for(const dx of [-.76,.76])for(const dz of [-.23,.23])k.box([wx+dx,.44,wz+dz],[.09,.88,.09],oak)
  k.box([wx,.91,wz],[1.78,.09,.65],honey)
  for(let i=0;i<3;i++)propPot(k,wx-.6+i*.29,.955,wz,.20)
  for(let i=0;i<2;i++)k.box([wx+.42+i*.17,1.08,wz],[.13,.24,.06],'#cdb285',[.23,0,0])
  for(const x of [2.18,2.54])k.beam([x,.20,-2.55],[x,1.27,-2.92],.045,.045,honey,true)
  k.put('rock',[2.18,.15,-2.54],[.21,.29,.09],iron)
  k.box([2.54,.19,-2.55],[.31,.053,.07],iron)
  for(let i=0;i<5;i++)k.box([2.42+i*.06,.10,-2.54],[.022,.16,.035],iron)
  k.put('pot',[-.73,.23,-2.71],[.4,.46,.4],'#839182')
  k.beam([-.59,.20,-2.71],[-.36,.43,-2.71],.10,.10,'#899688',true)
  k.put('ring',[-.96,.38,-2.71],[.29,.33,.23],'#879185')
  k.finish();return k
}
