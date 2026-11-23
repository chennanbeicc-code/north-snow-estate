precision highp float;
varying vec2 uv;
uniform sampler2D closedScene, openScene, masks, fishAtlas, restoration, mistDetail;
uniform float clockTime, business, skyTravel, detailStrength, inPavilion;
uniform sampler2D pavilionScene, nightScene;
uniform float nightMode, litHouse;
uniform vec4 fishPose[6], lanternSwing;
uniform vec2 fishStroke[6];
const vec2 size=vec2(1671.,941.);

vec2 photoUV(vec2 pixel){
  // A gentle reconstruction around texel centers, active only during magnification.
  vec2 sub=fract(pixel-.5);
  pixel+=detailStrength*(sub*sub*(3.-2.*sub)-sub);
  return clamp(pixel,vec2(.5),size-.5)/size;
}
vec4 scene(vec2 pixel){
  vec2 at=photoUV(pixel);
  vec4 day=vec4(0.);
  if(nightMode<1.){
    if(business<=0.)day=texture2D(closedScene,at);
    else if(business>=1.)day=texture2D(openScene,at);
    else day=mix(texture2D(closedScene,at),texture2D(openScene,at),business);
  }
  if(nightMode>0.){
    vec4 sampleColor=texture2D(nightScene,at);
    if(litHouse<.5 && pixel.x>201. && pixel.x<1081. && pixel.y>394. && pixel.y<645.){
      float warm=smoothstep(.10,.53,sampleColor.r-sampleColor.b);
      sampleColor.rgb*=mix(vec3(1.),vec3(.24,.27,.4),warm);
    }
    return mix(day,sampleColor,nightMode);
  }
  return day;
}
// Each atlas has one registered set of local cutouts for each supplied photograph.
vec4 states(sampler2D atlas,vec2 at){
  float operating=mix(business,1.,nightMode);
  if(operating<=0.)return texture2D(atlas,at);
  if(operating>=1.)return texture2D(atlas,at+vec2(0.,.5));
  return mix(texture2D(atlas,at),texture2D(atlas,at+vec2(0.,.5)),operating);
}
bool within(vec2 p,vec2 extent){return all(greaterThanEqual(p,vec2(0.)))&&all(lessThan(p,extent));}
vec2 rotated(vec2 p,float angle){
  float c=cos(angle),s=sin(angle);
  return vec2(c*p.x-s*p.y,s*p.x+c*p.y);
}
float wind(float t){return .49*sin(.47*t+.8)+.32*sin(.83*t-1.7)+.19*sin(1.39*t+.2);}
vec3 clouds(vec2 p,vec3 base,float coverage){
  // Overlap two downwind samples so the texture never reverses or snaps at a wrap.
  float distance=skyTravel*(.83+.31*(1.-smoothstep(48.,226.,p.y)));
  float phase=fract(distance/42.),other=fract(phase+.5);
  vec2 axis=vec2(1.,-.067);
  vec2 a=p-(phase-.5)*42.*axis,b=p-(other-.5)*42.*axis;
  float cross=.5+.5*cos(6.2831853*phase);
  vec3 moving=mix(scene(a).rgb,scene(b).rgb,cross);
  vec2 region=vec2(size.x,300.);
  vec3 low=texture2D(mistDetail,p/region).rgb;
  vec3 advected=mix(texture2D(mistDetail,a/region).rgb,texture2D(mistDetail,b/region).rgb,cross);
  // Only low-frequency mist varies over the ridges. Rock detail stays registered.
  vec3 result=mix(moving,base+(advected-low)*mix(1.,.24,nightMode),smoothstep(100.,202.,p.y));
  return mix(base,result,coverage);
}
vec2 current(vec2 p,float t){
  vec2 flow=vec2(-1.,.14);
  float along=dot(p,flow),across=dot(p,vec2(.14,1.));
  float stream=along*.072-t*1.26+1.6*sin(across*.096+along*.012);
  float ripple=along*.127+across*.16-t*1.93+.8*sin(across*.20);
  return vec2(.79*sin(stream)+.22*sin(ripple),.43*cos(stream*.83)+.30*sin(ripple));
}
void clearFish(inout vec3 rgb,vec2 p,vec2 origin,float index){
  vec2 local=p-origin+vec2(3.);
  if(!within(local,vec2(72.,40.)))return;
  vec4 repairPixel=states(restoration,(vec2(index*72.,187.)+local)/512.);
  repairPixel.rgb*=mix(vec3(1.),vec3(.46,.55,.66),nightMode);
  rgb=mix(rgb,repairPixel.rgb,smoothstep(.012,.80,repairPixel.a));
}
void swim(inout vec3 rgb,vec2 p,vec4 pose,vec2 stroke,float index,float head,float water){
  vec2 offset=p-pose.xy;
  if(abs(offset.x)>53.||abs(offset.y)>28.)return;
  offset.y/=.42;
  vec2 body=vec2(dot(offset,pose.zw),dot(offset,vec2(-pose.w,pose.z)));
  body.y*=.42;
  vec2 local=body+vec2(32.,16.);
  float along=clamp(.5-head*body.x/57.,0.,1.);
  local.y+=along*along*stroke.y*sin(stroke.x-4.2*along);
  if(!within(local,vec2(65.,32.)))return;
  vec4 fish=states(fishAtlas,(vec2(index*72.+3.,3.)+local)/vec2(432.,80.));
  fish.rgb*=mix(vec3(1.),vec3(.68,.69,.73),nightMode);
  rgb=mix(rgb,fish.rgb,fish.a*smoothstep(.06,.64,water));
}
void hangingLamp(inout vec3 rgb,vec2 p,vec2 origin,float index,vec2 swing){
  vec2 q=p-origin;
  if(!within(q,vec2(78.,164.)))return;
  vec2 atlasOrigin=vec2(index*84.+2.,2.);
  vec4 background=states(restoration,(atlasOrigin+q)/512.);
  background.rgb*=mix(vec3(1.),vec3(.40,.47,.58),nightMode);
  rgb=mix(rgb,background.rgb,smoothstep(.025,.88,background.a));
  vec2 hook=vec2(37.+index,1.);
  vec2 local=hook+rotated(q-hook,-swing.x);
  vec2 knot=vec2(hook.x,117.);
  if(local.y>knot.y)local=knot+rotated(local-knot,-swing.y);
  if(!within(local,vec2(78.,164.)))return;
  vec4 lamp=states(restoration,(atlasOrigin+vec2(168.,0.)+local)/512.);
  if(nightMode>0.)lamp.rgb=mix(lamp.rgb,texture2D(nightScene,photoUV(origin+local)).rgb,nightMode);
  rgb=mix(rgb,lamp.rgb,lamp.a);
}
void main(){
  vec2 p=uv*size;
  if(inPavilion>.5){
    // Only the exposed stream moves. The bridge, teaware and roof are fixed landmarks.
    vec2 pool=(p-vec2(520.,654.))/vec2(247.,30.);
    float water=1.-smoothstep(.70,1.,dot(pool,pool));
    if(clockTime>0.)p+=water*current(p,clockTime)*.64;
    gl_FragColor=texture2D(pavilionScene,photoUV(p));
    gl_FragColor.rgb*=mix(vec3(1.),vec3(.32,.44,.63),nightMode);
    return;
  }
  if(clockTime<=0.){gl_FragColor=scene(p);return;}
  vec3 weight=texture2D(masks,uv).rgb;
  vec3 rgb=scene(p).rgb;
  if(weight.r>.003)rgb=clouds(p,rgb,weight.r);
  if(weight.b>.003){
    // The blue field is zero on trunks and branch roots, largest at each tip.
    float breeze=wind(clockTime-p.x*.0013-p.y*.0005);
    float twig=.23*sin(2.63*clockTime+p.x*.034+p.y*.019);
    float bend=weight.b*(2.9*breeze+twig*(.3+abs(breeze)));
    rgb=scene(p+vec2(bend,bend*.38)).rgb;
  }
  if(p.y>736.){
    vec2 samplePoint=p+weight.g*current(p,clockTime);
    rgb=scene(samplePoint).rgb;
    clearFish(rgb,samplePoint,vec2(235.,837.),0.);
    clearFish(rgb,samplePoint,vec2(386.,870.),1.);
    clearFish(rgb,samplePoint,vec2(506.,829.),2.);
    clearFish(rgb,samplePoint,vec2(619.,818.),3.);
    clearFish(rgb,samplePoint,vec2(1272.,770.),4.);
    clearFish(rgb,samplePoint,vec2(1399.,770.),5.);
    swim(rgb,samplePoint,fishPose[0],fishStroke[0],0.,1.,weight.g);
    swim(rgb,samplePoint,fishPose[1],fishStroke[1],1.,-1.,weight.g);
    swim(rgb,samplePoint,fishPose[2],fishStroke[2],2.,-1.,weight.g);
    swim(rgb,samplePoint,fishPose[3],fishStroke[3],3.,-1.,weight.g);
    swim(rgb,samplePoint,fishPose[4],fishStroke[4],4.,-1.,weight.g);
    swim(rgb,samplePoint,fishPose[5],fishStroke[5],5.,-1.,weight.g);
    float reflection=smoothstep(.42,.84,max(rgb.g,rgb.b))*(.5+.5*sin(p.x*.08+p.y*.15-clockTime*1.47));
    rgb+=vec3(.011,.014,.015)*weight.g*reflection;
  }
  if(p.y>=525.&&p.y<689.){
    hangingLamp(rgb,p,vec2(1117.,525.),0.,lanternSwing.xy);
    hangingLamp(rgb,p,vec2(1571.,525.),1.,lanternSwing.zw);
  }
  gl_FragColor=vec4(rgb,1.);
}