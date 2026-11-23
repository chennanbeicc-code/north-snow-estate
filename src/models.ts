import type { Point } from './atlas'

export type Shape = 'box'|'pine'|'stone'|'disc'|'grass'|'gable'|'ball'
export type Piece = { shape:Shape; p:Point; s:Point; color:string; r:Point }
function model() {
  const parts:Piece[]=[]
  function add(shape:Shape,x:number,y:number,z:number,w:number,h:number,d:number,color:string,rx=0,ry=0,rz=0){
    parts.push({shape,p:[x,y,z],s:[w,h,d],color,r:[rx,ry,rz]})
  }
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,rx=0,ry=0,rz=0){
    add('box',x,y,z,w,h,d,color,rx,ry,rz)
  }
  return {parts,add,box}
}
function random(seed:number){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}}
const woods=['#794d35','#82543a','#885a3d','#6e4936','#8b5c40']
const select=(list:string[],n:number)=>list[Math.floor(n*list.length)]

export function bedroom(){
  const m=model(),{box,add}=m, rng=random(72)
  for(let i=0;i<23;i++)box(-4.30+i*.39,.04,0,.376,.12,6.14,select(woods,rng()))
  for(let i=0;i<18;i++){
    box(0,.21+i*.224,-3,8.94,.217,.16,select(['#88684e','#896a50','#8e7054'],rng()))
    box(-4.43,.21+i*.224,0,.17,.217,6.11,'#78583f')
  }
  box(0,3.94,-2.88,9,.22,.22,'#49382e')
  for(const x of [-4.25,-1.51,.5,4.2])box(x,2.02,-2.86,.16,3.84,.22,'#624a35')
  box(-.58,2.50,-2.76,1.67,1.65,.13,'#4f382d')
  box(-.58,2.50,-2.66,1.46,1.45,.06,'#799a9b')
  for(const y of [2.18,2.85])box(-.58,y,-2.60,1.46,.055,.08,'#a38c69')
  box(-.58,2.5,-2.60,.07,1.45,.08,'#a38c69')
  for (const x of [-1.42,.26])box(x,2.49,-2.52,.24,1.78,.17,'#8c8d70')
  box(-1.86,.45,.26,1.72,.46,3.12,'#614937')
  box(-1.86,.79,.26,1.76,.28,3.12,'#dbccad')
  box(-1.86,.96,-.83,1.29,.19,.62,'#ede0c4',-.08)
  box(-1.86,.99,.87,1.77,.18,1.79,'#668078')
  box(-1.86,1.09,.14,1.78,.07,.26,'#aab09a')
  box(-1.86,.96,-1.38,1.86,1.25,.15,'#956d4d')
  box(-3.04,.49,1.15,.86,.88,.85,'#95734f')
  box(-3.04,.99,1.15,.49,.075,.38,'#d5bc82',0,.19)
  box(-3.02,1.04,1.15,.45,.035,.35,'#9a5040',0,.19)
  box(-3.01,1.62,-2.55,1.74,2.99,.49,'#523d30')
  const books=['#8d5546','#78785c','#8f805e','#a99a75','#607674']
  for(let shelf=0;shelf<4;shelf++){
    const base=.43+shelf*.69
    box(-3,base,-2.32,1.84,.105,.58,'#a27b54')
    for(let i=0;i<8;i++){const h=.30+rng()*.24;box(-3.7+i*.18,base+.06+h/2,-2.26,.12+rng()*.045,h,.31,select(books,rng()),0,0,i===7?-.1:0)}
  }
  box(1.54,1.12,-1.63,2.66,.16,1.04,'#bd9369')
  for(const x of [.39,2.69])for(const z of [-1.21,-2.03])box(x,.57,z,.13,1.06,.14,'#674d39')
  box(1.47,1.38,-1.88,.13,.45,.14,'#54493e')
  box(1.47,1.85,-1.88,1.14,.76,.12,'#302e29')
  box(1.47,1.85,-1.803,.98,.60,.03,'#93b3a5')
  for(let i=0;i<3;i++)box(1.30,1.98-i*.10,-1.778,.45-i*.07,.026,.012,'#516c62')
  box(1.45,1.24,-1.36,.65,.05,.24,'#5a5650')
  box(.61,1.46,-1.88,.07,.51,.07,'#856a44')
  add('pine',.61,1.78,-1.88,.53,.37,.53,'#ffe2a2')
  box(1.64,.60,-.45,.67,.13,.66,'#987b56')
  for(const x of [1.38,1.90])for(const z of [-.68,-.21])box(x,.32,z,.075,.61,.075,'#664f39')
  box(1.64,.98,-.17,.65,.61,.09,'#a08460')
  box(3.23,2.55,-2.73,1.27,1.18,.14,'#644b37');box(3.23,2.55,-2.63,1.12,1.03,.08,'#b28d63')
  for(let i=0;i<3;i++)box(2.93+i*.26,2.53+i%2*.17,-2.567,.25,.36,.03,'#edddab',0,0,(i-1)*.15)
  box(.69,.12,.93,3.05,.03,1.80,'#9e6a52')
  for(let i=0;i<6;i++)box(.69,.142,.21+i*.29,2.91,.013,.04,'#d1ad83')
  return m.parts
}
