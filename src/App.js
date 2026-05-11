import { useState } from "react";

const G = {
  glass: "rgba(255,255,255,0.55)", glassDark: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.6)", borderSubtle: "rgba(255,255,255,0.35)",
  text: "#2a3428", muted: "#5a6b57", hint: "#93a48f",
  sage: "#5a7a54", sageLight: "rgba(138,180,132,0.18)", sageBorder: "rgba(90,122,84,0.3)",
  bg1: "#c8d8c4", bg2: "#e8e0d0", bg3: "#d4cabb",
};
const blur = "blur(14px)", blurSm = "blur(8px)";
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

function calcTDEE(peso, altura, edad, sexo, factorActividad) {
  if (!peso || !altura || !edad || !sexo || !factorActividad) return null;
  const bmr = sexo === "masculino"
    ? 88.36 + 13.4 * peso + 4.8 * altura - 5.7 * edad
    : 447.6 + 9.2 * peso + 3.1 * altura - 4.3 * edad;
  return Math.round(bmr * factorActividad);
}

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 8, height: 8, borderRadius: 99,
          background: i === current ? G.sage : "rgba(255,255,255,0.4)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

function Btn({ onClick, disabled, children, full }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "13px 24px", borderRadius: 12, border: "none",
      background: disabled ? "rgba(90,122,84,0.4)" : G.sage,
      color: "#fff", fontWeight: 600, fontSize: 16,
      width: full ? "100%" : "auto", fontFamily: "inherit",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.2s",
    }}>
      {children}
    </button>
  );
}

function SelectCard({ emoji, label, desc, selected, onClick, disabled }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      background: selected ? "rgba(90,122,84,0.15)" : "rgba(255,255,255,0.4)",
      border: `1.5px solid ${selected ? G.sage : "rgba(255,255,255,0.5)"}`,
      borderRadius: 12, padding: "14px 16px", cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 14,
      transition: "all 0.2s", opacity: disabled ? 0.5 : 1,
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: G.text }}>{label}</p>
        {desc && <p style={{ margin: "2px 0 0", fontSize: 13, color: G.hint }}>{desc}</p>}
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${selected ? G.sage : "rgba(180,180,180,0.4)"}`,
        background: selected ? G.sage : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
      }}>
        {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
      </div>
    </div>
  );
}

// ── Pantalla 1: Bienvenida ─────────────────────────────────────────────────
function StepBienvenida({ onNext }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🌿</div>
      <h1 style={{ margin: "0 0 12px", fontSize: 32, fontWeight: 300, color: G.text, letterSpacing: "-0.02em" }}>
        NutriQuest
      </h1>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: G.hint, letterSpacing: "0.06em" }}>
        TU COMPAÑERO NUTRICIONAL
      </p>
      <p style={{ margin: "28px 0 40px", fontSize: 16, color: G.muted, lineHeight: 1.7 }}>
        No te decimos cuántas calorías comiste.<br />
        Te decimos <strong style={{ color: G.sage }}>cómo lo que comés afecta tu cuerpo</strong>,<br />
        tu energía y tu bienestar.
      </p>
      <Btn onClick={onNext} full>Empezar</Btn>
    </div>
  );
}

// ── Pantalla 2: Objetivo ───────────────────────────────────────────────────
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
          <SelectCard
            key={o.id} emoji={o.emoji} label={o.label} desc={o.desc}
            selected={objetivos.includes(o.id)}
            disabled={!objetivos.includes(o.id) && objetivos.length >= 3}
            onClick={() => toggle(o.id)}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ padding: "13px 20px", borderRadius: 12, border: `1px solid rgba(180,180,180,0.35)`, background: "transparent", color: G.hint, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Volver</button>
        <div style={{ flex: 1 }}><Btn onClick={onNext} disabled={objetivos.length === 0} full>Continuar</Btn></div>
      </div>
    </div>
  );
}

// ── Pantalla 3: Datos personales ───────────────────────────────────────────
function StepDatos({ form, setForm, onNext, onBack }) {
  const inp = {
    width: "100%", background: "rgba(255,255,255,0.5)", border: `1px solid ${G.border}`,
    borderRadius: 10, color: G.text, padding: "11px 14px", fontSize: 15,
    boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  };
  const lbl = { display: "block", fontSize: 12, color: G.hint, marginBottom: 5, marginTop: 14, letterSpacing: "0.04em", textTransform: "uppercase" };
  const bmi = form.peso && form.altura ? (+form.peso / ((+form.altura / 100) ** 2)).toFixed(1) : null;
  const prot = form.peso ? Math.round(+form.peso * 2) : null;
  const valid = form.nombre && form.sexo && +form.edad > 0 && +form.peso > 0 && +form.altura > 0;

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: G.text }}>Tus datos</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: G.hint }}>Los usamos para personalizar tu experiencia.</p>

      <label style={lbl}>Nombre</label>
      <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Tu nombre" style={inp} />

      <label style={lbl}>Sexo</label>
      <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
        {["masculino", "femenino"].map(s => (
          <div key={s} onClick={() => setForm(f => ({ ...f, sexo: s }))} style={{
            flex: 1, padding: "11px", borderRadius: 10, textAlign: "center", cursor: "pointer",
            border: `1.5px solid ${form.sexo === s ? G.sage : "rgba(255,255,255,0.5)"}`,
            background: form.sexo === s ? "rgba(90,122,84,0.12)" : "rgba(255,255,255,0.4)",
            fontSize: 15, color: form.sexo === s ? G.sage : G.muted, fontWeight: form.sexo === s ? 600 : 400,
            transition: "all 0.2s",
          }}>
            {s === "masculino" ? "Masculino" : "Femenino"}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label style={lbl}>Edad</label>
          <input type="number" min="10" max="100" value={form.edad} onChange={e => setForm(f => ({ ...f, edad: e.target.value }))} placeholder="30" style={inp} />
        </div>
        <div>
          <label style={lbl}>Peso (kg)</label>
          <input type="number" min="30" max="200" value={form.peso} onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} placeholder="70" style={inp} />
        </div>
        <div>
          <label style={lbl}>Altura (cm)</label>
          <input type="number" min="100" max="230" value={form.altura} onChange={e => setForm(f => ({ ...f, altura: e.target.value }))} placeholder="170" style={inp} />
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
        <button onClick={onBack} style={{ padding: "13px 20px", borderRadius: 12, border: `1px solid rgba(180,180,180,0.35)`, background: "transparent", color: G.hint, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Volver</button>
        <div style={{ flex: 1 }}><Btn onClick={onNext} disabled={!valid} full>Continuar</Btn></div>
      </div>
    </div>
  );
}

// ── Pantalla 4: Nivel de actividad ─────────────────────────────────────────
function StepActividad({ actividad, setActividad, form, onNext, onBack }) {
  const factor = ACTIVIDAD.find(a => a.id === actividad)?.factor;
  const tdee = calcTDEE(+form.peso, +form.altura, +form.edad, form.sexo, factor);

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: G.text }}>¿Cuánto te movés?</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: G.hint }}>Esto nos ayuda a personalizar tus análisis.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {ACTIVIDAD.map(a => (
          <SelectCard key={a.id} emoji={a.emoji} label={a.label} desc={a.desc} selected={actividad === a.id} onClick={() => setActividad(a.id)} />
        ))}
      </div>

      {tdee && (
        <div style={{ background: G.sageLight, border: `1px solid ${G.sageBorder}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: G.hint, letterSpacing: "0.04em" }}>SEGÚN TU PERFIL</p>
          <p style={{ margin: 0, fontSize: 16, color: G.muted, lineHeight: 1.6 }}>
            Tu cuerpo necesita aproximadamente <strong style={{ color: G.sage }}>{tdee.toLocaleString()} calorías por día</strong>.
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ padding: "13px 20px", borderRadius: 12, border: `1px solid rgba(180,180,180,0.35)`, background: "transparent", color: G.hint, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Volver</button>
        <div style={{ flex: 1 }}><Btn onClick={onNext} disabled={!actividad} full>Continuar</Btn></div>
      </div>
    </div>
  );
}

// ── Pantalla 5: Restricciones alimentarias ─────────────────────────────────
function StepRestricciones({ restricciones, setRestricciones, restriccionCustom, setRestriccionCustom, onFinish, onBack, saving }) {
  const toggle = (id) => {
    setRestricciones(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500, color: G.text }}>¿Tenés alguna restricción?</h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: G.hint }}>Opcional. Nos ayuda a darte sugerencias más precisas.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {RESTRICCIONES_SUGERIDAS.map(r => {
          const selected = restricciones.includes(r.id);
          return (
            <div key={r.id} onClick={() => toggle(r.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12,
              cursor: "pointer", background: selected ? "rgba(90,122,84,0.12)" : "rgba(255,255,255,0.4)",
              border: `1.5px solid ${selected ? G.sage : "rgba(255,255,255,0.5)"}`,
              transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 18 }}>{r.emoji}</span>
              <span style={{ fontSize: 14, color: selected ? G.sage : G.muted, fontWeight: selected ? 600 : 400 }}>{r.label}</span>
            </div>
          );
        })}
      </div>

      <label style={{ display: "block", fontSize: 12, color: G.hint, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Otra restricción o preferencia</label>
      <input
        value={restriccionCustom}
        onChange={e => setRestriccionCustom(e.target.value)}
        placeholder="Ej: no como cerdo, alergia al huevo..."
        style={{ width: "100%", background: "rgba(255,255,255,0.5)", border: `1px solid ${G.border}`, borderRadius: 10, color: G.text, padding: "11px 14px", fontSize: 15, boxSizing: "border-box", outline: "none", fontFamily: "inherit", marginBottom: 20 }}
      />

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ padding: "13px 20px", borderRadius: 12, border: `1px solid rgba(180,180,180,0.35)`, background: "transparent", color: G.hint, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Volver</button>
        <div style={{ flex: 1 }}>
          <Btn onClick={onFinish} disabled={saving} full>
            {saving ? "Guardando..." : "¡Listo, empezar!"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function Onboarding({ onSave, userId }) {
  const [step, setStep] = useState(0);
  const [objetivos, setObjetivos] = useState([]);
  const [actividad, setActividad] = useState("");
  const [restricciones, setRestricciones] = useState([]);
  const [restriccionCustom, setRestriccionCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", sexo: "", edad: "", peso: "", altura: "" });

  const factor = ACTIVIDAD.find(a => a.id === actividad)?.factor;
  const tdee = calcTDEE(+form.peso, +form.altura, +form.edad, form.sexo, factor);

  const handleFinish = async () => {
    setSaving(true);
    const allRestrictions = [
      ...restricciones.map(r => RESTRICCIONES_SUGERIDAS.find(x => x.id === r)?.label || r),
      ...(restriccionCustom.trim() ? [restriccionCustom.trim()] : []),
    ].join(", ");

    const perfil = {
      name: form.nombre,
      weight: +form.peso,
      height: +form.altura,
      age: +form.edad,
      sex: form.sexo,
      activity: actividad,
      goals: objetivos,
      tdee: tdee,
      restrictions: allRestrictions || null,
      onboarded: true,
    };
    await onSave(perfil);
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
    <div style={{
      fontFamily: "'Segoe UI',system-ui,sans-serif", minHeight: "100vh",
      background: `linear-gradient(135deg,${G.bg1},${G.bg2},${G.bg3})`,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ ...glassCard, padding: 32, maxWidth: 460, width: "100%" }}>
        <ProgressDots total={5} current={step} />
        {steps[step]}
      </div>
    </div>
  );
}
