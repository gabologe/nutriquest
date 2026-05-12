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
const blur="blur(14px)",blurSm="blur(8px)";

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

const GOAL_LABELS={
  comer_mejor:"🥗 Comer mejor",energia:"⚡ Más energía",musculo:"💪 Ganar músculo",
  bajar_peso:"⚖️ Bajar de peso",verme_mejor:"✨ Verme mejor",
};
const ACTIVIDAD_FACTOR={sedentario:1.2,ligero:1.375,moderado:1.55,activo:1.725,muy_activo:1.9};

function calcEdad(fechaNac) {
  if(!fechaNac)return null;
  const hoy=new Date(),nac=new Date(fechaNac);
  let edad=hoy.getFullYear()-nac.getFullYear();
  const m=hoy.getMonth()-nac.getMonth();
  if(m<0||(m===0&&hoy.getDate()<nac.getDate()))edad--;
  return edad>0?edad:null;
}

function calcTDEE(peso,altura,fechaNac,sexo,actividad) {
  const edad=calcEdad(fechaNac)||0;
  if(!peso||!altura||!edad||!sexo||!actividad)return null;
  const bmr=sexo==="masculino"?88.36+13.4*peso+4.8*altura-5.7*edad:447.6+9.2*peso+3.1*altura-4.3*edad;
  return Math.round(bmr*(ACTIVIDAD_FACTOR[actividad]||1.55));
}

function getGoalsText(goals=[]) {
  const map={comer_mejor:"comer de forma más saludable",energia:"tener más energía",musculo:"ganar músculo",bajar_peso:"bajar de peso",verme_mejor:"verme mejor"};
  return goals.map(g=>map[g]||g).join(", ");
}

function getProgressColor(pct,type,goals=[]) {
  const hasBajarPeso=goals.includes("bajar_peso"),hasMusculo=goals.includes("musculo");
  if(type==="protein")return pct>=60?G.sage:G.gold;
  if(type==="calories"){
    if(hasBajarPeso){if(pct>100)return G.red;if(pct>=90)return G.gold;if(pct>=60)return G.sage;return G.gold;}
    if(hasMusculo){if(pct>100)return G.gold;if(pct>=80)return G.sage;return G.gold;}
    if(pct>100)return G.red;if(pct>=70)return G.sage;return G.gold;
  }
  return G.sage;
}

function useIsDesktop(){
  const [isDesktop,setIsDesktop]=useState(()=>window.innerWidth>=768);
  useEffect(()=>{const h=()=>setIsDesktop(window.innerWidth>=768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return isDesktop;
}

async function loadAllDays(userId){
  const{data,error}=await supabase.from("registros").select("*").eq("user_id",userId);
  if(error){console.error(error);return{};}
  const map={};
  data.forEach(row=>{if(row.fecha==="perfil")return;map[row.fecha]={meals:row.meals||{},snacks:row.snacks||[],workout:row.workout||null,dayClosed:row.dayClosed||false,dayAnalysis:row.dayAnalysis||null};});
  return map;
}
async function loadPerfil(userId){
  const{data,error}=await supabase.from("registros").select("perfil").eq("user_id",userId).eq("fecha","perfil").maybeSingle();
  if(error||!data)return null;return data.perfil;
}
async function savePerfil(userId,perfil){
  await supabase.from("registros").upsert({user_id:userId,auth_user_id:userId,fecha:"perfil",perfil},{onConflict:"user_id,fecha"});
}
async function saveDay(userId,fecha,dayData){
  await supabase.from("registros").upsert({user_id:userId,auth_user_id:userId,fecha,meals:dayData.meals||{},snacks:dayData.snacks||[],workout:dayData.workout||null},{onConflict:"user_id,fecha"});
}
const lsLoad=(k,def)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):def;}catch{return def;}};
const lsSave=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};

async function callAI(prompt,system){
  const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,system})});
  const data=await res.json();
  const text=data.content?.find(b=>b.type==="text")?.text||"";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

const glassCard={background:G.glass,backdropFilter:blur,WebkitBackdropFilter:blur,border:`1px solid ${G.border}`,borderRadius:18};
const glassSubtle={background:G.glassDark,backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.borderSubtle}`,borderRadius:12};

function SectionDivider({label}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:12,margin:"8px 0 16px"}}>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,0.4)"}}/>
      <span style={{fontSize:12,color:G.hint,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500}}>{label}</span>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,0.4)"}}/>
    </div>
  );
}

function Slider({min,max,step,value,onChange,label}){
  const pct=((value-min)/(max-min))*100;
  return(
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:13,color:G.hint,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</span>
        <span style={{fontSize:15,fontWeight:600,color:G.sage}}>{value}{label.toLowerCase().includes("dur")?" min":""}</span>
      </div>
      <div style={{position:"relative",height:20,display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",width:"100%",height:6,background:"rgba(255,255,255,0.3)",borderRadius:99,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:G.sage,borderRadius:99,opacity:0.85,transition:"width 0.1s"}}/>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} style={{position:"absolute",width:"100%",height:6,opacity:0,cursor:"pointer",margin:0,padding:0,WebkitAppearance:"none",appearance:"none"}}/>
        <div style={{position:"absolute",left:`calc(${pct}% - 10px)`,width:20,height:20,borderRadius:"50%",background:G.sage,border:"3px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,0.15)",transition:"left 0.1s",pointerEvents:"none"}}/>
      </div>
    </div>
  );
}

function AuthScreen(){
  const [isLogin,setIsLogin]=useState(true);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const handleSubmit=async()=>{
    if(!email||!password)return;
    setLoading(true);setMessage("");
    const{error}=isLogin?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
    if(error)setMessage(error.message);else if(!isLogin)setMessage("Revisá tu email para confirmar tu cuenta.");
    setLoading(false);
  };
  const inp={width:"100%",background:"rgba(255,255,255,0.55)",border:`1px solid rgba(255,255,255,0.6)`,borderRadius:12,color:G.text,padding:"13px 18px",fontSize:15,boxSizing:"border-box",outline:"none",fontFamily:"inherit",marginBottom:8};
  const lbl={display:"block",fontSize:11,color:G.hint,marginBottom:6,letterSpacing:"0.06em",textTransform:"uppercase"};
  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:420,borderRadius:28,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.12)"}}>
        <div style={{background:`linear-gradient(160deg,#3d6b47 0%,#5a7a54 60%,#87a882 100%)`,padding:"32px 28px 0",position:"relative",overflow:"hidden",minHeight:200}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:14,position:"relative",zIndex:2}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌿</div>
            <span style={{color:"#fff",fontSize:20,fontWeight:500,letterSpacing:"-0.01em"}}>NutriQuest</span>
          </div>
          <p style={{color:"rgba(255,255,255,0.85)",fontSize:14,textAlign:"center",lineHeight:1.6,margin:"0",position:"relative",zIndex:2}}>Tu compañero nutricional —<br/>entendé cómo lo que comés afecta tu cuerpo.</p>
          <svg viewBox="0 0 420 100" xmlns="http://www.w3.org/2000/svg" style={{display:"block",width:"100%",marginTop:8,position:"relative",zIndex:1}}>
            <ellipse cx="100" cy="95" rx="140" ry="50" fill="rgba(255,255,255,0.06)"/>
            <ellipse cx="330" cy="98" rx="130" ry="45" fill="rgba(255,255,255,0.06)"/>
            <line x1="40" y1="100" x2="40" y2="58" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
            <ellipse cx="40" cy="48" rx="13" ry="18" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
            <line x1="110" y1="100" x2="110" y2="68" stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round"/>
            <ellipse cx="110" cy="59" rx="11" ry="16" fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
            <line x1="210" y1="100" x2="210" y2="55" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
            <ellipse cx="210" cy="44" rx="15" ry="21" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.38)" strokeWidth="1.2"/>
            <line x1="310" y1="100" x2="310" y2="65" stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round"/>
            <ellipse cx="310" cy="56" rx="11" ry="16" fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
            <line x1="375" y1="100" x2="375" y2="55" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
            <ellipse cx="375" cy="44" rx="14" ry="19" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
          </svg>
        </div>
        <div style={{background:"rgba(255,255,255,0.92)",backdropFilter:blur,WebkitBackdropFilter:blur,padding:"28px 28px 32px"}}>
          <div style={{display:"flex",background:`rgba(138,180,132,0.15)`,borderRadius:99,padding:4,marginBottom:24,border:`1px solid rgba(90,122,84,0.2)`}}>
            {["Iniciar sesión","Registrarse"].map((label,i)=>{
              const active=(i===0&&isLogin)||(i===1&&!isLogin);
              return <button key={i} onClick={()=>{setIsLogin(i===0);setMessage("");}} style={{flex:1,padding:"10px 0",borderRadius:99,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:active?600:400,background:active?G.sage:"transparent",color:active?"#fff":G.muted,transition:"all 0.2s"}}>{label}</button>;
            })}
          </div>
          <label style={lbl}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          <label style={{...lbl,marginTop:8}}>Contraseña</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{...inp,marginBottom:0}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          {message&&<div style={{background:message.includes("email")?G.sageLight:G.redLight,border:`1px solid ${message.includes("email")?G.sageBorder:"rgba(180,80,80,0.25)"}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:message.includes("email")?G.sage:G.red,marginTop:12}}>{message}</div>}
          <div style={{marginTop:20}}><Btn onClick={handleSubmit} loading={loading} full>{isLogin?"Iniciar sesión":"Crear cuenta"}</Btn></div>
          <p onClick={()=>{setIsLogin(l=>!l);setMessage("");}} style={{textAlign:"center",marginTop:16,fontSize:13,color:G.hint,cursor:"pointer",userSelect:"none"}}>
            {isLogin?"¿No tenés cuenta? ":"¿Ya tenés cuenta? "}
            <span style={{color:G.sage,fontWeight:600}}>{isLogin?"Registrate":"Iniciá sesión"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Btn({onClick,loading,children,full,disabled,variant="primary"}){
  const base={padding:"11px 20px",borderRadius:10,border:"none",fontWeight:600,fontSize:16,width:full?"100%":"auto",fontFamily:"inherit",letterSpacing:"0.02em",transition:"all 0.2s",cursor:loading||disabled?"not-allowed":"pointer",opacity:loading||disabled?0.8:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8};
  const styles=variant==="secondary"?{...base,background:"transparent",color:G.hint,border:`1px solid rgba(180,180,180,0.35)`}:{...base,background:"#5a7a54",color:"#fff"};
  return <button onClick={onClick} disabled={loading||disabled} style={styles}>{loading?(<><span style={{width:15,height:15,border:"2px solid rgba(255,255,255,0.4)",borderTop:"2px solid #fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.7s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style></>):children}</button>;
}

function Tag({color,bg,border,children}){
  return <span style={{fontSize:14,background:bg||G.sageLight,color:color||G.sage,border:`1px solid ${border||G.sageBorder}`,padding:"4px 10px",borderRadius:99,fontWeight:500,letterSpacing:"0.02em"}}>{children}</span>;
}
function Divider(){return <div style={{height:"1px",background:"rgba(255,255,255,0.4)",margin:"0 18px"}}/>;}

function Toast({toasts}){
  return <div style={{position:"fixed",bottom:24,right:20,zIndex:9998,display:"flex",flexDirection:"column",gap:8}}>{toasts.map(t=><div key={t.id} style={{background:G.glass,backdropFilter:blur,WebkitBackdropFilter:blur,border:`1px solid ${G.border}`,color:G.text,padding:"14px 18px",borderRadius:14,display:"flex",alignItems:"center",gap:10,borderLeft:`3px solid ${G.sage}`,animation:"slideIn 0.3s ease"}}><span style={{fontSize:22}}>{t.emoji}</span><div><div style={{fontWeight:600,fontSize:15}}>{t.title}</div><div style={{fontSize:13,color:G.muted}}>{t.desc}</div></div></div>)}<style>{`@keyframes slideIn{from{transform:translateX(120%);opacity:0;}to{transform:translateX(0);opacity:1;}}`}</style></div>;
}

function DailyTip({profile,D}){
  const [tip,setTip]=useState(null);
  const [loading,setLoading]=useState(false);
  const today=todayStr();
  const cacheKey=`nq_tip_${today}`;

  useEffect(()=>{
    const cached=lsLoad(cacheKey,null);
    if(cached){setTip(cached);return;}
    if(!profile?.goals?.length)return;
    setLoading(true);
    const goals=getGoalsText(profile.goals||[]);
    const restrictions=profile.restrictions?`Restricciones: ${profile.restrictions}.`:"";
    callAI(
      `El usuario quiere: ${goals}. ${restrictions} Generá un tip nutricional o de hábito específico, práctico y motivador para hoy. Máx 2 oraciones. SOLO JSON: { emoji (1 emoji relevante), tip (string) }`,
      "Eres un coach nutricional empático. Responde SOLO con JSON válido."
    ).then(result=>{
      lsSave(cacheKey,result);
      setTip(result);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  if(loading)return(
    <div style={{...glassCard,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
      <span style={{fontSize:22}}>🌿</span>
      <p style={{margin:0,fontSize:D.sm,color:G.hint,fontStyle:"italic"}}>Preparando tu tip del día…</p>
    </div>
  );
  if(!tip)return null;
  return(
    <div style={{...glassCard,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"flex-start",gap:12}}>
      <span style={{fontSize:24,flexShrink:0}}>{tip.emoji||"💡"}</span>
      <div>
        <p style={{margin:"0 0 2px",fontSize:11,color:G.hint,letterSpacing:"0.05em",textTransform:"uppercase"}}>Tip del día</p>
        <p style={{margin:0,fontSize:D.sm,color:G.muted,lineHeight:1.6}}>{tip.tip}</p>
      </div>
    </div>
  );
}

function MealDetails({meal,D}){
  const alignC={excelente:G.sage,bueno:G.sageMid,moderado:G.gold,perjudicial:G.red};
  return(
    <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.4)"}}>
      {meal.goal_alignment&&<div style={{marginBottom:8,fontSize:D.md}}><span style={{color:G.hint,fontSize:D.sm}}>Alineación — </span><span style={{color:alignC[meal.goal_alignment]||G.muted,fontWeight:600}}>{meal.goal_alignment}</span></div>}
      {(meal.nutrients||[]).map((n,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6}}><span style={{color:n.negative?G.red:G.sage,fontWeight:600,minWidth:100,fontSize:D.sm}}>{n.name}</span><span style={{color:G.muted,fontSize:D.sm,lineHeight:1.5}}>{n.benefit}</span></div>)}
      {meal.tip&&<div style={{marginTop:10,background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:8,padding:"10px 14px",color:G.sage,fontSize:D.sm,fontStyle:"italic"}}>💡 {meal.tip}</div>}
    </div>
  );
}

function EditMealModal({meal,onSave,onDelete,onClose}){
  const [desc,setDesc]=useState(meal.desc||"");
  const [date,setDate]=useState(todayStr());
  const dateLabel=new Date(date+"T12:00:00").toLocaleDateString("es",{day:"numeric",month:"short",year:"numeric",timeZone:"America/Argentina/Buenos_Aires"});
  const edits=meal.editCount||0;
  const maxEdits=2;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(40,60,40,0.25)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"rgba(255,255,255,0.88)",border:"1px solid rgba(255,255,255,0.75)",borderRadius:18,padding:24,width:"100%",maxWidth:420}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <p style={{margin:0,fontSize:18,fontWeight:500,color:"#2e4a2b"}}>Editar comida</p>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:12,color:G.hint}}>{edits}/{maxEdits} ediciones</span>
            <div style={{position:"relative",display:"inline-flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:14,color:"#93a48f"}}>{dateLabel}</span>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%",border:"none",background:"none",fontSize:0}}/>
            </div>
          </div>
        </div>
        <label style={{display:"block",fontSize:13,color:"#93a48f",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Descripción</label>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} style={{width:"100%",background:"rgba(255,255,255,0.65)",border:"1px solid rgba(200,200,200,0.4)",borderRadius:10,color:"#2a3428",padding:"12px 14px",fontSize:16,boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",outline:"none",minHeight:80}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:20}}>
          <button onClick={onClose} style={{padding:12,borderRadius:10,border:"1px solid rgba(180,180,180,0.35)",background:"transparent",color:"#93a48f",fontSize:16,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
          <button onClick={()=>onSave(desc,date)} style={{padding:12,borderRadius:10,border:"none",background:"#5a7a54",color:"#fff",fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Guardar</button>
        </div>
        <button onClick={()=>{if(window.confirm("¿Eliminar esta comida?"))onDelete();}} style={{display:"block",width:"100%",marginTop:18,textAlign:"center",fontSize:16,color:"#8a4040",textDecoration:"underline",textUnderlineOffset:3,background:"none",border:"none",padding:0,cursor:"pointer",fontFamily:"inherit"}}>Eliminar esta comida</button>
      </div>
    </div>
  );
}

function MealCard({meal,onDelete,onSave,D}){
  const [exp,setExp]=useState(false);
  const [editing,setEditing]=useState(false);
  const skinC={beneficioso:G.sage,neutro:G.muted,inflamatorio:G.red};
  const skinBg={beneficioso:G.sageLight,neutro:"rgba(255,255,255,0.2)",inflamatorio:G.redLight};
  const skinBd={beneficioso:G.sageBorder,neutro:G.borderSubtle,inflamatorio:"rgba(180,80,80,0.25)"};
  const alignC={excelente:G.sage,bueno:G.sageMid,moderado:G.gold,perjudicial:G.red};
  const alignBg={excelente:G.sageLight,bueno:"rgba(135,168,130,0.15)",moderado:G.goldLight,perjudicial:G.redLight};
  const alignBd={excelente:G.sageBorder,bueno:"rgba(135,168,130,0.3)",moderado:"rgba(180,148,72,0.25)",perjudicial:"rgba(180,80,80,0.25)"};
  const scoreColor=meal.score>=8?G.sage:meal.score>=6?G.gold:G.red;
  const scoreBg=meal.score>=8?G.sageLight:meal.score>=6?G.goldLight:G.redLight;
  const scoreBd=meal.score>=8?G.sageBorder:meal.score>=6?"rgba(180,148,72,0.25)":"rgba(180,80,80,0.25)";
  const edits=meal.editCount||0;
  const canEdit=edits<2;
  return(
    <div>
      {editing&&<EditMealModal meal={meal} onSave={(desc,date)=>{onSave(desc,date);setEditing(false);}} onDelete={()=>{onDelete();setEditing(false);}} onClose={()=>setEditing(false)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,cursor:"pointer"}} onClick={()=>setExp(e=>!e)}>
          <p style={{margin:"0 0 8px",color:G.text,fontSize:D.md,lineHeight:1.6}}>{meal.desc}</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <Tag bg={scoreBg} color={scoreColor} border={scoreBd}>⭐ {meal.score}/10</Tag>
            <Tag>💪 {meal.protein_g}g</Tag>
            <Tag bg={skinBg[meal.skin_impact]} color={skinC[meal.skin_impact]} border={skinBd[meal.skin_impact]}>🌿 {meal.skin_impact}</Tag>
            {meal.goal_alignment&&<Tag bg={alignBg[meal.goal_alignment]} color={alignC[meal.goal_alignment]} border={alignBd[meal.goal_alignment]}>🎯 {meal.goal_alignment}</Tag>}
          </div>
        </div>
        {canEdit?(
          <button onClick={()=>setEditing(true)} style={{background:"none",border:`1px solid ${G.borderSubtle}`,borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:14,color:G.hint,marginLeft:12,flexShrink:0,fontFamily:"inherit"}}>✏️</button>
        ):(
          <span style={{marginLeft:12,fontSize:12,color:G.hint,flexShrink:0,padding:"5px 0"}}>sin ediciones</span>
        )}
      </div>
      {exp&&<MealDetails meal={meal} D={D}/>}
    </div>
  );
}

function MealSlot({slot,meal,input,onInput,loading,onSubmit,onDelete,onSave,D}){
  const inp={width:"100%",background:"rgba(255,255,255,0.5)",backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"11px 14px",fontSize:D.md,boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
  return(
    <div style={{padding:"18px 20px"}}>
      <div style={{fontWeight:500,fontSize:D.md,color:G.text,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:D.lg}}>{slot.emoji}</span>
        <span style={{letterSpacing:"0.01em",color:G.muted}}>{slot.label}</span>
      </div>
      {meal?<MealCard meal={meal} onDelete={onDelete} onSave={onSave} D={D}/>:<div style={{display:"flex",gap:8}}><input value={input} onChange={e=>onInput(e.target.value)} placeholder="¿Qué comiste?" style={{...inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&onSubmit()}/><Btn loading={loading} onClick={onSubmit}>Analizar</Btn></div>}
    </div>
  );
}

function WorkoutCard({workout,D}){
  return(
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <Tag>{workout.type}</Tag>
      <Tag>{workout.duration} min</Tag>
      <Tag>{"●".repeat(workout.intensity)} int.</Tag>
    </div>
  );
}

function WeekRanking({days,D}){
  const weeks={};
  Object.entries(days).forEach(([date,day])=>{
    const d=new Date(date+"T12:00:00");const mon=new Date(d);mon.setDate(d.getDate()-d.getDay()+1);
    const wk=mon.toISOString().slice(0,10);if(!weeks[wk])weeks[wk]=[];
    const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];
    weeks[wk].push(allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:0);
  });
  const ranked=Object.entries(weeks).map(([wk,arr])=>({wk,score:(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1),days:arr.length})).sort((a,b)=>b.score-a.score);
  return <div style={{...glassSubtle,padding:18,marginTop:10,borderRadius:14}}><p style={{margin:"0 0 12px",fontSize:D.md,fontWeight:600,color:G.text}}>Mejores semanas</p>{ranked.slice(0,5).map((r,i)=><div key={r.wk} style={{display:"flex",justifyContent:"space-between",fontSize:D.sm,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.3)"}}><span style={{color:G.muted}}>{["🥇","🥈","🥉","4","5"][i]} {r.wk}</span><span style={{color:G.sage,fontWeight:600}}>⭐ {r.score} · {r.days}d</span></div>)}</div>;
}

function ProfilePanel({profile,onUpdate,userId,D}){
  const [editing,setEditing]=useState(false);
  const [goalsOpen,setGoalsOpen]=useState(false);
  const [form,setForm]=useState({name:profile.name,weight:profile.weight,height:profile.height,fechaNac:profile.fechaNac||""});
  const [selectedGoals,setSelectedGoals]=useState(profile.goals||[]);
  const edad=calcEdad(profile.fechaNac)||profile.age;
  const bmi=(profile.weight/((profile.height/100)**2)).toFixed(1);
  const inp={width:"100%",background:"rgba(255,255,255,0.5)",backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"11px 14px",fontSize:D.md,boxSizing:"border-box",marginBottom:8,outline:"none",fontFamily:"inherit"};
  const lbl={display:"block",fontSize:D.sm,color:G.hint,marginBottom:5,marginTop:12,letterSpacing:"0.04em",textTransform:"uppercase"};
  const previewEdad=calcEdad(form.fechaNac)||profile.age;
  const previewTDEE=calcTDEE(+form.weight||profile.weight,+profile.height,form.fechaNac||profile.fechaNac,profile.sex,profile.activity);
  const previewProt=Math.round((+form.weight||profile.weight)*2);
  const toggleGoal=(id)=>setSelectedGoals(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length>=3?prev:[...prev,id]);
  const handleSave=async()=>{
    if(!form.name||!+form.weight||!+form.height)return;
    const tdee=calcTDEE(+form.weight,+profile.height,form.fechaNac||profile.fechaNac,profile.sex,profile.activity);
    const updated={...profile,name:form.name,weight:+form.weight,fechaNac:form.fechaNac||profile.fechaNac,age:previewEdad,tdee,goals:selectedGoals};
    await savePerfil(userId,updated);onUpdate(updated);setEditing(false);setGoalsOpen(false);
  };
  const handleCancel=()=>{setEditing(false);setGoalsOpen(false);setForm({name:profile.name,weight:profile.weight,height:profile.height,fechaNac:profile.fechaNac||""});setSelectedGoals(profile.goals||[]);};

  if(editing)return(
    <div style={{...glassCard,padding:"18px 20px",marginBottom:16}}>
      <p style={{margin:"0 0 14px",fontSize:D.lg,fontWeight:600,color:G.text}}>Editar perfil</p>
      <label style={lbl}>Nombre</label>
      <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inp}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><label style={lbl}>Peso (kg)</label><input type="number" value={form.weight} onChange={e=>setForm(f=>({...f,weight:e.target.value}))} style={inp}/></div>
        <div><label style={lbl}>Altura (cm)</label><input type="number" value={profile.height} disabled style={{...inp,opacity:0.6}}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4,marginBottom:8}}>
        <div style={{background:G.sageLight,borderRadius:10,padding:"10px 14px"}}>
          <p style={{margin:"0 0 2px",fontSize:11,color:G.hint,letterSpacing:"0.04em"}}>META DE PROTEÍNA</p>
          <p style={{margin:0,fontSize:D.lg,fontWeight:600,color:G.sage}}>{previewProt}g<span style={{fontSize:12,fontWeight:400,color:G.hint}}>/día</span></p>
        </div>
        {previewTDEE&&<div style={{background:G.sageLight,borderRadius:10,padding:"10px 14px"}}>
          <p style={{margin:"0 0 2px",fontSize:11,color:G.hint,letterSpacing:"0.04em"}}>CALORÍAS DIARIAS</p>
          <p style={{margin:0,fontSize:D.lg,fontWeight:600,color:G.sage}}>{previewTDEE.toLocaleString()}<span style={{fontSize:12,fontWeight:400,color:G.hint}}> kcal</span></p>
        </div>}
      </div>
      <div style={{border:`1px solid ${G.borderSubtle}`,borderRadius:12,overflow:"hidden",marginBottom:16}}>
        <button onClick={()=>setGoalsOpen(o=>!o)} style={{width:"100%",padding:"12px 16px",background:"rgba(255,255,255,0.3)",border:"none",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:D.sm,color:G.muted,fontWeight:500}}>
          <span>Objetivos</span><span style={{fontSize:11,color:G.hint}}>{goalsOpen?"▲":"▼"}</span>
        </button>
        {goalsOpen&&(
          <div style={{padding:"12px 16px",borderTop:`1px solid ${G.borderSubtle}`}}>
            <p style={{margin:"0 0 10px",fontSize:12,color:G.hint}}>Hasta 3 opciones</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Object.entries(GOAL_LABELS).map(([id,label])=>{
                const selected=selectedGoals.includes(id);
                const disabled=!selected&&selectedGoals.length>=3;
                return(
                  <div key={id} onClick={disabled?undefined:()=>toggleGoal(id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,cursor:disabled?"not-allowed":"pointer",background:selected?"rgba(90,122,84,0.12)":"rgba(255,255,255,0.35)",border:`1.5px solid ${selected?G.sage:"rgba(255,255,255,0.5)"}`,opacity:disabled?0.5:1,transition:"all 0.2s"}}>
                    <span style={{flex:1,fontSize:D.sm,color:selected?G.sage:G.muted,fontWeight:selected?600:400}}>{label}</span>
                    <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${selected?G.sage:"rgba(180,180,180,0.4)"}`,background:selected?G.sage:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {selected&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={handleCancel} variant="secondary">Cancelar</Btn>
        <div style={{flex:1}}><Btn onClick={handleSave} full>Guardar</Btn></div>
      </div>
    </div>
  );

  return(
    <div style={{...glassCard,padding:"18px 20px",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:42,height:42,borderRadius:"50%",background:G.sageLight,border:`1px solid ${G.sageBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🌿</div>
          <div>
            <p style={{margin:0,fontSize:D.md,fontWeight:600,color:G.text}}>{profile.name}</p>
            <p style={{margin:"3px 0 0",fontSize:D.sm,color:G.hint}}>IMC {bmi}{edad?` · ${edad} años`:""}</p>
          </div>
        </div>
        <button onClick={()=>setEditing(true)} style={{background:"none",border:`1px solid ${G.borderSubtle}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:14,color:G.hint,fontFamily:"inherit",flexShrink:0}}>editar</button>
      </div>
      {(profile.goals||[]).length>0&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {(profile.goals||[]).map(g=><span key={g} style={{fontSize:14,background:G.sageLight,color:G.sage,padding:"4px 10px",borderRadius:99,fontWeight:500}}>{GOAL_LABELS[g]||g}</span>)}
        </div>
      )}
    </div>
  );
}

function DayCloseModal({todayData,profile,onClose,onSave,D}){
  const [loading,setLoading]=useState(false);
  const [analysis,setAnalysis]=useState(null);
  const allMeals=[...Object.values(todayData.meals||{}),...(todayData.snacks||[])];
  const avgScore=allMeals.length?(allMeals.reduce((a,m)=>a+(m.score||0),0)/allMeals.length).toFixed(1):"—";
  const totProt=Math.round(allMeals.reduce((a,m)=>a+(m.protein_g||0),0));
  const userGoals=getGoalsText(profile?.goals||[]);
  const handleAnalyze=async()=>{
    setLoading(true);
    const mealsDesc=allMeals.map(m=>m.desc).join("; ");
    const restrictions=profile?.restrictions?`Restricciones: ${profile.restrictions}.`:"";
    try{
      const result=await callAI(`Analizá el día. Comidas: "${mealsDesc}". Score: ${avgScore}. Proteína: ${totProt}g de ${Math.round((profile?.weight||70)*2)}g. Objetivos: ${userGoals}. ${restrictions} SOLO JSON: { resumen, logros ([string] máx 2), areas_mejora ([string] máx 2), consejo_manana, puntuacion_dia (1-10) }`,"Eres un nutricionista honesto. Responde SOLO con JSON válido.");
      setAnalysis(result);
      await onSave({...todayData,dayClosed:true,dayAnalysis:result});
    }catch{alert("Error al analizar el día.");}
    setLoading(false);
  };
  const scoreColor=analysis?.puntuacion_dia>=8?G.sage:analysis?.puntuacion_dia>=6?G.gold:G.red;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(40,60,40,0.3)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{...glassCard,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <p style={{margin:0,fontSize:D.lg,fontWeight:600,color:G.text}}>Cerrar el día</p>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:G.hint}}>×</button>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:20}}>
          {[["SCORE",avgScore],["PROTEÍNA",`${totProt}g`],["COMIDAS",allMeals.length]].map(([k,v])=>(
            <div key={k} style={{background:G.sageLight,borderRadius:10,padding:"10px 14px",flex:1,textAlign:"center"}}>
              <p style={{margin:"0 0 2px",fontSize:11,color:G.hint,letterSpacing:"0.04em"}}>{k}</p>
              <p style={{margin:0,fontSize:22,fontWeight:600,color:G.sage}}>{v}</p>
            </div>
          ))}
        </div>
        {!analysis?<Btn onClick={handleAnalyze} loading={loading} full>Analizar mi día</Btn>:(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{textAlign:"center"}}><p style={{margin:0,fontSize:40,fontWeight:300,color:scoreColor,lineHeight:1}}>{analysis.puntuacion_dia}</p><p style={{margin:"2px 0 0",fontSize:11,color:G.hint}}>/10</p></div>
              <p style={{margin:0,fontSize:D.md,color:G.muted,lineHeight:1.6,flex:1}}>{analysis.resumen}</p>
            </div>
            {(analysis.logros||[]).map((l,i)=><div key={i} style={{fontSize:D.sm,color:G.sage,marginBottom:4}}>✓ {l}</div>)}
            {(analysis.areas_mejora||[]).map((a,i)=><div key={i} style={{fontSize:D.sm,color:G.gold,marginBottom:4}}>→ {a}</div>)}
            {analysis.consejo_manana&&<div style={{background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:8,padding:"10px 14px",fontSize:D.sm,color:G.sage,fontStyle:"italic",marginTop:8}}>🌅 Mañana: {analysis.consejo_manana}</div>}
            <div style={{marginTop:16}}><Btn onClick={onClose} full>Listo</Btn></div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanTab({todayData,profile,plan,setPlan,D}){
  const [loading,setLoading]=useState(false);
  const missingSlots=FIXED_SLOTS.filter(s=>!todayData.meals?.[s.id]);
  const consumedCal=[...Object.values(todayData.meals||{}),...(todayData.snacks||[])].reduce((a,m)=>a+(m.calories||m.protein_g*4||0),0);
  const consumedProt=[...Object.values(todayData.meals||{}),...(todayData.snacks||[])].reduce((a,m)=>a+(m.protein_g||0),0);
  const remainingCal=profile?.tdee?(profile.tdee-consumedCal):null;
  const remainingProt=profile?.weight?(Math.round(profile.weight*2)-consumedProt):null;
  const isExceeded=remainingCal!==null&&remainingCal<0;
  const userGoals=getGoalsText(profile?.goals||[]);
  const handleGenerate=async()=>{
    setLoading(true);
    const pendingSlots=missingSlots.map(s=>s.label).join(", ")||"ninguno";
    const alreadyEaten=Object.values(todayData.meals||{}).map(m=>m.desc).concat((todayData.snacks||[]).map(s=>s.desc)).join("; ")||"nada todavía";
    const restrictions=profile?.restrictions?`Restricciones: ${profile.restrictions}.`:"";
    const prompt=isExceeded
      ?`Excedió calorías. Ya comió: ${alreadyEaten}. Objetivos: ${userGoals}. ${restrictions} Faltan: ${pendingSlots}. Opciones livianas. SOLO JSON: { slots: [{slot, sugerencia, motivo}], mensaje_motivacional }`
      :`Lleva ${Math.round(consumedCal)} kcal y ${Math.round(consumedProt)}g proteína. Quedan ${Math.round(remainingCal||0)} kcal y ${Math.round(remainingProt||0)}g. Ya comió: ${alreadyEaten}. Objetivos: ${userGoals}. ${restrictions} Faltan: ${pendingSlots}. SOLO JSON: { slots: [{slot, sugerencia, motivo}], mensaje_motivacional }`;
    try{const result=await callAI(prompt,"Eres un nutricionista empático. Responde SOLO con JSON válido.");setPlan(result);}
    catch{alert("Error al generar el plan.");}
    setLoading(false);
  };
  return(
    <div>
      <div style={{...glassCard,padding:"18px 20px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{margin:0,fontSize:D.md,fontWeight:500,color:G.text}}>Plan de hoy</p>
          {missingSlots.length===0?<span style={{fontSize:13,color:G.sage,fontWeight:500}}>✓ Día completo</span>:<span style={{fontSize:13,color:G.hint}}>{missingSlots.length} pendiente{missingSlots.length!==1?"s":""}</span>}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {FIXED_SLOTS.map(s=>{const done=!!todayData.meals?.[s.id];return <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:99,background:done?"rgba(90,122,84,0.12)":"rgba(255,255,255,0.3)",border:`1px solid ${done?G.sage:G.borderSubtle}`}}><span style={{fontSize:14}}>{s.emoji}</span><span style={{fontSize:13,color:done?G.sage:G.hint,fontWeight:done?500:400}}>{s.label}</span>{done&&<span style={{fontSize:11,color:G.sage}}>✓</span>}</div>;})}
        </div>
        {isExceeded&&<div style={{background:G.redLight,border:`1px solid rgba(180,80,80,0.25)`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:D.sm,color:G.red}}>Superaste las calorías — igual te sugerimos opciones livianas 💚</div>}
        <Btn onClick={handleGenerate} loading={loading} full>{plan?"Actualizar plan":"Generar plan"}</Btn>
      </div>
      {plan&&<div>
        {plan.mensaje_motivacional&&<div style={{...glassCard,padding:"16px 20px",marginBottom:12}}><p style={{margin:0,fontSize:D.md,color:G.sage,fontStyle:"italic",lineHeight:1.6}}>💚 {plan.mensaje_motivacional}</p></div>}
        {(plan.slots||[]).map((item,i)=><div key={i} style={{...glassCard,padding:"16px 20px",marginBottom:10}}><p style={{margin:"0 0 6px",fontSize:12,color:G.hint,letterSpacing:"0.04em",textTransform:"uppercase"}}>{item.slot}</p><p style={{margin:"0 0 8px",fontSize:D.md,fontWeight:500,color:G.text,lineHeight:1.5}}>{item.sugerencia}</p><p style={{margin:0,fontSize:D.sm,color:G.muted,lineHeight:1.5}}>{item.motivo}</p></div>)}
      </div>}
    </div>
  );
}

function ProgressTab({days,fetchWeekSummary,weekSummaryLoading,weekSummary,showRanking,setShowRanking,badges,workoutGoal,setWorkoutGoal,D}){
  const [section,setSection]=useState("metricas");
  const [period,setPeriod]=useState("week");
  const [histDate,setHistDate]=useState(todayStr());
  const [expandedMeal,setExpandedMeal]=useState(null);
  const [editingWorkoutGoal,setEditingWorkoutGoal]=useState(false);
  const [tempGoal,setTempGoal]=useState(workoutGoal);
  const getKey=d=>d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});
  const inp={width:"100%",background:"rgba(255,255,255,0.5)",border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"12px 14px",fontSize:16,boxSizing:"border-box",marginBottom:8,outline:"none",fontFamily:"inherit"};

  const getPeriodData=()=>{
    if(period==="week")return Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=getKey(d);const day=days[k]||{};const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;return{key:k,label:d.toLocaleDateString("es",{weekday:"short"}),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0)),workout:day.workout};});
    if(period==="month")return Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);const k=getKey(d);const day=days[k]||{};const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;return{key:k,label:d.getDate().toString(),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0)),workout:day.workout};});
    return Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-11+i);d.setDate(1);const yr=d.getFullYear(),mo=d.getMonth();const mDays=Object.entries(days).filter(([k])=>{const dd=new Date(k+"T12:00:00");return dd.getFullYear()===yr&&dd.getMonth()===mo;});const allM=mDays.flatMap(([,day])=>[...Object.values(day.meals||{}),...(day.snacks||[])]);const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:null;const prot=mDays.length?mDays.reduce((acc,[,day])=>acc+[...Object.values(day.meals||{}),...(day.snacks||[])].reduce((a,m)=>a+(m.protein_g||0),0),0)/mDays.length:0;return{key:`${yr}-${mo}`,label:d.toLocaleDateString("es",{month:"short"}),score:score!=null?Math.round(score*10)/10:null,prot:Math.round(prot),workouts:mDays.filter(([,day])=>day.workout).length};});
  };

  const data=getPeriodData();
  const maxProt=Math.max(...data.map(d=>d.prot),1);
  const scoreDays=data.filter(d=>d.score!=null);
  const avgScore=scoreDays.length?(scoreDays.reduce((a,d)=>a+d.score,0)/scoreDays.length).toFixed(1):"—";
  const avgProt=Math.round(data.reduce((a,d)=>a+d.prot,0)/Math.max(data.length,1));
  const weeksInPeriod=period==="week"?1:period==="month"?4:52;
  const targetTotal=workoutGoal*weeksInPeriod;
  const totalWorkouts=period==="year"?data.reduce((a,d)=>a+(d.workouts||0),0):data.filter(d=>d.workout).length;
  const volumePct=Math.min(100,Math.round((totalWorkouts/targetTotal)*100));
  const volumeColor=totalWorkouts>=targetTotal?G.sage:totalWorkouts>=targetTotal*0.7?G.gold:G.red;
  const coherenceDays=Object.values(days).filter(d=>d.workout?.coherence_score);
  const avgCoherence=coherenceDays.length?(coherenceDays.reduce((a,d)=>a+(d.workout.coherence_score||0),0)/coherenceDays.length).toFixed(1):null;
  let currentStreak=0;const sd=new Date();
  while(true){const k=getKey(sd);const day=days[k];const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);if(!has)break;currentStreak++;sd.setDate(sd.getDate()-1);}
  const allDates=Object.keys(days).filter(k=>k!=="perfil").sort();
  let maxStreak=0,tempStreak=0;
  for(let i=0;i<allDates.length;i++){const day=days[allDates[i]];const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);if(has){tempStreak++;maxStreak=Math.max(maxStreak,tempStreak);}else{tempStreak=0;}}
  const calDays=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);const day=days[getKey(d)];return day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0||day.workout);});
  const gap=period==="month"?1:3;
  const PeriodBtn=({id,label})=><button onClick={()=>setPeriod(id)} style={{padding:"7px 16px",borderRadius:99,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:D.sm,fontWeight:period===id?600:400,background:period===id?"rgba(90,122,84,0.2)":"transparent",color:period===id?G.sage:G.hint}}>{label}</button>;
  const SectionBtn=({id,label})=><button onClick={()=>setSection(id)} style={{flex:1,padding:"6px 4px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:D.sm,fontWeight:section===id?600:400,color:section===id?G.sage:G.hint,transition:"all 0.2s",letterSpacing:"0.02em",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>{label}<div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid rgba(138,180,132,0.35)`}}>
  return(
    <div>
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid rgba(255,255,255,0.3)`}}>
        <SectionBtn id="metricas" label="Métricas"/><SectionBtn id="historial" label="Historial"/><SectionBtn id="badges" label="Badges"/>
      </div>
      {section==="metricas"&&<div>
        <div style={{...glassSubtle,display:"flex",justifyContent:"center",gap:4,padding:"4px",borderRadius:99,marginBottom:16}}>
          <PeriodBtn id="week" label="Semana"/><PeriodBtn id="month" label="Mes"/><PeriodBtn id="year" label="Año"/>
        </div>
        <div style={{...glassCard,padding:20,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <p style={{margin:0,fontSize:D.md,fontWeight:500,color:G.text}}>Proteína & Puntaje</p>
            <div style={{display:"flex",gap:12,fontSize:D.sm,color:G.hint}}><span>Score <strong style={{color:G.sage}}>{avgScore}</strong></span><span>Prot <strong style={{color:G.gold}}>{avgProt}g</strong></span></div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",height:60,gap}}>{data.map(d=>{const h=d.prot?Math.round((d.prot/maxProt)*56):2;return <div key={d.key} style={{flex:1,height:h,background:G.goldLight,borderTop:`2px solid ${G.gold}`,borderRadius:"3px 3px 0 0",alignSelf:"flex-end"}}/>;})}</div>
          <div style={{display:"flex",gap,marginTop:4}}>{data.map((d,i)=>(period==="week"||period==="year"||(period==="month"&&i%5===0))?<div key={d.key} style={{flex:1,textAlign:"center"}}><span style={{fontSize:11,color:G.hint}}>{d.label}</span></div>:<div key={d.key} style={{flex:1}}/>)}</div>
          <div style={{height:"1px",background:"rgba(255,255,255,0.35)",margin:"6px 0"}}/>
          <div style={{display:"flex",gap,marginBottom:8}}>{data.map(d=><div key={d.key} style={{flex:1,textAlign:"center"}}><span style={{fontSize:D.sm,fontWeight:700,color:G.sage}}>{d.score!=null?d.score:"·"}</span></div>)}</div>
        </div>
        <div style={{...glassCard,padding:20,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{margin:0,fontSize:D.md,fontWeight:500,color:G.text}}>Volumen de entrenamiento</p>
            <div>{editingWorkoutGoal?(
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button onClick={()=>setTempGoal(t=>Math.max(1,t-1))} style={{width:24,height:24,borderRadius:"50%",border:`1px solid ${G.borderSubtle}`,background:"transparent",cursor:"pointer",fontSize:14,color:G.hint,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>−</button>
                <span style={{fontSize:D.sm,fontWeight:600,color:G.sage,minWidth:20,textAlign:"center"}}>{tempGoal}</span>
                <button onClick={()=>setTempGoal(t=>Math.min(7,t+1))} style={{width:24,height:24,borderRadius:"50%",border:`1px solid ${G.borderSubtle}`,background:"transparent",cursor:"pointer",fontSize:14,color:G.hint,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>+</button>
                <button onClick={()=>{setWorkoutGoal(tempGoal);setEditingWorkoutGoal(false);lsSave("nq_workout_goal",tempGoal);}} style={{padding:"3px 8px",borderRadius:6,border:"none",background:G.sage,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>ok</button>
              </div>
            ):(
              <button onClick={()=>{setTempGoal(workoutGoal);setEditingWorkoutGoal(true);}} style={{fontSize:D.sm,color:G.hint,background:"none",border:`1px solid ${G.borderSubtle}`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>{workoutGoal}x/sem</button>
            )}</div>
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
        {weekSummary&&<div style={{...glassCard,padding:20,marginTop:12}}>{[["Mejor día",G.sage,weekSummary.best_day],["Peor día",G.red,weekSummary.worst_day],["Logro",G.text,weekSummary.achievement],["Próximo desafío",G.text,weekSummary.challenge]].map(([k,c,v])=><div key={k} style={{marginBottom:14}}><p style={{margin:"0 0 3px",fontSize:D.sm,color:G.hint,letterSpacing:"0.04em"}}>{k.toUpperCase()}</p><p style={{margin:0,fontSize:D.md,color:c,fontWeight:500}}>{v}</p></div>)}<div style={{background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:10,padding:"14px 16px",marginTop:4,color:G.sage,fontSize:D.md,fontStyle:"italic"}}>{weekSummary.motivation}</div></div>}
        <button onClick={()=>setShowRanking(r=>!r)} style={{width:"100%",marginTop:12,padding:"10px",borderRadius:10,border:`1px solid ${G.borderSubtle}`,background:"rgba(255,255,255,0.2)",color:G.hint,cursor:"pointer",fontSize:16,fontFamily:"inherit",backdropFilter:blurSm,WebkitBackdropFilter:blurSm}}>{showRanking?"Ocultar":"Ver"} ranking personal</button>
        {showRanking&&<WeekRanking days={days} D={D}/>}
      </div>}
      {section==="historial"&&<div>
        <input type="date" value={histDate} onChange={e=>setHistDate(e.target.value)} style={{...inp,marginBottom:16}}/>
        {(()=>{
          const hDay=days[histDate];
          if(!hDay)return <p style={{color:G.hint,textAlign:"center",padding:28,fontSize:D.md}}>Sin registros para este día.</p>;
          const allH=[...Object.values(hDay.meals||{}),...(hDay.snacks||[])];
          const avgScore=allH.length?(allH.reduce((a,m)=>a+(m.score||0),0)/allH.length).toFixed(1):"—";
          const totProt=Math.round(allH.reduce((a,m)=>a+(m.protein_g||0),0));
          return <div>
            <div style={{...glassCard,padding:"16px 20px",marginBottom:12}}>
              <p style={{margin:"0 0 10px",fontWeight:500,fontSize:D.lg}}>{new Date(histDate+"T12:00:00").toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Tag>{allH.length} comida{allH.length!==1?"s":""}</Tag>
                <Tag bg={G.goldLight} color={G.gold} border="rgba(180,148,72,0.25)">⭐ {avgScore}</Tag>
                <Tag>💪 {totProt}g</Tag>
                {hDay.workout&&<Tag>🏋️ {hDay.workout.type}</Tag>}
              </div>
              {hDay.dayAnalysis&&<div style={{marginTop:12,background:G.sageLight,border:`1px solid ${G.sageBorder}`,borderRadius:8,padding:"10px 14px",fontSize:D.sm,color:G.sage}}><strong>Análisis:</strong> {hDay.dayAnalysis.resumen}</div>}
            </div>
            {FIXED_SLOTS.map(slot=>{const m=hDay.meals?.[slot.id];if(!m)return null;const key=`${histDate}-${slot.id}`;const isExp=expandedMeal===key;return <div key={key} style={{...glassCard,padding:"16px 20px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",cursor:"pointer",marginBottom:8}} onClick={()=>setExpandedMeal(isExp?null:key)}><span style={{fontWeight:500,fontSize:D.md}}>{slot.emoji} {slot.label}</span><span style={{fontSize:D.sm,color:G.hint}}>{isExp?"▲":"▼"}</span></div><p style={{margin:0,fontSize:D.sm,color:G.muted}}>{m.desc}</p>{isExp&&<MealDetails meal={m} D={D}/>}</div>;})}
            {(hDay.snacks||[]).map((s,i)=>{const key=`${histDate}-snack-${i}`;const isExp=expandedMeal===key;return <div key={key} style={{...glassCard,padding:"16px 20px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",cursor:"pointer",marginBottom:8}} onClick={()=>setExpandedMeal(isExp?null:key)}><span style={{fontWeight:500,fontSize:D.md}}>🥜 {s.name}</span><span style={{fontSize:D.sm,color:G.hint}}>{isExp?"▲":"▼"}</span></div><p style={{margin:0,fontSize:D.sm,color:G.muted}}>{s.desc}</p>{isExp&&<MealDetails meal={s} D={D}/>}</div>;})}
            {hDay.workout&&<div style={{...glassCard,padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontWeight:500,fontSize:D.md}}>🏋️ Entrenamiento</p><WorkoutCard workout={hDay.workout} D={D}/></div>}
          </div>;
        })()}
      </div>}
      {section==="badges"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {BADGES_DEF.map(b=>{const unlocked=badges.includes(b.id);return <div key={b.id} style={{...unlocked?glassCard:glassSubtle,padding:18,textAlign:"center",opacity:unlocked?1:0.5}}><div style={{fontSize:32,marginBottom:10,filter:unlocked?"none":"grayscale(1) opacity(0.4)"}}>{b.emoji}</div><p style={{margin:"0 0 4px",fontWeight:500,fontSize:15,color:G.text}}>{b.name}</p><p style={{margin:0,fontSize:14,color:G.hint,lineHeight:1.5}}>{b.desc}</p>{unlocked&&<p style={{margin:"10px 0 0",fontSize:13,color:G.sage,fontWeight:600,letterSpacing:"0.04em"}}>✓ DESBLOQUEADO</p>}</div>;})}
      </div>}
    </div>
  );
}

export default function App(){
  const isDesktop=useIsDesktop();
  const D={xs:isDesktop?"16px":"12px",sm:isDesktop?"19px":"13px",md:isDesktop?"22px":"15px",lg:isDesktop?"26px":"18px",xl:isDesktop?"34px":"22px"};
  const inp={width:"100%",background:"rgba(255,255,255,0.5)",backdropFilter:blurSm,WebkitBackdropFilter:blurSm,border:`1px solid ${G.border}`,borderRadius:10,color:G.text,padding:"12px 14px",fontSize:D.md,boxSizing:"border-box",marginBottom:8,outline:"none",fontFamily:"inherit"};
  const lbl={display:"block",fontSize:D.sm,color:G.hint,marginBottom:5,marginTop:12,letterSpacing:"0.04em",textTransform:"uppercase"};

  const [session,setSession]=useState(null);
  const [sessionLoading,setSessionLoading]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setSessionLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);});
    return()=>subscription.unsubscribe();
  },[]);

  const USER_ID=session?.user?.id??"gabo";
  const [tab,setTab]=useState("today");
  const [profile,setProfile]=useState(null);
  const [days,setDays]=useState({});
  const [loading,setLoading]=useState(true);
  const [badges,setBadges]=useState(()=>lsLoad("nq_badges",[]));
  const [streak,setStreak]=useState(()=>lsLoad("nq_streak",0));
  const [workoutGoal,setWorkoutGoal]=useState(()=>lsLoad("nq_workout_goal",3));
  const [toasts,setToasts]=useState([]);
  const [weekSummary,setWeekSummary]=useState(null);
  const [weekSummaryLoading,setWeekSummaryLoading]=useState(false);
  const [showRanking,setShowRanking]=useState(false);
  const [mealInputs,setMealInputs]=useState({});
  const [mealLoading,setMealLoading]=useState({});
  const [snackName,setSnackName]=useState("");
  const [workoutForm,setWorkoutForm]=useState({type:"Fuerza/hipertrofia",duration:45,intensity:3});
  const [workoutLoading,setWorkoutLoading]=useState(false);
  const [showDayClose,setShowDayClose]=useState(false);
  const [dayPlan,setDayPlan]=useState(null);

  const today=todayStr();
  const todayData=days[today]||{meals:{},snacks:[],workout:null,dayClosed:false,dayAnalysis:null};

  useEffect(()=>{
    if(sessionLoading)return;
    (async()=>{setLoading(true);const[p,d]=await Promise.all([loadPerfil(USER_ID),loadAllDays(USER_ID)]);setProfile(p);setDays(d);setLoading(false);})();
  },[USER_ID,sessionLoading]);

  useEffect(()=>{lsSave("nq_badges",badges);},[badges]);
  useEffect(()=>{lsSave("nq_streak",streak);},[streak]);

  const addToast=useCallback((b)=>{const id=Date.now();setToasts(t=>[...t,{id,...b}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000);},[]);
  const unlockBadge=useCallback((id)=>{setBadges(b=>{if(b.includes(id))return b;const def=BADGES_DEF.find(x=>x.id===id);if(def)addToast({emoji:def.emoji,title:def.name,desc:def.desc});return[...b,id];});},[addToast]);
  const calcStreak=useCallback((daysMap)=>{let s=0;const d=new Date();while(true){const k=d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});const day=daysMap[k];const has=day&&(Object.keys(day.meals||{}).length>0||(day.snacks||[]).length>0);if(!has)break;s++;d.setDate(d.getDate()-1);}return s;},[]);

  const updateToday=async(patch)=>{
    const updated={...todayData,...patch};
    setDays(prev=>({...prev,[today]:updated}));
    await saveDay(USER_ID,today,updated);
    const s=calcStreak({...days,[today]:updated});
    setStreak(s);lsSave("nq_streak",s);
  };

  const handleDeleteMeal=async(slotId)=>{const m={...todayData.meals};delete m[slotId];await updateToday({meals:m});};
  const handleDeleteSnack=async(index)=>{await updateToday({snacks:(todayData.snacks||[]).filter((_,i)=>i!==index)});};

  const handleEditMeal=async(slotId,newDesc,targetDate)=>{
    const oldMeal=todayData.meals[slotId];
    const editCount=(oldMeal.editCount||0)+1;
    setMealLoading(l=>({...l,[slotId]:true}));
    const userGoals=getGoalsText(profile?.goals||[]);
    const restrictions=profile?.restrictions?`Restricciones: ${profile.restrictions}.`:"";
    let result={};
    try{
      result=await callAI(`Analiza esta comida: "${newDesc}". El usuario quiere: ${userGoals}. ${restrictions} Sé honesto. SOLO JSON: score (1-10), protein_g, skin_impact ("beneficioso"|"neutro"|"inflamatorio"), goal_alignment ("excelente"|"bueno"|"moderado"|"perjudicial"), nutrients ([{name,benefit,negative:bool}] máx 4), tip.`,"Eres un nutricionista honesto. Responde SOLO con JSON válido.");
    }catch{console.error("Error al re-analizar");}
    setMealLoading(l=>({...l,[slotId]:false}));
    const meal={...oldMeal,desc:newDesc,...result,editCount};
    if(targetDate&&targetDate!==today){
      const toDay=days[targetDate]||{meals:{},snacks:[],workout:null};
      const newFrom={...todayData.meals};delete newFrom[slotId];
      await saveDay(USER_ID,today,{...todayData,meals:newFrom});
      await saveDay(USER_ID,targetDate,{...toDay,meals:{...toDay.meals,[slotId]:meal}});
      const[,d]=await Promise.all([loadPerfil(USER_ID),loadAllDays(USER_ID)]);setDays(d);
    }else{await updateToday({meals:{...todayData.meals,[slotId]:meal}});}
  };

  useEffect(()=>{if(streak>=3)unlockBadge("streak_3");if(streak>=7){unlockBadge("streak_7");unlockBadge("week_complete");}},[streak,unlockBadge]);

  const handleMealSubmit=async(slotId,label)=>{
    const desc=mealInputs[slotId];if(!desc?.trim())return;
    setMealLoading(l=>({...l,[slotId]:true}));
    try{
      const userGoals=getGoalsText(profile?.goals||[]);
      const restrictions=profile?.restrictions?`Restricciones: ${profile.restrictions}.`:"";
      const result=await callAI(`Analiza esta comida: "${desc}". El usuario quiere: ${userGoals}. ${restrictions} Sé honesto. SOLO JSON: score (1-10), protein_g, skin_impact ("beneficioso"|"neutro"|"inflamatorio"), goal_alignment ("excelente"|"bueno"|"moderado"|"perjudicial"), nutrients ([{name,benefit,negative:bool}] máx 4), tip.`,"Eres un nutricionista honesto. Responde SOLO con JSON válido.");
      const meal={desc,...result,slot:slotId,label,editCount:0,timestamp:Date.now()};
      const newMeals={...todayData.meals,[slotId]:meal};
      await updateToday({meals:newMeals});
      unlockBadge("first_meal");
      const dayProt=Object.values(newMeals).reduce((a,m)=>a+(m.protein_g||0),0)+(todayData.snacks||[]).reduce((a,s)=>a+(s.protein_g||0),0);
      if(profile&&dayProt>=profile.weight*2)unlockBadge("protein_goal");
      const scores=Object.values(newMeals).map(m=>m.score||0);
      if(scores.length>=3&&scores.reduce((a,b)=>a+b,0)/scores.length>=9)unlockBadge("perfect_day");
      setMealInputs(i=>({...i,[slotId]:""}));
    }catch{alert("Error al analizar. Intentá de nuevo.");}
    setMealLoading(l=>({...l,[slotId]:false}));
  };

  const handleSnackSubmit=async()=>{
    const desc=mealInputs["snack_new"];if(!desc?.trim()||!snackName?.trim())return;
    setMealLoading(l=>({...l,snack_new:true}));
    try{
      const userGoals=getGoalsText(profile?.goals||[]);
      const restrictions=profile?.restrictions?`Restricciones: ${profile.restrictions}.`:"";
      const result=await callAI(`Analiza este tentempié "${snackName}": "${desc}". El usuario quiere: ${userGoals}. ${restrictions} Sé honesto. SOLO JSON: score (1-10), protein_g, skin_impact ("beneficioso"|"neutro"|"inflamatorio"), goal_alignment ("excelente"|"bueno"|"moderado"|"perjudicial"), nutrients ([{name,benefit,negative:bool}] máx 4), tip.`,"Eres un nutricionista honesto. Responde SOLO con JSON válido.");
      await updateToday({snacks:[...(todayData.snacks||[]),{desc,name:snackName,...result,editCount:0,timestamp:Date.now()}]});
      unlockBadge("first_meal");
      setMealInputs(i=>({...i,snack_new:""}));setSnackName("");
    }catch{alert("Error al analizar el tentempié.");}
    setMealLoading(l=>({...l,snack_new:false}));
  };

  const handleWorkoutSubmit=async()=>{
    setWorkoutLoading(true);
    const mealsDesc=[...Object.values(todayData.meals||{}).map(m=>m.desc),...(todayData.snacks||[]).map(s=>s.desc)].join("; ");
    try{
      const result=await callAI(
        `Entreno: ${workoutForm.type}, ${workoutForm.duration}min, intensidad ${workoutForm.intensity}/5. Comidas hoy: "${mealsDesc}". SOLO JSON: coherence_score (1-10), impact (string breve).`,
        "Eres un nutricionista. Responde SOLO con JSON válido."
      );
      await updateToday({workout:{...workoutForm,...result,timestamp:Date.now()}});
      unlockBadge("first_workout");
      const weekW=Object.entries(days).filter(([d,v])=>{const diff=(new Date(today)-new Date(d))/86400000;return diff>=0&&diff<7&&v?.workout;}).length+1;
      if(weekW>=3)unlockBadge("athlete");
    }catch{await updateToday({workout:{...workoutForm,timestamp:Date.now()}});}
    setWorkoutLoading(false);
  };

  const fetchWeekSummary=async()=>{
    setWeekSummaryLoading(true);
    const data7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=d.toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"});const day=days[k]||{};const allM=[...Object.values(day.meals||{}),...(day.snacks||[])];const score=allM.length?allM.reduce((a,m)=>a+(m.score||0),0)/allM.length:0;return`${k}: score ${Math.round(score*10)/10}, prot ${Math.round(allM.reduce((a,m)=>a+(m.protein_g||0),0))}g`;}).join("; ");
    try{const r=await callAI(`7 días: ${data7}. SOLO JSON: best_day, worst_day, achievement, challenge, motivation.`,"Eres un coach nutricional honesto. Responde SOLO con JSON válido.");setWeekSummary(r);}
    catch{alert("Error al generar el resumen.");}
    setWeekSummaryLoading(false);
  };

  if(sessionLoading)return(<div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",color:G.muted}}><div style={{fontSize:44,marginBottom:14}}>🌿</div><p style={{fontSize:18,letterSpacing:"0.04em"}}>Cargando…</p></div></div>);
  if(!session)return <AuthScreen/>;
  if(loading)return(<div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center",color:G.muted}}><div style={{fontSize:44,marginBottom:14}}>🌿</div><p style={{fontSize:18,letterSpacing:"0.04em"}}>Cargando…</p></div></div>);
  if(!profile||!profile.onboarded)return <Onboarding onSave={async(perfil)=>{await savePerfil(USER_ID,perfil);setProfile(perfil);}} userId={USER_ID}/>;

  const proteinGoal=Math.round(profile.weight*2);
  const todayProt=[...Object.values(todayData.meals||{}),...(todayData.snacks||[])].reduce((a,m)=>a+(m.protein_g||0),0);
  const todayCal=[...Object.values(todayData.meals||{}),...(todayData.snacks||[])].reduce((a,m)=>a+(m.calories||m.protein_g*4||0),0);
  const protPct=Math.min(110,(todayProt/proteinGoal)*100);
  const calPct=profile?.tdee?Math.min(110,(todayCal/profile.tdee)*100):0;
  const protColor=getProgressColor(protPct,"protein",profile?.goals||[]);
  const calColor=getProgressColor(calPct,"calories",profile?.goals||[]);
  const TABS=[{id:"today",label:"Hoy"},{id:"progress",label:"Progreso"},{id:"plan",label:"Plan"}];
  const maxW=isDesktop?960:640;

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:`linear-gradient(135deg,${G.bg1} 0%,${G.bg2} 50%,${G.bg3} 100%)`,color:G.text}}>
      <Toast toasts={toasts}/>
      {showDayClose&&<DayCloseModal todayData={todayData} profile={profile} onClose={()=>setShowDayClose(false)} onSave={updateToday} D={D}/>}

      <div style={{maxWidth:maxW,margin:"0 auto",padding:isDesktop?"28px 40px":"20px 20px"}}>
        <div style={{textAlign:"center",marginBottom:20,position:"relative"}}>
          <h1 style={{margin:"0 0 3px",fontSize:D.xl,fontWeight:300,color:G.text,letterSpacing:"0.02em"}}>🌿 NutriQuest</h1>
          <p style={{margin:0,fontSize:D.sm,color:G.hint,letterSpacing:"0.06em"}}>{new Date().toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long",timeZone:"America/Argentina/Buenos_Aires"})}</p>
          <button onClick={()=>supabase.auth.signOut()} style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",background:"none",border:`1px solid ${G.borderSubtle}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:14,color:G.hint,fontFamily:"inherit"}}>Salir</button>
        </div>

        <ProfilePanel profile={profile} onUpdate={setProfile} userId={USER_ID} D={D}/>
        <DailyTip profile={profile} D={D}/>

        <div style={{...glassCard,padding:"14px 20px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
            <span style={{color:G.hint,letterSpacing:"0.04em",fontSize:D.xs}}>PROTEÍNA HOY</span>
            <span style={{fontSize:D.sm}}>
              <span style={{color:G.hint,fontWeight:400}}>{Math.round(todayProt)}g</span>
              <span style={{color:G.hint,fontWeight:400}}> / </span>
              <span style={{color:protColor,fontWeight:700}}>{proteinGoal}g</span>
            </span>
          </div>
          <div style={{background:"rgba(255,255,255,0.3)",borderRadius:99,height:6,overflow:"hidden",marginBottom:14}}>
            <div style={{width:`${protPct}%`,background:protColor,height:"100%",borderRadius:99,transition:"width 0.6s ease",opacity:0.85}}/>
          </div>
          {profile?.tdee&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
              <span style={{color:G.hint,letterSpacing:"0.04em",fontSize:D.xs}}>CALORÍAS HOY</span>
              <span style={{fontSize:D.sm}}>
                <span style={{color:G.hint,fontWeight:400}}>{Math.round(todayCal)} kcal</span>
                <span style={{color:G.hint,fontWeight:400}}> / </span>
                <span style={{color:calColor,fontWeight:700}}>{profile.tdee.toLocaleString()} kcal</span>
              </span>
            </div>
            <div style={{background:"rgba(255,255,255,0.3)",borderRadius:99,height:6,overflow:"hidden"}}>
              <div style={{width:`${calPct}%`,background:calColor,height:"100%",borderRadius:99,transition:"width 0.6s ease",opacity:0.85}}/>
            </div>
          </>}
        </div>

        <div style={{...glassSubtle,display:"flex",gap:0,marginBottom:20,overflow:"hidden",padding:4,borderRadius:14}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 6px",background:tab===t.id?"rgba(255,255,255,0.6)":"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:D.sm,fontWeight:tab===t.id?600:400,color:tab===t.id?G.sage:G.hint,borderRadius:10,transition:"all 0.2s",backdropFilter:tab===t.id?blurSm:"none",WebkitBackdropFilter:tab===t.id?blurSm:"none"}}>{t.label}</button>)}
        </div>

        {tab==="today"&&<div>
          <SectionDivider label="COMIDAS"/>
          <div style={{...glassCard,overflow:"hidden",marginBottom:16}}>
            {FIXED_SLOTS.map((slot,i)=>(
              <div key={slot.id}>
                <MealSlot slot={slot} meal={todayData.meals?.[slot.id]} input={mealInputs[slot.id]||""} onInput={v=>setMealInputs(x=>({...x,[slot.id]:v}))} loading={mealLoading[slot.id]} onSubmit={()=>handleMealSubmit(slot.id,slot.label)} onDelete={()=>handleDeleteMeal(slot.id)} onSave={(desc,date)=>handleEditMeal(slot.id,desc,date)} D={D}/>
                {i<FIXED_SLOTS.length-1&&<Divider/>}
              </div>
            ))}
          </div>

          <div style={{...glassCard,padding:"18px 20px",marginBottom:16}}>
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

          <SectionDivider label="ENTRENAMIENTO"/>
          <div style={{...glassCard,padding:22,marginBottom:16}}>
            <p style={{margin:"0 0 18px",fontSize:D.lg,fontWeight:500,color:G.text}}>🏋️ Entrenamiento de hoy</p>
            {todayData.workout?<WorkoutCard workout={todayData.workout} D={D}/>:(
              <div>
                <label style={lbl}>Tipo</label>
                <select value={workoutForm.type} onChange={e=>setWorkoutForm(f=>({...f,type:e.target.value}))} style={inp}>{WORKOUT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
                <div style={{marginTop:12,marginBottom:4}}>
                  <Slider min={15} max={180} step={5} value={workoutForm.duration} onChange={v=>setWorkoutForm(f=>({...f,duration:v}))} label="Duración"/>
                </div>
                <div style={{marginTop:12,marginBottom:16}}>
                  <Slider min={1} max={5} step={1} value={workoutForm.intensity} onChange={v=>setWorkoutForm(f=>({...f,intensity:v}))} label="Intensidad"/>
                </div>
                <Btn loading={workoutLoading} onClick={handleWorkoutSubmit} full>Registrar entrenamiento</Btn>
              </div>
            )}
          </div>

          <SectionDivider label="FIN DEL DÍA"/>
          <div style={{...glassCard,padding:"18px 20px",marginBottom:16,textAlign:"center"}}>
            {todayData.dayClosed?(
              <div>
                <p style={{margin:"0 0 4px",fontSize:D.md,fontWeight:500,color:G.sage}}>✓ Día cerrado</p>
                {todayData.dayAnalysis&&<p style={{margin:0,fontSize:D.sm,color:G.muted}}>Puntuación del día: <strong style={{color:G.sage}}>{todayData.dayAnalysis.puntuacion_dia}/10</strong></p>}
              </div>
            ):(
              <div>
                <p style={{margin:"0 0 12px",fontSize:D.md,color:G.muted,lineHeight:1.6}}>¿Terminaste de comer por hoy?<br/>Cerrá el día para obtener tu análisis completo.</p>
                <Btn onClick={()=>setShowDayClose(true)} full>Cerrar el día</Btn>
              </div>
            )}
          </div>
        </div>}

        {tab==="progress"&&<ProgressTab days={days} fetchWeekSummary={fetchWeekSummary} weekSummaryLoading={weekSummaryLoading} weekSummary={weekSummary} showRanking={showRanking} setShowRanking={setShowRanking} badges={badges} workoutGoal={workoutGoal} setWorkoutGoal={setWorkoutGoal} D={D}/>}
        {tab==="plan"&&<PlanTab todayData={todayData} profile={profile} plan={dayPlan} setPlan={setDayPlan} D={D}/>}
      </div>
    </div>
  );
}
