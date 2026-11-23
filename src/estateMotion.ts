type Point = readonly [number, number]
type Course = { points: Point[]; speed: number; bearing: number }

// The water plane is foreshortened in the photograph. Measure distances and turns
// on that plane, then project them back into the source image.
const depthScale = .42
const courses: Course[] = [
  {points:[[267,853],[307,858],[348,852],[328,843],[276,845],[245,848]],speed:10.4,bearing:.16},
  {points:[[418,886],[377,887],[351,882],[378,876],[431,872],[452,879]],speed:8.1,bearing:3.08},
  {points:[[538,845],[499,856],[472,855],[496,842],[548,827],[573,830]],speed:11.1,bearing:2.85},
  {points:[[651,834],[615,842],[593,835],[624,822],[683,812],[710,817],[687,827]],speed:9.2,bearing:2.84},
  {points:[[1304,786],[1275,792],[1253,788],[1276,778],[1329,766],[1356,771],[1333,780]],speed:6.8,bearing:2.88},
  {points:[[1431,786],[1397,792],[1368,786],[1391,771],[1444,762],[1457,771]],speed:8.3,bearing:2.92},
]
function catmull(a:number,b:number,c:number,d:number,t:number){
  return b+.5*t*((c-a)+t*((2*a-5*b+4*c-d)+t*(3*b-a-3*c+d)))
}
function sampleCourse({points}:Course){
  const samples:{x:number;y:number;s:number}[]=[]
  for(let i=0;i<=points.length*24;i++){
    const k=Math.floor(i/24),t=i%24/24
    const at=(offset:number)=>points[(k+offset+points.length)%points.length]
    const coord=(axis:0|1)=>catmull(at(-1)[axis],at(0)[axis],at(1)[axis],at(2)[axis],t)
    const x=coord(0),y=coord(1),prev=samples[i-1]
    samples.push({x,y,s:prev?prev.s+Math.hypot(x-prev.x,(y-prev.y)/depthScale):0})
  }
  return samples
}
const tracks=courses.map(sampleCourse)
const gust=(t:number)=>.49*Math.sin(.47*t+.8)+.32*Math.sin(.83*t-1.7)+.19*Math.sin(1.39*t+.2)
export function estateMotion(){
  let time=0,skyTravel=0
  const swimmers=courses.map(()=>({distance:0,stroke:0,segment:0}))
  const lamps=[{angle:0,velocity:0},{angle:0,velocity:0}]
  const pose=new Float32Array(24),strokes=new Float32Array(12),swing=new Float32Array(4)
  function update(delta:number){
    time+=delta
    skyTravel+=delta*(.90+.19*gust(time*.36))
    for(let i=0;i<swimmers.length;i++){
      const fish=swimmers[i],track=tracks[i],course=courses[i]
      const effort=.5+.5*Math.sin(time*(.69+.045*i)+i*2.18+.66*Math.sin(time*.33+i))
      fish.distance=(fish.distance+delta*course.speed*(.69+.75*effort))%track[track.length-1].s
      fish.stroke+=delta*(4.8+4.1*effort)
      if(track[fish.segment].s>fish.distance)fish.segment=0
      while(track[fish.segment+1].s<fish.distance)fish.segment++
      const a=track[fish.segment],b=track[fish.segment+1],u=(fish.distance-a.s)/(b.s-a.s)
      const c=track[(fish.segment+2)%(track.length-1)],prev=track[(fish.segment+track.length-2)%(track.length-1)]
      const dx=(b.x-prev.x)*(1-u)+(c.x-a.x)*u,dy=(b.y-prev.y)*(1-u)+(c.y-a.y)*u
      const turn=Math.atan2(dy/depthScale,dx)-Math.atan2(Math.sin(course.bearing)/depthScale,Math.cos(course.bearing))
      pose[4*i]=a.x+(b.x-a.x)*u;pose[4*i+1]=a.y+(b.y-a.y)*u
      pose[4*i+2]=Math.cos(turn);pose[4*i+3]=Math.sin(turn)
      strokes[2*i]=fish.stroke+i;strokes[2*i+1]=.38+1.58*effort
    }
    for(let i=0;i<lamps.length;i++){
      const lamp=lamps[i],stiffness=i?14.0:12.6
      const target=.043*gust(time-.7-i*.72)
      // Small integration steps keep the hanging weight stable after a slow frame.
      const steps=Math.max(1,Math.ceil(delta*90))
      for(let j=0;j<steps;j++){
        lamp.velocity+=((target-lamp.angle)*stiffness-lamp.velocity*1.31)*delta/steps
        lamp.angle+=lamp.velocity*delta/steps
      }
      swing[i*2]=lamp.angle;swing[i*2+1]=-.16*lamp.velocity+.005*gust(time-1-i)
    }
  }
  update(0)
  return {pose,strokes,swing,update,get time(){return time},get skyTravel(){return skyTravel}}
}

