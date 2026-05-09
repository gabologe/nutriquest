import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://pbxxevlzcezkmeyxsydn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBieHhldmx6Y2V6a21leXhzeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTI5MzcsImV4cCI6MjA5MzcyODkzN30.tsC-3kM9orTRdCPip84GdctDlXSSaOmv8UquELx-bR4"
);

const USER_ID = "gabo";

const G = {
  glass:"rgba(255,255,255,0.55)",glassDark:"rgba(255,255,255,0.35)",glassSubtle:"rgba(255,255,255,0.25)",
  border:"rgba(255,255,255,0.6)",borderSubtle:"rgba(255,255,255,0.35)",
  text:"#2a3428",muted:"#5a6b57",hint:"#93a48f",
  sage:"#5a7a54",sageMid:"#87a882",sageLight:"rgba(138,180,132,0.18)",sageBorder:"rgba(90,122,84,0.3)",
  gold:"#8a6c2a",goldLight:"rgba(180,148,72,0.15)",red:"#8a4040",redLight:"rgba(180,80,80,0.12)",
  bg1:"#c8d8c4",bg2:"#e8e0d0",bg3:"#d4cabb",
};
const blur="blur(14px)",blurSm="blur(8px)";

const LEVELS=[
  {name:"Novato",emoji:"🌱",xp:0},{name:"Aprendiz",emoji:"🌿",xp:200},
  {name:"Consciente",emoji:"🍃",xp:500},{name:"Atleta",emoji:"🌾",xp:1000},{name:"Leyenda",emoji:"🌳",xp:2000},
];
const BADGES_DEF=[
  {id:"first_meal",emoji:"🍽️",name:"Primer registro",desc:"Registraste tu primera comida"},
  {id:"week_complete",emoji:"📅",name:"Semana completa",desc:"7 días registrando"},
  {id:"streak_3",emoji:"🔥",name:"En racha",desc:"3 días consecutivos"},
  {id:"streak_7",emoji:"⚡",name:"Imparable",desc:"7 días consecutivos"},
  {id:"protein_goal",emoji:"💪",name:"Meta proteína",desc:"Alcanzaste tu meta de proteína"},
  {id:"perfect_day",emoji:"⭐",name:"Día perfecto",desc:"Promedio ≥ 9 en un día"},
  {id:"first_workout",emoji:"🏋️",name:"A entrenar",desc:"Primer entrenamiento registrado"},
  {id:"athlete",emoji:"🥊",name:"Atleta en proceso",desc:"3 entrenamientos en la semana"},
];
const FIXED_SLOTS=[
  {id:"breakfast",label:"Desayuno",emoji:"🌅"},{id:"lunch",label:"Almuerzo",emoji:"🍽️"},
  {id:"snack",label:"Merienda",emoji:"☕"},{id:"dinner",label:"Cena",emoji:"🌙"},
];
const WORKOUT_TYPES=["Fuerza/hipertrofia","Cardio","Funcional/HIIT","Movilidad","Deporte"];

const todayStr=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});

async function loadAllDays(){
  const{data,error}=await supabase.from("registros").select("*").eq("user_id",USER_ID);
  if(error){console.error(error);return{};}
  const map={};
  data.forEach(row=>{
    if(row.fecha==="perfil")return;
    map[row.fecha]={meals:row.meals||{},snacks:row.snacks||[],workout:row.workout||null};
  });
  return map;
}
async function loadPerfil(){
  const{data,error}=await supabase.from("registros").select("perfil").eq("user_id",USER_ID).eq("fecha","perfil").maybeSingle();
  if(error||!data)return null;
  return data.perfil;
}
async function savePerfil(perfil){
  await supabase.from("registros").upsert({user_id:USER_ID,fecha:"perfil",perfil},{onConflict:"user_id,fecha"});
}
async function saveDay(fecha,dayData){
  await supabase.from("registros").upsert({
    user_id:USER_ID,fecha,
    meals:dayData.meals||{},snacks:dayData.snacks||[],workout:dayData.workout||null,
  },{onConflict:"user_id,fecha"});
}

const lsLoad=(k,def)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):def;}catch{return def;}};
const lsSave=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

async function callAI(prompt,system){
  const res=await fetch("/api/analyze",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt,system}),
  });
  const data=await res.json();
  const text=data.content?.find(b=>b.type==="text")?.text||"";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

const glassCard={background:G.glass,backdropFilter:blur,WebkitBackdropFilter:blur,border:`1px solid ${G.border}`,borderRadius:18};
const glassSubtle={background:G.glassDark,backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.borderSubtle}`,borderRadius:12};
const inp={width:"100%",background:"rgba(255,255,255,0.5)",backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"10px 13px",fontSize:14,boxSizing:"border-box",marginBottom:8,outline:"none",fontFamily:"inherit"};
const lbl={display:"block",fontSize:11,color:G.hint,marginBottom:4,marginTop:10,letterSpacing:"0.05em",textTransform:"uppercase"};

function Btn({onClick,loading,children,full,disabled}){
  return <button onClick={onClick} disabled={loading||disabled} style={{padding:"10px 18px",borderRadius:10,border:`1px solid ${loading||disabled?G.borderSubtle:G.sageBorder}`,cursor:"pointer",background:loading||disabled?"rgba(255,255,255,0.3)":"rgba(90,122,84,0.15)",backdropFilter:blurSm,WebkitBackdropFilter:blurSm,color:loading||disabled?G.hint:G.sage,fontWeight:600,fontSize:13,width:full?"100%":"auto",fontFamily:"inherit",letterSpacing:"0.02em",transition:"all 0.2s"}}>{loading?"…":children}</button>;
}
function Tag({color,bg,border,children}){
  return <span style={{fontSize:11,background:bg||G.sageLight,color:color||G.sage,border:`1px solid ${border||G.sageBorder}`,padding:"3px 9px",borderRadius:99,fontWeight:500,letterSpacing:"0.02em"}}>{children}</span>;
}
function Divider(){return <div style={{height:"1px",background:"rgba(255,255,255,0.4)",margin:"0 18px"}}/>;}

function Confetti({active}){
  if(!active)return null;
  const pieces=Array.from({length:22},(_,i)=>({id:i,left:Math.random()*100,color:[G.sage,G.sageMid,G.gold,"#c8b89a","#8fad8b"][i%5],delay:Math.random()*0.4,size:5+Math.random()*6}));
  return <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999}}>{pieces.map(p=><div key={p.id} style={{position:"absolute",left:`${p.left}%`,top:"-10px",width:p.size,height:p.size,borderRadius:"50%",background:p.color,animation:`fall 1.6s ${p.delay}s ease-in forwards`}}/>)}<style>{`@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:0;}}`}</style></div>;
}
function Toast({toasts}){
  return <div style={{position:"fixed",bottom:24,right:20,zIndex:9998,display:"flex",flexDirection:"column",gap:8}}>{toasts.map(t=><div key={t.id} style={{background:G.glass,backdropFilter:blur,WebkitBackdropFilter:blur,border:`1px solid ${G.border}`,color:G.text,padding:"12px 16px",borderRadius:14,display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${G.sage}`,animation:"slideIn 0.3s ease"}}><span style={{fontSize:20}}>{t.emoji}</span><div><div style={{fontWeight:600,fontSize:13}}>{t.title}</div><div style={{fontSize:11,color:G.muted}}>{t.desc}</div></div></div>)}<style>{`@keyframes slideIn{from{transform:translateX(120%);opacity:0;}to{transform:translateX(0);opacity:1;}}`}</style></div>;
}
function XPBar({xp,streak}){
  const li=LEVELS.reduce((a,l,i)=>xp>=l.xp?i:a,0);
  const lvl=LEVELS[li],next=LEVELS[li+1];
  const pct=next?Math.round(((xp-lvl.xp)/(next.xp-lvl.xp))*100):100;
  return <div style={{...glassCard,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:24}}>{lvl.emoji}</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span style={{fontWeight:600,color:G.sage,letterSpacing:"0.04em"}}>{lvl.name}</span><span style={{color:G.hint,fontSize:11}}>{next?`${xp} / ${next.xp} xp`:"Máximo"}</span></div><div style={{background:"rgba(255,255,255,0.35)",borderRadius:99,height:5,overflow:"hidden"}}><div style={{width:`${pct}%`,background:G.sage,height:"100%",borderRadius:99,transition:"width 0.6s ease",opacity:0.8}}/></div></div>{streak>0&&<div style={{...glassSubtle,display:"flex",flexDirection:"column",alignItems:"center",padding:"6px 10px",minWidth:38,borderRadius:10}}><span style={{fontSize:14}}>🔥</span><span style={{fontSize:10,color:G.gold,fontWeight:600,marginTop:1}}>{streak}d</span></div>}</div>;
}
function MealDetails({meal}){
  const hyC={excelente:G.sage,bueno:G.sageMid,moderado:G.gold,bajo:G.red};
  return <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.4)",fontSize:13}}><div style={{marginBottom:8}}><span style={{color:G.hint,fontSize:12}}>Hipertrofia — </span><span style={{color:hyC[meal.hypertrophy]||G.muted,fontWeight:600}}>{meal.hypertrophy}</span></div>{(meal.nutrients||[]).map((n,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:5}}><span style={{color:G.sage,fontWeight:600,minWidth:80,fontSize:12}}>{n.name}</span><span style={{color:G.muted,fontSize:12,lineHeight:1.4}}>{n.benefit}</span></div>)}{meal.tip&&<div style={{marginTop:10,background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:8,padding:"10px 12px",color:G.sage,fontSize:12,fontStyle:"italic"}}>💡 {meal.tip}</div>}</div>;
}
function MealCard({meal}){
  const[exp,setExp]=useState(false);
  const skinC={beneficioso:G.sage,neutro:G.muted,inflamatorio:G.red};
  const skinBg={beneficioso:G.sageLight,neutro:"rgba(255,255,255,0.2)",inflamatorio:G.redLight};
  const skinBd={beneficioso:G.sageBorder,neutro:G.borderSubtle,inflamatorio:"rgba(180,80,80,0.25)"};
  return <div><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",cursor:"pointer"}} onClick={()=>setExp(e=>!e)}><div style={{flex:1}}><p style={{margin:"0 0 8px",color:G.text,fontSize:13,lineHeight:1.5}}>{meal.desc}</p><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Tag bg={G.goldLight} color={G.gold} border="rgba(180,148,72,0.25)">⭐ {meal.score}/10</Tag><Tag>💪 {meal.protein_g}g</Tag><Tag bg={skinBg[meal.skin_impact]} color={skinC[meal.skin_impact]} border={skinBd[meal.skin_impact]}>🌿 {meal.skin_impact}</Tag></div></div><span style={{fontSize:10,color:G.hint,marginLeft:10,marginTop:2}}>{exp?"▲":"▼"}</span></div>{exp&&<MealDetails meal={meal}/>}</div>;
}
function MealSlot({slot,meal,input,onInput,loading,onSubmit}){
  return <div style={{padding:"15px 18px"}}><div style={{fontWeight:500,fontSize:13,color:G.text,marginBottom:10,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>{slot.emoji}</span><span style={{letterSpacing:"0.01em",color:G.muted}}>{slot.label}</span></div>{meal?<MealCard meal={meal}/>:<div style={{display:"flex",gap:8}}><input value={input} onChange={e=>onInput(e.target.value)} placeholder="¿Qué comiste?" style={{...inp,flex:1,marginBottom:0}} onKeyDown={e=>e.key==="Enter"&&onSubmit()}/><Btn loading={loading} onClick={onSubmit}>Analizar</Btn></div>}</div>;
}
function WorkoutCard({workout,compact}){
  return <div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:compact?0:10}}><Tag>{workout.type}</Tag><Tag>{workout.duration} min</Tag><Tag>{"●".repeat(workout.intensity)} int.</Tag></div>{!compact&&workout.coherence_score&&<div style={{marginTop:12}}><div style={{fontSize:13,marginBottom:8}}><span style={{color:G.hint,fontSize:12}}>Coherencia — </span><span style={{fontWeight:600,color:G.sage}}>{workout.coherence_score}/10</span></div><p style={{fontSize:12,color:G.muted,margin:"0 0 8px",lineHeight:1.5}}>{workout.balance}</p>{(workout.strengths||[]).map((s,i)=><div key={i} style={{fontSize:12,color:G.sage,marginBottom:3}}>✓ {s}</div>)}{(workout.suggestions||[]).map((s,i)=><div key={i} style={{fontSize:12,color:G.gold,marginBottom:3}}>→ {s}</div>)}</div>}</div>;
}
function WeekRanking({days}){
  const weeks={};
  Object.entries(days).forEach(([date,day])=>{
    const d=new Date(date+"T12:00:00");
    const mon=new Date(d);mon.setDate(d.getDate()-d.getDay()+1);
    const wk=mon.toISOString().slice(0,10);
    if(!weeks[wk])weeks[wk]=[];
    const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];
    weeks[wk].push(allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:0);
  });
  const ranked=Object.entries(weeks).map(([wk,arr])=>({wk,score:(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1),days:arr.length})).sort((a,b)=>b.score-a.score);
  return <div style={{...glassSubtle,padding:16,marginTop:10,borderRadius:14}}><p style={{margin:"0 0 10px",fontSize:13,fontWeight:600,color:G.text}}>Mejores semanas</p>{ranked.slice(0,5).map((r,i)=><div key={r.wk} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.3)"}}><span style={{color:G.muted}}>{["🥇","🥈","🥉","4","5"][i]} {r.wk}</span><span style={{color:G.sage,fontWeight:600}}>⭐ {r.score} · {r.days}d</span></div>)}</div>;
}
function ProfilePanel({profile,onUpdate}){
  const[editing,setEditing]=useState(false);
  const[form,setForm]=useState({name:profile.name,weight:profile.weight,height:profile.height});
  const bmi=(profile.weight/((profile.height/100)**2)).toFixed(1);
  const protGoal=Math.round(profile.weight*2);
  const handleSave=async()=>{
    if(!form.name||!+form.weight||!+form.height)return;
    const updated={name:form.name,weight:+form.weight,height:+form.height};
    await savePerfil(updated);onUpdate(updated);setEditing(false);
  };
  if(editing)return(
    <div style={{...glassCard,padding:"16px 18px",marginBottom:16}}>
      <p style={{margin:"0 0 12px",fontSize:13,fontWeight:600,color:G.text}}>Editar perfil</p>
      <label style={lbl}>Nombre</label>
      <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><label style={lbl}>Peso (kg)</label><input type="number" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} style={inp}/></div>
        <div><label style={lbl}>Altura (cm)</label><input type="number" value={form.height} onChange={e=>setForm(f=>({...f,height:e.target.value}))} style={inp}/></div>
      </div>
      {form.weight&&form.height&&<div style={{background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:G.sage,marginBottom:10}}>Meta proteína: <strong>{Math.round(+form.weight*2)}g/día</strong> · IMC: {(+form.weight/((+form.height/100)**2)).toFixed(1)}</div>}
      <div style={{display:"flex",gap:8}}><Btn onClick={handleSave} full>Guardar</Btn><Btn onClick={()=>setEditing(false)}>Cancelar</Btn></div>
    </div>
  );
  return(
    <div style={{...glassCard,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",gap:14,alignItems:"center"}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:G.sageLight,border:`1px solid ${G.sageBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🌿</div>
        <div><p style={{margin:0,fontSize:13,fontWeight:600,color:G.text}}>{profile.name}</p><p style={{margin:"2px 0 0",fontSize:11,color:G.hint}}>{profile.weight}kg · {profile.height}cm · IMC {bmi}</p></div>
      </div>
      <div style={{textAlign:"right"}}>
        <p style={{margin:0,fontSize:18,fontWeight:600,color:G.sage}}>{protGoal}<span style={{fontSize:11,color:G.hint,fontWeight:400}}> g prot</span></p>
        <button onClick={()=>setEditing(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:G.hint,padding:0,fontFamily:"inherit",marginTop:2}}>editar</button>
      </div>
    </div>
  );
}
function ProfileSetup({onSave}){
  const[form,setForm]=useState({name:"",weight:"",height:""});
  const[saving,setSaving]=useState(false);
  const valid=form.name&&+form.weight>0&&+form.height>0;
  const bmi=form.weight&&form.height?(+form.weight/((+form.height/100)**2)).toFixed(1):null;
  const prot=form.weight?Math.round(+form.weight*2):null;
  const handleSave=async()=>{
    setSaving(true);
    const perfil={name:form.name,weight:+form.weight,height:+form.height};
    await savePerfil(perfil);onSave(perfil);setSaving(false);
  };
  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{...glassCard,padding:32,maxWidth:360,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:36,marginBottom:10}}>🌿</div>
          <h1 style={{margin:0,fontSize:22,fontWeight:300,color:G.text,letterSpacing:"-0.02em"}}>NutriQuest</h1>
          <p style={{margin:"6px 0 0",fontSize:12,color:G.hint,letterSpacing:"0.04em"}}>TU COMPAÑERO NUTRICIONAL</p>
        </div>
        <label style={lbl}>Nombre</label>
        <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Tu nombre" style={inp}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div><label style={lbl}>Peso (kg)</label><input type="number" min="30" max="200" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} placeholder="70" style={inp}/></div>
          <div><label style={lbl}>Altura (cm)</label><input type="number" min="100" max="230" value={form.height} onChange={e=>setForm(f=>({...f,height:e.target.value}))} placeholder="175" style={inp}/></div>
        </div>
        {prot&&(
          <div style={{background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><p style={{margin:0,color:G.hint,fontSize:11,letterSpacing:"0.04em"}}>META DE PROTEÍNA</p><p style={{margin:"3px 0 0",fontSize:20,fontWeight:600,color:G.sage}}>{prot}g<span style={{fontSize:11,fontWeight:400,color:G.hint}}>/día</span></p></div>
              {bmi&&<div style={{textAlign:"right"}}><p style={{margin:0,color:G.hint,fontSize:11,letterSpacing:"0.04em"}}>IMC</p><p style={{margin:"3px 0 0",fontSize:20,fontWeight:600,color:G.sage}}>{bmi}</p></div>}
            </div>
            <p style={{margin:"8px 0 0",fontSize:11,color:G.hint}}>Calculado como 2g × kg de peso corporal</p>
          </div>
        )}
        <Btn onClick={handleSave} full disabled={!valid} loading={saving}>Comenzar</Btn>
      </div>
    </div>
  );
}

// ── MetricsTab ─────────────────────────────────────────────────────────────
function MetricsTab({days,fetchWeekSummary,weekSummaryLoading,weekSummary,showRanking,setShowRanking}){
  const[period,setPeriod]=useState("week");
  const getKey=d=>d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});

  const getPeriodData=()=>{
    if(period==="week"){
      return Array.from({length:7},(_,i)=>{
        const d=new Date();d.setDate(d.getDate()-6+i);
        const k=getKey(d);
        const day=days[k]||{};
        const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];
        const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;
        return{key:k,label:d.toLocaleDateString("es",{weekday:"short"}),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0)),workout:day.workout};
      });
    }
    if(period==="month"){
      return Array.from({length:30},(_,i)=>{
        const d=new Date();d.setDate(d.getDate()-29+i);
        const k=getKey(d);
        const day=days[k]||{};
        const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];
        const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;
        return{key:k,label:d.getDate().toString(),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0)),workout:day.workout};
      });
    }
    return Array.from({length:12},(_,i)=>{
      const d=new Date();d.setMonth(d.getMonth()-11+i);d.setDate(1);
      const yr=d.getFullYear(),mo=d.getMonth();
      const mDays=Object.entries(days).filter(([k])=>{const dd=new Date(k+"T12:00:00");return dd.getFullYear()===yr&&dd.getMonth()===mo;});
      const allM=mDays.flatMap(([,day])=>[...Object.values(day.meals||{}),...(day.snacks||[])]);
      const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;
      const prot=mDays.length?mDays.reduce((acc,[,day])=>acc+[...Object.values(day.meals||{}),...(day.snacks||[])].reduce((a,m)=>a+(m.protein_g||0),0),0)/mDays.length:0;
      return{key:`${yr}-${mo}`,label:d.toLocaleDateString("es",{month:"short"}),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(prot),workouts:mDays.filter(([,day])=>day.workout).length};
    });
  };

  const data=getPeriodData();
  const maxProt=Math.max(...data.map(d=>d.prot),1);
  const scoreDays=data.filter(d=>d.score!=null);
  const avgScore=scoreDays.length?(scoreDays.reduce((a,d)=>a+d.score,0)/scoreDays.length).toFixed(1):"—";
  const avgProt=Math.round(data.reduce((a,d)=>a+d.prot,0)/Math.max(data.length,1));

  const targetPerWeek=3;
  const weeksInPeriod=period==="week"?1:period==="month"?4:52;
  const targetTotal=targetPerWeek*weeksInPeriod;
  const totalWorkouts=period==="year"?data.reduce((a,d)=>a+(d.workouts||0),0):data.filter(d=>d.workout).length;
  const volumePct=Math.min(100,Math.round((totalWorkouts/targetTotal)*100));
  const volumeColor=totalWorkouts>=targetTotal?G.sage:totalWorkouts>=targetTotal*0.7?G.gold:G.red;

  const coherenceDays=Object.values(days).filter(d=>d.workout?.coherence_score);
  const avgCoherence=coherenceDays.length?(coherenceDays.reduce((a,d)=>a+(d.workout.coherence_score||0),0)/coherenceDays.length).toFixed(1):null;

  let currentStreak=0;const sd=new Date();
  while(true){
    const k=getKey(sd);const day=days[k];
    const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);
    if(!has)break;
    currentStreak++;sd.setDate(sd.getDate()-1);
  }
  const allDates=Object.keys(days).filter(k=>k!=="perfil").sort();
  let maxStreak=0,tempStreak=0;
  for(let i=0;i<allDates.length;i++){
    const day=days[allDates[i]];
    const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);
    if(has){tempStreak++;maxStreak=Math.max(maxStreak,tempStreak);}else{tempStreak=0;}
  }
  const calDays=Array.from({length:30},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-29+i);
    const day=days[getKey(d)];
    return day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);
  });

  // Gráfico SVG — coordenadas numéricas absolutas
  const W=300,H=80;
  const barW=W/data.length;
  const linePoints=data.map((d,i)=>({
    x:(i+0.5)*barW,
    y:d.score!=null?H-(d.score/10)*H*0.95:null,
    score:d.score,
  }));
  const validLine=linePoints.filter(p=>p.y!=null);

  const PeriodBtn=({id,label})=>(
    <button onClick={()=>setPeriod(id)} style={{padding:"6px 14px",borderRadius:99,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:period===id?600:400,background:period===id?"rgba(90,122,84,0.2)":"transparent",color:period===id?G.sage:G.hint}}>{label}</button>
  );

  return(
    <div>
      <div style={{...glassSubtle,display:"flex",justifyContent:"center",gap:4,padding:"4px",borderRadius:99,marginBottom:16}}>
        <PeriodBtn id="week" label="Semana"/>
        <PeriodBtn id="month" label="Mes"/>
        <PeriodBtn id="year" label="Año"/>
      </div>

      {/* Gráfico combinado */}
      <div style={{...glassCard,padding:20,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <p style={{margin:0,fontSize:13,fontWeight:500,color:G.text}}>Proteína & Puntaje</p>
          <div style={{display:"flex",gap:12,fontSize:11,color:G.hint}}>
            <span>Score <strong style={{color:G.sage}}>{avgScore}</strong></span>
            <span>Prot <strong style={{color:G.gold}}>{avgProt}g</strong></span>
          </div>
        </div>
        <div style={{position:"relative"}}>
          {/* Barras doradas proteína */}
          <div style={{display:"flex",alignItems:"flex-end",height:80,gap:period==="month"?1:3}}>
            {data.map(d=>{
              const h=d.prot?Math.round((d.prot/maxProt)*76):2;
              return <div key={d.key} style={{flex:1,height:h,background:G.goldLight,borderTop:`2px solid ${G.gold}`,borderRadius:"3px 3px 0 0",alignSelf:"flex-end"}}/>;
            })}
          </div>
          {/* Línea verde puntaje — SVG con coordenadas absolutas */}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{position:"absolute",top:0,left:0,width:"100%",height:80,overflow:"visible"}}
          >
            {validLine.length>1&&(
              <polyline
                points={validLine.map(p=>`${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={G.sage}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.9"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {validLine.map((p,i)=>(
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={G.sage} opacity="0.9" vectorEffect="non-scaling-stroke"/>
            ))}
          </svg>
        </div>
        {/* Etiquetas eje X */}
        <div style={{display:"flex",marginTop:4}}>
          {data.map((d,i)=>(
            (period==="week"||period==="year"||(period==="month"&&i%5===0))
              ?<div key={d.key} style={{flex:1,textAlign:"center"}}><span style={{fontSize:9,color:G.hint}}>{d.label}</span></div>
              :<div key={d.key} style={{flex:1}}/>
          ))}
        </div>
        <div style={{display:"flex",gap:16,marginTop:6,fontSize:11,color:G.hint}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:8,background:G.goldLight,border:`1px solid ${G.gold}`,borderRadius:2,display:"inline-block"}}/>Proteína (g)</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:16,height:2,background:G.sage,display:"inline-block",borderRadius:1}}/>Puntaje</span>
        </div>
      </div>

      {/* Volumen */}
      <div style={{...glassCard,padding:20,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{margin:0,fontSize:13,fontWeight:500,color:G.text}}>Volumen de entrenamiento</p>
          <span style={{fontSize:11,color:G.hint}}>{targetPerWeek}x/sem meta</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{position:"relative",width:72,height:72,flexShrink:0}}>
            <svg width="72" height="72" style={{transform:"rotate(-90deg)"}}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6"/>
              <circle cx="36" cy="36" r="30" fill="none" stroke={volumeColor} strokeWidth="6"
                strokeDasharray={`${2*Math.PI*30}`}
                strokeDashoffset={`${2*Math.PI*30*(1-volumePct/100)}`}
                strokeLinecap="round" opacity="0.85"/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:18,fontWeight:600,color:volumeColor,lineHeight:1}}>{totalWorkouts}</span>
              <span style={{fontSize:9,color:G.hint}}>/{targetTotal}</span>
            </div>
          </div>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 4px",fontSize:13,color:volumeColor,fontWeight:600}}>
              {totalWorkouts>=targetTotal?"✓ Meta cumplida":totalWorkouts>=targetTotal*0.7?"Casi llegás":"Por debajo de la meta"}
            </p>
            <p style={{margin:0,fontSize:11,color:G.hint}}>{period==="week"?"Esta semana":period==="month"?"Último mes":"Este año"} · {totalWorkouts} sesión{totalWorkouts!==1?"es":""}</p>
          </div>
        </div>
      </div>

      {/* Coherencia */}
      <div style={{...glassCard,padding:20,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500,color:G.text}}>Coherencia nutrición-entreno</p>
        {avgCoherence?(
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{textAlign:"center"}}>
              <p style={{margin:0,fontSize:36,fontWeight:300,color:G.sage,lineHeight:1}}>{avgCoherence}</p>
              <p style={{margin:"4px 0 0",fontSize:10,color:G.hint}}>promedio</p>
            </div>
            <div style={{flex:1}}>
              <div style={{background:"rgba(255,255,255,0.3)",borderRadius:99,height:6,overflow:"hidden",marginBottom:8}}>
                <div style={{width:`${(avgCoherence/10)*100}%`,background:G.sage,height:"100%",borderRadius:99,opacity:0.8}}/>
              </div>
              <p style={{margin:0,fontSize:11,color:G.hint}}>{avgCoherence>=8?"Excelente sincronía entre lo que comés y entrenás":avgCoherence>=6?"Buena coherencia, hay margen para mejorar":"Revisá la relación entre tus comidas y entrenamientos"}</p>
            </div>
          </div>
        ):<p style={{margin:0,fontSize:12,color:G.hint,fontStyle:"italic"}}>Registrá entrenamientos para ver este índice.</p>}
      </div>

      {/* Racha */}
      <div style={{...glassCard,padding:20,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500,color:G.text}}>Racha de consistencia</p>
        <div style={{display:"flex",gap:20,marginBottom:16}}>
          <div style={{textAlign:"center"}}>
            <p style={{margin:0,fontSize:32,fontWeight:300,color:G.sage,lineHeight:1}}>{currentStreak}</p>
            <p style={{margin:"4px 0 0",fontSize:10,color:G.hint}}>racha actual</p>
          </div>
          <div style={{width:"1px",background:"rgba(255,255,255,0.3)"}}/>
          <div style={{textAlign:"center"}}>
            <p style={{margin:0,fontSize:32,fontWeight:300,color:G.gold,lineHeight:1}}>{maxStreak}</p>
            <p style={{margin:"4px 0 0",fontSize:10,color:G.hint}}>récord</p>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4}}>
          {calDays.map((active,i)=><div key={i} style={{height:16,borderRadius:3,background:active?"rgba(90,122,84,0.6)":"rgba(255,255,255,0.15)"}}/>)}
        </div>
        <p style={{margin:"6px 0 0",fontSize:10,color:G.hint}}>Últimos 30 días — verde = día activo</p>
      </div>

      <Btn onClick={fetchWeekSummary} loading={weekSummaryLoading} full>Resumen semanal con IA</Btn>
      {weekSummary&&(
        <div style={{...glassCard,padding:20,marginTop:12}}>
          {[["Mejor día",G.sage,weekSummary.best_day],["Peor día",G.red,weekSummary.worst_day],["Logro",G.text,weekSummary.achievement],["Próximo desafío",G.text,weekSummary.challenge]].map(([k,c,v])=>(
            <div key={k} style={{marginBottom:12}}>
              <p style={{margin:"0 0 2px",fontSize:11,color:G.hint,letterSpacing:"0.04em"}}>{k.toUpperCase()}</p>
              <p style={{margin:0,fontSize:13,color:c,fontWeight:500}}>{v}</p>
            </div>
          ))}
          <div style={{background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:10,padding:"12px 14px",marginTop:4,color:G.sage,fontSize:12,fontStyle:"italic"}}>{weekSummary.motivation}</div>
        </div>
      )}
      <button onClick={()=>setShowRanking(r=>!r)} style={{width:"100%",marginTop:10,padding:"9px",borderRadius:10,border:`1px solid ${G.borderSubtle}`,background:"rgba(255,255,255,0.2)",color:G.hint,cursor:"pointer",fontSize:12,fontFamily:"inherit",backdropFilter:blurSm,WebkitBackdropFilter:blurSm}}>{showRanking?"Ocultar":"Ver"} ranking personal</button>
      {showRanking&&<WeekRanking days={days}/>}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App(){
  const[tab,setTab]=useState("today");
  const[profile,setProfile]=useState(null);
  const[days,setDays]=useState({});
  const[loading,setLoading]=useState(true);
  const[xp,setXp]=useState(()=>lsLoad("nq_xp",0));
  const[badges,setBadges]=useState(()=>lsLoad("nq_badges",[]));
  const[streak,setStreak]=useState(()=>lsLoad("nq_streak",0));
  const[confetti,setConfetti]=useState(false);
  const[toasts,setToasts]=useState([]);
  const[histDate,setHistDate]=useState(todayStr());
  const[expandedMeal,setExpandedMeal]=useState(null);
  const[weekSummary,setWeekSummary]=useState(null);
  const[weekSummaryLoading,setWeekSummaryLoading]=useState(false);
  const[showRanking,setShowRanking]=useState(false);
  const[mealInputs,setMealInputs]=useState({});
  const[mealLoading,setMealLoading]=useState({});
  const[snackName,setSnackName]=useState("");
  const[workoutForm,setWorkoutForm]=useState({type:"Fuerza/hipertrofia",duration:45,intensity:3,notes:""});
  const[workoutLoading,setWorkoutLoading]=useState(false);

  const today=todayStr();
  const todayData=days[today]||{meals:{},snacks:[],workout:null};

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const[p,d]=await Promise.all([loadPerfil(),loadAllDays()]);
      setProfile(p);setDays(d);setLoading(false);
    })();
  },[]);

  useEffect(()=>{lsSave("nq_xp",xp);},[xp]);
  useEffect(()=>{lsSave("nq_badges",badges);},[badges]);
  useEffect(()=>{lsSave("nq_streak",streak);},[streak]);

  const addToast=useCallback((badge)=>{
    const id=Date.now();
    setToasts(t=>[...t,{id,...badge}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000);
  },[]);

  const unlockBadge=useCallback((id)=>{
    setBadges(b=>{
      if(b.includes(id))return b;
      const def=BADGES_DEF.find(x=>x.id===id);
      if(def)addToast({emoji:def.emoji,title:def.name,desc:def.desc});
      return[...b,id];
    });
  },[addToast]);

  const calcStreak=useCallback((daysMap)=>{
    let s=0;const d=new Date();
    while(true){
      const k=d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});
      const day=daysMap[k];
      const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0);
      if(!has)break;
      s++;d.setDate(d.getDate()-1);
    }
    return s;
  },[]);

  const updateToday=async(patch)=>{
    const updated={...todayData,...patch};
    setDays(prev=>({...prev,[today]:updated}));
    await saveDay(today,updated);
    const s=calcStreak({...days,[today]:updated});
    setStreak(s);lsSave("nq_streak",s);
  };

  useEffect(()=>{
    if(streak>=3)unlockBadge("streak_3");
    if(streak>=7){unlockBadge("streak_7");unlockBadge("week_complete");}
  },[streak,unlockBadge]);

  const triggerConfetti=()=>{setConfetti(true);setTimeout(()=>setConfetti(false),2000);};

  const handleMealSubmit=async(slotId,label)=>{
    const desc=mealInputs[slotId];
    if(!desc?.trim())return;
    setMealLoading(l=>({...l,[slotId]:true}));
    try{
      const result=await callAI(
        `Analiza esta comida: "${desc}". Devuelve SOLO JSON: score (1-10), protein_g (número), skin_impact ("beneficioso"|"neutro"|"inflamatorio"), hypertrophy ("excelente"|"bueno"|"moderado"|"bajo"), nutrients ([{name,benefit}] máx 4), tip (string breve).`,
        "Eres un nutricionista experto. Responde SOLO con JSON válido, sin texto adicional."
      );
      const meal={desc,...result,slot:slotId,label,timestamp:Date.now()};
      const newMeals={...todayData.meals,[slotId]:meal};
      await updateToday({meals:newMeals});
      setXp(x=>x+50+(result.score||0)*5);
      triggerConfetti();
      if(Object.keys(newMeals).length===1&&Object.keys(days).length<=1)unlockBadge("first_meal");
      const dayProt=Object.values(newMeals).reduce((a,m)=>a+(m.protein_g||0),0)+(todayData.snacks||[]).reduce((a,s)=>a+(s.protein_g||0),0);
      if(profile&&dayProt>=profile.weight*2)unlockBadge("protein_goal");
      const scores=Object.values(newMeals).map(m=>m.score||0);
      if(scores.length>=3&&scores.reduce((a,b)=>a+b,0)/scores.length>=9)unlockBadge("perfect_day");
      setMealInputs(i=>({...i,[slotId]:""}));
    }catch{alert("Error al analizar. Intentá de nuevo.");}
    setMealLoading(l=>({...l,[slotId]:false}));
  };

  const handleSnackSubmit=async()=>{
    const desc=mealInputs["snack_new"];
    if(!desc?.trim()||!snackName?.trim())return;
    setMealLoading(l=>({...l,snack_new:true}));
    try{
      const result=await callAI(
        `Analiza este tentempié "${snackName}": "${desc}". Devuelve SOLO JSON: score (1-10), protein_g (número), skin_impact ("beneficioso"|"neutro"|"inflamatorio"), hypertrophy ("excelente"|"bueno"|"moderado"|"bajo"), nutrients ([{name,benefit}] máx 4), tip (string breve).`,
        "Eres un nutricionista experto. Responde SOLO con JSON válido."
      );
      const snack={desc,name:snackName,...result,timestamp:Date.now()};
      await updateToday({snacks:[...(todayData.snacks||[]),snack]});
      setXp(x=>x+40+(result.score||0)*3);
      triggerConfetti();unlockBadge("first_meal");
      setMealInputs(i=>({...i,snack_new:""}));setSnackName("");
    }catch{alert("Error al analizar el tentempié.");}
    setMealLoading(l=>({...l,snack_new:false}));
  };

  const handleWorkoutSubmit=async()=>{
    setWorkoutLoading(true);
    const mealsDesc=[...Object.values(todayData.meals||{}).map(m=>m.desc),...(todayData.snacks||[]).map(s=>s.desc)].join("; ");
    try{
      const result=await callAI(
        `Entreno: ${workoutForm.type}, ${workoutForm.duration}min, intensidad ${workoutForm.intensity}/5. Comidas hoy: "${mealsDesc}". SOLO JSON: coherence_score (1-10), balance (string), protein_ok (bool), strengths ([string]), suggestions ([string]).`,
        "Eres un entrenador y nutricionista. Responde SOLO con JSON válido."
      );
      await updateToday({workout:{...workoutForm,...result,timestamp:Date.now()}});
      setXp(x=>x+80);unlockBadge("first_workout");
      const weekW=Object.entries(days).filter(([d,v])=>{
        const diff=(new Date(today)-new Date(d))/86400000;
        return diff>=0&&diff<7&&v?.workout;
      }).length+1;
      if(weekW>=3)unlockBadge("athlete");
    }catch{alert("Error al analizar el entrenamiento.");}
    setWorkoutLoading(false);
  };

  const fetchWeekSummary=async()=>{
    setWeekSummaryLoading(true);
    const data7=Array.from({length:7},(_,i)=>{
      const d=new Date();d.setDate(d.getDate()-6+i);
      const k=d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});
      const day=days[k]||{};
      const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];
      const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:0;
      return`${k}: score ${Math.round(score*10)/10}, prot ${Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0))}g`;
    }).join("; ");
    try{
      const r=await callAI(
        `7 días de nutrición: ${data7}. SOLO JSON: best_day, worst_day, achievement (string), challenge (string), motivation (string).`,
        "Eres un coach nutricional. Responde SOLO con JSON válido."
      );
      setWeekSummary(r);
    }catch{alert("Error al generar el resumen.");}
    setWeekSummaryLoading(false);
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:G.muted}}>
        <div style={{fontSize:40,marginBottom:12}}>🌿</div>
        <p style={{fontSize:14,letterSpacing:"0.04em"}}>Cargando…</p>
      </div>
    </div>
  );
  if(!profile)return <ProfileSetup onSave={setProfile}/>;

  const proteinGoal=Math.round(profile.weight*2);
  const todayProt=[...Object.values(todayData.meals||{}),...(todayData.snacks||[])].reduce((a,m)=>a+(m.protein_g||0),0);
  const TABS=[
    {id:"today",label:"Hoy"},{id:"workout",label:"Entreno"},
    {id:"history",label:"Historial"},{id:"metrics",label:"Métricas"},{id:"badges",label:"Badges"},
  ];

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1} 0%,${G.bg2} 50%,${G.bg3} 100%)`,color:G.text,padding:20,maxWidth:600,margin:"0 auto"}}>
      <Confetti active={confetti}/>
      <Toast toasts={toasts}/>
      <div style={{textAlign:"center",marginBottom:20}}>
        <h1 style={{margin:"0 0 2px",fontSize:18,fontWeight:300,color:G.text,letterSpacing:"0.02em"}}>🌿 NutriQuest</h1>
        <p style={{margin:0,fontSize:11,color:G.hint,letterSpacing:"0.06em"}}>
          {new Date().toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long",timeZone:"America/Argentina/Buenos_Aires"})}
        </p>
      </div>
      <ProfilePanel profile={profile} onUpdate={setProfile}/>
      <XPBar xp={xp} streak={streak}/>
      <div style={{...glassCard,padding:"12px 18px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8}}>
          <span style={{color:G.hint,letterSpacing:"0.04em",fontSize:11}}>PROTEÍNA HOY</span>
          <span style={{color:todayProt>=proteinGoal?G.sage:G.gold,fontWeight:600}}>{Math.round(todayProt)}g / {proteinGoal}g</span>
        </div>
        <div style={{background:"rgba(255,255,255,0.3)",borderRadius:99,height:5,overflow:"hidden"}}>
          <div style={{width:`${Math.min(100,(todayProt/proteinGoal)*100)}%`,background:G.sage,height:"100%",borderRadius:99,transition:"width 0.6s ease",opacity:0.75}}/>
        </div>
      </div>
      <div style={{...glassSubtle,display:"flex",gap:0,marginBottom:20,overflow:"hidden",padding:4,borderRadius:14}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 6px",background:tab===t.id?"rgba(255,255,255,0.6)":"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:tab===t.id?600:400,color:tab===t.id?G.sage:G.hint,borderRadius:10,transition:"all 0.2s",backdropFilter:tab===t.id?blurSm:"none",WebkitBackdropFilter:tab===t.id?blurSm:"none"}}>{t.label}</button>
        ))}
      </div>

      {tab==="today"&&(
        <div>
          <div style={{...glassCard,overflow:"hidden",marginBottom:16}}>
            {FIXED_SLOTS.map((slot,i)=>(
              <div key={slot.id}>
                <MealSlot slot={slot} meal={todayData.meals?.[slot.id]} input={mealInputs[slot.id]||""} onInput={v=>setMealInputs(x=>({...x,[slot.id]:v}))} loading={mealLoading[slot.id]} onSubmit={()=>handleMealSubmit(slot.id,slot.label)}/>
                {i<FIXED_SLOTS.length-1&&<Divider/>}
              </div>
            ))}
          </div>
          <div style={{...glassCard,padding:"16px 18px"}}>
            <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500,color:G.muted}}>🥜 Tentempiés</p>
            {(todayData.snacks||[]).map((s,i)=>(
              <div key={i} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.4)"}}>
                <p style={{margin:"0 0 6px",fontSize:11,color:G.hint,letterSpacing:"0.04em"}}>{s.name.toUpperCase()}</p>
                <MealCard meal={s}/>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={snackName} onChange={e=>setSnackName(e.target.value)} placeholder="Nombre del tentempié" style={{...inp,marginBottom:0,flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={mealInputs["snack_new"]||""} onChange={e=>setMealInputs(x=>({...x,snack_new:e.target.value}))} placeholder="Describí qué comiste…" style={{...inp,flex:1,marginBottom:0}} onKeyDown={e=>e.key==="Enter"&&handleSnackSubmit()}/>
              <Btn loading={mealLoading["snack_new"]} onClick={handleSnackSubmit}>Agregar</Btn>
            </div>
          </div>
        </div>
      )}

      {tab==="workout"&&(
        <div style={{...glassCard,padding:20}}>
          <p style={{margin:"0 0 16px",fontSize:14,fontWeight:500,color:G.text}}>Entrenamiento de hoy</p>
          {todayData.workout?<WorkoutCard workout={todayData.workout}/>:(
            <div>
              <label style={lbl}>Tipo</label>
              <select value={workoutForm.type} onChange={e=>setWorkoutForm(f=>({...f,type:e.target.value}))} style={inp}>{WORKOUT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
              <label style={lbl}>Duración — {workoutForm.duration} min</label>
              <input type="range" min={15} max={180} step={5} value={workoutForm.duration} onChange={e=>setWorkoutForm(f=>({...f,duration:+e.target.value}))} style={{width:"100%",marginBottom:8}}/>
              <label style={lbl}>Intensidad — {workoutForm.intensity} / 5</label>
              <input type="range" min={1} max={5} step={1} value={workoutForm.intensity} onChange={e=>setWorkoutForm(f=>({...f,intensity:+e.target.value}))} style={{width:"100%",marginBottom:8}}/>
              <label style={lbl}>Notas</label>
              <textarea value={workoutForm.notes} onChange={e=>setWorkoutForm(f=>({...f,notes:e.target.value}))} placeholder="Opcional…" rows={2} style={{...inp,resize:"vertical"}}/>
              <Btn loading={workoutLoading} onClick={handleWorkoutSubmit} full>Analizar con IA</Btn>
            </div>
          )}
        </div>
      )}

      {tab==="history"&&(
        <div>
          <input type="date" value={histDate} onChange={e=>setHistDate(e.target.value)} style={{...inp,marginBottom:16}}/>
          {(()=>{
            const hDay=days[histDate];
            if(!hDay)return <p style={{color:G.hint,textAlign:"center",padding:24,fontSize:13}}>Sin registros para este día.</p>;
            const allH=[...Object.values(hDay.meals||{}),...(hDay.snacks||[])];
            const avgScore=allH.length?(allH.reduce((a,m)=>a+(m.score||0),0)/allH.length).toFixed(1):"—";
            const totProt=Math.round(allH.reduce((a,m)=>a+(m.protein_g||0),0));
            return(
              <div>
                <div style={{...glassCard,padding:"14px 18px",marginBottom:12}}>
                  <p style={{margin:"0 0 8px",fontWeight:500,fontSize:14}}>{new Date(histDate+"T12:00:00").toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}</p>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <Tag>{allH.length} comida{allH.length!==1?"s":""}</Tag>
                    <Tag bg={G.goldLight} color={G.gold} border="rgba(180,148,72,0.25)">⭐ {avgScore}</Tag>
                    <Tag>💪 {totProt}g</Tag>
                    {hDay.workout&&<Tag>🏋️ {hDay.workout.type}</Tag>}
                  </div>
                </div>
                {FIXED_SLOTS.map(slot=>{
                  const m=hDay.meals?.[slot.id];if(!m)return null;
                  const key=`${histDate}-${slot.id}`;const isExp=expandedMeal===key;
                  return(
                    <div key={key} style={{...glassCard,padding:"14px 18px",marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",cursor:"pointer",marginBottom:6}} onClick={()=>setExpandedMeal(isExp?null:key)}>
                        <span style={{fontWeight:500,fontSize:13}}>{slot.emoji} {slot.label}</span>
                        <span style={{fontSize:10,color:G.hint}}>{isExp?"▲":"▼"}</span>
                      </div>
                      <p style={{margin:0,fontSize:12,color:G.muted}}>{m.desc}</p>
                      {isExp&&<MealDetails meal={m}/>}
                    </div>
                  );
                })}
                {(hDay.snacks||[]).map((s,i)=>{
                  const key=`${histDate}-snack-${i}`;const isExp=expandedMeal===key;
                  return(
                    <div key={key} style={{...glassCard,padding:"14px 18px",marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",cursor:"pointer",marginBottom:6}} onClick={()=>setExpandedMeal(isExp?null:key)}>
                        <span style={{fontWeight:500,fontSize:13}}>🥜 {s.name}</span>
                        <span style={{fontSize:10,color:G.hint}}>{isExp?"▲":"▼"}</span>
                      </div>
                      <p style={{margin:0,fontSize:12,color:G.muted}}>{s.desc}</p>
                      {isExp&&<MealDetails meal={s}/>}
                    </div>
                  );
                })}
                {hDay.workout&&(
                  <div style={{...glassCard,padding:"14px 18px"}}>
                    <p style={{margin:"0 0 10px",fontWeight:500,fontSize:13}}>🏋️ {hDay.workout.type}</p>
                    <WorkoutCard workout={hDay.workout} compact/>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {tab==="metrics"&&(
        <MetricsTab
          days={days}
          fetchWeekSummary={fetchWeekSummary}
          weekSummaryLoading={weekSummaryLoading}
          weekSummary={weekSummary}
          showRanking={showRanking}
          setShowRanking={setShowRanking}
        />
      )}

      {tab==="badges"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {BADGES_DEF.map(b=>{
            const unlocked=badges.includes(b.id);
            return(
              <div key={b.id} style={{...unlocked?glassCard:glassSubtle,padding:16,textAlign:"center",opacity:unlocked?1:0.5}}>
                <div style={{fontSize:26,marginBottom:8,filter:unlocked?"none":"grayscale(1) opacity(0.4)"}}>{b.emoji}</div>
                <p style={{margin:"0 0 3px",fontWeight:500,fontSize:12,color:G.text}}>{b.name}</p>
                <p style={{margin:0,fontSize:11,color:G.hint,lineHeight:1.4}}>{b.desc}</p>
                {unlocked&&<p style={{margin:"8px 0 0",fontSize:10,color:G.sage,fontWeight:600,letterSpacing:"0.04em"}}>✓ DESBLOQUEADO</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
