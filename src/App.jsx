import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

const ALERT_DAYS = 7;
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function daysDiff(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target - TODAY) / 86400000);
}
function fmt(n) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0); }

async function logActivity({ companyId, userName, action, entity = null, amount = null }) {
  try { await supabase.from("activity_log").insert({ company_id: companyId, user_name: userName || "Sistema", action, entity, amount }); } catch {}
}
function fmtDate(str) { if (!str) return "-"; const [y, m, d] = str.split("-"); return `${d}/${m}/${y}`; }
function getTotalPaid(inv) { return (inv.payments || []).reduce((a, p) => a + p.amount, 0); }
function getInvoiceBalance(inv) { return Math.max(0, inv.amount - getTotalPaid(inv)); }
function getInvoiceStatus(inv) {
  if (getInvoiceBalance(inv) <= 0) return "paid";
  return daysDiff(inv.due_date) < 0 ? "overdue" : "pending";
}
function getClientStatus(client, invoices) {
  const clInvs = invoices.filter(i => i.client_id === client.id);
  if (clInvs.some(i => getInvoiceStatus(i) === "overdue")) return "overdue";
  if (clInvs.some(i => getInvoiceStatus(i) === "pending" && daysDiff(i.due_date) <= ALERT_DAYS)) return "alert";
  if (client.next_contact && daysDiff(client.next_contact) <= 0) return "contact";
  return "ok";
}

const navy  = "#1a2340";
const navy2 = "#243060";
const red   = "#d0282e";
const bg    = "#f4f6f9";
const white = "#ffffff";
const bc    = "#e4e8ef";
const muted = "#8a95a8";
const sub   = "#4a5568";
const successColor = "#16a34a";
const warnColor    = "#d97706";
const font  = ''DM Sans','Helvetica Neue',sans-serif';

// ── COMPANY THEMES ──
const THEMES = {
  default: {
    sidebar: "#1a2340",
    accent:  "#d0282e",
    accent2: "#243060",
    logoText: "P",
    logoSub:  "PROPACKING",
    logoSubSmall: "INSUMOS EMBALAJE",
    label:   "PROPACKING",
    font,
  },
  propelsa: {
    sidebar: "#2a6e35",
    accent:  "#4caf65",
    accent2: "#1e5228",
    logoText: "P",
    logoSub:  "PROPELSA",
    logoSubSmall: "",
    label:   "PROPELSA",
    font: "'DM Sans','Helvetica Neue',sans-serif",
  },
  wassington: {
    sidebar: "#c41208",
    accent:  "#ff4433",
    accent2: "#8c0d06",
    logoText: "W",
    logoSub:  "WASSINGTON",
    logoSubSmall: "★",
    label:   "WASSINGTON",
    font: "'DM Sans','Helvetica Neue',sans-serif",
  },
  cepindus: {
    sidebar: "#1a1a2e",
    accent:  "#cc2200",
    accent2: "#2d2d44",
    logoText: "C",
    logoSub:  "CEPINDUS",
    logoSubSmall: "",
    label:   "CEPINDUS",
    font: "'DM Sans','Helvetica Neue',sans-serif",
  },
};

function getTheme(companyName) {
  if (!companyName) return THEMES.default;
  const n = companyName.toLowerCase().replace(/[^a-z]/g, "");
  if (n.includes("propelsa") || n.includes("propelsa".replace(/[^a-z]/g,"")))   return THEMES.propelsa;
  if (n.includes("wassington")) return THEMES.wassington;
  if (n.includes("cepindus"))   return THEMES.cepindus;
  // Also match by first letter for unknown companies named starting with W/C/P
  return THEMES.default;
}

const S = {
  card: {
    background: white, border: `1px solid ${bc}`,
    borderRadius: 12, padding: 24, marginBottom: 20,
  },
  cardHeader: (color) => ({
    background: color, borderRadius: "12px 12px 0 0",
    padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
  }),
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left", fontSize: 11, letterSpacing: 1.5, color: muted,
    textTransform: "uppercase", padding: "0 0 12px",
    borderBottom: `1px solid ${bc}`, fontWeight: 600,
  },
  td: {
    padding: "14px 0", borderBottom: `1px solid ${bc}`,
    fontSize: 13, verticalAlign: "middle", color: navy,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, letterSpacing: 2,
    textTransform: "uppercase", color: muted, marginBottom: 16, marginTop: 0,
  },
  input: {
    background: bg, border: `1px solid ${bc}`, borderRadius: 8,
    padding: "10px 14px", color: navy, fontSize: 13, width: "100%",
    fontFamily: font, boxSizing: "border-box", outline: "none",
  },
  label: {
    fontSize: 11, color: muted, letterSpacing: 1.5,
    textTransform: "uppercase", display: "block", marginBottom: 8, fontWeight: 600,
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(6px)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modalBox: {
    background: white, border: `1px solid ${bc}`,
    borderRadius: 16, padding: 32, width: 520,
    maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  btn: (v = "default") => ({
    background:
      v === "primary" ? navy :
      v === "danger"  ? "#fef2f2" :
      v === "warning" ? "#fffbeb" :
      v === "red"     ? red :
      "transparent",
    color:
      v === "primary" ? white :
      v === "danger"  ? red :
      v === "warning" ? warnColor :
      v === "red"     ? white :
      sub,
    border:
      v === "danger"  ? `1px solid #fecaca` :
      v === "warning" ? `1px solid #fde68a` :
      v === "primary" || v === "red" ? "none" :
      `1px solid ${bc}`,
    borderRadius: 8, padding: "8px 18px", cursor: "pointer",
    fontSize: 13, fontWeight: 600, fontFamily: font,
    transition: "all 0.15s",
  }),
  navItem: (active, accent) => ({
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
    background: active ? (accent||red) : "transparent",
    color: active ? white : "rgba(255,255,255,0.5)",
    fontSize: 13, fontWeight: active ? 600 : 500,
    transition: "all 0.15s", marginBottom: 2,
  }),
  navBtn: (active, color) => ({
    background: active ? (color || navy) : "transparent",
    color: active ? white : sub,
    border: `1px solid ${active ? (color || navy) : bc}`,
    borderRadius: 8, padding: "6px 14px", cursor: "pointer",
    fontSize: 12, fontWeight: 600, fontFamily: font,
    transition: "all 0.15s",
  }),
};

function Badge({ type, children }) {
  const map = {
    overdue: { background: "#fef2f2", color: red,          border: "1px solid #fecaca" },
    pending: { background: "#fffbeb", color: warnColor,    border: "1px solid #fde68a" },
    paid:    { background: "#f0fdf4", color: successColor, border: "1px solid #bbf7d0" },
    today:   { background: "#f5f3ff", color: "#7c3aed",    border: "1px solid #ddd6fe" },
    alert:   { background: "#fffbeb", color: warnColor,    border: "1px solid #fde68a" },
    partial: { background: "#f5f3ff", color: "#7c3aed",    border: "1px solid #ddd6fe" },
  };
  const style = map[type] || map.pending;
  return <span style={{ ...style, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{children}</span>;
}

function Modal({ title, onClose, onConfirm, confirmLabel, children }) {
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: red }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: sub, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        {onConfirm && <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
          <button style={S.btn()} onClick={onClose}>Cancelar</button>
          <button style={S.btn("primary")} onClick={onConfirm}>{confirmLabel || "Guardar"}</button>
        </div>}
        {!onConfirm && <div style={{ marginTop: 16 }}><button style={S.btn()} onClick={onClose}>Cerrar</button></div>}
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, children }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children || <input style={S.input} type={type} value={value || ""} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}

function PaymentHistoryModal({ inv, onDeletePayment, onClose }) {
  const totalPaid = getTotalPaid(inv);
  const balance = getInvoiceBalance(inv);
  const payments = inv.payments || [];
  return (
    <Modal title={`Pagos — ${inv.number}`} onClose={onClose}>
      <div style={{ background: bg, borderRadius: 8, padding: 14, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
        <div>Factura: <strong>{fmt(inv.amount)}</strong></div>
        <div>Cobrado: <strong style={{ color: successColor }}>{fmt(totalPaid)}</strong></div>
        <div>Saldo: <strong style={{ color: balance > 0 ? red : successColor }}>{fmt(balance)}</strong></div>
      </div>
      {payments.length === 0
        ? <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin pagos registrados.</div>
        : payments.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${bc}` }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: successColor }}>{fmt(p.amount)}</div>
              <div style={{ fontSize: 11, color: muted }}>{fmtDate(p.date)}{p.note ? ` · ${p.note}` : ""}</div>
            </div>
            <button style={{ ...S.btn("danger"), fontSize: 11 }}
              onClick={() => { if (window.confirm(`¿Eliminar pago de ${fmt(p.amount)}?`)) onDeletePayment(inv.id, p.id); }}>
              × Eliminar
            </button>
          </div>
        ))}
    </Modal>
  );
}

function InvoiceRow({ inv, onMarkPaid, onPartialPay, onDelete, onViewPayments, onEdit }) {
  const st = getInvoiceStatus(inv);
  const balance = getInvoiceBalance(inv);
  const totalPaid = getTotalPaid(inv);
  const d = daysDiff(inv.due_date);
  const hasPayments = (inv.payments || []).length > 0;
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${bc}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{inv.number}</div>
          <div style={{ fontSize: 11, color: muted }}>
            Vence: {fmtDate(inv.due_date)}{d < 0 && st !== "paid" ? ` · ${Math.abs(d)}d vencida` : ""}
            {totalPaid > 0 && <span style={{ color: "#7c3aed" }}> · Cobrado: {fmt(totalPaid)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(balance)}</div>
            {totalPaid > 0 && <div style={{ fontSize: 10, color: muted }}>de {fmt(inv.amount)}</div>}
          </div>
          {st === "paid" ? <Badge type="paid">Cobrada</Badge> : totalPaid > 0 ? <Badge type="partial">Parcial</Badge> : st === "overdue" ? <Badge type="overdue">Vencida</Badge> : <Badge type="pending">Pendiente</Badge>}
          {st !== "paid" && <><button style={S.btn()} onClick={() => onPartialPay(inv)}>$ Pago</button><button style={S.btn()} onClick={() => onMarkPaid(inv.id)}>✓</button></>}
          {hasPayments && <button style={{ ...S.btn(), fontSize: 11 }} onClick={() => onViewPayments(inv)}>📋 Recibos</button>}
          {onEdit && st !== "paid" && <button style={{ ...S.btn(), fontSize: 11 }} onClick={() => onEdit(inv)}>✏️</button>}
          <button style={S.btn("danger")} onClick={() => onDelete(inv.id)}>×</button>
        </div>
      </div>
    </div>
  );
}

function AIAssistant({ client, invoices, companyName }) {
  const [channel, setChannel] = useState("whatsapp");
  const [tone, setTone] = useState("cordial");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const clInvs = invoices.filter(i => i.client_id === client.id && getInvoiceStatus(i) !== "paid");
  const totalDebt = clInvs.reduce((a, i) => a + getInvoiceBalance(i), 0);
  const overdueInvs = clInvs.filter(i => getInvoiceStatus(i) === "overdue");
  const lastNote = client.notes?.[0];

  async function generate() {
    setLoading(true); setMessage(""); setCopied(false);
    const invoiceSummary = clInvs.map(i => {
      const st = getInvoiceStatus(i); const d = daysDiff(i.due_date);
      return `- ${i.number}: saldo ${fmt(getInvoiceBalance(i))}, vence ${fmtDate(i.due_date)}${st === "overdue" ? ` (vencida hace ${Math.abs(d)} dias)` : ` (en ${d} dias)`}`;
    }).join("\n");
    const payProfile = client.payment_profile;
    const payProfileText = payProfile && (payProfile.method || payProfile.notes)
      ? `Forma de pago habitual del cliente: ${[payProfile.method, payProfile.term, payProfile.notes].filter(Boolean).join(". ")}`
      : "Sin información de forma de pago registrada.";

    const prompt = `Sos un asistente de cobranzas que trabaja PARA la empresa "${companyName}". Vas a contactar a un cliente que le debe dinero a ${companyName}.

Genera un mensaje de cobranza para enviar por ${channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "email" : "llamada telefonica (guion)"}.
Datos del cliente deudor: Empresa: ${client.name}, Contacto: ${client.contact || "sin nombre"}, Deuda total: ${fmt(totalDebt)}
Facturas pendientes:
${invoiceSummary}
${lastNote ? `Ultimo contacto: "${lastNote.text}" (${fmtDate(lastNote.date)})` : "Sin contactos previos"}
${payProfileText}
Tono: ${tone === "cordial" ? "Cordial y amable" : tone === "firme" ? "Firme y directo" : "Urgente"}
- Escribi en espanol rioplatense, tuteo
- El mensaje lo manda alguien de ${companyName}, firma como ${companyName}
- Si hay info de forma de pago, usala para personalizar el mensaje (ej: mencioná el cheque si paga con cheques)
- ${channel === "whatsapp" ? "Max 5 lineas." : channel === "email" ? "Con asunto en primera linea." : "Guion de llamada con apertura, desarrollo y cierre."}
- No uses asteriscos ni markdown`;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await res.json();
      setMessage(d.content?.map(b => b.text || "").join("") || "Error al generar.");
    } catch { setMessage("No se pudo conectar."); }
    setLoading(false);
  }
  function copy() { navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  const toneColors = { cordial: null, firme: warnColor, urgente: red };
  return (
    <div style={{ ...S.card, borderColor: `${bc}` }}>
      <p style={{ ...S.sectionTitle, color: red }}>🤖 Asistente IA — Generar mensaje</p>
      {clInvs.length === 0 ? <div style={{ color: muted, fontSize: 13 }}>Sin facturas pendientes.</div> : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div><label style={S.label}>Canal</label><div style={{ display: "flex", gap: 6 }}>
              {[["whatsapp","💬 WhatsApp"],["email","✉️ Email"],["llamada","📞 Llamada"]].map(([k,l]) => (
                <button key={k} style={{ ...S.navBtn(channel===k), fontSize:11, padding:"5px 10px" }} onClick={() => setChannel(k)}>{l}</button>
              ))}
            </div></div>
            <div><label style={S.label}>Tono</label><div style={{ display: "flex", gap: 6 }}>
              {[["cordial","Cordial"],["firme","Firme"],["urgente","Urgente"]].map(([k,l]) => (
                <button key={k} style={{ ...S.navBtn(tone===k, toneColors[k]), fontSize:11, padding:"5px 10px" }} onClick={() => setTone(k)}>{l}</button>
              ))}
            </div></div>
          </div>
          <button style={{ ...S.btn("primary"), width:"100%", padding:"10px", fontSize:13 }} onClick={generate} disabled={loading}>
            {loading ? "⏳ Generando..." : "✨ Generar mensaje de cobranza"}
          </button>
          {message && !loading && (
            <div style={{ marginTop:14 }}>
              <div style={{ background:"#f8f9fb", border:`1px solid ${bc}`, borderRadius:8, padding:16, fontSize:13, lineHeight:1.75, whiteSpace:"pre-wrap" }}>{message}</div>
              <button style={{ ...S.btn(copied?"primary":"default"), marginTop:10, width:"100%" }} onClick={copy}>{copied ? "✓ ¡Copiado!" : "📋 Copiar mensaje"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Dashboard({ data, onGoToClient, companyName }) {
  const [sortAsc, setSortAsc] = useState(true);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const overdueInvs = data.invoices.filter(i => getInvoiceStatus(i) === "overdue");
  const pendingInvs = data.invoices.filter(i => getInvoiceStatus(i) === "pending");
  const alertInvs = pendingInvs.filter(i => daysDiff(i.due_date) <= ALERT_DAYS);
  const toContact = data.clients.filter(c => c.next_contact && daysDiff(c.next_contact) <= 0);
  const getClient = id => data.clients.find(c => c.id === id);
  const totalOverdue = overdueInvs.reduce((a,i)=>a+getInvoiceBalance(i),0);
  const totalPending = pendingInvs.reduce((a,i)=>a+getInvoiceBalance(i),0);
  const sortedOverdue = [...overdueInvs].sort((a,b) => sortAsc ? new Date(a.due_date)-new Date(b.due_date) : new Date(b.due_date)-new Date(a.due_date));

  useEffect(() => {
    if (data.clients.length === 0) return;
    generateSummary();
  }, [companyName]);

  async function generateSummary() {
    setAiLoading(true); setAiSummary("");
    const overdueClients = overdueInvs.map(i => {
      const cl = getClient(i.client_id);
      return `- ${cl?.name}: ${fmt(getInvoiceBalance(i))} vencida hace ${Math.abs(daysDiff(i.due_date))} dias`;
    }).join("\n");
    const contactClients = toContact.map(c => {
      const lastNote = c.notes?.[0];
      return `- ${c.name}${lastNote ? `: ultima nota "${lastNote.text}"` : ""}`;
    }).join("\n");
    const alertClients = alertInvs.map(i => {
      const cl = getClient(i.client_id);
      return `- ${cl?.name}: ${fmt(getInvoiceBalance(i))} vence en ${daysDiff(i.due_date)} dias`;
    }).join("\n");

    const prompt = `Sos el asistente de cobranzas de ${companyName}. Hoy es ${fmtDate(TODAY.toISOString().split("T")[0])}.
Genera un resumen ejecutivo breve y directo del dia para el equipo de cobranzas. Maximo 5 oraciones.
Mencioná lo mas urgente primero. Usa nombres reales. Tono profesional pero informal, espanol rioplatense.
No uses asteriscos, bullets ni markdown. Solo texto plano en parrafos cortos.

Datos de hoy:
- Total vencido: ${fmt(totalOverdue)} (${overdueInvs.length} facturas)
- Por vencer pronto: ${fmt(alertInvs.reduce((a,i)=>a+getInvoiceBalance(i),0))} (${alertInvs.length} facturas)
- Clientes para llamar hoy: ${toContact.length}
${overdueClients ? `\nFacturas vencidas:\n${overdueClients}` : ""}
${contactClients ? `\nContactar hoy:\n${contactClients}` : ""}
${alertClients ? `\nVencen pronto:\n${alertClients}` : ""}`;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await res.json();
      setAiSummary(d.content?.map(b => b.text || "").join("") || "");
    } catch {}
    setAiLoading(false);
  }

  const Stat = ({bgColor, label, value, sub}) => (
    <div style={{ borderRadius:14, padding:"24px 26px", background:bgColor, color:white, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", bottom:-18, right:-18, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,.1)" }} />
      <div style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:1.5, marginBottom:12, opacity:.75 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, letterSpacing:-1, marginBottom:6, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, opacity:.65, fontWeight:500 }}>{sub}</div>
    </div>
  );

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        <Stat bgColor={red}     label="Vencido"        value={fmt(totalOverdue)}            sub={`${overdueInvs.length} factura${overdueInvs.length!==1?"s":""}`} />
        <Stat bgColor="#b45309" label="Por vencer"     value={fmt(totalPending)}            sub={`${pendingInvs.length} factura${pendingInvs.length!==1?"s":""}`} />
        <Stat bgColor="#5b21b6" label="Contactar hoy"  value={toContact.length}             sub={`cliente${toContact.length!==1?"s":""} pendiente${toContact.length!==1?"s":""}`} />
        <Stat bgColor={navy}    label="Total en cartera" value={fmt(totalOverdue+totalPending)} sub="por cobrar" />
      </div>

      {/* AI Summary */}
      <div style={{ background:navy, borderRadius:12, padding:24, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: aiSummary||aiLoading ? 12 : 0 }}>
          <p style={{ margin:0, fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,.5)" }}>🤖 Resumen del día — {companyName}</p>
          <button style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.15)", borderRadius:6, padding:"5px 12px", color:"rgba(255,255,255,.6)", fontSize:11, cursor:"pointer", fontFamily:font }} onClick={generateSummary} disabled={aiLoading}>↻ Actualizar</button>
        </div>
        {aiLoading && <div style={{ color:"rgba(255,255,255,.5)", fontSize:13 }}>Analizando tu cartera...</div>}
        {aiSummary && !aiLoading && <div style={{ fontSize:13, lineHeight:1.8, color:"rgba(255,255,255,.75)", whiteSpace:"pre-wrap" }}>{aiSummary}</div>}
        {!aiSummary && !aiLoading && data.clients.length === 0 && <div style={{ color:"rgba(255,255,255,.4)", fontSize:13 }}>Cargá clientes y facturas para ver el resumen.</div>}
      </div>

      {/* Vencen pronto + Contactar hoy */}
      {(alertInvs.length > 0 || toContact.length > 0) && (
        <div className="grid2" style={{ display:"grid", gridTemplateColumns: alertInvs.length>0 && toContact.length>0 ? "1fr 1fr" : "1fr", gap:16, marginBottom:20 }}>
          {alertInvs.length > 0 && (
            <div style={{ background:white, border:`1px solid ${bc}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ background:"#b45309", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"rgba(255,255,255,.7)" }}>⚠ Vencen pronto</div>
                  <div style={{ fontSize:13, fontWeight:700, color:white, marginTop:4 }}>Próximos {ALERT_DAYS} días</div>
                </div>
                <div style={{ fontSize:28, fontWeight:800, color:white }}>{alertInvs.length}</div>
              </div>
              <div style={{ padding:"0 24px" }}>
                {alertInvs.map(inv => { const cl = getClient(inv.client_id); return (
                  <div key={inv.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${bc}` }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>{cl?.name} <span style={{ fontWeight:400, color:muted }}>— {inv.number}</span></div>
                      <div style={{ fontSize:12, color:muted, marginTop:2 }}>Vence el {fmtDate(inv.due_date)}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Badge type="alert">en {daysDiff(inv.due_date)}d</Badge>
                      <strong style={{ fontSize:13 }}>{fmt(getInvoiceBalance(inv))}</strong>
                      <button style={S.btn("primary")} onClick={() => onGoToClient(cl)}>Ver</button>
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          )}
          {toContact.length > 0 && (
            <div style={{ background:white, border:`1px solid ${bc}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ background:"#5b21b6", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"rgba(255,255,255,.7)" }}>📞 Contactar hoy</div>
                  <div style={{ fontSize:13, fontWeight:700, color:white, marginTop:4 }}>Clientes pendientes</div>
                </div>
                <div style={{ fontSize:28, fontWeight:800, color:white }}>{toContact.length}</div>
              </div>
              <div style={{ padding:"0 24px" }}>
                {toContact.map(c => { const n = data.invoices.filter(i => i.client_id===c.id && getInvoiceStatus(i)!=="paid").length; return (
                  <div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${bc}` }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>{c.name}</div>
                      <div style={{ fontSize:12, color:muted, marginTop:2 }}>{c.contact}{c.phone ? ` · ${c.phone}` : ""}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:muted }}>{n} fc.</span>
                      <button style={S.btn("primary")} onClick={() => onGoToClient(c)}>Ver</button>
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Facturas vencidas */}
      <div style={{ background:white, border:`1px solid ${bc}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ background:navy, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"rgba(255,255,255,.6)" }}>Facturas vencidas</div>
            <div style={{ fontSize:13, fontWeight:700, color:white, marginTop:4 }}>Ordenadas por antigüedad</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:28, fontWeight:800, color:"#ff8080" }}>{overdueInvs.length}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>facturas</div>
          </div>
        </div>
        <div style={{ padding:"0 24px" }}>
          {overdueInvs.length === 0
            ? <div style={{ padding:"20px 0", color:muted, fontSize:13 }}>Sin facturas vencidas 🎉</div>
            : (
              <table style={S.table}>
                <thead><tr>
                  <th style={S.th}>Cliente</th>
                  <th style={S.th}>N° Factura</th>
                  <th style={{ ...S.th, cursor:"pointer", userSelect:"none" }} onClick={() => setSortAsc(s=>!s)}>Vencimiento {sortAsc?"↑":"↓"}</th>
                  <th style={S.th}>Días</th>
                  <th style={S.th}>Saldo</th>
                </tr></thead>
                <tbody>{sortedOverdue.map(inv => { const cl = getClient(inv.client_id); const paid = getTotalPaid(inv); return (
                  <tr key={inv.id}>
                    <td style={S.td}><span style={{ cursor:"pointer", fontWeight:600, color:navy }} onClick={() => onGoToClient(cl)}>{cl?.name}</span></td>
                    <td style={{ ...S.td, color:muted }}>{inv.number}{paid>0&&<> <Badge type="partial">Parcial</Badge></>}</td>
                    <td style={S.td}>{fmtDate(inv.due_date)}</td>
                    <td style={S.td}><Badge type="overdue">{Math.abs(daysDiff(inv.due_date))}d</Badge></td>
                    <td style={S.td}><strong>{fmt(getInvoiceBalance(inv))}</strong>{paid>0&&<div style={{ fontSize:11, color:muted }}>de {fmt(inv.amount)}</div>}</td>
                  </tr>
                ); })}</tbody>
              </table>
            )
          }
        </div>
      </div>
    </div>
  );
}

function ClientDetail({ clientId, data, onBack, onSave, companyName, companyId }) {
  // ALL hooks first — before any conditional return
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name:"", contact:"", phone:"", email:"", next_contact:"" });
  const [noteModal, setNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ note:"", next_contact:"" });
  const [invModal, setInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ number:"", amount:"", due_date:"" });
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount:"", note:"" });
  const [distributeModal, setDistributeModal] = useState(false);
  const [distributeAmount, setDistributeAmount] = useState("");
  const [distribution, setDistribution] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [payProfileModal, setPayProfileModal] = useState(false);
  const [payProfileForm, setPayProfileForm] = useState({ method:"", term:"", notes:"" });
  const [editNoteIdx, setEditNoteIdx] = useState(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [editInvModal, setEditInvModal] = useState(null);
  const [editInvForm, setEditInvForm] = useState({ number:"", amount:"", due_date:"" });
  // Now safe to do conditional logic
  const cl = data.clients.find(c => c.id === clientId);
  if (!cl) return <div style={{ color:muted }}>Cliente no encontrado.</div>;
  const clInvoices = data.invoices.filter(i => i.client_id === clientId);
  const totalDebt = clInvoices.reduce((a,i)=>a+getInvoiceBalance(i),0);
  const dd = cl?.next_contact ? daysDiff(cl.next_contact) : null;

  async function savePayProfile() {
    await supabase.from("clients").update({ payment_profile: payProfileForm }).eq("id", clientId);
    onSave(); setPayProfileModal(false);
  }

  function computeDistribution(total) {
    const unpaid = clInvoices.filter(i => getInvoiceStatus(i) !== "paid").sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    let remaining = total;
    return unpaid.map(inv => { const balance = getInvoiceBalance(inv); const applied = Math.min(balance, remaining); remaining = Math.max(0, remaining - applied); return { inv, balance, applied, leftover: balance - applied }; });
  }
  function handleDistributeChange(val) { setDistributeAmount(val); const total = parseFloat(val); setDistribution(total > 0 ? computeDistribution(total) : null); }

  async function saveEdit() { await supabase.from("clients").update(editForm).eq("id", clientId); onSave(); setEditing(false); }
  async function addNote() {
    const note = { date: new Date().toISOString().split("T")[0], text: noteForm.note };
    const newNotes = [note, ...(cl.notes || [])];
    const updates = { notes: newNotes };
    if (noteForm.next_contact) updates.next_contact = noteForm.next_contact;
    await supabase.from("clients").update(updates).eq("id", clientId);
    await logActivity({ companyId, userName: localStorage.getItem("cobUser") || "Usuario", action: `Registró contacto con ${cl.name}`, entity: cl.name });
    onSave(); setNoteModal(false); setNoteForm({ note:"", next_contact:"" });
  }
  async function addInvoice() {
    await supabase.from("invoices").insert({ company_id: companyId, client_id: clientId, number: invForm.number||"FC-????", amount: parseFloat(invForm.amount)||0, payments: [], due_date: invForm.due_date||"" });
    await logActivity({ companyId, userName: localStorage.getItem("cobUser") || "Usuario", action: `Cargó factura ${invForm.number||"nueva"} a ${cl.name}`, entity: cl.name, amount: parseFloat(invForm.amount)||0 });
    onSave(); setInvModal(false); setInvForm({ number:"", amount:"", due_date:"" });
  }
  async function applyPayment() {
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0 || !payModal) return;
    const balance = getInvoiceBalance(payModal);
    const applied = Math.min(balance, amount);
    const newPayment = { id:"p"+Date.now(), date: new Date().toISOString().split("T")[0], amount: applied, note: payForm.note };
    const updatedPayments = [...(payModal.payments || []), newPayment];
    await supabase.from("invoices").update({ payments: updatedPayments }).eq("id", payModal.id);
    await logActivity({ companyId, userName: localStorage.getItem("cobUser") || "Usuario", action: `Registró pago de ${cl.name} — factura ${payModal.number}`, entity: cl.name, amount: applied });
    onSave(); setPayModal(null); setPayForm({ amount:"", note:"" });
  }
  async function markPaid(invId) {
    const inv = clInvoices.find(i => i.id === invId);
    const balance = getInvoiceBalance(inv);
    if (balance <= 0) return;
    const newPayment = { id:"p"+Date.now(), date: new Date().toISOString().split("T")[0], amount: balance, note: "Pago total" };
    await supabase.from("invoices").update({ payments: [...(inv.payments||[]), newPayment] }).eq("id", invId);
    await logActivity({ companyId, userName: localStorage.getItem("cobUser") || "Usuario", action: `Marcó como cobrada factura ${inv.number} de ${cl.name}`, entity: cl.name, amount: balance });
    onSave();
  }
  async function applyDistribution() {
    if (!distribution) return;
    for (const { inv, applied } of distribution) {
      if (applied <= 0) continue;
      const newPayment = { id:"p"+Date.now()+Math.random(), date: new Date().toISOString().split("T")[0], amount: applied, note: `Distribución ${fmt(parseFloat(distributeAmount))}` };
      await supabase.from("invoices").update({ payments: [...(inv.payments||[]), newPayment] }).eq("id", inv.id);
    }
    await logActivity({ companyId, userName: localStorage.getItem("cobUser") || "Usuario", action: `Distribuyó pago de ${fmt(parseFloat(distributeAmount))} entre facturas de ${cl.name}`, entity: cl.name, amount: parseFloat(distributeAmount) });
    onSave(); setDistributeModal(false); setDistributeAmount(""); setDistribution(null);
  }
  async function deletePayment(invId, paymentId) {
    const inv = data.invoices.find(i => i.id === invId);
    const payment = (inv.payments||[]).find(p => p.id === paymentId);
    const updatedPayments = (inv.payments||[]).filter(p => p.id !== paymentId);
    await supabase.from("invoices").update({ payments: updatedPayments }).eq("id", invId);
    await logActivity({ companyId, userName: localStorage.getItem("cobUser")||"Usuario", action: `Eliminó pago de ${fmt(payment?.amount||0)} en factura ${inv.number} de ${cl.name}`, entity: cl.name });
    onSave(); setHistoryModal(null);
  }
  async function deleteInvoice(invId) {
    const inv = data.invoices.find(i => i.id === invId);
    await supabase.from("invoices").delete().eq("id", invId);
    await logActivity({ companyId, userName: localStorage.getItem("cobUser")||"Usuario", action: `Eliminó factura ${inv?.number||""} de ${cl.name}`, entity: cl.name });
    onSave();
  }

  async function saveEditInv() {
    const amount = parseFloat(editInvForm.amount);
    await supabase.from("invoices").update({ number: editInvForm.number, amount, due_date: editInvForm.due_date }).eq("id", editInvModal.id);
    await logActivity({ companyId, userName: localStorage.getItem("cobUser")||"Usuario", action: `Editó factura ${editInvForm.number} de ${cl.name}`, entity: cl.name });
    setEditInvModal(null); onSave();
  }

  async function deleteNote(idx) {
    if (!window.confirm("¿Eliminar este contacto?")) return;
    const newNotes = (cl.notes||[]).filter((_,i) => i !== idx);
    await supabase.from("clients").update({ notes: newNotes }).eq("id", clientId);
    onSave();
  }
  async function saveEditNote() {
    if (!editNoteText.trim()) return;
    const newNotes = (cl.notes||[]).map((n,i) => i === editNoteIdx ? { ...n, text: editNoteText } : n);
    await supabase.from("clients").update({ notes: newNotes }).eq("id", clientId);
    setEditNoteIdx(null); setEditNoteText(""); onSave();
  }

  return (
    <div>
      <button style={{ ...S.btn(), marginBottom:20 }} onClick={onBack}>← Volver</button>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <div style={S.card}>
            {editing ? (
              <>
                <p style={{ ...S.sectionTitle, color:red }}>Editar datos</p>
                <Field label="Empresa / Nombre" value={editForm.name} onChange={v=>setEditForm(f=>({...f,name:v}))} /><div style={{height:10}}/>
                <Field label="Contacto" value={editForm.contact} onChange={v=>setEditForm(f=>({...f,contact:v}))} /><div style={{height:10}}/>
                <Field label="Teléfono" value={editForm.phone} onChange={v=>setEditForm(f=>({...f,phone:v}))} /><div style={{height:10}}/>
                <Field label="Email" value={editForm.email} onChange={v=>setEditForm(f=>({...f,email:v}))} /><div style={{height:10}}/>
                <Field label="Próximo contacto" type="date" value={editForm.next_contact} onChange={v=>setEditForm(f=>({...f,next_contact:v}))} />
                <div style={{ display:"flex", gap:8, marginTop:16 }}>
                  <button style={S.btn()} onClick={()=>setEditing(false)}>Cancelar</button>
                  <button style={S.btn("primary")} onClick={saveEdit}>Guardar cambios</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                  <div><div style={{ fontSize:20, fontWeight:700, color:red }}>{cl.name}</div><div style={{ fontSize:13, color:muted, marginTop:4 }}>{cl.contact}</div></div>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:muted, letterSpacing:1 }}>DEUDA TOTAL</div><div style={{ fontSize:22, fontWeight:700, color:totalDebt>0?red:successColor }}>{fmt(totalDebt)}</div></div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:13 }}>
                  {cl.phone&&<div>📞 <span style={{color:muted}}>{cl.phone}</span></div>}
                  {cl.email&&<div>✉️ <span style={{color:muted}}>{cl.email}</span></div>}
                  {cl.next_contact&&<div style={{marginTop:4}}>🗓️ Próximo contacto: <strong style={{color:dd!==null&&dd<=0?"#5b21b6":"#e8e8f0"}}>{fmtDate(cl.next_contact)}</strong>{dd!==null&&dd<=0&&<> <Badge type="today">HOY</Badge></>}</div>}
                </div>
                <div style={{ display:"flex", gap:8, marginTop:16 }}>
                  <button style={S.btn()} onClick={()=>setEditing(true)}>✏️ Editar datos</button>
                  <button style={S.btn("primary")} onClick={()=>{setNoteForm({note:"",next_contact:""});setNoteModal(true);}}>+ Registrar contacto</button>
                </div>
              </>
            )}
          </div>
          <div style={S.card}>
            <p style={S.sectionTitle}>Historial de contactos</p>
            {(!cl.notes||cl.notes.length===0)
              ? <div style={{color:muted,fontSize:13}}>Sin notas aún.</div>
              : cl.notes.map((n,i)=>(
                <div key={i} style={{ borderLeft:`2px solid ${bc}`, paddingLeft:12, marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{fontSize:11,color:muted,marginBottom:2}}>{fmtDate(n.date)}</div>
                      {editNoteIdx === i
                        ? <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            <textarea style={{...S.input, height:70, resize:"vertical", fontSize:13}}
                              value={editNoteText} onChange={e=>setEditNoteText(e.target.value)} />
                            <div style={{ display:"flex", gap:6 }}>
                              <button style={{...S.btn("primary"), fontSize:11, padding:"5px 12px"}} onClick={saveEditNote}>Guardar</button>
                              <button style={{...S.btn(), fontSize:11, padding:"5px 12px"}} onClick={()=>setEditNoteIdx(null)}>Cancelar</button>
                            </div>
                          </div>
                        : <div style={{fontSize:13, color:sub}}>{n.text}</div>
                      }
                    </div>
                    {editNoteIdx !== i && (
                      <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                        <button title="Editar" onClick={()=>{setEditNoteIdx(i);setEditNoteText(n.text);}}
                          style={{ background:"none", border:`1px solid ${bc}`, borderRadius:6, cursor:"pointer", fontSize:12, padding:"3px 7px", color:muted }}>✏️</button>
                        <button title="Eliminar" onClick={()=>deleteNote(i)}
                          style={{ background:"none", border:`1px solid ${bc}`, borderRadius:6, cursor:"pointer", fontSize:12, padding:"3px 7px", color:muted }}>×</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{...S.sectionTitle, margin:0}}>💳 Forma de pago habitual</p>
              <button style={{ ...S.btn(), fontSize:11 }} onClick={()=>{setPayProfileForm({ method:cl.payment_profile?.method||"", term:cl.payment_profile?.term||"", notes:cl.payment_profile?.notes||"" });setPayProfileModal(true);}}>✏️ Editar</button>
            </div>
            {!cl.payment_profile || (!cl.payment_profile.method && !cl.payment_profile.notes) ? (
              <div style={{color:muted,fontSize:13}}>Sin información cargada aún.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13 }}>
                {cl.payment_profile.method && <div>💳 <span style={{color:muted}}>Medio:</span> <strong>{cl.payment_profile.method}</strong></div>}
                {cl.payment_profile.term && <div>📅 <span style={{color:muted}}>Plazo habitual:</span> <strong>{cl.payment_profile.term}</strong></div>}
                {cl.payment_profile.notes && <div style={{ marginTop:4, background:"#f8f9fb", borderRadius:8, padding:"10px 12px", color:sub, lineHeight:1.6 }}>{cl.payment_profile.notes}</div>}
              </div>
            )}
          </div>
          <AIAssistant client={cl} invoices={data.invoices} companyName={companyName} />
        </div>
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <p style={{...S.sectionTitle,margin:0}}>Facturas</p>
            <div style={{ display:"flex", gap:8 }}>
              {clInvoices.some(i=>getInvoiceStatus(i)!=="paid") && <button style={S.btn("warning")} onClick={()=>{setDistributeAmount("");setDistribution(null);setDistributeModal(true);}}>💰 Distribuir pago</button>}
              <button style={S.btn("primary")} onClick={()=>{setInvForm({number:"",amount:"",due_date:""});setInvModal(true);}}>+ Nueva</button>
            </div>
          </div>
          {clInvoices.length===0 ? <div style={{color:muted,fontSize:13}}>Sin facturas.</div>
            : clInvoices.map(inv=>(
              <InvoiceRow key={inv.id} inv={inv} onMarkPaid={markPaid} onPartialPay={inv=>{setPayModal(inv);setPayForm({amount:"",note:""}); }} onDelete={deleteInvoice} onViewPayments={inv=>setHistoryModal(inv)}
                onEdit={inv=>{ setEditInvModal(inv); setEditInvForm({ number:inv.number, amount:String(inv.amount), due_date:inv.due_date }); }} />
            ))}
        </div>
      </div>

      {payModal && <Modal title={`Registrar pago — ${payModal.number}`} onClose={()=>setPayModal(null)} onConfirm={applyPayment} confirmLabel="Registrar pago">
        <div style={{ background:"#f8f9fb", borderRadius:8, padding:14, fontSize:13 }}>
          <div>Factura: <strong>{fmt(payModal.amount)}</strong></div>
          {getTotalPaid(payModal)>0&&<div>Ya cobrado: <strong style={{color:"#7c3aed"}}>{fmt(getTotalPaid(payModal))}</strong></div>}
          <div>Saldo: <strong style={{color:red}}>{fmt(getInvoiceBalance(payModal))}</strong></div>
        </div>
        <Field label="Monto del pago ($)" type="number" value={payForm.amount} onChange={v=>setPayForm(f=>({...f,amount:v}))} />
        <Field label="Nota (opcional)" value={payForm.note} onChange={v=>setPayForm(f=>({...f,note:v}))} />
      </Modal>}

      {historyModal && <PaymentHistoryModal inv={data.invoices.find(i=>i.id===historyModal.id)||historyModal} onDeletePayment={deletePayment} onClose={()=>setHistoryModal(null)} />}

      {distributeModal && <Modal title="Distribuir pago" onClose={()=>setDistributeModal(false)} onConfirm={applyDistribution} confirmLabel="Aplicar distribución">
        <Field label="Monto total recibido ($)" type="number" value={distributeAmount} onChange={handleDistributeChange} />
        {distribution && (
          <div>
            <div style={{ fontSize:11, color:sub, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Distribución automática (más vencidas primero)</div>
            {distribution.map(({ inv, balance, applied, leftover }) => (
              <div key={inv.id} style={{ background:"#f8f9fb", borderRadius:8, padding:12, marginBottom:8, borderLeft:`3px solid ${applied>=balance?successColor:applied>0?"#7c3aed":"#ffffff18"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div><div style={{ fontWeight:700, fontSize:13 }}>{inv.number}</div><div style={{ fontSize:11, color:muted }}>Vence {fmtDate(inv.due_date)} · Saldo: {fmt(balance)}</div></div>
                  <div style={{ textAlign:"right" }}>
                    {applied>0 ? <><div style={{ fontWeight:700, fontSize:13, color:applied>=balance?successColor:"#7c3aed" }}>{applied>=balance?"✓ Saldada":`Aplica ${fmt(applied)}`}</div>{leftover>0&&<div style={{fontSize:11,color:muted}}>Queda: {fmt(leftover)}</div>}</> : <div style={{fontSize:12,color:"#444"}}>Sin alcanzar</div>}
                  </div>
                </div>
              </div>
            ))}
            {(() => { const sobrante = parseFloat(distributeAmount) - distribution.reduce((a,d)=>a+d.balance,0); return sobrante>0 ? <div style={{ background:"#10b98122", border:"1px solid #10b98144", borderRadius:8, padding:12, fontSize:13, color:successColor }}>✓ Cubre toda la deuda. Sobrante: <strong>{fmt(sobrante)}</strong></div> : null; })()}
          </div>
        )}
        {!distribution && <div style={{fontSize:12,color:muted}}>Ingresá el monto para ver cómo se distribuye.</div>}
      </Modal>}

      {noteModal && <Modal title="Registrar contacto" onClose={()=>setNoteModal(false)} onConfirm={addNote}>
        <Field label="Comentario"><textarea style={{...S.input,height:80,resize:"vertical"}} value={noteForm.note} onChange={e=>setNoteForm(f=>({...f,note:e.target.value}))} placeholder="¿Qué pasó en el contacto?" /></Field>
        <Field label="Próximo recontacto" type="date" value={noteForm.next_contact} onChange={v=>setNoteForm(f=>({...f,next_contact:v}))} />
      </Modal>}

      {invModal && <Modal title="Nueva factura" onClose={()=>setInvModal(false)} onConfirm={addInvoice}>
        <Field label="N° Factura" value={invForm.number} onChange={v=>setInvForm(f=>({...f,number:v}))} />
        <Field label="Monto total ($)" type="number" value={invForm.amount} onChange={v=>setInvForm(f=>({...f,amount:v}))} />
        <Field label="Fecha de vencimiento" type="date" value={invForm.due_date} onChange={v=>setInvForm(f=>({...f,due_date:v}))} />
      </Modal>}

      {editInvModal && <Modal title={`Editar factura — ${editInvModal.number}`} onClose={()=>setEditInvModal(null)} onConfirm={saveEditInv} confirmLabel="Guardar cambios">
        <Field label="N° Factura" value={editInvForm.number} onChange={v=>setEditInvForm(f=>({...f,number:v}))} />
        <Field label="Monto total ($)" type="number" value={editInvForm.amount} onChange={v=>setEditInvForm(f=>({...f,amount:v}))} />
        <Field label="Fecha de vencimiento" type="date" value={editInvForm.due_date} onChange={v=>setEditInvForm(f=>({...f,due_date:v}))} />
      </Modal>}

      {payProfileModal&&<Modal title="Forma de pago habitual" onClose={()=>setPayProfileModal(false)} onConfirm={savePayProfile}>
        <Field label="Medio de pago (ej: cheque, transferencia, efectivo)"><input style={S.input} value={payProfileForm.method} onChange={e=>setPayProfileForm(f=>({...f,method:e.target.value}))} placeholder="ej: Cheque / Transferencia bancaria" /></Field>
        <Field label="Plazo habitual (ej: 30 días, 15 días)"><input style={S.input} value={payProfileForm.term} onChange={e=>setPayProfileForm(f=>({...f,term:e.target.value}))} placeholder="ej: Cheque a 30 días" /></Field>
        <Field label="Observaciones (comportamiento de pago)"><textarea style={{...S.input,height:90,resize:"vertical"}} value={payProfileForm.notes} onChange={e=>setPayProfileForm(f=>({...f,notes:e.target.value}))} placeholder="ej: Siempre paga los viernes. A veces pide prórroga de 15 días. Buen cliente pero lento." /></Field>
      </Modal>}
    </div>
  );
}

function ClientsView({ data, onSave, companyId, companyName, selectedClientId, setSelectedClientId }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name:"",contact:"",phone:"",email:"",next_contact:"" });
  async function addClient() {
    await supabase.from("clients").insert({ company_id: companyId, name:addForm.name||"Sin nombre", contact:addForm.contact||"", phone:addForm.phone||"", email:addForm.email||"", notes:[], next_contact:addForm.next_contact||null });
    onSave(); setAddModal(false); setAddForm({name:"",contact:"",phone:"",email:"",next_contact:""});
  }
  if (selectedClientId) return <ClientDetail clientId={selectedClientId} data={data} onBack={()=>setSelectedClientId(null)} onSave={onSave} companyName={companyName} companyId={companyId} />;
  const statusFilters = [{key:"all",label:"Todos"},{key:"overdue",label:"Con vencidas",color:red},{key:"alert",label:"Vencen pronto",color:warnColor},{key:"contact",label:"Llamar hoy",color:"#5b21b6"},{key:"ok",label:"Al día",color:successColor}];
  const filtered = data.clients.filter(c => {
    const matchText = c.name.toLowerCase().includes(search.toLowerCase()) || (c.contact||"").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter==="all" || getClientStatus(c,data.invoices)===statusFilter;
    return matchText && matchStatus;
  });
  const borderColorMap = {overdue:"#fecaca",alert:"#fde68a",contact:"#ddd6fe",ok:bc};
  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center" }}>
        <input style={{...S.input,flex:1}} placeholder="Buscar cliente..." value={search} onChange={e=>setSearch(e.target.value)} />
        <button style={S.btn("primary")} onClick={()=>{setAddForm({name:"",contact:"",phone:"",email:"",next_contact:""});setAddModal(true);}}>+ Nuevo cliente</button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {statusFilters.map(f=><button key={f.key} style={S.navBtn(statusFilter===f.key,f.color)} onClick={()=>setStatusFilter(f.key)}>{f.label}</button>)}
      </div>
      {filtered.length===0&&<div style={{color:muted,fontSize:13,padding:"20px 0"}}>No hay clientes en esta categoría.</div>}
      {filtered.map(c=>{
        const clInvs = data.invoices.filter(i=>i.client_id===c.id&&getInvoiceStatus(i)!=="paid");
        const debt = clInvs.reduce((a,i)=>a+getInvoiceBalance(i),0);
        const cStatus = getClientStatus(c,data.invoices);
        return (
          <div key={c.id} style={{...S.card,cursor:"pointer",borderColor:borderColorMap[cStatus]||bc}} onClick={()=>setSelectedClientId(c.id)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{c.name} <span style={{fontWeight:400,fontSize:12,color:sub}}>— {c.contact}</span>
                  {cStatus==="overdue"&&<> <Badge type="overdue">Vencida</Badge></>}
                  {cStatus==="alert"&&<> <Badge type="alert">Vence pronto</Badge></>}
                  {cStatus==="contact"&&<> <Badge type="today">Llamar hoy</Badge></>}
                </div>
                <div style={{fontSize:12,color:muted,marginTop:4}}>{c.phone}{c.next_contact&&` · Recontactar: ${fmtDate(c.next_contact)}`}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,fontWeight:700,color:debt>0?(cStatus==="overdue"?red:"#d97706"):successColor}}>{fmt(debt)}</div>
                <div style={{fontSize:11,color:muted}}>{clInvs.length} factura{clInvs.length!==1?"s":""}</div>
              </div>
            </div>
          </div>
        );
      })}
      {addModal&&<Modal title="Nuevo cliente" onClose={()=>setAddModal(false)} onConfirm={addClient}>
        <Field label="Empresa / Nombre" value={addForm.name} onChange={v=>setAddForm(f=>({...f,name:v}))} />
        <Field label="Contacto" value={addForm.contact} onChange={v=>setAddForm(f=>({...f,contact:v}))} />
        <Field label="Teléfono" value={addForm.phone} onChange={v=>setAddForm(f=>({...f,phone:v}))} />
        <Field label="Email" value={addForm.email} onChange={v=>setAddForm(f=>({...f,email:v}))} />
        <Field label="Próximo contacto" type="date" value={addForm.next_contact} onChange={v=>setAddForm(f=>({...f,next_contact:v}))} />
      </Modal>}
    </div>
  );
}

function InvoicesView({ data, onSave, companyId, onGoToClient }) {
  const [filter, setFilter] = useState("all");
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ clientId:"",number:"",amount:"",due_date:"" });
  const [historyModal, setHistoryModal] = useState(null);
  const [quickMode, setQuickMode] = useState(false);
  const [quickRows, setQuickRows] = useState([{ clientId: data.clients[0]?.id||"", number:"", amount:"", due_date:"" }]);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickDone, setQuickDone] = useState(0);

  function addQuickRow() { setQuickRows(r => [...r, { clientId: data.clients[0]?.id||"", number:"", amount:"", due_date:"" }]); }
  function removeQuickRow(i) { setQuickRows(r => r.filter((_,idx)=>idx!==i)); }
  function updateQuickRow(i, field, val) { setQuickRows(r => r.map((row,idx) => idx===i ? {...row,[field]:val} : row)); }

  async function saveQuickRows() {
    setQuickSaving(true); setQuickDone(0);
    const valid = quickRows.filter(r => r.number && r.amount && r.due_date && r.clientId);
    for (const r of valid) {
      await supabase.from("invoices").insert({ company_id: companyId, client_id: r.clientId, number: r.number, amount: parseFloat(r.amount)||0, payments:[], due_date: r.due_date });
      const cl = data.clients.find(c => c.id === r.clientId);
      await logActivity({ companyId, userName: localStorage.getItem("cobUser") || "Usuario", action: `Cargó factura ${r.number} a ${cl?.name || "cliente"}`, entity: cl?.name, amount: parseFloat(r.amount)||0 });
      setQuickDone(d => d+1);
    }
    setQuickSaving(false);
    setQuickRows([{ clientId: data.clients[0]?.id||"", number:"", amount:"", due_date:"" }]);
    setQuickMode(false); setQuickDone(0);
    onSave();
  }

  async function deletePayment(invId, paymentId) {
    const inv = data.invoices.find(i => i.id === invId);
    const payment = (inv.payments||[]).find(p => p.id === paymentId);
    const cl = data.clients.find(c => c.id === inv.client_id);
    const updatedPayments = (inv.payments||[]).filter(p => p.id !== paymentId);
    await supabase.from("invoices").update({ payments: updatedPayments }).eq("id", invId);
    await logActivity({ companyId, userName: localStorage.getItem("cobUser")||"Usuario", action: `Eliminó pago de ${fmt(payment?.amount||0)} en factura ${inv.number} de ${cl?.name||"cliente"}`, entity: cl?.name });
    onSave(); setHistoryModal(null);
  }
  async function addInvoice() {
    const cl = data.clients.find(c => c.id === (addForm.clientId||data.clients[0]?.id));
    await supabase.from("invoices").insert({ company_id: companyId, client_id:addForm.clientId||data.clients[0]?.id, number:addForm.number||"FC-????", amount:parseFloat(addForm.amount)||0, payments:[], due_date:addForm.due_date||"" });
    await logActivity({ companyId, userName: localStorage.getItem("cobUser") || "Usuario", action: `Cargó factura ${addForm.number||"nueva"} a ${cl?.name || "cliente"}`, entity: cl?.name, amount: parseFloat(addForm.amount)||0 });
    onSave(); setAddModal(false); setAddForm({clientId:"",number:"",amount:"",due_date:""});
  }
  async function deleteInvoice(invId) {
    const inv = data.invoices.find(i => i.id === invId);
    const cl = data.clients.find(c => c.id === inv?.client_id);
    await supabase.from("invoices").delete().eq("id", invId);
    await logActivity({ companyId, userName: localStorage.getItem("cobUser")||"Usuario", action: `Eliminó factura ${inv?.number||""} de ${cl?.name||"cliente"}`, entity: cl?.name });
    onSave();
  }
  const getClient = id => data.clients.find(c=>c.id===id);
  const filtered = [...data.invoices].filter(i=>{
    const st = getInvoiceStatus(i);
    if (filter==="all") return true;
    if (filter==="alert") return st==="pending"&&daysDiff(i.due_date)<=ALERT_DAYS;
    if (filter==="partial") return getTotalPaid(i)>0&&st!=="paid";
    return st===filter;
  }).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));

  return (
    <div>
      {quickMode ? (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700 }}>⚡ Carga rápida de facturas</div>
              <div style={{ fontSize:12, color:muted, marginTop:4 }}>Cargá varias facturas de una vez sin salir de la pantalla</div>
            </div>
            <button style={S.btn()} onClick={()=>setQuickMode(false)}>← Cancelar</button>
          </div>
          <div style={S.card}>
            <table style={{...S.table, marginBottom:12}}>
              <thead><tr>
                <th style={S.th}>Cliente</th>
                <th style={S.th}>N° Factura</th>
                <th style={S.th}>Monto ($)</th>
                <th style={S.th}>Vencimiento</th>
                <th style={S.th}></th>
              </tr></thead>
              <tbody>
                {quickRows.map((row, i) => (
                  <tr key={i}>
                    <td style={S.td}>
                      <select style={{...S.input, padding:"6px 10px"}} value={row.clientId} onChange={e=>updateQuickRow(i,"clientId",e.target.value)}>
                        {data.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td style={S.td}><input style={{...S.input, padding:"6px 10px"}} value={row.number} onChange={e=>updateQuickRow(i,"number",e.target.value)} placeholder="FC-0001" /></td>
                    <td style={S.td}><input style={{...S.input, padding:"6px 10px"}} type="number" value={row.amount} onChange={e=>updateQuickRow(i,"amount",e.target.value)} placeholder="0" /></td>
                    <td style={S.td}><input style={{...S.input, padding:"6px 10px"}} type="date" value={row.due_date} onChange={e=>updateQuickRow(i,"due_date",e.target.value)} /></td>
                    <td style={S.td}><button style={{...S.btn("danger"), padding:"4px 8px"}} onClick={()=>removeQuickRow(i)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button style={S.btn()} onClick={addQuickRow}>+ Agregar fila</button>
              <button style={{...S.btn("primary"), padding:"8px 20px"}} onClick={saveQuickRows} disabled={quickSaving}>
                {quickSaving ? `Guardando... (${quickDone}/${quickRows.filter(r=>r.number&&r.amount&&r.due_date).length})` : `✓ Guardar ${quickRows.filter(r=>r.number&&r.amount&&r.due_date).length} factura${quickRows.filter(r=>r.number&&r.amount&&r.due_date).length!==1?"s":""}`}
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[["all","Todas"],["overdue","Vencidas"],["alert","Vencen pronto"],["pending","Pendientes"],["partial","Pago parcial"],["paid","Cobradas"]].map(([f,l])=>(
          <button key={f} style={S.navBtn(filter===f)} onClick={()=>setFilter(f)}>{l}</button>
        ))}
        <div style={{flex:1}}/>
        <button style={{...S.btn("warning"), marginRight:6}} onClick={()=>setQuickMode(true)}>⚡ Carga rápida</button>
        <button style={S.btn("primary")} onClick={()=>{setAddForm({clientId:data.clients[0]?.id||"",number:"",amount:"",due_date:""});setAddModal(true);}}>+ Nueva factura</button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Cliente</th><th style={S.th}>N° Factura</th>
            <th style={S.th}>Vencimiento</th><th style={S.th}>Estado</th>
            <th style={S.th}>Saldo</th><th style={S.th}>Acciones</th>
          </tr></thead>
          <tbody>
            {filtered.map(inv=>{
              const cl=getClient(inv.client_id); const st=getInvoiceStatus(inv); const d=daysDiff(inv.due_date); const paid=getTotalPaid(inv);
              return (
                <tr key={inv.id}>
                  <td style={S.td}><span style={{cursor:"pointer",color:red}} onClick={()=>onGoToClient(cl)}>{cl?.name}</span></td>
                  <td style={S.td}><span style={{color:muted}}>{inv.number}</span></td>
                  <td style={S.td}>{fmtDate(inv.due_date)}{d<0&&st!=="paid"&&<span style={{color:red,fontSize:11}}> ({Math.abs(d)}d)</span>}{d>=0&&d<=ALERT_DAYS&&st!=="paid"&&<span style={{color:warnColor,fontSize:11}}> (en {d}d)</span>}</td>
                  <td style={S.td}>{st==="paid"?<Badge type="paid">Cobrada</Badge>:paid>0?<Badge type="partial">Parcial</Badge>:st==="overdue"?<Badge type="overdue">Vencida</Badge>:<Badge type="pending">Pendiente</Badge>}</td>
                  <td style={S.td}><strong>{fmt(getInvoiceBalance(inv))}</strong>{paid>0&&<div style={{fontSize:10,color:muted}}>de {fmt(inv.amount)}</div>}</td>
                  <td style={S.td}>
                    <div style={{display:"flex",gap:6}}>
                      {(inv.payments||[]).length>0&&<button style={{...S.btn(),fontSize:11}} onClick={()=>setHistoryModal(inv)}>📋 Recibos</button>}
                      <button style={S.btn("danger")} onClick={()=>deleteInvoice(inv.id)}>×</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length===0&&<tr><td colSpan={6} style={{...S.td,color:muted,textAlign:"center",padding:32}}>Sin facturas en esta categoría.</td></tr>}
          </tbody>
        </table>
      </div>
      {addModal&&<Modal title="Nueva factura" onClose={()=>setAddModal(false)} onConfirm={addInvoice}>
        <Field label="Cliente"><select style={S.input} value={addForm.clientId} onChange={e=>setAddForm(f=>({...f,clientId:e.target.value}))}>{data.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="N° Factura" value={addForm.number} onChange={v=>setAddForm(f=>({...f,number:v}))} />
        <Field label="Monto total ($)" type="number" value={addForm.amount} onChange={v=>setAddForm(f=>({...f,amount:v}))} />
        <Field label="Fecha de vencimiento" type="date" value={addForm.due_date} onChange={v=>setAddForm(f=>({...f,due_date:v}))} />
      </Modal>}
      {historyModal&&<PaymentHistoryModal inv={data.invoices.find(i=>i.id===historyModal.id)||historyModal} onDeletePayment={deletePayment} onClose={()=>setHistoryModal(null)} />}
    </div>
      )}
    </div>
  );
}

// ── STATS VIEW ──
function StatsView({ data, onGoToClient }) {
  const TOP = 10;
  const clientStats = data.clients.map(client => {
    const invs = data.invoices.filter(i => i.client_id === client.id);
    const totalVolume = invs.reduce((a, i) => a + i.amount, 0);
    let totalDaysLate = 0, countDaysLate = 0;
    invs.forEach(inv => {
      const payments = inv.payments || [];
      if (payments.length === 0) return;
      const lastPayment = payments.reduce((a, p) => p.date > a.date ? p : a, payments[0]);
      const daysLate = Math.floor((new Date(lastPayment.date) - new Date(inv.due_date)) / 86400000);
      totalDaysLate += daysLate; countDaysLate++;
    });
    const avgDaysLate = countDaysLate > 0 ? Math.round(totalDaysLate / countDaysLate) : null;
    const pendingDebt = invs.reduce((a, i) => a + getInvoiceBalance(i), 0);
    return { client, totalVolume, avgDaysLate, pendingDebt, invoiceCount: invs.length };
  }).filter(s => s.totalVolume > 0);

  const byVolume = [...clientStats].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, TOP);
  const byPunctuality = [...clientStats].filter(s => s.avgDaysLate !== null).sort((a, b) => a.avgDaysLate - b.avgDaysLate).slice(0, TOP);
  const medals = ["🥇","🥈","🥉"];

  function PunctBadge({ days }) {
    if (days <= 0) return <Badge type="paid">Paga antes</Badge>;
    if (days <= 7) return <Badge type="alert">{days}d tarde</Badge>;
    return <Badge type="overdue">{days}d tarde</Badge>;
  }

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        <div style={S.card}>
          <p style={S.sectionTitle}>💰 Top {TOP} por volumen de compras</p>
          {byVolume.length === 0 ? <div style={{color:muted,fontSize:13}}>Sin datos aún.</div> : byVolume.map((s, i) => (
            <div key={s.client.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${bc}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18, width:28 }}>{medals[i] || `${i+1}.`}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, cursor:"pointer", color:red }} onClick={() => onGoToClient(s.client)}>{s.client.name}</div>
                  <div style={{ fontSize:11, color:muted }}>{s.invoiceCount} factura{s.invoiceCount!==1?"s":""}</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{fmt(s.totalVolume)}</div>
                {s.pendingDebt > 0 && <div style={{ fontSize:11, color:red }}>Debe: {fmt(s.pendingDebt)}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <p style={S.sectionTitle}>⏱️ Top {TOP} mejores pagadores</p>
          {byPunctuality.length === 0 ? <div style={{color:muted,fontSize:13}}>Sin pagos registrados aún.</div> : byPunctuality.map((s, i) => (
            <div key={s.client.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${bc}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18, width:28 }}>{medals[i] || `${i+1}.`}</span>
                <div style={{ fontWeight:700, fontSize:13, cursor:"pointer", color:red }} onClick={() => onGoToClient(s.client)}>{s.client.name}</div>
              </div>
              <PunctBadge days={s.avgDaysLate} />
            </div>
          ))}
          <div style={{ fontSize:11, color:"#444", marginTop:12 }}>Calculado en base a pagos registrados.</div>
        </div>
      </div>
    </div>
  );
}


// ── BOARD VIEW ──
function BoardView({ companyId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState({ author:"", text:"", color:"default" });
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useState(null);

  useEffect(() => { loadNotes(); }, [companyId]);

  async function loadNotes() {
    setLoading(true);
    const { data } = await supabase.from("board_notes").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setNotes(data || []);
    setLoading(false);
  }

  async function addNote() {
    if (!newNote.text.trim()) return;
    setUploading(true);
    let file_url = null;
    let file_name = null;
    let file_type = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("board-files").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("board-files").getPublicUrl(path);
        file_url = urlData.publicUrl;
        file_name = file.name;
        file_type = file.type;
      }
    }

    await supabase.from("board_notes").insert({
      company_id: companyId,
      author: newNote.author || "Anónimo",
      text: newNote.text,
      color: newNote.color,
      file_url, file_name, file_type,
    });
    setNewNote({ author:"", text:"", color:"default" });
    setFile(null);
    setAdding(false);
    setUploading(false);
    loadNotes();
  }

  async function deleteNote(id, fileUrl) {
    if (!window.confirm("¿Eliminar esta nota?")) return;
    if (fileUrl) {
      const path = fileUrl.split("/board-files/")[1];
      if (path) await supabase.storage.from("board-files").remove([path]);
    }
    await supabase.from("board_notes").delete().eq("id", id);
    loadNotes();
  }

  const colorMap = {
    default: { bg: white,     border: bc,        label: "⬜ Normal" },
    yellow:  { bg: "#fffbeb", border: "#fde68a", label: "🟡 Importante" },
    red:     { bg: "#fef2f2", border: "#fecaca", label: "🔴 Urgente" },
    green:   { bg: "#f0fdf4", border: "#bbf7d0", label: "🟢 Resuelto" },
    purple:  { bg: "#f5f3ff", border: "#ddd6fe", label: "🟣 Info" },
  };

  const borderLeft = { default: muted, yellow: warnColor, red, green: successColor, purple: "#7c3aed" };

  return (
    <div>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out" }}>
          <img src={lightbox} style={{ maxWidth:"90vw", maxHeight:"90vh", borderRadius:8, boxShadow:"0 8px 40px rgba(0,0,0,.5)" }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>📋 Pizarrón del equipo</div>
          <div style={{ fontSize:12, color:muted, marginTop:4 }}>Notas, tareas y archivos para todos</div>
        </div>
        <button style={S.btn("primary")} onClick={() => setAdding(true)}>+ Nueva nota</button>
      </div>

      {adding && (
        <div style={{ ...S.card, marginBottom:24 }}>
          <p style={{ ...S.sectionTitle, color:red }}>Nueva nota</p>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><label style={S.label}>Tu nombre</label>
              <input style={S.input} value={newNote.author} onChange={e=>setNewNote(n=>({...n,author:e.target.value}))} placeholder="ej: Patricio" />
            </div>
            <div><label style={S.label}>Nota</label>
              <textarea style={{...S.input, height:100, resize:"vertical"}} value={newNote.text} onChange={e=>setNewNote(n=>({...n,text:e.target.value}))} placeholder="Escribí tu nota, tarea o aviso acá..." />
            </div>

            {/* File upload */}
            <div>
              <label style={S.label}>Adjuntar archivo (imagen o PDF)</label>
              <label style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:bg, border:`2px dashed ${bc}`, borderRadius:8, cursor:"pointer" }}>
                <span style={{ fontSize:20 }}>📎</span>
                <span style={{ fontSize:13, color: file ? navy : muted }}>
                  {file ? file.name : "Hacé clic para elegir una imagen o PDF"}
                </span>
                <input type="file" accept="image/*,.pdf" style={{ display:"none" }}
                  onChange={e => setFile(e.target.files[0] || null)} />
              </label>
              {file && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                  {file.type.startsWith("image/") && (
                    <img src={URL.createObjectURL(file)} style={{ width:60, height:60, objectFit:"cover", borderRadius:6, border:`1px solid ${bc}` }} />
                  )}
                  {file.type === "application/pdf" && <span style={{ fontSize:24 }}>📄</span>}
                  <span style={{ fontSize:12, color:sub }}>{file.name}</span>
                  <button style={{ ...S.btn("danger"), padding:"3px 8px", fontSize:11 }} onClick={() => setFile(null)}>×</button>
                </div>
              )}
            </div>

            <div><label style={S.label}>Tipo</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {Object.entries(colorMap).map(([k,v]) => (
                  <button key={k} style={{ ...S.btn(newNote.color===k ? "primary" : "default"), fontSize:11 }} onClick={()=>setNewNote(n=>({...n,color:k}))}>{v.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={S.btn()} onClick={() => { setAdding(false); setFile(null); }}>Cancelar</button>
              <button style={S.btn("primary")} onClick={addNote} disabled={uploading}>
                {uploading ? "Publicando..." : "Publicar nota"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading
        ? <div style={{color:muted, fontSize:13}}>Cargando...</div>
        : notes.length === 0
          ? <div style={{color:muted, fontSize:13, textAlign:"center", padding:"40px 0"}}>Sin notas aún. ¡Agregá la primera!</div>
          : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
              {notes.map(note => {
                const c = colorMap[note.color] || colorMap.default;
                const bl = borderLeft[note.color] || muted;
                const date = new Date(note.created_at);
                const dateStr = `${date.getDate().toString().padStart(2,"0")}/${(date.getMonth()+1).toString().padStart(2,"0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2,"0")}:${date.getMinutes().toString().padStart(2,"0")}`;
                const isImage = note.file_type?.startsWith("image/");
                const isPdf = note.file_type === "application/pdf";
                return (
                  <div key={note.id} style={{ background:c.bg, border:`1px solid ${c.border}`, borderLeft:`4px solid ${bl}`, borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:navy }}>{note.author}</div>
                        <div style={{ fontSize:11, color:muted }}>{dateStr} · {colorMap[note.color]?.label || "⬜ Normal"}</div>
                      </div>
                      <button style={{ ...S.btn("danger"), padding:"4px 8px", fontSize:11 }} onClick={() => deleteNote(note.id, note.file_url)}>×</button>
                    </div>
                    <div style={{ fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap", color:sub, marginBottom: note.file_url ? 14 : 0 }}>{note.text}</div>

                    {/* Attachment */}
                    {isImage && note.file_url && (
                      <img src={note.file_url} alt={note.file_name}
                        onClick={() => setLightbox(note.file_url)}
                        style={{ width:"100%", maxHeight:200, objectFit:"cover", borderRadius:8, cursor:"zoom-in", border:`1px solid ${bc}`, marginTop:4 }} />
                    )}
                    {isPdf && note.file_url && (
                      <a href={note.file_url} target="_blank" rel="noreferrer"
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:white, border:`1px solid ${bc}`, borderRadius:8, textDecoration:"none", color:navy, fontSize:13, fontWeight:600, marginTop:4 }}>
                        <span style={{ fontSize:20 }}>📄</span>
                        <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{note.file_name}</span>
                        <span style={{ color:muted, fontSize:11 }}>↓ Abrir</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
      }
    </div>
  );
}


function NameForm({ onSave }) {
  const [name, setName] = useState("");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <input style={{ ...S.input, fontSize:15, padding:"12px 16px" }} placeholder="ej: Patricio" value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && name.trim() && onSave(name.trim())} autoFocus />
      <button style={{ ...S.btn("primary"), padding:"12px", fontSize:14, borderRadius:10 }}
        onClick={() => name.trim() && onSave(name.trim())}>Entrar →</button>
    </div>
  );
}

// ── ACTIVITY VIEW ──
function ActivityView({ companyId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("today");

  useEffect(() => { loadLogs(); }, [companyId, filter]);

  async function deleteLog(id) {
    await supabase.from("activity_log").delete().eq("id", id);
    setLogs(prev => prev.filter(l => l.id !== id));
  }

  async function loadLogs() {
    setLoading(true);
    let query = supabase.from("activity_log").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (filter === "today") {
      const start = new Date(); start.setHours(0,0,0,0);
      query = query.gte("created_at", start.toISOString());
    } else if (filter === "week") {
      const start = new Date(); start.setDate(start.getDate() - 7); start.setHours(0,0,0,0);
      query = query.gte("created_at", start.toISOString());
    }
    const { data } = await query.limit(200);
    setLogs(data || []);
    setLoading(false);
  }

  function getIcon(action) {
    if (action.includes("pago") || action.includes("cobr") || action.includes("Distribuy")) return { icon:"💰", color:"#16a34a", bg:"#f0fdf4", border:"#bbf7d0" };
    if (action.includes("factura") || action.includes("Cargó")) return { icon:"🧾", color:"#1a2340", bg:"#f0f4ff", border:"#c7d2fe" };
    if (action.includes("contacto") || action.includes("nota")) return { icon:"📝", color:"#d97706", bg:"#fffbeb", border:"#fde68a" };
    return { icon:"⚡", color:"#5b21b6", bg:"#f5f3ff", border:"#ddd6fe" };
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
  }

  // Group by day
  const grouped = logs.reduce((acc, log) => {
    const day = new Date(log.created_at).toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" });
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  const filters = [
    { key:"today", label:"Hoy" },
    { key:"week",  label:"Esta semana" },
    { key:"all",   label:"Todo" },
  ];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>◷ Actividad del equipo</div>
          <div style={{ fontSize:12, color:muted, marginTop:4 }}>Registro de acciones realizadas</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {filters.map(f => (
            <button key={f.key} style={S.navBtn(filter===f.key)} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading
        ? <div style={{ color:muted, fontSize:13 }}>Cargando...</div>
        : logs.length === 0
          ? <div style={{ textAlign:"center", padding:"60px 0", color:muted }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Sin actividad registrada</div>
              <div style={{ fontSize:13, marginTop:6 }}>Las acciones del equipo aparecerán acá automáticamente</div>
            </div>
          : Object.entries(grouped).map(([day, items]) => (
              <div key={day} style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:muted, marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
                  <span>{day}</span>
                  <span style={{ background:bc, borderRadius:99, padding:"2px 8px", fontSize:10 }}>{items.length} acciones</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {items.map(log => {
                    const { icon, color, bg, border } = getIcon(log.action);
                    return (
                      <div key={log.id} style={{ background:white, border:`1px solid ${bc}`, borderRadius:10, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:38, height:38, borderRadius:10, background:bg, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:navy }}>{log.action}</div>
                          <div style={{ fontSize:12, color:muted, marginTop:2 }}>
                            <span style={{ fontWeight:600, color }}>{log.user_name}</span>
                            {" · "}
                            {fmtTime(log.created_at)}
                          </div>
                        </div>
                        {log.amount > 0 && (
                          <div style={{ fontSize:15, fontWeight:700, color:successColor, flexShrink:0 }}>{fmt(log.amount)}</div>
                        )}
                        <button onClick={() => deleteLog(log.id)} title="Eliminar registro"
                          style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(0,0,0,.2)", fontSize:18, lineHeight:1, padding:"0 4px", flexShrink:0 }}
                          onMouseEnter={e => e.target.style.color=red}
                          onMouseLeave={e => e.target.style.color="rgba(0,0,0,.2)"}>×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
      }
    </div>
  );
}

function CompanySelector({ companies, onSelect, onAdd, onDelete }) {
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  function handleAdd() { if (!newName.trim()) return; onAdd(newName.trim()); setNewName(""); setAddModal(false); }

  return (
    <div style={{ minHeight:"100vh", background:bg, display:"flex", fontFamily:font }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Left panel — navy brand */}
      <div style={{ width:"42%", background:navy, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"60px 50px" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24 }}>
          {/* Logo */}
          <div style={{ width:90, height:90, borderRadius:"50%", background:white, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{ fontSize:11, fontWeight:800, color:navy2, letterSpacing:1.5 }}>PROPACKING</div>
              <div style={{ fontSize:36, fontWeight:900, color:red, lineHeight:1 }}>P</div>
              <div style={{ fontSize:8, fontWeight:700, color:navy2, letterSpacing:1 }}>INSUMOS PARA EMBALAJE</div>
            </div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:800, color:white, letterSpacing:.5 }}>ProPacking</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:6, letterSpacing:1 }}>SISTEMA DE COBRANZAS</div>
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.35)", lineHeight:1.8, textAlign:"center", maxWidth:260 }}>
            Gestión de clientes, facturas y cobranzas en un solo lugar.
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 60px" }}>
        <div style={{ maxWidth:380 }}>
          <div style={{ fontSize:22, fontWeight:700, color:navy, marginBottom:6 }}>Seleccioná una empresa</div>
          <div style={{ fontSize:13, color:muted, marginBottom:32 }}>Elegí con qué empresa vas a trabajar hoy</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
            {companies.map(co => {
              const t = getTheme(co.name);
              return (
              <div key={co.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button onClick={() => onSelect(co)}
                  style={{ flex:1, background:white, border:`2px solid ${bc}`, borderRadius:12, padding:"14px 18px", cursor:"pointer", textAlign:"left", fontFamily:font, display:"flex", alignItems:"center", gap:14, transition:"all .15s" }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = t.sidebar; e.currentTarget.style.boxShadow = `0 4px 16px ${t.sidebar}25`; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = bc; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:t.sidebar, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:18, fontWeight:900, color:white }}>{t.logoText}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:navy }}>{co.name}</div>
                    <div style={{ fontSize:11, color:muted, marginTop:2 }}>Sistema de cobranzas</div>
                  </div>
                  <span style={{ color:muted, fontSize:16 }}>→</span>
                </button>
                <button style={{ ...S.btn("danger"), padding:"10px 12px" }} onClick={() => { if (window.confirm(`¿Eliminar "${co.name}"?`)) onDelete(co.id); }}>×</button>
              </div>
            );})}
          </div>
          <button style={{ ...S.btn("primary"), width:"100%", padding:"14px", fontSize:14, borderRadius:10 }} onClick={() => setAddModal(true)}>+ Nueva empresa</button>
        </div>
      </div>

      {addModal && <Modal title="Nueva empresa" onClose={()=>setAddModal(false)} onConfirm={handleAdd}>
        <Field label="Nombre de la empresa" value={newName} onChange={setNewName} />
      </Modal>}
    </div>
  );
}

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [data, setData] = useState({ clients:[], invoices:[] });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem("cobUser") || "");
  const [askName, setAskName] = useState(() => !localStorage.getItem("cobUser"));
  function saveName(name) { localStorage.setItem("cobUser", name); setUserName(name); setAskName(false); }
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Load companies on mount
  useEffect(() => {
    (async () => {
      const { data: cos } = await supabase.from("companies").select("*").order("name");
      setCompanies(cos || []);
      setLoading(false);
    })();
  }, []);

  const loadData = useCallback(async (companyId) => {
    const id = companyId || currentCompany?.id;
    if (!id) return;
    const [{ data: clients }, { data: invoices }] = await Promise.all([
      supabase.from("clients").select("*").eq("company_id", id).order("name"),
      supabase.from("invoices").select("*").eq("company_id", id).order("due_date"),
    ]);
    setData({ clients: clients||[], invoices: invoices||[] });
  }, [currentCompany]);

  async function selectCompany(co) {
    setCurrentCompany(co);
    setView("dashboard");
    setSelectedClientId(null);
    const [{ data: clients }, { data: invoices }] = await Promise.all([
      supabase.from("clients").select("*").eq("company_id", co.id).order("name"),
      supabase.from("invoices").select("*").eq("company_id", co.id).order("due_date"),
    ]);
    setData({ clients: clients||[], invoices: invoices||[] });
  }

  async function addCompany(name) {
    const { data: co } = await supabase.from("companies").insert({ name }).select().single();
    if (co) setCompanies(prev => [...prev, co].sort((a,b) => a.name.localeCompare(b.name)));
  }

  async function deleteCompany(id) {
    await supabase.from("companies").delete().eq("id", id);
    setCompanies(prev => prev.filter(c => c.id !== id));
    if (currentCompany?.id === id) setCurrentCompany(null);
  }

  function goToClient(client) { if (!client) return; setSelectedClientId(client.id); setView("clients"); }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:24, fontWeight:800, color:navy, letterSpacing:2, marginBottom:8 }}>COBRANZAS</div>
        <div style={{ fontSize:13, color:muted }}>Cargando...</div>
      </div>
    </div>
  );

  if (!currentCompany) return <CompanySelector companies={companies} onSelect={selectCompany} onAdd={addCompany} onDelete={deleteCompany} />;

  // Ask name once per browser if not set
  if (askName) return (
    <div style={{ minHeight:"100vh", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font }}>
      <div style={{ background:white, border:`1px solid ${bc}`, borderRadius:16, padding:40, width:380, boxShadow:"0 8px 32px rgba(0,0,0,.1)" }}>
        <div style={{ fontSize:24, marginBottom:8 }}>👋</div>
        <div style={{ fontSize:20, fontWeight:700, color:navy, marginBottom:6 }}>¿Cómo te llamás?</div>
        <div style={{ fontSize:13, color:muted, marginBottom:24 }}>Tu nombre va a aparecer en el registro de actividad del equipo.</div>
        <NameForm onSave={saveName} />
      </div>
    </div>
  );

  const navItems = [
    { id:"dashboard", label:"Dashboard",    icon:"▦" },
    { id:"clients",   label:"Clientes",     icon:"◈" },
    { id:"invoices",  label:"Facturas",     icon:"◉" },
    { id:"stats",     label:"Estadísticas", icon:"◎" },
    { id:"board",     label:"Pizarrón",     icon:"◫" },
    { id:"activity",  label:"Actividad",    icon:"◷" },
  ];

  function navigate(id) { setView(id); if(id!=="clients") setSelectedClientId(null); setSidebarOpen(false); }

  const totalCartera = data.invoices.filter(i=>getInvoiceStatus(i)!=="paid").reduce((a,i)=>a+getInvoiceBalance(i),0);
  const totalVencidas = data.invoices.filter(i=>getInvoiceStatus(i)==="overdue").length;
  const T = getTheme(currentCompany?.name);

  const T = getTheme(currentCompany?.name);

  return (
    <div style={{ minHeight:"100vh", background:bg, color:navy, fontFamily:font, display:"flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @media(max-width:767px){
          .sb{ display:none !important; }
          .ml220{ margin-left:0 !important; }
          .pad3232{ padding:16px !important; }
          .toppad{ padding:0 16px !important; }
          .grid4{ grid-template-columns:1fr 1fr !important; }
          .grid2{ grid-template-columns:1fr !important; }
        }
        @media(min-width:768px){
          .hbg{ display:none !important; }
          .mobsb{ display:none !important; }
        }
      `}</style>

      {/* SIDEBAR DESKTOP */}
      <aside className="sb" style={{ width:220, minHeight:"100vh", background:T.sidebar, display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, zIndex:40 }}>
        <div style={{ padding:"28px 24px 24px", borderBottom:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:white, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <div style={{ fontSize:6, fontWeight:800, color:T.accent2, letterSpacing:.5 }}>{T.logoSub}</div>
              <div style={{ fontSize:18, fontWeight:900, color:T.accent, lineHeight:1 }}>{T.logoText}</div>
              {T.logoSubSmall && <div style={{ fontSize:5, fontWeight:700, color:T.accent2, letterSpacing:.5 }}>{T.logoSubSmall}</div>}
            </div>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:white, letterSpacing:.5 }}>{currentCompany.name}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginTop:2, letterSpacing:.5 }}>Cobranzas</div>
          </div>
        </div>
        <div style={{ padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:6 }}>Empresa activa</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:13, fontWeight:600, color:white }}>{currentCompany.name}</div>
            <button onClick={() => setCurrentCompany(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.3)", fontSize:11, fontFamily:font, padding:0 }}>Cambiar ⇄</button>
          </div>
        </div>
        <nav style={{ padding:"16px 12px", flex:1 }}>
          {navItems.map(item => (
            <div key={item.id} style={S.navItem(view===item.id, T.accent)} onClick={() => navigate(item.id)}>
              <span style={{ fontSize:15, width:20, textAlign:"center" }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:6 }}>Cartera total</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#ff8080" }}>{fmt(totalCartera)}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", marginTop:4 }}>{totalVencidas} vencidas · {data.clients.length} clientes</div>
        </div>
      </aside>

      {/* SIDEBAR MOBILE */}
      {sidebarOpen && (
        <div className="mobsb" style={{ position:"fixed", inset:0, zIndex:50, display:"flex" }}>
          <div style={{ width:260, background:T.sidebar, display:"flex", flexDirection:"column", minHeight:"100vh", overflowY:"auto" }}>
            <div style={{ padding:"20px 20px 18px", borderBottom:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:white, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                  <div style={{ fontSize:6, fontWeight:800, color:T.accent2 }}>{T.logoSub}</div>
                  <div style={{ fontSize:14, fontWeight:900, color:T.accent, lineHeight:1 }}>{T.logoText}</div>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:white }}>{currentCompany.name}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.35)" }}>Cobranzas</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,.5)", fontSize:26, cursor:"pointer", padding:0, lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:4 }}>Empresa activa</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontSize:12, fontWeight:600, color:white }}>{currentCompany.name}</div>
                <button onClick={() => setCurrentCompany(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.3)", fontSize:11, fontFamily:font, padding:0 }}>Cambiar ⇄</button>
              </div>
            </div>
            <nav style={{ padding:"12px 10px", flex:1 }}>
              {navItems.map(item => (
                <div key={item.id} style={S.navItem(view===item.id, T.accent)} onClick={() => navigate(item.id)}>
                  <span style={{ fontSize:15, width:20, textAlign:"center" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </nav>
            <div style={{ padding:"16px 20px", borderTop:"1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:4 }}>Cartera total</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#ff8080" }}>{fmt(totalCartera)}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", marginTop:3 }}>{totalVencidas} vencidas · {data.clients.length} clientes</div>
            </div>
          </div>
          <div style={{ flex:1, background:"rgba(0,0,0,.5)" }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* MAIN */}
      <div className="ml220" style={{ marginLeft:220, flex:1, display:"flex", flexDirection:"column", minHeight:"100vh" }}>
        {/* Topbar */}
        <div className="toppad" style={{ background:white, borderBottom:`1px solid ${bc}`, padding:"0 32px", height:56, display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:20 }}>
          <button className="hbg" onClick={() => setSidebarOpen(true)}
            style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:navy, padding:4, lineHeight:1 }}>☰</button>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:navy }}>{navItems.find(n=>n.id===view)?.label||"Dashboard"}</div>
            <div style={{ fontSize:11, color:muted, marginTop:1 }}>{new Date().toLocaleDateString("es-AR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
        </div>

        {/* Content */}
        <main className="pad3232" style={{ padding:"28px 32px", flex:1 }}>
          {view==="dashboard"&&<Dashboard data={data} onGoToClient={goToClient} companyName={currentCompany.name} />}
          {view==="clients"&&<ClientsView data={data} onSave={()=>loadData()} companyId={currentCompany.id} companyName={currentCompany.name} selectedClientId={selectedClientId} setSelectedClientId={setSelectedClientId} />}
          {view==="invoices"&&<InvoicesView data={data} onSave={()=>loadData()} companyId={currentCompany.id} onGoToClient={goToClient} />}
          {view==="stats"&&<StatsView data={data} onGoToClient={goToClient} />}
          {view==="board"&&<BoardView companyId={currentCompany.id} />}
          {view==="activity"&&<ActivityView companyId={currentCompany.id} />}
        </main>
      </div>
    </div>
  );
}
