import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SceneSettings, SettingsLabel } from './SceneSettings'
import { musicNote, soundCue } from './sceneAudio'
import { stations } from './atlas'
import { CameraHunt, readCameraStep, saveCameraStep, type CameraStep } from './CameraHunt'
import WebmailDraft, { contactAddress } from './WebmailDraft'
import tiedScroll from './scroll-tied.webp'
import pineScroll from './scroll-pine.webp'
import './bedroom.css'
import './archive-stage.css'

const objects=[
  {name:'书桌信封',title:stations[0].title,x:65,y:49,icon:'M3 5h18v14H3z M3 6l9 7 9-7'},
  {name:'书架',title:'工作经历',x:83,y:45,icon:'M3 4h5v15H3z M9 4h4v15H9z M14 6l4-1 3 13-4 1z M2 21h20'},
  {name:'画轴',title:'工作影像',x:41,y:30,icon:'M4 3h16v3H4z M5 6v12m14-12v12 M4 18h16v3H4z M7 15l4-5 3 3 2-2 2 4'},
  {name:'储物箱',title:'项目与志愿经历',x:91,y:73,icon:'M3 10V7l2-3h14l2 3v3 M3 10h18v10H3z M3 12h7m4 0h7 M10 10h4v5h-4z'},
  {name:'火盆',title:'炉边密函',x:39,y:75},
]
const jobs=[
  ['2018.07–2018.11','南京苏宁易购','售前客服','接待平台咨询，介绍商品并协助顾客完成选购。'],
  ['2018.10–2021.03','好孩子','网络客服','从售前、售中到售后轮岗，参与团队管理、品类运营及直播中控。'],
  ['2021.07–2024.11','北纬四十三度','媒介商务 BD','为援疆产品对接供应商、政府采购与电商渠道，参与推介活动的策划和落地。'],
  ['2025.02–2025.12','苏州佳伟箱包','跨境电商运营','运营 1688 店铺、美区 TikTok 店铺与 Shopify，从选品、投放到达人合作。'],
]
const projects=[
  {title:'宠物&女装账号运营',date:'2024.10 — 2025.01',text:'从零搭建抖音、小红书账号，负责定位、选题和视频脚本。四个月内双平台累计粉丝突破五万。',
    images:[['project','直播运营数据'],['project-accounts','宠物账号主页与运营记录']]},
  {title:'疆域阿力木账号助理',date:'2023.07 — 2023.12',
    images:[['work-2-12','疆域阿力木户外直播现场']]},
  {title:'中华龙舟大赛 · 南京赛区',date:'2017.09',text:'在赛事现场担任志愿者，协助工作人员输送物资、维护现场秩序，处理现场问题。',
    images:[['volunteer','赛事转播车'],['volunteer-venue','南京六合站赛事会场'],['volunteer-camera','赛道旁的转播摄像机']]},
]
const years=['2022','2023','2024–2025']
const photos=import.meta.glob('./room-archive/**/*.webp',{eager:true,query:'?url',import:'default'}) as Record<string,string>
const photo=(name:string)=>photos['./room-archive/'+name+'.webp']
const resume=new URL('./room-archive/north-resume.pdf',import.meta.url).href
const storage='north.snow-study.collection.v1'
function readProgress(){try{return Number(localStorage.getItem(storage))&15}catch{return 0}}

const english=['Correspondence','Chronology','Photographs','Field notes']
const hints=['看看窗下书桌上的信封。移开草稿，里面藏着 North 的来信。','去窗右的书架看看。把档案按入职时间排好，就能读到 North 的工作经历。','窗左的画轴里夹着一只相框。翻到背面，找找照片的封条。','去打开床尾的储物箱。箱底的文件袋里，留着几张工具卡。']
const roman=['I','II','III','IV']
// Hold the completed arrangement on screen before turning to the archive page.
function useReveal(ready:boolean,collect:()=>void){
  const finish=useRef(collect)
  useEffect(()=>{finish.current=collect},[collect])
  useEffect(()=>{
    if(!ready)return
    const id=setTimeout(()=>finish.current(),matchMedia('(prefers-reduced-motion: reduce)').matches?200:920)
    return ()=>clearTimeout(id)
  },[ready])
}

function Papers({collect}:{collect:()=>void}){
  const [removed,setRemoved]=useState(0),[unsealed,setUnsealed]=useState(false)
  const pointer=useRef<{x:number;y:number;id:number}|null>(null)
  const nextDraft=useRef(0)
  function moveDraft(i:number) {
    if(i!==nextDraft.current)return
    nextDraft.current=i+1
    soundCue('paper')
    setRemoved(i+1)
  }
  useReveal(unsealed,collect)
  return <div className="paper-field"><button className={'sealed-envelope letter-seal'+(unsealed?' unsealed':'')} disabled={removed<2||unsealed} onClick={()=>{soundCue('seal');setUnsealed(true)}} aria-label="拆开信封"><span>North 亲启</span><i>启</i></button>
    {[1,0].map(i=><button key={i} disabled={i!==removed} className={'draft slip-'+i+(i<removed?' swept':'')}
      onPointerDown={e=>{pointer.current={x:e.clientX,y:e.clientY,id:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{const p=pointer.current;if(!p||p.id!==e.pointerId)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;e.currentTarget.style.setProperty('--drag',dx+'px');e.currentTarget.style.setProperty('--lift',dy+'px')}}
      onPointerUp={e=>{const p=pointer.current;pointer.current=null;if(p&&p.id===e.pointerId)moveDraft(i)}}
      onPointerCancel={e=>{pointer.current=null;e.currentTarget.style.removeProperty('--drag');e.currentTarget.style.removeProperty('--lift')}}
      onClick={()=>moveDraft(i)}><small>FIELD NOTES / {i?'B':'A'}</small><b>{i?'选题草稿':'尚未整理'}</b><i/><i/><i/><em>{i?'a new idea.':'look beneath.'}</em></button>)}
    <p className="puzzle-caption" role="status">{unsealed?'信封已拆开，正在展开信纸。':removed===2?'信封露出来了。轻点封印，展开信纸。':'两张草稿压着一封信。试着将它们移开。'} <small>{removed} / 2</small></p></div>
}
function Sorting({collect}:{collect:()=>void}){
  const [step,setStep]=useState(0),[wrong,setWrong]=useState<number|null>(null)
  const [picked,setPicked]=useState<number|null>(null)
  useReveal(step===jobs.length,collect)
  function place(i:number,slot:number){
    if(i!==step||slot!==step){setWrong(i);return}
    soundCue('book');setWrong(null);setStep(step+1)
  }
  return <><div className="timeline-slots">{jobs.map((job,i)=><span key={job[0]} className={i<step?'filled':i===step?'next-slot':''} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(picked!==null)place(picked,i);setPicked(null)}}>{i<step?job[0].slice(0,7):roman[i]}</span>)}</div>
    <div className="file-grid sort-grid">{[2,0,3,1].map(i=><button key={i} disabled={i<step} draggable={i>=step} onDragStart={e=>{setPicked(i);e.dataTransfer.setData('text/plain',jobs[i][0])}} onDragEnd={()=>setPicked(null)} className={wrong===i?'out-of-order':''} onClick={()=>place(i,step)}><small>{jobs[i][1]}</small><b>{jobs[i][0].slice(0,7)}</b><span>{jobs[i][2]}</span></button>)}</div>
    <p className="task-note" role="status">{step===4?'顺序已复原，正在打开工作履历。':wrong!==null?'这张的时间对不上。再看一眼入职年月。':'从最早的一段开始，点选档案，或拖入上方的时间槽。'}　{step} / 4</p></>
}
function FramePuzzle({collect}:{collect:()=>void}){
  const [turned,setTurned]=useState(false),[peel,setPeel]=useState(0)
  const slider=useRef<HTMLInputElement>(null)
  useReveal(peel===100,collect)
  function turn(){soundCue('frame');setTurned(true);requestAnimationFrame(()=>slider.current?.focus({preventScroll:true}))}
  return <><div className={'archive-frame'+(turned?' turned':'')}><button aria-label="翻转相框" disabled={turned} onClick={turn}><span className="frame-face"><img src={photo('work-0-0')} alt="工作影像相框"/><small>工作影像　·　2022—2025</small></span><span className="frame-reverse" aria-hidden="true"><i>工作影像</i><b>照片手记</b><small>2022 · 2023 · 2024—2025</small><em style={{transform:'translateX('+peel*.86+'%) rotate('+(peel*.07-3)+'deg)',opacity:1-peel*.007}}>ARCHIVE　/　SEALED</em></span></button></div>
    <label className={'seal-track'+(turned?'':' concealed')}>向右拉开封条<input ref={slider} type="range" min={0} max={100} step={1} value={peel} disabled={!turned||peel===100} onChange={e=>{const next=Number(e.target.value);if(next===100)soundCue('seal');setPeel(next)}}/></label>
    <p className="task-note" role="status">{!turned?'画轴里夹着一只相框。翻过来看看。':peel===100?'封条已揭开，正在展开相册。':'背板上贴着封条。沿着它，慢慢向右拉到底。'}</p></>
}
function Pockets({collect}:{collect:()=>void}){
  const [opened,setOpened]=useState(false),[exposed,setExposed]=useState(0),[cards,setCards]=useState(0)
  const count=projects.filter((_,i)=>cards&(1<<i)).length
  useReveal(count===projects.length,collect)
  if(!opened)return <div className="locked-chest"><button className="chest-lid" onClick={()=>{soundCue('lid');setOpened(true)}}>掀开箱盖</button><p className="task-note">拨开铜扣，箱底藏着几只旧文件袋。</p></div>
  return <><div className="pockets tool-pockets">{projects.map(({title,date},i)=>{const bit=1<<i,raised=!!(exposed&bit),taken=!!(cards&bit)
    return <button key={title} className={taken?'pocket-empty':raised?'taken':''} aria-label={(raised?'收集':'打开')+title} disabled={taken} onClick={()=>{soundCue(raised?'paper':'folder');if(raised)setCards(cards|bit);else setExposed(exposed|bit)}}><span><strong>{title}</strong><small>{date}</small></span><b>{taken?'已收集':raised?'取出工具卡':title}</b></button>})}</div>
    <p className="task-note" role="status">{count===projects.length?'工具卡已收齐，正在打开档案。':'打开文件袋，再取出露出的工具卡。'}　{count} / {projects.length}</p></>
}
type PageNavigation = { index:number; count:number; go:(index:number)=>void }
function PhotoDetail({id, label, dismiss, pages}:{id:string;label:string;dismiss:()=>void;pages?:PageNavigation}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [enlarged, setEnlarged] = useState(!!pages)
  useEffect(() => { dialog.current?.showModal() }, [])
  return createPortal(<dialog ref={dialog} className="photo-detail" aria-label={label}
    onCancel={event => event.stopPropagation()}
    onClose={event => { event.stopPropagation(); dismiss() }}>
    <div className="photo-bar">
      <span aria-live="polite">{label}</span>
      {pages && <div className="resume-paging">
        <button type="button" aria-label="简历上一页" disabled={pages.index===0} onClick={()=>pages.go(pages.index-1)}>上一页</button>
        <button type="button" aria-label="简历下一页" disabled={pages.index===pages.count-1} onClick={()=>pages.go(pages.index+1)}>下一页</button>
      </div>}
      <button type="button" aria-pressed={enlarged} onClick={() => setEnlarged(!enlarged)}>
        {enlarged ? '适应屏幕' : pages ? '放大阅读' : '原始尺寸'}
      </button>
      <button type="button" autoFocus onClick={() => dialog.current?.close()}>关闭大图</button>
    </div>
    <div key={id} className={'photo-canvas' + (enlarged ? (pages?' resume-enlarged':' original') : '')}>
      <img src={photo('large/'+id) ?? photo(id)} alt={label}/>
    </div>
  </dialog>, document.body)
}

const resumePages = ['resume-1','resume-2','resume-3']
function ResumePreview() {
  const [page,setPage] = useState<number|null>(null)
  const label = (index:number) => '完整简历 · 第 '+(index+1)+' / '+resumePages.length+' 页'
  return <>
    <div className="resume-links"><span>点击简历可放大</span><a href={resume} target="_blank" rel="noopener">打开原版 PDF ↗</a></div>
    <div className="resume-preview" aria-label="简历三页预览">
      {resumePages.map((id,i)=><button type="button" key={id} aria-haspopup="dialog" aria-label={'放大查看：'+label(i)} onClick={()=>setPage(i)}>
        <img src={photo(id)} loading="lazy" alt={label(i)}/>
      </button>)}
    </div>
    {page!==null && <PhotoDetail id={resumePages[page]} label={label(page)} pages={{index:page,count:resumePages.length,go:setPage}} dismiss={()=>setPage(null)}/>}
  </>
}

function ArchivePhoto({id,label}:{id:string;label:string}) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="photo-thumb" aria-label={'放大查看：'+label}
      aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <img src={photo(id)} alt={label} loading="lazy"/>
    </button>
    {open && <PhotoDetail id={id} label={label} dismiss={() => setOpen(false)}/>}
  </>
}

function PhotoReader(){
  const [group,setGroup]=useState(0),[index,setIndex]=useState(0)
  const count=[6,4,15][group]
  return <div className="album"><div className="year-tabs">{years.map((y,i)=><button key={y} aria-pressed={group===i} onClick={()=>{setGroup(i);setIndex(0)}}>{y}</button>)}</div><figure key={group+'-'+index}><ArchivePhoto id={'work-'+group+'-'+index} label={years[group]+' 工作照片 '+(index+1)}/><figcaption>{years[group]} · 工作影像 <span>{index+1} / {count}</span></figcaption></figure><div className="album-controls"><button onClick={()=>setIndex((index+count-1)%count)}>上一张</button><button onClick={()=>setIndex((index+1)%count)}>下一张</button></div></div>
}
const profileFields = [
  ['中文名', '陈志浩'],
  ['英文名', 'North'],
  ['电话', '13914901905'],
  ['邮箱', 'chennanbeicc@gmail.com'],
  ['出生日期', '1998年2月25日'],
  ['星座', '双鱼座'],
  ['MBTI', 'INFJ'],
  ['学历', '大专'],
]

function ProfileRecord() {
  return <div className="profile-record">
    <section>
      <h3>基础信息</h3>
      <dl>{profileFields.map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      )}</dl>
    </section>
    <section>
      <h3>优势</h3>
      <p>我拥有6年互联网电商领域及商务对接的综合经验，这些锻炼了我极强的用户洞察、数据分析和跨部门协作能力。</p>
      <p>手上也积累了一些厂家资源，涉及有食品酒水，五金器械，鞋服包包，宠物类目等。</p>
    </section>
  </div>
}

function RecordBook({page,mask,go}:{page:number;mask:number;go:(i:number)=>void}){
  return <div className="record-book"><aside><div className="portrait-print"><ArchivePhoto id="portrait" label="North 的照片"/></div><h3>陈志浩</h3><small>NORTH / 个人档案</small><div className="book-tabs">{objects.slice(0,4).map((o,i)=><button disabled={!(mask&(1<<i))} aria-current={page===i?'page':undefined} key={o.name} onClick={()=>go(i)}>{roman[i]}　{o.title}</button>)}</div></aside>
    <article className="book-leaf" key={page}><small>FIELD ARCHIVE　/　{english[page]}</small><h2 id="archive-name">{objects[page].title}</h2>
    {page===0&&<ProfileRecord/>}
    {page===1&&<ol className="career-list">{jobs.map(([d,c,r,t])=><li key={d}><small>{d}</small><h3>{c} · {r}</h3><p>{t}</p></li>)}</ol>}
    {page===2&&<PhotoReader/>}
    {page===3&&projects.map(project=><section key={project.title} className="tool-story">
      <small>{project.date}</small><h3>{project.title}</h3>
      <div className="project-gallery">{project.images.map(([id,label])=>
        <ArchivePhoto key={id} id={id} label={label}/>)}</div>
      {project.text&&<p>{project.text}</p>}
    </section>)}
    <div className="archive-signed">已收入档案</div></article></div>
}
function Fire(){
  const [value,setValue]=useState(''),[error,setError]=useState(false),[opened,setOpened]=useState(false)
  const [tab,setTab]=useState('mail'),[body,setBody]=useState(''),[reply,setReply]=useState('')
  const [sending,setSending]=useState(false),[notice,setNotice]=useState('')
  const [delivery, setDelivery] = useState<'checking'|'direct'|'client'>('checking')
  const [offerDraft, setOfferDraft] = useState(false)
  useEffect(() => {
    if (!opened) return
    const controller = new AbortController()
    let active = true
    const timer = window.setTimeout(() => controller.abort(), 4500)
    async function checkDelivery() {
      try {
        const response = await fetch('/api/room-mail', {signal: controller.signal, cache: 'no-store'})
        const status = response.ok ? await response.json() : null
        if (active) setDelivery(status?.direct === true ? 'direct' : 'client')
      } catch { if (active) setDelivery('client') }
      finally { window.clearTimeout(timer) }
    }
    void checkDelivery()
    return () => { active = false; window.clearTimeout(timer); controller.abort() }
  }, [opened])
  const busy=useRef(false)
  async function send(e:React.FormEvent){
    e.preventDefault();if(busy.current || !body.trim() || delivery!=='direct')return
    busy.current=true;setSending(true);setNotice('');setOfferDraft(false)
    try{
      const res=await fetch('/api/room-mail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({replyTo:reply.trim(),message:body.trim()})})
      if(res.status===204){setNotice('邮件服务器已接收这封信。');setBody('')}
      else {
        setOfferDraft(true)
        setNotice(res.status===429?'来信间隔较短，请稍后再试。':'未收到邮件服务器的接收确认，信稿已保留。')
      }
    }catch{setNotice('连接中断，暂时无法确认投递结果。信稿已保留。');setOfferDraft(true)}finally{busy.current=false;setSending(false)}
  }
  if(opened)return <div className="mail-desktop"><div className="desktop-bar">炉边工作台</div><div className="mail-layout"><aside><b>档案与通信</b><button aria-pressed={tab==='mail'} onClick={()=>setTab('mail')}>联系 North</button><button aria-pressed={tab==='cv'} onClick={()=>setTab('cv')}>完整简历</button></aside><section>
  {tab==='mail'?<><small>写一封信</small><h2 id="archive-name">下一段故事，从这里开始。</h2><p>收件人　North &lt;{contactAddress}&gt;</p>
    <form onSubmit={send}>
      <label>你的回信邮箱{delivery==='client'?'（选填）':''}<input type="email" required={delivery==='direct'} value={reply} disabled={sending} maxLength={254} onChange={e=>setReply(e.target.value)}/></label>
      <textarea required maxLength={4000} aria-label="邮件正文" placeholder="你好，North……" value={body} disabled={sending} onChange={e=>setBody(e.target.value)}/>
      {delivery!=='client'&&<button className="mail-launch" disabled={sending||delivery==='checking'||!body.trim()}>{sending?'正在发送…':'发送邮件'}</button>}
      {notice&&<p role="status">{notice}</p>}
      {(delivery==='client'||offerDraft)&&<WebmailDraft reply={reply} body={body}/>}
    </form></>:<><h2 id="archive-name">完整简历</h2><p>陈志浩 · 国内与跨境电商运营</p><p>苏宁易购 → 好孩子 → 北纬四十三度 → 佳伟箱包</p><p>联系邮箱　chennanbeicc@gmail.com</p><ResumePreview/></>}
  </section></div></div>
  return <form className="password-desk" onSubmit={e=>{e.preventDefault();if(value==='1998')setOpened(true);else setError(true)}}><small>炉边密函　/　PRIVATE DESKTOP</small><i>N</i><h2 id="archive-name">请输入通关密码</h2><label htmlFor="birth-code">密码是我的出生年份，请输入四位数字。</label><div><input id="birth-code" type="password" inputMode="numeric" maxLength={4} value={value} onChange={e=>{setValue(e.target.value.replace(/\D/g,''));setError(false)}} placeholder="四位数字" autoComplete="off"/><button aria-label="开启密函">→</button></div><p role="status">{error?'密码不正确，可以再试一次。':''}</p></form>
}
export default function Bedroom({house,onLight,onReturn,music,toggleMusic}:{music:boolean;toggleMusic:()=>void;house:boolean;onLight:()=>void;onReturn:(fullyExplored:boolean)=>void}){
  const [savedMask,setSavedMask]=useState(readProgress)
  const [cameraStep,setCameraStep]=useState<CameraStep>(readCameraStep)
  const advanceCamera=useCallback((next:CameraStep)=>{setCameraStep(next);saveCameraStep(next)},[])
  const [mask,setMask]=useState(0),[active,setActive]=useState<number|null>(null),[page,setPage]=useState(0)
  const [intro,setIntro]=useState(true),[menu,setMenu]=useState(false)
  useEffect(()=>{
    const html=document.documentElement,body=document.body
    const prev=[html.style.overflow,body.style.overflow,body.style.overscrollBehavior]
    html.style.overflow='hidden';body.style.overflow='hidden';body.style.overscrollBehavior='none'
    return ()=>{html.style.overflow=prev[0];body.style.overflow=prev[1];body.style.overscrollBehavior=prev[2]}
  },[])
  const [systemReduce,setSystemReduce]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[noMotion,setNoMotion]=useState(false)
  const reduced=systemReduce||noMotion
  const dialog=useRef<HTMLDialogElement>(null),picture=useRef<HTMLDivElement>(null),begin=useRef<HTMLButtonElement>(null),initialPin=useRef<HTMLButtonElement>(null)
  const obj=active===null?null:objects[active]
  const [reading,setReading]=useState(false)
  const total=objects.slice(0,4).filter((_,i)=>mask&(1<<i)).length
  useEffect(()=>{begin.current?.focus({preventScroll:true});const q=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setSystemReduce(q.matches);q.addEventListener('change',change);return ()=>q.removeEventListener('change',change)},[])
  useEffect(()=>{
    if(active===null)return
    const id=setTimeout(()=>{if(dialog.current&&!dialog.current.open)dialog.current.showModal()},reduced?0:820)
    return ()=>clearTimeout(id)
  },[active,reduced])
  function open(i:number){if(active!==null||intro||(i===4&&mask!==15))return;setReading(false);setActive(i);setPage(i);setMenu(false)}
  function leaveArchive(){
    if(active===3 && reading && (mask&8) && cameraStep==='tucked') {
      if(reduced)soundCue('card')
      advanceCamera(reduced?'floor':'falling')
    }
    setActive(null)
  }
  function collect(){if(active===null||active>3)return;const next=mask|(1<<active);setReading(true);setMask(next);setSavedMask(next);try{localStorage.setItem(storage,String(next))}catch{}}
  const zoom=2.15
  const offset=(n:number)=>Math.max(-54,Math.min(54,(50-n)*zoom))
  function explore(progress:number, resume=false){
    if(!resume)advanceCamera('tucked')
    setMask(progress);setIntro(false);setMenu(false)
    requestAnimationFrame(()=>initialPin.current?.focus({preventScroll:true}))
  }
  const hinted=objects.slice(0,4).findIndex((_,i)=>!(mask&(1<<i)))
  return <main className={'study archive-stage'+(house?'':' dimmed')+(intro?' entrance':'')+(reduced?' still-stage':'')+(active!==null?' inspecting':'')+(active===4?' to-fire':'')+(!intro&&(cameraStep==='seeking'||cameraStep==='found'||cameraStep==='ready')?' camera-route':'')}
    onPointerMove={e=>{if(e.pointerType!=='mouse'||reduced||intro||obj)return;const rect=e.currentTarget.getBoundingClientRect();picture.current?.style.setProperty('--pan-x',((.5-(e.clientX-rect.left)/rect.width)*1.1)+'%');picture.current?.style.setProperty('--pan-y',((.5-(e.clientY-rect.top)/rect.height)*1.1)+'%')}}>
    <div className="study-view"><div ref={picture} className="study-picture" style={obj?{transform:'translate('+offset(obj.x)+'%,'+offset(obj.y)+'%) scale('+zoom+')'}:undefined}>
      <img className="study-art" src={new URL('./bedroom-scene.webp',import.meta.url).href} alt="雪窗前的书桌，窗左的画轴、窗右的书架、木箱与火盆。"/>
      {!intro&&<CameraHunt step={cameraStep} advance={advanceCamera} reduced={reduced} hidden={active!==null||menu}/>}
      <div className="chest-scrolls" aria-hidden="true">
        <img className="tied-scroll" src={tiedScroll} alt="" draggable={false}/>
        <img className="pine-scroll" src={pineScroll} alt="" draggable={false}/>
      </div>
      <div className="hearth-effects" data-heat={intro?0:total} aria-hidden="true">
        <div className="banked-coals"/>
        {!intro&&total>0&&<div className="brazier blazing">{[0,1,2,3,4,5,6].map(i=><i key={i} style={{left:(10+i*11)+'%',height:(50+38*Math.sin(i*.56))+'%',animationDelay:(-i*.21)+'s'}}/>)}</div>}
      </div>
      {!intro&&objects.map((o,i)=>i===4&&mask!==15?null:<button ref={i===0?initialPin:undefined} key={o.name} className={i===4&&mask===15?'study-pin hearth-prompt':'study-pin'} style={{left:o.x+'%',top:o.y+'%'}} aria-label={o.name} disabled={active!==null} onClick={()=>open(i)}><i>✧</i><span>{i===4&&mask===15?'点击火盆，查看最终简历':o.name}</span></button>)}
    </div></div>
    {intro?<section className="opening-screen"><div className="opening-type"><small>A PERSONAL ARCHIVE　 /　 NORTH</small><h1 lang="en" aria-label="Welcome to My Room">Welcome to<br/><em>My Room</em></h1><p>未完的档案 <i/> 雪窗书斋</p></div><div className="opening-actions"><button ref={begin} onClick={()=>explore(0)}>✧　开启故事 <small>BEGIN</small></button>{(savedMask>0||cameraStep!=='tucked')&&<button onClick={()=>explore(savedMask,true)}>继续上次进度</button>}<button onClick={()=>setMenu(!menu)} aria-haspopup="dialog"><SettingsLabel/></button></div></section>:<div className="exploration-ui">
    {!menu&&(cameraStep==='floor'||cameraStep==='seeking')&&<div className="camera-clue" role="status">{cameraStep==='floor'?'一张内存卡落在了箱子左前方的地板上。':'捡到了一张内存卡。找找房间里的照相机。'}</div>}
    <div className="archive-hud"><div className="hud-progress" aria-label={'档案收集 '+total+' / 4'}>{objects.slice(0,4).map((o,i)=><i key={o.name} className={mask&(1<<i)?'lit':''} role="img" aria-label={o.name+(mask&(1<<i)?'，已收集':'，未收集')} title={o.name}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={o.icon}/></svg></i>)}<small aria-live="polite">{total} / 4</small></div><button onClick={()=>setMenu(!menu)} aria-haspopup="dialog"><SettingsLabel/></button></div>
    <div className="guide-line" role="status" aria-live="polite" aria-atomic="true">{hinted>=0?hints[hinted]:'四份档案已集齐。点击火盆，查看最终简历。'}</div></div>}
    {menu&&<SceneSettings close={()=>setMenu(false)} musicNote={musicNote('bedroom')} rows={[
      {label:'房屋灯光',enabled:house,toggle:onLight},
      {label:'减少动态',enabled:reduced,toggle:()=>setNoMotion(!noMotion),disabled:systemReduce},
      {label:'配乐',enabled:music,toggle:toggleMusic}]}/>}
    {active===null&&<button className="room-back" onClick={()=>onReturn(!intro && mask===15 && cameraStep==='ready')}>‹　返回</button>}
    <dialog ref={dialog} className={'stage-dialog '+(reading?'reading':active===4?'terminal':'puzzling')} aria-labelledby="archive-name" onClose={leaveArchive} onCancel={e=>e.preventDefault()}>
      {active!==null&&obj&&<><button className="room-back" aria-label={active===3&&reading?'放回档案，返回卧室':'返回卧室'} onClick={()=>dialog.current?.close()}>{active===3&&reading?'‹　放回档案':'‹　返回'}</button>
      {reading?<RecordBook page={page} mask={mask} go={setPage}/>:active===4?<Fire/>:<section className="task-stage"><small>{english[active]}</small><h2 id="archive-name">{obj.name}</h2>
      {active===0&&<Papers collect={collect}/>}
      {active===1&&<Sorting collect={collect}/>}
      {active===2&&<FramePuzzle collect={collect}/>}
      {active===3&&<Pockets collect={collect}/>}
      {active<4&&!!(mask&(1<<active))&&<button className="revisit-book" onClick={()=>setReading(true)}>翻阅已收集档案</button>}</section>}</>}
    </dialog>
  </main>
}
