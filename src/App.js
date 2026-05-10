import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Onboarding from "./Onboarding";

const supabase = createClient(
  "https://pbxxevlzcezkmeyxsydn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBieHhldmx6Y2V6a21leXhzeWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTI5MzcsImV4cCI6MjA5MzcyODkzN30.tsC-3kM9orTRdCPip84GdctDlXSSaOmv8UquELx-bR4"
);

const G = {
  glass:"rgba(255,255,255,0.55)",glassDark:"rgba(255,255,255,0.35)",glassSubtle:"rgba(255,255,255,0.25)",
  border:"rgba(255,255,255,0.6)",borderSubtle:"rgba(255,255,255,0.35)",
  text:"#2a3428",muted:"#5a6b57",hint:"#93a48f",
  sage:"#5a7a54",sageMid:"#87a882",sageLight:"rgba(138,180,132,0.18)",sageBorder:"rgba(90,122,84,0.3)",
  gold:"#8a6c2a",goldLight:"rgba(180,148,72,0.15)",red:"#8a4040",redLight:"rgba(180,80,80,0.12)",
  bg1:"#c8d8c4",bg2:"#e8e0d0",bg3:"#d4cabb",
};
const blur = "blur(14px)", blurSm = "blur(8px)";

const LEVELS = [
  {name:"Novato",emoji:"🌱",xp:0},{name:"Aprendiz",emoji:"🌿",xp:200},
  {name:"Consciente",emoji:"🍃",xp:500},{name:"Atleta",emoji:"🌾",xp:1000},{name:"Leyenda",emoji:"🌳",xp:2000},
];
const BADGES_DEF = [
  {id:"first_meal",emoji:"🍽️",name:"Primer registro",desc:"Registraste tu primera comida"},
  {id:"week_complete",emoji:"📅",name:"Semana completa",desc:"7 días registrando"},
  {id:"streak_3",emoji:"🔥",name:"En racha",desc:"3 días consecutivos"},
  {id:"streak_7",emoji:"⚡",name:"Imparable",desc:"7 días consecutivos"},
  {id:"protein_goal",emoji:"💪",name:"Meta proteína",desc:"Alcanzaste tu meta de proteína"},
  {id:"perfect_day",emoji:"⭐",name:"Día perfecto",desc:"Promedio ≥ 9 en un día"},
  {id:"first_workout",emoji:"🏋️",name:"A entrenar",desc:"Primer entrenamiento registrado"},
  {id:"athlete",emoji:"🥊",name:"Atleta en proceso",desc:"3 entrenamientos en la semana"},
];
const FIXED_SLOTS = [
  {id:"breakfast",label:"Desayuno",emoji:"🌅"},{id:"lunch",label:"Almuerzo",emoji:"🍽️"},
  {id:"snack",label:"Merienda",emoji:"☕"},{id:"dinner",label:"Cena",emoji:"🌙"},
];
const WORKOUT_TYPES = ["Fuerza/hipertrofia","Cardio","Funcional/HIIT","Movilidad","Deporte"];
const todayStr = () => new Date().toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});

// ── Hook responsive ────────────────────────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isDesktop;
}

// ── Supabase helpers ───────────────────────────────────────────────────────
async function loadAllDays(userId) {
  const {data,error} = await supabase.from("registros").select("*").eq("user_id",userId);
  if (error) { console.error(error); return {}; }
  const map = {};
  data.forEach(row => {
    if (row.fecha === "perfil") return;
    map[row.fecha] = {meals:row.meals||{},snacks:row.snacks||[],workout:row.workout||null};
  });
  return map;
}
async function loadPerfil(userId) {
  const {data,error} = await supabase.from("registros").select("perfil").eq("user_id",userId).eq("fecha","perfil").maybeSingle();
  if (error||!data) return null;
  return data.perfil;
}
async function savePerfil(userId, perfil) {
  await supabase.from("registros").upsert({user_id:userId,auth_user_id:userId,fecha:"perfil",perfil},{onConflict:"user_id,fecha"});
}
async function saveDay(userId, fecha, dayData) {
  await supabase.from("registros").upsert({
    user_id:userId, auth_user_id:userId, fecha,
    meals:dayData.meals||{}, snacks:dayData.snacks||[], workout:dayData.workout||null,
  },{onConflict:"user_id,fecha"});
}
const lsLoad = (k,def) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):def; } catch { return def; } };
const lsSave = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

async function callAI(prompt, system) {
  const res = await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,system})});
  const data = await res.json();
  const text = data.content?.find(b=>b.type==="text")?.text||"";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

// ── Shared styles (static) ─────────────────────────────────────────────────
const glassCard = {background:G.glass,backdropFilter:blur,WebkitBackdropFilter:blur,border:`1px solid ${G.border}`,borderRadius:18};
const glassSubtle = {background:G.glassDark,backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.borderSubtle}`,borderRadius:12};

// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const inp = {width:"100%",background:"rgba(255,255,255,0.5)",border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"12px 14px",fontSize:16,boxSizing:"border-box",marginBottom:8,outline:"none",fontFamily:"inherit"};
  const lbl = {display:"block",fontSize:13,color:G.hint,marginBottom:5,marginTop:12,letterSpacing:"0.04em",textTransform:"uppercase"};

  const handleSubmit = async () => {
    if (!email||!password) return;
    setLoading(true);
    setMessage("");
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else if (!isLogin) setMessage("Revisá tu email para confirmar tu cuenta.");
    setLoading(false);
  };

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{...glassCard,padding:36,maxWidth:400,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:30}}>
          <div style={{fontSize:44,marginBottom:12}}>🌿</div>
          <h1 style={{margin:0,fontSize:28,fontWeight:300,color:G.text,letterSpacing:"-0.02em"}}>NutriQuest</h1>
          <p style={{margin:"8px 0 0",fontSize:13,color:G.hint,letterSpacing:"0.03em"}}>TU COMPAÑERO NUTRICIONAL</p>
        </div>

        <label style={lbl}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          placeholder="tu@email.com"
          style={inp}
          onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
        />

        <label style={lbl}>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          placeholder="••••••••"
          style={inp}
          onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
        />

        {message && (
          <div style={{background:message.includes("email")?G.sageLight:G.redLight,border:`1px solid ${message.includes("email")?G.sageBorder:"rgba(180,80,80,0.25)"}`,borderRadius:8,padding:"10px 14px",fontSize:14,color:message.includes("email")?G.sage:G.red,marginBottom:8}}>
            {message}
          </div>
        )}

        <div style={{marginTop:16}}>
          <Btn onClick={handleSubmit} loading={loading} full>
            {isLogin ? "Iniciar sesión" : "Registrarme"}
          </Btn>
        </div>

        <p onClick={()=>{setIsLogin(l=>!l);setMessage("");}} style={{textAlign:"center",marginTop:20,fontSize:14,color:G.hint,cursor:"pointer",userSelect:"none"}}>
          {isLogin ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
          <span style={{color:G.sage,fontWeight:600}}>{isLogin ? "Registrate" : "Iniciá sesión"}</span>
        </p>
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────
function Btn({onClick,loading,children,full,disabled}) {
  return (
    <button onClick={onClick} disabled={loading||disabled} style={{
      padding:"11px 20px",borderRadius:10,border:"none",
      background:"#5a7a54",color:"#fff",fontWeight:600,fontSize:14,
      width:full?"100%":"auto",fontFamily:"inherit",letterSpacing:"0.02em",
      transition:"all 0.2s",cursor:loading||disabled?"not-allowed":"pointer",
      opacity:loading||disabled?0.8:1,
      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
    }}>
      {loading ? (
        <>
          <span style={{width:15,height:15,border:"2px solid rgba(255,255,255,0.4)",borderTop:"2px solid #fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.7s linear infinite"}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        </>
      ) : children}
    </button>
  );
}

function Tag({color,bg,border,children}) {
  return <span style={{fontSize:13,background:bg||G.sageLight,color:color||G.sage,border:`1px solid ${border||G.sageBorder}`,padding:"4px 10px",borderRadius:99,fontWeight:500,letterSpacing:"0.02em"}}>{children}</span>;
}
function Divider() { return <div style={{height:"1px",background:"rgba(255,255,255,0.4)",margin:"0 18px"}}/>; }

function Confetti({active}) {
  if (!active) return null;
  const pieces = Array.from({length:22},(_,i)=>({id:i,left:Math.random()*100,color:[G.sage,G.sageMid,G.gold,"#c8b89a","#8fad8b"][i%5],delay:Math.random()*0.4,size:5+Math.random()*6}));
  return <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999}}>{pieces.map(p=><div key={p.id} style={{position:"absolute",left:`${p.left}%`,top:"-10px",width:p.size,height:p.size,borderRadius:"50%",background:p.color,animation:`fall 1.6s ${p.delay}s ease-in forwards`}}/>)}<style>{`@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:0;}}`}</style></div>;
}
function Toast({toasts}) {
  return <div style={{position:"fixed",bottom:24,right:20,zIndex:9998,display:"flex",flexDirection:"column",gap:8}}>{toasts.map(t=><div key={t.id} style={{background:G.glass,backdropFilter:blur,WebkitBackdropFilter:blur,border:`1px solid ${G.border}`,color:G.text,padding:"14px 18px",borderRadius:14,display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${G.sage}`,animation:"slideIn 0.3s ease"}}><span style={{fontSize:22}}>{t.emoji}</span><div><div style={{fontWeight:600,fontSize:15}}>{t.title}</div><div style={{fontSize:13,color:G.muted}}>{t.desc}</div></div></div>)}<style>{`@keyframes slideIn{from{transform:translateX(120%);opacity:0;}to{transform:translateX(0);opacity:1;}}`}</style></div>;
}

function XPBar({xp,streak}) {
  const li = LEVELS.reduce((a,l,i)=>xp>=l.xp?i:a,0);
  const lvl = LEVELS[li], next = LEVELS[li+1];
  const pct = next?Math.round(((xp-lvl.xp)/(next.xp-lvl.xp))*100):100;
  return <div style={{...glassCard,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:26}}>{lvl.emoji}</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:6}}><span style={{fontWeight:600,color:G.sage,letterSpacing:"0.03em"}}>{lvl.name}</span><span style={{color:G.hint,fontSize:13}}>{next?`${xp} / ${next.xp} xp`:"Máximo"}</span></div><div style={{background:"rgba(255,255,255,0.35)",borderRadius:99,height:6,overflow:"hidden"}}><div style={{width:`${pct}%`,background:G.sage,height:"100%",borderRadius:99,transition:"width 0.6s ease",opacity:0.8}}/></div></div>{streak>0&&<div style={{...glassSubtle,display:"flex",flexDirection:"column",alignItems:"center",padding:"6px 12px",minWidth:42,borderRadius:10}}><span style={{fontSize:16}}>🔥</span><span style={{fontSize:12,color:G.gold,fontWeight:600,marginTop:1}}>{streak}d</span></div>}</div>;
}

function MealDetails({meal, D}) {
  const hyC = {excelente:G.sage,bueno:G.sageMid,moderado:G.gold,bajo:G.red};
  return <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.4)"}}><div style={{marginBottom:8,fontSize:D.md}}><span style={{color:G.hint,fontSize:D.sm}}>Hipertrofia — </span><span style={{color:hyC[meal.hypertrophy]||G.muted,fontWeight:600}}>{meal.hypertrophy}</span></div>{(meal.nutrients||[]).map((n,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6}}><span style={{color:G.sage,fontWeight:600,minWidth:100,fontSize:D.sm}}>{n.name}</span><span style={{color:G.muted,fontSize:D.sm,lineHeight:1.5}}>{n.benefit}</span></div>)}{meal.tip&&<div style={{marginTop:10,background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:8,padding:"10px 14px",color:G.sage,fontSize:D.sm,fontStyle:"italic"}}>💡 {meal.tip}</div>}</div>;
}

function EditMealModal({meal,onSave,onDelete,onClose}) {
  const [desc,setDesc] = useState(meal.desc||"");
  const [date,setDate] = useState(todayStr());
  const dateLabel = new Date(date+"T12:00:00").toLocaleDateString("es",{day:"numeric",month:"short",year:"numeric",timeZone:"America/Argentina/Buenos_Aires"});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(40,60,40,0.25)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"rgba(255,255,255,0.88)",border:"1px solid rgba(255,255,255,0.75)",borderRadius:18,padding:24,width:"100%",maxWidth:420}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <p style={{margin:0,fontSize:18,fontWeight:500,color:"#2e4a2b"}}>Editar comida</p>
          <div style={{position:"relative",display:"inline-flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:14,color:"#93a48f"}}>{dateLabel}</span>
            <span style={{fontSize:15,color:"#93a48f"}}>✏️</span>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%",border:"none",background:"none",fontSize:0}}/>
          </div>
        </div>
        <label style={{display:"block",fontSize:13,color:"#93a48f",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Descripción</label>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3}
          style={{width:"100%",background:"rgba(255,255,255,0.65)",border:"1px solid rgba(200,200,200,0.4)",borderRadius:10,color:"#2a3428",padding:"12px 14px",fontSize:16,boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",outline:"none",minHeight:80}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:20}}>
          <button onClick={onClose} style={{padding:12,borderRadius:10,border:"1px solid rgba(180,180,180,0.35)",background:"transparent",color:"#93a48f",fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
          <button onClick={()=>onSave(desc,date)} style={{padding:12,borderRadius:10,border:"none",background:"#5a7a54",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Guardar</button>
        </div>
        <button onClick={()=>{if(window.confirm("¿Eliminar esta comida?"))onDelete();}}
          style={{display:"block",width:"100%",marginTop:18,textAlign:"center",fontSize:14,color:"#8a4040",textDecoration:"underline",textUnderlineOffset:3,background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit"}}>
          Eliminar esta comida
        </button>
      </div>
    </div>
  );
}

function MealCard({meal,onDelete,onSave,D}) {
  const [exp,setExp] = useState(false);
  const [editing,setEditing] = useState(false);
  const skinC = {beneficioso:G.sage,neutro:G.muted,inflamatorio:G.red};
  const skinBg = {beneficioso:G.sageLight,neutro:"rgba(255,255,255,0.2)",inflamatorio:G.redLight};
  const skinBd = {beneficioso:G.sageBorder,neutro:G.borderSubtle,inflamatorio:"rgba(180,80,80,0.25)"};
  return (
    <div>
      {editing&&<EditMealModal meal={meal} onSave={(desc,date)=>{onSave(desc,date);setEditing(false);}} onDelete={()=>{onDelete();setEditing(false);}} onClose={()=>setEditing(false)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,cursor:"pointer"}} onClick={()=>setExp(e=>!e)}>
          <p style={{margin:"0 0 8px",color:G.text,fontSize:D.md,lineHeight:1.6}}>{meal.desc}</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <Tag bg={G.goldLight} color={G.gold} border="rgba(180,148,72,0.25)">⭐ {meal.score}/10</Tag>
            <Tag>💪 {meal.protein_g}g</Tag>
            <Tag bg={skinBg[meal.skin_impact]} color={skinC[meal.skin_impact]} border={skinBd[meal.skin_impact]}>🌿 {meal.skin_impact}</Tag>
          </div>
        </div>
        <button onClick={()=>setEditing(true)} style={{background:"none",border:`1px solid ${G.borderSubtle}`,borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:13,color:G.hint,marginLeft:12,flexShrink:0,fontFamily:"inherit"}}>✏️</button>
      </div>
      {exp&&<MealDetails meal={meal} D={D}/>}
    </div>
  );
}

function MealSlot({slot,meal,input,onInput,loading,onSubmit,onDelete,onSave,D}) {
  const inp = {width:"100%",background:"rgba(255,255,255,0.5)",backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"11px 14px",fontSize:D.md,boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
  return (
    <div style={{padding:"18px 20px"}}>
      <div style={{fontWeight:500,fontSize:D.md,color:G.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:D.lg}}>{slot.emoji}</span>
        <span style={{letterSpacing:"0.01em",color:G.muted}}>{slot.label}</span>
      </div>
      {meal
        ? <MealCard meal={meal} onDelete={onDelete} onSave={onSave} D={D}/>
        : <div style={{display:"flex",gap:8}}><input value={input} onChange={e=>onInput(e.target.value)} placeholder="¿Qué comiste?" style={{...inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&onSubmit()}/><Btn loading={loading} onClick={onSubmit}>Analizar</Btn></div>
      }
    </div>
  );
}

function WorkoutCard({workout,compact,D}) {
  return <div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:compact?0:10}}><Tag>{workout.type}</Tag><Tag>{workout.duration} min</Tag><Tag>{"●".repeat(workout.intensity)} int.</Tag></div>{!compact&&workout.coherence_score&&<div style={{marginTop:12}}><div style={{fontSize:D.md,marginBottom:8}}><span style={{color:G.hint,fontSize:D.sm}}>Coherencia — </span><span style={{fontWeight:600,color:G.sage}}>{workout.coherence_score}/10</span></div><p style={{fontSize:D.md,color:G.muted,margin:"0 0 8px",lineHeight:1.6}}>{workout.balance}</p>{(workout.strengths||[]).map((s,i)=><div key={i} style={{fontSize:D.md,color:G.sage,marginBottom:4}}>✓ {s}</div>)}{(workout.suggestions||[]).map((s,i)=><div key={i} style={{fontSize:D.md,color:G.gold,marginBottom:4}}>→ {s}</div>)}</div>}</div>;
}

function WeekRanking({days,D}) {
  const weeks = {};
  Object.entries(days).forEach(([date,day])=>{
    const d = new Date(date+"T12:00:00");
    const mon = new Date(d); mon.setDate(d.getDate()-d.getDay()+1);
    const wk = mon.toISOString().slice(0,10);
    if (!weeks[wk]) weeks[wk]=[];
    const allM = [...Object.values(day.meals||{}),...(day.snacks||[])];
    weeks[wk].push(allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:0);
  });
  const ranked = Object.entries(weeks).map(([wk,arr])=>({wk,score:(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1),days:arr.length})).sort((a,b)=>b.score-a.score);
  return <div style={{...glassSubtle,padding:18,marginTop:10,borderRadius:14}}><p style={{margin:"0 0 12px",fontSize:D.md,fontWeight:600,color:G.text}}>Mejores semanas</p>{ranked.slice(0,5).map((r,i)=><div key={r.wk} style={{display:"flex",justifyContent:"space-between",fontSize:D.sm,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.3)"}}><span style={{color:G.muted}}>{["🥇","🥈","🥉","4","5"][i]} {r.wk}</span><span style={{color:G.sage,fontWeight:600}}>⭐ {r.score} · {r.days}d</span></div>)}</div>;
}

function ProfilePanel({profile,onUpdate,userId,D}) {
  const [editing,setEditing] = useState(false);
  const [form,setForm] = useState({name:profile.name,weight:profile.weight,height:profile.height});
  const bmi = (profile.weight/((profile.height/100)**2)).toFixed(1);
  const protGoal = Math.round(profile.weight*2);
  const inp = {width:"100%",background:"rgba(255,255,255,0.5)",backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"11px 14px",fontSize:D.md,boxSizing:"border-box",marginBottom:8,outline:"none",fontFamily:"inherit"};
  const lbl = {display:"block",fontSize:D.sm,color:G.hint,marginBottom:5,marginTop:12,letterSpacing:"0.04em",textTransform:"uppercase"};
  const handleSave = async () => {
    if (!form.name||!+form.weight||!+form.height) return;
    const updated = {name:form.name,weight:+form.weight,height:+form.height};
    await savePerfil(userId, updated); onUpdate(updated); setEditing(false);
  };
  if (editing) return (
    <div style={{...glassCard,padding:"18px 20px",marginBottom:16}}>
      <p style={{margin:"0 0 14px",fontSize:D.lg,fontWeight:600,color:G.text}}>Editar perfil</p>
      <label style={lbl}>Nombre</label>
      <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><label style={lbl}>Peso (kg)</label><input type="number" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} style={inp}/></div>
        <div><label style={lbl}>Altura (cm)</label><input type="number" value={form.height} onChange={e=>setForm(f=>({...f,height:e.target.value}))} style={inp}/></div>
      </div>
      {form.weight&&form.height&&<div style={{background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:8,padding:"10px 14px",fontSize:D.sm,color:G.sage,marginBottom:10}}>Meta proteína: <strong>{Math.round(+form.weight*2)}g/día</strong> · IMC: {(+form.weight/((+form.height/100)**2)).toFixed(1)}</div>}
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={handleSave} full>Guardar</Btn>
        <button onClick={()=>setEditing(false)} style={{padding:"11px 20px",borderRadius:10,border:`1px solid rgba(180,180,180,0.35)`,background:"transparent",color:G.hint,fontSize:D.sm,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
      </div>
    </div>
  );
  return (
    <div style={{...glassCard,padding:"16px 20px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",gap:14,alignItems:"center"}}>
        <div style={{width:42,height:42,borderRadius:"50%",background:G.sageLight,border:`1px solid ${G.sageBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌿</div>
        <div>
          <p style={{margin:0,fontSize:D.md,fontWeight:600,color:G.text}}>{profile.name}</p>
          <p style={{margin:"3px 0 0",fontSize:D.sm,color:G.hint}}>{profile.weight}kg · {profile.height}cm · IMC {bmi}</p>
        </div>
      </div>
      <div style={{textAlign:"right"}}>
        <p style={{margin:0,fontSize:D.xl,fontWeight:600,color:G.sage}}>{protGoal}<span style={{fontSize:D.sm,color:G.hint,fontWeight:400}}> g prot</span></p>
        <button onClick={()=>setEditing(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:D.sm,color:G.hint,padding:0,fontFamily:"inherit",marginTop:3}}>editar</button>
      </div>
    </div>
  );
}

function ProfileSetup({onSave, userId}) {
  const D = { xs:"13px",sm:"15px",md:"17px",lg:"20px",xl:"24px" };
  const [form,setForm] = useState({name:"",weight:"",height:""});
  const [saving,setSaving] = useState(false);
  const valid = form.name&&+form.weight>0&&+form.height>0;
  const bmi = form.weight&&form.height?(+form.weight/((+form.height/100)**2)).toFixed(1):null;
  const prot = form.weight?Math.round(+form.weight*2):null;
  const handleSave = async () => { setSaving(true); const perfil={name:form.name,weight:+form.weight,height:+form.height}; await savePerfil(userId, perfil); onSave(perfil); setSaving(false); };
  const inp = {width:"100%",background:"rgba(255,255,255,0.5)",border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"12px 14px",fontSize:D.md,boxSizing:"border-box",marginBottom:8,outline:"none",fontFamily:"inherit"};
  const lbl = {display:"block",fontSize:D.sm,color:G.hint,marginBottom:5,marginTop:12,letterSpacing:"0.04em",textTransform:"uppercase"};
  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{...glassCard,padding:36,maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:30}}>
          <div style={{fontSize:44,marginBottom:12}}>🌿</div>
          <h1 style={{margin:0,fontSize:D.xl,fontWeight:300,color:G.text,letterSpacing:"-0.02em"}}>NutriQuest</h1>
          <p style={{margin:"8px 0 0",fontSize:D.sm,color:G.hint,letterSpacing:"0.03em"}}>TU COMPAÑERO NUTRICIONAL</p>
        </div>
        <label style={lbl}>Nombre</label>
        <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Tu nombre" style={inp}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div><label style={lbl}>Peso (kg)</label><input type="number" min="30" max="200" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} placeholder="70" style={inp}/></div>
          <div><label style={lbl}>Altura (cm)</label><input type="number" min="100" max="230" value={form.height} onChange={e=>setForm(f=>({...f,height:e.target.value}))} placeholder="175" style={inp}/></div>
        </div>
        {prot&&(
          <div style={{background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><p style={{margin:0,color:G.hint,fontSize:D.sm,letterSpacing:"0.04em"}}>META DE PROTEÍNA</p><p style={{margin:"4px 0 0",fontSize:D.xl,fontWeight:600,color:G.sage}}>{prot}g<span style={{fontSize:D.sm,fontWeight:400,color:G.hint}}>/día</span></p></div>
              {bmi&&<div style={{textAlign:"right"}}><p style={{margin:0,color:G.hint,fontSize:D.sm,letterSpacing:"0.04em"}}>IMC</p><p style={{margin:"4px 0 0",fontSize:D.xl,fontWeight:600,color:G.sage}}>{bmi}</p></div>}
            </div>
            <p style={{margin:"8px 0 0",fontSize:D.sm,color:G.hint}}>Calculado como 2g × kg de peso corporal</p>
          </div>
        )}
        <Btn onClick={handleSave} full disabled={!valid} loading={saving}>Comenzar</Btn>
      </div>
    </div>
  );
}

function MetricsTab({days,fetchWeekSummary,weekSummaryLoading,weekSummary,showRanking,setShowRanking,D}) {
  const [period,setPeriod] = useState("week");
  const getKey = d => d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});
  const getPeriodData = () => {
    if (period==="week") return Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=getKey(d);const day=days[k]||{};const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;return{key:k,label:d.toLocaleDateString("es",{weekday:"short"}),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0)),workout:day.workout};});
    if (period==="month") return Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);const k=getKey(d);const day=days[k]||{};const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;return{key:k,label:d.getDate().toString(),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0)),workout:day.workout};});
    return Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-11+i);d.setDate(1);const yr=d.getFullYear(),mo=d.getMonth();const mDays=Object.entries(days).filter(([k])=>{const dd=new Date(k+"T12:00:00");return dd.getFullYear()===yr&&dd.getMonth()===mo;});const allM=mDays.flatMap(([,day])=>[...Object.values(day.meals||{}),...(day.snacks||[])]);const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;const prot=mDays.length?mDays.reduce((acc,[,day])=>acc+[...Object.values(day.meals||{}),...(day.snacks||[])].reduce((a,m)=>a+(m.protein_g||0),0),0)/mDays.length:0;return{key:`${yr}-${mo}`,label:d.toLocaleDateString("es",{month:"short"}),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(prot),workouts:mDays.filter(([,day])=>day.workout).length};});
  };
  const data = getPeriodData();
  const maxProt = Math.max(...data.map(d=>d.prot),1);
  const scoreDays = data.filter(d=>d.score!=null);
  const avgScore = scoreDays.length?(scoreDays.reduce((a,d)=>a+d.score,0)/scoreDays.length).toFixed(1):"—";
  const avgProt = Math.round(data.reduce((a,d)=>a+d.prot,0)/Math.max(data.length,1));
  const targetPerWeek=3, weeksInPeriod=period==="week"?1:period==="month"?4:52;
  const targetTotal = targetPerWeek*weeksInPeriod;
  const totalWorkouts = period==="year"?data.reduce((a,d)=>a+(d.workouts||0),0):data.filter(d=>d.workout).length;
  const volumePct = Math.min(100,Math.round((totalWorkouts/targetTotal)*100));
  const volumeColor = totalWorkouts>=targetTotal?G.sage:totalWorkouts>=targetTotal*0.7?G.gold:G.red;
  const coherenceDays = Object.values(days).filter(d=>d.workout?.coherence_score);
  const avgCoherence = coherenceDays.length?(coherenceDays.reduce((a,d)=>a+(d.workout.coherence_score||0),0)/coherenceDays.length).toFixed(1):null;
  let currentStreak=0; const sd=new Date();
  while(true){const k=getKey(sd);const day=days[k];const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);if(!has)break;currentStreak++;sd.setDate(sd.getDate()-1);}
  const allDates=Object.keys(days).filter(k=>k!=="perfil").sort();
  let maxStreak=0,tempStreak=0;
  for(let i=0;i<allDates.length;i++){const day=days[allDates[i]];const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);if(has){tempStreak++;maxStreak=Math.max(maxStreak,tempStreak);}else{tempStreak=0;}}
  const calDays=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);const day=days[getKey(d)];return day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);});
  const gap = period==="month"?1:3;
  const PeriodBtn = ({id,label}) => <button onClick={()=>setPeriod(id)} style={{padding:"7px 16px",borderRadius:99,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:D.sm,fontWeight:period===id?600:400,background:period===id?"rgba(90,122,84,0.2)":"transparent",color:period===id?G.sage:G.hint}}>{label}</button>;

  return (
    <div>
      <div style={{...glassSubtle,display:"flex",justifyContent:"center",gap:4,padding:"4px",borderRadius:99,marginBottom:16}}>
        <PeriodBtn id="week" label="Semana"/>
        <PeriodBtn id="month" label="Mes"/>
        <PeriodBtn id="year" label="Año"/>
      </div>
      <div style={{...glassCard,padding:20,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <p style={{margin:0,fontSize:D.md,fontWeight:500,color:G.text}}>Proteína & Puntaje</p>
          <div style={{display:"flex",gap:12,fontSize:D.sm,color:G.hint}}>
            <span>Score <strong style={{color:G.sage}}>{avgScore}</strong></span>
            <span>Prot <strong style={{color:G.gold}}>{avgProt}g</strong></span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",height:60,gap}}>{data.map(d=>{const h=d.prot?Math.round((d.prot/maxProt)*56):2;return <div key={d.key} style={{flex:1,height:h,background:G.goldLight,borderTop:`2px solid ${G.gold}`,borderRadius:"3px 3px 0 0",alignSelf:"flex-end"}}/>;})}</div>
        <div style={{display:"flex",gap,marginTop:4}}>{data.map((d,i)=>(period==="week"||period==="year"||(period==="month"&&i%5===0))?<div key={d.key} style={{flex:1,textAlign:"center"}}><span style={{fontSize:11,color:G.hint}}>{d.label}</span></div>:<div key={d.key} style={{flex:1}}/>)}</div>
        <div style={{height:"1px",background:"rgba(255,255,255,0.35)",margin:"6px 0"}}/>
        <div style={{display:"flex",gap,marginBottom:8}}>{data.map(d=><div key={d.key} style={{flex:1,textAlign:"center"}}><span style={{fontSize:D.sm,fontWeight:700,color:G.sage}}>{d.score!=null?d.score:"·"}</span></div>)}</div>
        <div style={{display:"flex",gap:16,marginTop:16,fontSize:D.sm,color:G.hint}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:8,background:G.goldLight,border:`1px solid ${G.gold}`,borderRadius:2,display:"inline-block"}}/>Proteína (g)</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:D.sm,fontWeight:700,color:G.sage}}>7</span><span style={{marginLeft:4}}>Puntaje</span></span>
        </div>
      </div>
      <div style={{...glassCard,padding:20,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{margin:0,fontSize:D.md,fontWeight:500,color:G.text}}>Volumen de entrenamiento</p>
          <span style={{fontSize:D.sm,color:G.hint}}>{targetPerWeek}x/sem meta</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{position:"relative",width:72,height:72,flexShrink:0}}>
            <svg width="72" height="72" style={{transform:"rotate(-90deg)"}}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6"/>
              <circle cx="36" cy="36" r="30" fill="none" stroke={volumeColor} strokeWidth="6" strokeDasharray={`${2*Math.PI*30}`} strokeDashoffset={`${2*Math.PI*30*(1-volumePct/100)}`} strokeLinecap="round" opacity="0.85"/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:20,fontWeight:600,color:volumeColor,lineHeight:1}}>{totalWorkouts}</span>
              <span style={{fontSize:11,color:G.hint}}>/{targetTotal}</span>
            </div>
          </div>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 4px",fontSize:D.md,color:volumeColor,fontWeight:600}}>{totalWorkouts>=targetTotal?"✓ Meta cumplida":totalWorkouts>=targetTotal*0.7?"Casi llegás":"Por debajo de la meta"}</p>
            <p style={{margin:0,fontSize:D.sm,color:G.hint}}>{period==="week"?"Esta semana":period==="month"?"Último mes":"Este año"} · {totalWorkouts} sesión{totalWorkouts!==1?"es":""}</p>
          </div>
        </div>
      </div>
      <div style={{...glassCard,padding:20,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:D.md,fontWeight:500,color:G.text}}>Coherencia nutrición-entreno</p>
        {avgCoherence?(
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:38,fontWeight:300,color:G.sage,lineHeight:1}}>{avgCoherence}</p><p style={{margin:"4px 0 0",fontSize:D.sm,color:G.hint}}>promedio</p></div>
            <div style={{flex:1}}>
              <div style={{background:"rgba(255,255,255,0.3)",borderRadius:99,height:6,overflow:"hidden",marginBottom:8}}><div style={{width:`${(avgCoherence/10)*100}%`,background:G.sage,height:"100%",borderRadius:99,opacity:0.8}}/></div>
              <p style={{margin:0,fontSize:D.sm,color:G.hint}}>{avgCoherence>=8?"Excelente sincronía entre lo que comés y entrenás":avgCoherence>=6?"Buena coherencia, hay margen para mejorar":"Revisá la relación entre tus comidas y entrenamientos"}</p>
            </div>
          </div>
        ):<p style={{margin:0,fontSize:D.md,color:G.hint,fontStyle:"italic"}}>Registrá entrenamientos para ver este índice.</p>}
      </div>
      <div style={{...glassCard,padding:20,marginBottom:12}}>
        <p style={{margin:"0 0 12px",fontSize:D.md,fontWeight:500,color:G.text}}>Racha de consistencia</p>
        <div style={{display:"flex",gap:24,marginBottom:16}}>
          <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:38,fontWeight:300,color:G.sage,lineHeight:1}}>{currentStreak}</p><p style={{margin:"4px 0 0",fontSize:D.sm,color:G.hint}}>racha actual</p></div>
          <div style={{width:"1px",background:"rgba(255,255,255,0.3)"}}/>
          <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:38,fontWeight:300,color:G.gold,lineHeight:1}}>{maxStreak}</p><p style={{margin:"4px 0 0",fontSize:D.sm,color:G.hint}}>récord</p></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4}}>{calDays.map((active,i)=><div key={i} style={{height:16,borderRadius:3,background:active?"rgba(90,122,84,0.6)":"rgba(255,255,255,0.15)"}}/>)}</div>
        <p style={{margin:"8px 0 0",fontSize:D.sm,color:G.hint}}>Últimos 30 días — verde = día activo</p>
      </div>
      <Btn onClick={fetchWeekSummary} loading={weekSummaryLoading} full>Resumen semanal con IA</Btn>
      {weekSummary&&(
        <div style={{...glassCard,padding:20,marginTop:12}}>
          {[["Mejor día",G.sage,weekSummary.best_day],["Peor día",G.red,weekSummary.worst_day],["Logro",G.text,weekSummary.achievement],["Próximo desafío",G.text,weekSummary.challenge]].map(([k,c,v])=>(
            <div key={k} style={{marginBottom:14}}><p style={{margin:"0 0 3px",fontSize:D.sm,color:G.hint,letterSpacing:"0.04em"}}>{k.toUpperCase()}</p><p style={{margin:0,fontSize:D.md,color:c,fontWeight:500}}>{v}</p></div>
          ))}
          <div style={{background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:10,padding:"14px 16px",marginTop:4,color:G.sage,fontSize:D.md,fontStyle:"italic"}}>{weekSummary.motivation}</div>
        </div>
      )}
      <button onClick={()=>setShowRanking(r=>!r)} style={{width:"100%",marginTop:12,padding:"10px",borderRadius:10,border:`1px solid ${G.borderSubtle}`,background:"rgba(255,255,255,0.2)",color:G.hint,cursor:"pointer",fontSize:D.sm,fontFamily:"inherit",backdropFilter:blurSm,WebkitBackdropFilter:blurSm}}>{showRanking?"Ocultar":"Ver"} ranking personal</button>
      {showRanking&&<WeekRanking days={days} D={D}/>}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const isDesktop = useIsDesktop();
  const D = {
    xs: isDesktop?"16px":"12px",
    sm: isDesktop?"19px":"13px",
    md: isDesktop?"22px":"15px",
    lg: isDesktop?"26px":"18px",
    xl: isDesktop?"34px":"22px",
  };
  const inp = {width:"100%",background:"rgba(255,255,255,0.5)",backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"12px 14px",fontSize:D.md,boxSizing:"border-box",marginBottom:8,outline:"none",fontFamily:"inherit"};
  const lbl = {display:"block",fontSize:D.sm,color:G.hint,marginBottom:5,marginTop:12,letterSpacing:"0.04em",textTransform:"uppercase"};

  // ── Auth state ──────────────────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // USER_ID: UUID real para usuarios autenticados, "gabo" para legacy
  const USER_ID = session?.user?.id ?? "gabo";

  const [tab,setTab] = useState("today");
  const [profile,setProfile] = useState(null);
  const [days,setDays] = useState({});
  const [loading,setLoading] = useState(true);
  const [xp,setXp] = useState(()=>lsLoad("nq_xp",0));
  const [badges,setBadges] = useState(()=>lsLoad("nq_badges",[]));
  const [streak,setStreak] = useState(()=>lsLoad("nq_streak",0));
  const [confetti,setConfetti] = useState(false);
  const [toasts,setToasts] = useState([]);
  const [histDate,setHistDate] = useState(todayStr());
  const [expandedMeal,setExpandedMeal] = useState(null);
  const [weekSummary,setWeekSummary] = useState(null);
  const [weekSummaryLoading,setWeekSummaryLoading] = useState(false);
  const [showRanking,setShowRanking] = useState(false);
  const [mealInputs,setMealInputs] = useState({});
  const [mealLoading,setMealLoading] = useState({});
  const [snackName,setSnackName] = useState("");
  const [workoutForm,setWorkoutForm] = useState({type:"Fuerza/hipertrofia",duration:45,intensity:3,notes:""});
  const [workoutLoading,setWorkoutLoading] = useState(false);

  const today = todayStr();
  const todayData = days[today]||{meals:{},snacks:[],workout:null};

  useEffect(()=>{
    if (sessionLoading) return;
    (async()=>{
      setLoading(true);
      const[p,d]=await Promise.all([loadPerfil(USER_ID),loadAllDays(USER_ID)]);
      setProfile(p);setDays(d);setLoading(false);
    })();
  },[USER_ID, sessionLoading]);

  useEffect(()=>{lsSave("nq_xp",xp);},[xp]);
  useEffect(()=>{lsSave("nq_badges",badges);},[badges]);
  useEffect(()=>{lsSave("nq_streak",streak);},[streak]);

  const addToast = useCallback((badge)=>{const id=Date.now();setToasts(t=>[...t,{id,...badge}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000);},[]);
  const unlockBadge = useCallback((id)=>{setBadges(b=>{if(b.includes(id))return b;const def=BADGES_DEF.find(x=>x.id===id);if(def)addToast({emoji:def.emoji,title:def.name,desc:def.desc});return[...b,id];});},[addToast]);
  const calcStreak = useCallback((daysMap)=>{let s=0;const d=new Date();while(true){const k=d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});const day=daysMap[k];const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0);if(!has)break;s++;d.setDate(d.getDate()-1);}return s;},[]);

  const updateToday = async (patch) => {
    const updated = {...todayData,...patch};
    setDays(prev=>({...prev,[today]:updated}));
    await saveDay(USER_ID, today, updated);
    const s = calcStreak({...days,[today]:updated});
    setStreak(s); lsSave("nq_streak",s);
  };

  const handleMoveDate = async (slotId,targetDate,isMeal=true,snackIndex=null) => {
    const fromDay = days[today]||{meals:{},snacks:[],workout:null};
    const toDay = days[targetDate]||{meals:{},snacks:[],workout:null};
    if (isMeal) {
      const meal = fromDay.meals[slotId]; if (!meal) return;
      const newFromMeals = {...fromDay.meals}; delete newFromMeals[slotId];
      await saveDay(USER_ID, today,{...fromDay,meals:newFromMeals});
      await saveDay(USER_ID, targetDate,{...toDay,meals:{...toDay.meals,[slotId]:meal}});
    } else {
      const snack = (fromDay.snacks||[])[snackIndex]; if (!snack) return;
      await saveDay(USER_ID, today,{...fromDay,snacks:(fromDay.snacks||[]).filter((_,i)=>i!==snackIndex)});
      await saveDay(USER_ID, targetDate,{...toDay,snacks:[...(toDay.snacks||[]),snack]});
    }
    const [,d] = await Promise.all([loadPerfil(USER_ID),loadAllDays(USER_ID)]); setDays(d);
  };

  const handleDeleteMeal = async (slotId) => { const m={...todayData.meals}; delete m[slotId]; await updateToday({meals:m}); };
  const handleDeleteSnack = async (index) => { await updateToday({snacks:(todayData.snacks||[]).filter((_,i)=>i!==index)}); };
  const handleEditMeal = async (slotId,newDesc,targetDate) => {
    const meal = {...todayData.meals[slotId],desc:newDesc};
    if (targetDate&&targetDate!==today) {
      const toDay = days[targetDate]||{meals:{},snacks:[],workout:null};
      const newFrom = {...todayData.meals}; delete newFrom[slotId];
      await saveDay(USER_ID, today,{...todayData,meals:newFrom});
      await saveDay(USER_ID, targetDate,{...toDay,meals:{...toDay.meals,[slotId]:meal}});
      const [,d] = await Promise.all([loadPerfil(USER_ID),loadAllDays(USER_ID)]); setDays(d);
    } else { await updateToday({meals:{...todayData.meals,[slotId]:meal}}); }
  };

  useEffect(()=>{if(streak>=3)unlockBadge("streak_3");if(streak>=7){unlockBadge("streak_7");unlockBadge("week_complete");}},[streak,unlockBadge]);
  const triggerConfetti = () => { setConfetti(true); setTimeout(()=>setConfetti(false),2000); };

  const handleMealSubmit = async (slotId,label) => {
    const desc = mealInputs[slotId]; if (!desc?.trim()) return;
    setMealLoading(l=>({...l,[slotId]:true}));
    try {
      const result = await callAI(`Analiza esta comida: "${desc}". Devuelve SOLO JSON: score (1-10), protein_g (número), skin_impact ("beneficioso"|"neutro"|"inflamatorio"), hypertrophy ("excelente"|"bueno"|"moderado"|"bajo"), nutrients ([{name,benefit}] máx 4), tip (string breve).`,"Eres un nutricionista experto. Responde SOLO con JSON válido, sin texto adicional.");
      const meal = {desc,...result,slot:slotId,label,timestamp:Date.now()};
      const newMeals = {...todayData.meals,[slotId]:meal};
      await updateToday({meals:newMeals});
      setXp(x=>x+50+(result.score||0)*5); triggerConfetti();
      if (Object.keys(newMeals).length===1&&Object.keys(days).length<=1) unlockBadge("first_meal");
      const dayProt = Object.values(newMeals).reduce((a,m)=>a+(m.protein_g||0),0)+(todayData.snacks||[]).reduce((a,s)=>a+(s.protein_g||0),0);
      if (profile&&dayProt>=profile.weight*2) unlockBadge("protein_goal");
      const scores = Object.values(newMeals).map(m=>m.score||0);
      if (scores.length>=3&&scores.reduce((a,b)=>a+b,0)/scores.length>=9) unlockBadge("perfect_day");
      setMealInputs(i=>({...i,[slotId]:""}));
    } catch { alert("Error al analizar. Intentá de nuevo."); }
    setMealLoading(l=>({...l,[slotId]:false}));
  };

  const handleSnackSubmit = async () => {
    const desc = mealInputs["snack_new"]; if (!desc?.trim()||!snackName?.trim()) return;
    setMealLoading(l=>({...l,snack_new:true}));
    try {
      const result = await callAI(`Analiza este tentempié "${snackName}": "${desc}". Devuelve SOLO JSON: score (1-10), protein_g (número), skin_impact ("beneficioso"|"neutro"|"inflamatorio"), hypertrophy ("excelente"|"bueno"|"moderado"|"bajo"), nutrients ([{name,benefit}] máx 4), tip (string breve).`,"Eres un nutricionista experto. Responde SOLO con JSON válido.");
      await updateToday({snacks:[...(todayData.snacks||[]),{desc,name:snackName,...result,timestamp:Date.now()}]});
      setXp(x=>x+40+(result.score||0)*3); triggerConfetti(); unlockBadge("first_meal");
      setMealInputs(i=>({...i,snack_new:""})); setSnackName("");
    } catch { alert("Error al analizar el tentempié."); }
    setMealLoading(l=>({...l,snack_new:false}));
  };

  const handleWorkoutSubmit = async () => {
    setWorkoutLoading(true);
    const mealsDesc = [...Object.values(todayData.meals||{}).map(m=>m.desc),...(todayData.snacks||[]).map(s=>s.desc)].join("; ");
    try {
      const result = await callAI(`Entreno: ${workoutForm.type}, ${workoutForm.duration}min, intensidad ${workoutForm.intensity}/5. Comidas hoy: "${mealsDesc}". SOLO JSON: coherence_score (1-10), balance (string), protein_ok (bool), strengths ([string]), suggestions ([string]).`,"Eres un entrenador y nutricionista. Responde SOLO con JSON válido.");
      await updateToday({workout:{...workoutForm,...result,timestamp:Date.now()}});
      setXp(x=>x+80); unlockBadge("first_workout");
      const weekW = Object.entries(days).filter(([d,v])=>{const diff=(new Date(today)-new Date(d))/86400000;return diff>=0&&diff<7&&v?.workout;}).length+1;
      if (weekW>=3) unlockBadge("athlete");
    } catch { alert("Error al analizar el entrenamiento."); }
    setWorkoutLoading(false);
  };

  const fetchWeekSummary = async () => {
    setWeekSummaryLoading(true);
    const data7 = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});const day=days[k]||{};const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:0;return`${k}: score ${Math.round(score*10)/10}, prot ${Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0))}g`;}).join("; ");
    try { const r=await callAI(`7 días de nutrición: ${data7}. SOLO JSON: best_day, worst_day, achievement (string), challenge (string), motivation (string).`,"Eres un coach nutricional. Responde SOLO con JSON válido."); setWeekSummary(r); }
    catch { alert("Error al generar el resumen."); }
    setWeekSummaryLoading(false);
  };

  // ── Pantalla de carga de sesión ─────────────────────────────────────────
  if (sessionLoading) return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:G.muted}}>
        <div style={{fontSize:44,marginBottom:14}}>🌿</div>
        <p style={{fontSize:18,letterSpacing:"0.04em"}}>Cargando…</p>
      </div>
    </div>
  );

  // ── Pantalla de login ───────────────────────────────────────────────────
  if (!session) return <AuthScreen />;

  // ── Pantalla de carga de datos ──────────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",color:G.muted}}>
        <div style={{fontSize:44,marginBottom:14}}>🌿</div>
        <p style={{fontSize:18,letterSpacing:"0.04em"}}>Cargando…</p>
      </div>
    </div>
  );

  if (!profile || !profile.onboarded) return <Onboarding onSave={async (perfil) => { await savePerfil(USER_ID, perfil); setProfile(perfil); }} userId={USER_ID}/>;

  const proteinGoal = Math.round(profile.weight*2);
  const todayProt = [...Object.values(todayData.meals||{}),...(todayData.snacks||[])].reduce((a,m)=>a+(m.protein_g||0),0);
  const TABS = [{id:"today",label:"Hoy"},{id:"workout",label:"Entreno"},{id:"history",label:"Historial"},{id:"metrics",label:"Métricas"},{id:"badges",label:"Badges"}];

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1} 0%,${G.bg2} 50%,${G.bg3} 100%)`,color:G.text}}>
      <Confetti active={confetti}/>
      <Toast toasts={toasts}/>
      <div style={{maxWidth:isDesktop?720:640,margin:"0 auto",padding:isDesktop?"28px 40px":"20px 20px"}}>

        <div style={{textAlign:"center",marginBottom:20,position:"relative"}}>
          <h1 style={{margin:"0 0 3px",fontSize:D.xl,fontWeight:300,color:G.text,letterSpacing:"0.02em"}}>🌿 NutriQuest</h1>
          <p style={{margin:0,fontSize:D.sm,color:G.hint,letterSpacing:"0.06em"}}>{new Date().toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long",timeZone:"America/Argentina/Buenos_Aires"})}</p>
          <button onClick={()=>supabase.auth.signOut()} style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",background:"none",border:`1px solid ${G.borderSubtle}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:12,color:G.hint,fontFamily:"inherit"}}>Salir</button>
        </div>

        <ProfilePanel profile={profile} onUpdate={setProfile} userId={USER_ID} D={D}/>
        <XPBar xp={xp} streak={streak}/>

        <div style={{...glassCard,padding:"14px 20px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:D.sm,marginBottom:8}}>
            <span style={{color:G.hint,letterSpacing:"0.04em",fontSize:D.xs}}>PROTEÍNA HOY</span>
            <span style={{color:todayProt>=proteinGoal?G.sage:G.gold,fontWeight:600}}>{Math.round(todayProt)}g / {proteinGoal}g</span>
          </div>
          <div style={{background:"rgba(255,255,255,0.3)",borderRadius:99,height:6,overflow:"hidden"}}>
            <div style={{width:`${Math.min(100,(todayProt/proteinGoal)*100)}%`,background:G.sage,height:"100%",borderRadius:99,transition:"width 0.6s ease",opacity:0.75}}/>
          </div>
        </div>

        <div style={{...glassSubtle,display:"flex",gap:0,marginBottom:20,overflow:"hidden",padding:4,borderRadius:14}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 6px",background:tab===t.id?"rgba(255,255,255,0.6)":"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:D.sm,fontWeight:tab===t.id?600:400,color:tab===t.id?G.sage:G.hint,borderRadius:10,transition:"all 0.2s",backdropFilter:tab===t.id?blurSm:"none",WebkitBackdropFilter:tab===t.id?blurSm:"none"}}>{t.label}</button>)}
        </div>

        {tab==="today"&&(
          <div>
            <div style={{...glassCard,overflow:"hidden",marginBottom:16}}>
              {FIXED_SLOTS.map((slot,i)=>(
                <div key={slot.id}>
                  <MealSlot slot={slot} meal={todayData.meals?.[slot.id]} input={mealInputs[slot.id]||""} onInput={v=>setMealInputs(x=>({...x,[slot.id]:v}))} loading={mealLoading[slot.id]} onSubmit={()=>handleMealSubmit(slot.id,slot.label)} onDelete={()=>handleDeleteMeal(slot.id)} onSave={(desc,date)=>handleEditMeal(slot.id,desc,date)} D={D}/>
                  {i<FIXED_SLOTS.length-1&&<Divider/>}
                </div>
              ))}
            </div>
            <div style={{...glassCard,padding:"18px 20px"}}>
              <p style={{margin:"0 0 14px",fontSize:D.md,fontWeight:500,color:G.muted}}>🥜 Tentempiés</p>
              {(todayData.snacks||[]).map((s,i)=>(
                <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid rgba(255,255,255,0.4)"}}>
                  <p style={{margin:"0 0 6px",fontSize:D.xs,color:G.hint,letterSpacing:"0.04em"}}>{s.name.toUpperCase()}</p>
                  <MealCard meal={s} onDelete={()=>handleDeleteSnack(i)} onSave={()=>{}} D={D}/>
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
          <div style={{...glassCard,padding:22}}>
            <p style={{margin:"0 0 18px",fontSize:D.lg,fontWeight:500,color:G.text}}>Entrenamiento de hoy</p>
            {todayData.workout?<WorkoutCard workout={todayData.workout} D={D}/>:(
              <div>
                <label style={lbl}>Tipo</label>
                <select value={workoutForm.type} onChange={e=>setWorkoutForm(f=>({...f,type:e.target.value}))} style={inp}>{WORKOUT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                <label style={lbl}>Duración — {workoutForm.duration} min</label>
                <input type="range" min={15} max={180} step={5} value={workoutForm.duration} onChange={e=>setWorkoutForm(f=>({...f,duration:+e.target.value}))} style={{width:"100%",marginBottom:8}}/>
                <label style={lbl}>Intensidad — {workoutForm.intensity} / 5</label>
                <input type="range" min={1} max={5} step={1} value={workoutForm.intensity} onChange={e=>setWorkoutForm(f=>({...f,intensity:+e.target.value}))} style={{width:"100%",marginBottom:8}}/>
                <label style={lbl}>Notas</label>
                <textarea value={workoutForm.notes} onChange={e=>setWorkoutForm(f=>({...f,notes:e.target.value}))} placeholder="Opcional…" rows={3} style={{...inp,resize:"vertical"}}/>
                <Btn loading={workoutLoading} onClick={handleWorkoutSubmit} full>Analizar con IA</Btn>
              </div>
            )}
          </div>
        )}

        {tab==="history"&&(
          <div>
            <input type="date" value={histDate} onChange={e=>setHistDate(e.target.value)} style={{...inp,marginBottom:16}}/>
            {(()=>{
              const hDay = days[histDate];
              if (!hDay) return <p style={{color:G.hint,textAlign:"center",padding:28,fontSize:D.md}}>Sin registros para este día.</p>;
              const allH = [...Object.values(hDay.meals||{}),...(hDay.snacks||[])];
              const avgScore = allH.length?(allH.reduce((a,m)=>a+(m.score||0),0)/allH.length).toFixed(1):"—";
              const totProt = Math.round(allH.reduce((a,m)=>a+(m.protein_g||0),0));
              return (
                <div>
                  <div style={{...glassCard,padding:"16px 20px",marginBottom:12}}>
                    <p style={{margin:"0 0 10px",fontWeight:500,fontSize:D.lg}}>{new Date(histDate+"T12:00:00").toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}</p>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <Tag>{allH.length} comida{allH.length!==1?"s":""}</Tag>
                      <Tag bg={G.goldLight} color={G.gold} border="rgba(180,148,72,0.25)">⭐ {avgScore}</Tag>
                      <Tag>💪 {totProt}g</Tag>
                      {hDay.workout&&<Tag>🏋️ {hDay.workout.type}</Tag>}
                    </div>
                  </div>
                  {FIXED_SLOTS.map(slot=>{
                    const m = hDay.meals?.[slot.id]; if (!m) return null;
                    const key = `${histDate}-${slot.id}`; const isExp = expandedMeal===key;
                    return (
                      <div key={key} style={{...glassCard,padding:"16px 20px",marginBottom:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",cursor:"pointer",marginBottom:8}} onClick={()=>setExpandedMeal(isExp?null:key)}>
                          <span style={{fontWeight:500,fontSize:D.md}}>{slot.emoji} {slot.label}</span>
                          <span style={{fontSize:D.sm,color:G.hint}}>{isExp?"▲":"▼"}</span>
                        </div>
                        <p style={{margin:0,fontSize:D.sm,color:G.muted}}>{m.desc}</p>
                        {isExp&&<MealDetails meal={m} D={D}/>}
                      </div>
                    );
                  })}
                  {(hDay.snacks||[]).map((s,i)=>{
                    const key = `${histDate}-snack-${i}`; const isExp = expandedMeal===key;
                    return (
                      <div key={key} style={{...glassCard,padding:"16px 20px",marginBottom:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",cursor:"pointer",marginBottom:8}} onClick={()=>setExpandedMeal(isExp?null:key)}>
                          <span style={{fontWeight:500,fontSize:D.md}}>🥜 {s.name}</span>
                          <span style={{fontSize:D.sm,color:G.hint}}>{isExp?"▲":"▼"}</span>
                        </div>
                        <p style={{margin:0,fontSize:D.sm,color:G.muted}}>{s.desc}</p>
                        {isExp&&<MealDetails meal={s} D={D}/>}
                      </div>
                    );
                  })}
                  {hDay.workout&&<div style={{...glassCard,padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontWeight:500,fontSize:D.md}}>🏋️ {hDay.workout.type}</p><WorkoutCard workout={hDay.workout} compact D={D}/></div>}
                </div>
              );
            })()}
          </div>
        )}

        {tab==="metrics"&&(
          <MetricsTab days={days} fetchWeekSummary={fetchWeekSummary} weekSummaryLoading={weekSummaryLoading} weekSummary={weekSummary} showRanking={showRanking} setShowRanking={setShowRanking} D={D}/>
        )}

        {tab==="badges"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {BADGES_DEF.map(b=>{
              const unlocked = badges.includes(b.id);
              return (
                <div key={b.id} style={{...unlocked?glassCard:glassSubtle,padding:18,textAlign:"center",opacity:unlocked?1:0.5}}>
                  <div style={{fontSize:32,marginBottom:10,filter:unlocked?"none":"grayscale(1) opacity(0.4)"}}>{b.emoji}</div>
                  <p style={{margin:"0 0 4px",fontWeight:500,fontSize:D.md,color:G.text}}>{b.name}</p>
                  <p style={{margin:0,fontSize:D.sm,color:G.hint,lineHeight:1.5}}>{b.desc}</p>
                  {unlocked&&<p style={{margin:"10px 0 0",fontSize:D.xs,color:G.sage,fontWeight:600,letterSpacing:"0.04em"}}>✓ DESBLOQUEADO</p>}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
