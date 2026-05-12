import { useState, useEffect, useRef } from "react";

const G = {
  glass: "rgba(255,255,255,0.55)", glassDark: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.6)", borderSubtle: "rgba(255,255,255,0.35)",
  text: "#2a3428", muted: "#5a6b57", hint: "#93a48f",
  sage: "#5a7a54", sageLight: "rgba(138,180,132,0.18)", sageBorder: "rgba(90,122,84,0.3)",
  bg1: "#c8d8c4", bg2: "#e8e0d0", bg3: "#d4cabb",
};
const blur = "blur(14px)";
const glassCard = { background: G.glass, backdropFilter: blur, WebkitBackdropFilter: blur, border: `1px solid ${G.border}`, borderRadius: 18 };

const OBJETIVOS = [
  { id: "comer_mejor", emoji: "🥗", label: "Comer mejor", desc: "Mejorar mis hábitos alimenticios" },
  { id: "energia", emoji: "⚡", label: "Tener más energía", desc: "Sentirme bien y rendir más en el día" },
  { id: "musculo", emoji: "💪", label: "Ganar músculo", desc: "Entrenar y ver resultados" },
  { id: "bajar_peso", emoji: "⚖️", label: "Bajar de peso", desc: "Llegar a mi peso ideal" },
  { id: "verme_mejor", emoji: "✨", label: "Verme mejor", desc: "Mejorar mi piel, mi cuerpo y mi bienestar" },
];

const ACTIVIDAD = [
  { id: "sedentario", emoji: "🛋️", label: "Sedentario", desc: "Poco o nada de ejercicio", factor: 1.2 },
  { id: "ligero", emoji: "🚶", label: "Ligero", desc: "1-3 días por semana", factor: 1.375 },
  { id: "moderado", emoji: "🚴", label: "Moderado", desc: "3-5 días por semana", factor: 1.55 },
  { id: "activo", emoji: "🏃", label: "Activo", desc: "6-7 días por semana", factor: 1.725 },
  { id: "muy_activo", emoji: "🔥", label: "Muy activo", desc: "Entrenamiento intenso diario", factor: 1.9 },
];

const RESTRICCIONES_SUGERIDAS = [
  { id: "vegetariano", emoji: "🥦", label: "Vegetariano" },
  { id: "vegano", emoji: "🌱", label: "Vegano" },
  { id: "sin_gluten", emoji: "🌾", label: "Sin gluten" },
  { id: "sin_lactosa", emoji: "🥛", label: "Sin lactosa" },
  { id: "sin_mariscos", emoji: "🦐", label: "Sin mariscos" },
  { id: "sin_frutos_secos", emoji: "🥜", label: "Sin frutos secos" },
  { id: "bajo_sodio", emoji: "🧂", label: "Bajo en sodio" },
  { id: "diabetico", emoji: "🩺", label: "Diabético" },
];

const MESES_LABELS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ITEM_H = 48;
const DAYS = Array.from({length:31},(_,i)=>String(i+1).padStart(2,"0"));
const YEARS = Array.from({length:90},(_,i)=>String(2008-i));

function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date(), nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad > 0 ? edad : null;
}

function calcTDEE(peso, altura, fechaNac, sexo, factorActividad) {
  const edad = calcEdad(fechaNac);
  if (!peso || !altura || !edad || !sexo || !factorActividad) return null;
  const bmr = sexo === "masculino"
    ? 88.36 + 13.4 * peso + 4.8 * altura - 5.7 * edad
    : 447.6 + 9.2 * peso + 3.1 * altura - 4.3 * edad;
  return Math.round(bmr * factorActividad);
}

// ── FechaPicker adaptativo ─────────────────────────────────────────────────
function ScrollCol({ items, initIdx, onSelect, labelFn }) {
  const ref = useRef(null);
  const [selIdx, setSelIdx] = useState(initIdx);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = initIdx * ITEM_H;
  }, []);

  const handleScroll = () => {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    if (idx !== selIdx) { setSelIdx(idx); onSelect(idx); }
  };

  return (
    <div style={{flex:1,overflow:"hidden",position:"relative",borderRadius:10,background:"rgba(255,255,255,0.3)"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:ITEM_H*1.5,background:"linear-gradient(to bottom,rgba(200,216,196,0.8),transparent)",pointerEvents:"none",zIndex:2}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:ITEM_H*1.5,background:"linear-gradient(to top,rgba(200,216,196,0.8),transparent)",pointerEvents:"none",zIndex:2}}/>
      <div style={{position:"absolute",top:ITEM_H*1.5,left:4,right:4,height:ITEM_H,borderTop:`1px solid ${G.sageBorder}`,borderBottom:`1px solid ${G.sageBorder}`,pointerEvents:"none",zIndex:1}}/>
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{overflowY:"scroll",height:ITEM_H*4,scrollSnapType:"y mandatory",padding:`${ITEM_H*1.5}px 0`,scrollbarWidth:"none",msOverflowStyle:"none"}}
      >
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        {items.map((item,i) => (
          <div key={i} style={{height:ITEM_H,display:"flex",alignItems:"center",justifyContent:"center",scrollSnapAlign:"center",fontSize:i===selIdx?17:14,fontWeight:i===selIdx?600:400,color:i===selIdx?G.sage:G.hint,transition:"all 0.15s",userSelect:"none"}}>
            {labelFn ? labelFn(item, i) : item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FechaPicker({ diaNac, mesNac, anioNac, onChange }) {
  const isMobile = window.innerWidth < 768;

  const buildFecha = (d, m, a) => {
    const fechaNac = d && m && a && String(a).length === 4
      ? `${a}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}` : "";
    return { diaNac: String(d||""), mesNac: String(m||""), anioNac: String(a||""), fechaNac };
  };

  const inp = { background:"rgba(255,255,255,0.5)", border:`1px solid ${G.border}`, borderRadius:10, color:G.text, padding:"11px 14px", fontSize:15, boxSizing:"border-box", outline:"none", fontFamily:"inherit", width:"100%" };

  if (!isMobile) {
    return (
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1}}>
          <p style={{margin:"0 0 4px",fontSize:11,color:G.hint,textAlign:"center"}}>Día</p>
          <select value={diaNac} onChange={e=>onChange(buildFecha(e.target.value,mesNac,anioNac))} style={inp}>
            <option value="">Día</option>
            {Array.from({length:31},(_,i)=><option key={i+1} value={String(i+1).padStart(2,"0")}>{i+1}</option>)}
          </select>
        </div>
        <div style={{flex:2}}>
          <p style={{margin:"0 0 4px",fontSize:11,color:G.hint,textAlign:"center"}}>Mes</p>
          <select value={mesNac} onChange={e=>onChange(buildFecha(diaNac,e.target.value,anioNac))} style={inp}>
            <option value="">Mes</option>
            {MESES_LABELS.map((m,i)=><option key={i+1} value={String(i+1).padStart(2,"0")}>{m}</option>)}
          </select>
        </div>
        <div style={{flex:1.5}}>
          <p style={{margin:"0 0 4px",fontSize:11,color:G.hint,textAlign:"center"}}>Año</p>
          <select value={anioNac} onChange={e=>onChange(buildFecha(diaNac,mesNac,e.target.value))} style={inp}>
            <option value="">Año</option>
            {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    );
  }

  const initDay = diaNac ? DAYS.indexOf(diaNac) : 14;
  const initMonth = mesNac ? +mesNac - 1 : 4;
  const initYear = anioNac ? YEARS.indexOf(anioNac) : 18;

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:4}}>
        <div style={{flex:1,textAlign:"center",fontSize:11,color:G.hint}}>Día</div>
        <div style={{flex:1,textAlign:"center",fontSize:11,color:G.hint}}>Mes</div>
        <div style={{flex:1,textAlign:"center",fontSize:11,color:G.hint}}>Año</div>
      </div>
      <div style={{display:"flex",gap:6,height:ITEM_H*4}}>
        <ScrollCol
          items={DAYS}
          initIdx={initDay}
          onSelect={idx=>onChange(buildFecha(DAYS[idx],mesNac,anioNac))}
        />
        <ScrollCol
          items={MESES_LABELS}
          initIdx={initMonth}
          onSelect={idx=>onChange(buildFecha(diaNac,String(idx+1).padStart(2,"0"),anioNac))}
        />
        <ScrollCol
          items={YEARS}
          initIdx={initYear}
          onSelect={idx=>onChange(buildFecha(diaNac,mesNac,YEARS[idx]))}
        />
      </div>
    </div>
  );
}

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 99, background: i === current ? G.sage : "rgba(255,255,255,0.4)", transition: "all 0.3s ease" }} />
      ))}
    </div>
  );
}

function Btn({ onClick, disabled, children, full }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "13px 24px", borderRadius: 12, border: "none", background: disabled ? "rgba(90,122,84,0.4)" : G.sage, color: "#fff", fontWeight: 600, fontSize: 16, width: full ? "100%" : "auto", fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
      {children}
    </button>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "13px 20px", borderRadius: 12, border: `1px solid rgba(180,180,180,0.35)`, background: "transparent", color: G.hint, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Volver</button>
  );
}

function SelectCard({ emoji, label, desc, selected, onClick, disabled }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{ background: selected ? "rgba(90,122,84,0.15)" : "rgba(255,255,255,0.4)", border: `1.5px solid ${selected ? G.sage : "rgba(255,255,255,0.5)"}`, borderRadius: 12, padding: "14px 16px", cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 14, transition: "all 0.2s", opacity: disabled ? 0.5 : 1 }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: G.text }}>{label}</p>
        {desc && <p style={{ margin: "2px 0 0", fontSize: 13, color: G.hint }}>{desc}</p>}
      </div>
      <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `2px solid ${selected ? G.sage : "rgba(180,180,180,0.4)"}`, background: selected ? G.sage : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
        {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
      </div>
    </div>
  );
}

function StepBienvenida({ onNext }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🌿</div>
      <h1 style={{ margin: "0 0 12px", fontSize: 32, fontWeight: 300, color: G.text, letterSpacing: "-0.02em" }}>NutriQuest</h1>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: G.hint, letterSpacing: "0.06em" }}>TU COMPAÑERO NUTRICIONAL</p>
      <p style={{ margin: "28px 0 40px", fontSize: 16, color: G.muted, lineHeight: 1.7 }}>
        No te decimos cuántas calorías comiste.<br />
        Te decimos <strong style={{ color: G.sage }}>cómo lo que comés afecta tu cuerpo</strong>,<br />
        tu energía y tu bienestar.
      </p>
      <Btn onClick={onNext} full>Empezar</Btn>
    </div>
  );
}

function StepObjetivo({ objetivos, setObjetivos, onNext, onBack }) {
  const toggle = (id) => {
    setObjetivos(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };
  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: G.text }}>¿Cuál es tu objetivo?</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: G.hint }}>Podés elegir hasta 3 opciones.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {OBJETIVOS.map(o => (
          <SelectCard key={o.id} emoji={o.emoji} label={o.label} desc={o.desc} selected={objetivos.includes(o.id)} disabled={!objetivos.includes(o.id) && objetivos.length >= 3} onClick={() => toggle(o.id)} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <BackBtn onClick={onBack} />
        <div style={{ flex: 1 }}><Btn onClick={onNext} disabled={objetivos.length === 0} full>Continuar</Btn></div>
      </div>
    </div>
  );
}

function StepDatos({ form, setForm, onNext, onBack }) {
  const inp = { width: "100%", background: "rgba(255,255,255,0.5)", border: `1px solid ${G.border}`, borderRadius: 10, color: G.text, padding: "11px 14px", fontSize: 15, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
  const lbl = { display: "block", fontSize: 12, color: G.hint, marginBottom: 5, marginTop: 14, letterSpacing: "0.04em", textTransform: "uppercase" };

  const edad = calcEdad(form.fechaNac);
  const bmi = form.peso && form.altura ? (+form.peso / ((+form.altura / 100) ** 2)).toFixed(1) : null;
  const prot = form.peso ? Math.round(+form.peso * 2) : null;
  const valid = form.nombre && form.sexo && form.fechaNac && +form.peso > 0 && +form.altura > 0 && edad && edad >= 10;

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: G.text }}>Tus datos</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: G.hint }}>Los usamos para personalizar tu experiencia.</p>

      <label style={lbl}>Nombre</label>
      <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Tu nombre" style={inp} />

      <label style={lbl}>Sexo</label>
      <div style={{ display: "flex", gap: 10 }}>
        {["masculino", "femenino"].map(s => (
          <div key={s} onClick={() => setForm(f => ({ ...f, sexo: s }))} style={{ flex: 1, padding: "11px", borderRadius: 10, textAlign: "center", cursor: "pointer", border: `1.5px solid ${form.sexo === s ? G.sage : "rgba(255,255,255,0.5)"}`, background: form.sexo === s ? "rgba(90,122,84,0.12)" : "rgba(255,255,255,0.4)", fontSize: 15, color: form.sexo === s ? G.sage : G.muted, fontWeight: form.sexo === s ? 600 : 400, transition: "all 0.2s" }}>
            {s === "masculino" ? "Masculino" : "Femenino"}
          </div>
        ))}
      </div>

      <label style={lbl}>Fecha de nacimiento</label>
      <FechaPicker
        diaNac={form.diaNac||""}
        mesNac={form.mesNac||""}
        anioNac={form.anioNac||""}
        onChange={({diaNac,mesNac,anioNac,fechaNac})=>setForm(f=>({...f,diaNac,mesNac,anioNac,fechaNac}))}
      />
      {edad && <p style={{ margin: "6px 0 0", fontSize: 12, color: G.hint }}>{edad} años</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        <div>
          <label style={lbl}>Peso (kg)</label>
          <input type="number" min="30" max="200" placeholder="70" value={form.peso} onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} style={inp} />
        </div>
        <div>
          <label style={lbl}>Altura (cm)</label>
          <input type="number" min="100" max="230" placeholder="170" value={form.altura} onChange={e => setForm(f => ({ ...f, altura: e.target.value }))} style={inp} />
        </div>
      </div>

      {prot && (
        <div style={{ background: G.sageLight, border: `1px solid ${G.sageBorder}`, borderRadius: 10, padding: "12px 16px", marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, color: G.hint, fontSize: 12, letterSpacing: "0.04em" }}>META DE PROTEÍNA</p>
              <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 600, color: G.sage }}>{prot}g<span style={{ fontSize: 13, fontWeight: 400, color: G.hint }}>/día</span></p>
            </div>
            {bmi && (
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, color: G.hint, fontSize: 12, letterSpacing: "0.04em" }}>IMC</p>
                <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 600, color: G.sage }}>{bmi}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <BackBtn onClick={onBack} />
        <div style={{ flex: 1 }}><Btn onClick={onNext} disabled={!valid} full>Continuar</Btn></div>
      </div>
    </div>
  );
}

function StepActividad({ actividad, setActividad, form, onNext, onBack }) {
  const factor = ACTIVIDAD.find(a => a.id === actividad)?.factor;
  const tdee = calcTDEE(+form.peso, +form.altura, form.fechaNac, form.sexo, factor);
  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: G.text }}>¿Cuánto te movés?</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: G.hint }}>Esto nos ayuda a personalizar tus análisis.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {ACTIVIDAD.map(a => <SelectCard key={a.id} emoji={a.emoji} label={a.label} desc={a.desc} selected={actividad === a.id} onClick={() => setActividad(a.id)} />)}
      </div>
      {tdee && (
        <div style={{ background: G.sageLight, border: `1px solid ${G.sageBorder}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: G.hint, letterSpacing: "0.04em" }}>SEGÚN TU PERFIL</p>
          <p style={{ margin: 0, fontSize: 16, color: G.muted, lineHeight: 1.6 }}>Tu cuerpo necesita aproximadamente <strong style={{ color: G.sage }}>{tdee.toLocaleString()} calorías por día</strong>.</p>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <BackBtn onClick={onBack} />
        <div style={{ flex: 1 }}><Btn onClick={onNext} disabled={!actividad} full>Continuar</Btn></div>
      </div>
    </div>
  );
}

function StepRestricciones({ restricciones, setRestricciones, restriccionCustom, setRestriccionCustom, onFinish, onBack, saving }) {
  const toggle = (id) => setRestricciones(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const inp = { width: "100%", background: "rgba(255,255,255,0.5)", border: `1px solid ${G.border}`, borderRadius: 10, color: G.text, padding: "11px 14px", fontSize: 15, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: G.text }}>¿Tenés alguna restricción?</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: G.hint }}>Opcional. Nos ayuda a darte sugerencias más precisas.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {RESTRICCIONES_SUGERIDAS.map(r => {
          const selected = restricciones.includes(r.id);
          return (
            <div key={r.id} onClick={() => toggle(r.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, cursor: "pointer", background: selected ? "rgba(90,122,84,0.12)" : "rgba(255,255,255,0.4)", border: `1.5px solid ${selected ? G.sage : "rgba(255,255,255,0.5)"}`, transition: "all 0.2s" }}>
              <span style={{ fontSize: 18 }}>{r.emoji}</span>
              <span style={{ fontSize: 14, color: selected ? G.sage : G.muted, fontWeight: selected ? 600 : 400 }}>{r.label}</span>
            </div>
          );
        })}
      </div>
      <label style={{ display: "block", fontSize: 12, color: G.hint, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Otra restricción o preferencia</label>
      <input value={restriccionCustom} onChange={e => setRestriccionCustom(e.target.value)} placeholder="Ej: no como cerdo, alergia al huevo..." style={{ ...inp, marginBottom: 20 }} />
      <div style={{ display: "flex", gap: 10 }}>
        <BackBtn onClick={onBack} />
        <div style={{ flex: 1 }}><Btn onClick={onFinish} disabled={saving} full>{saving ? "Guardando..." : "¡Listo, empezar!"}</Btn></div>
      </div>
    </div>
  );
}

export default function Onboarding({ onSave }) {
  const [step, setStep] = useState(0);
  const [objetivos, setObjetivos] = useState([]);
  const [actividad, setActividad] = useState("");
  const [restricciones, setRestricciones] = useState([]);
  const [restriccionCustom, setRestriccionCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "", sexo: "", fechaNac: "",
    diaNac: "", mesNac: "", anioNac: "",
    peso: "", altura: ""
  });

  const factor = ACTIVIDAD.find(a => a.id === actividad)?.factor;
  const tdee = calcTDEE(+form.peso, +form.altura, form.fechaNac, form.sexo, factor);
  const edad = calcEdad(form.fechaNac);

  const handleFinish = async () => {
    setSaving(true);
    const allRestrictions = [
      ...restricciones.map(r => RESTRICCIONES_SUGERIDAS.find(x => x.id === r)?.label || r),
      ...(restriccionCustom.trim() ? [restriccionCustom.trim()] : []),
    ].join(", ");
    const perfil = {
      name: form.nombre, weight: +form.peso, height: +form.altura,
      fechaNac: form.fechaNac, age: edad,
      sex: form.sexo, activity: actividad,
      goals: objetivos, tdee,
      restrictions: allRestrictions || null,
      onboarded: true,
    };
    try { await onSave(perfil); }
    catch (e) { console.error("Error:", e); alert("Hubo un error. Intentá de nuevo."); }
    setSaving(false);
  };

  const steps = [
    <StepBienvenida onNext={() => setStep(1)} />,
    <StepObjetivo objetivos={objetivos} setObjetivos={setObjetivos} onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <StepDatos form={form} setForm={setForm} onNext={() => setStep(3)} onBack={() => setStep(1)} />,
    <StepActividad actividad={actividad} setActividad={setActividad} form={form} onNext={() => setStep(4)} onBack={() => setStep(2)} />,
    <StepRestricciones restricciones={restricciones} setRestricciones={setRestricciones} restriccionCustom={restriccionCustom} setRestriccionCustom={setRestriccionCustom} onFinish={handleFinish} onBack={() => setStep(3)} saving={saving} />,
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", minHeight: "100vh", background: `linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...glassCard, padding: 32, maxWidth: 460, width: "100%" }}>
        <ProgressDots total={5} current={step} />
        {steps[step]}
      </div>
    </div>
  );
}
