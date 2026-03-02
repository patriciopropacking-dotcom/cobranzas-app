import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

const ALERT_DAYS = 7;
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function daysDiff(dateStr) { return Math.floor((new Date(dateStr) - TODAY) / 86400000); }
function fmt(n) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0); }
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

const accent = "#e8ff47", bg = "#0f0f13", surface = "#1a1a22", bc = "#ffffff18";
const S = {
  card: { background: surface, border: `1px solid ${bc}`, borderRadius: 12, padding: 20, marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 10, letterSpacing: 2, color: "#555", textTransform: "uppercase", padding: "8px 12px", borderBottom: `1px solid ${bc}` },
  td: { padding: "12px 12px", borderBottom: `1px solid ${bc}18`, fontSize: 13, verticalAlign: "middle" },
  sectionTitle: { fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#888", marginBottom: 16, marginTop: 0 },
  input: { background: "#0f0f13", border: `1px solid ${bc}`, borderRadius: 8, padding: "10px 14px", color: "#e8e8f0", fontSize: 13, width: "100%", fontFamily: "'DM Mono','Courier New',monospace", boxSizing: "border-box" },
  label: { fontSize: 11, color: "#666", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 },
  overlay: { position: "fixed", inset: 0, background: "#00000088", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBox: { background: "#1a1a22", border: `1px solid ${bc}`, borderRadius: 16, padding: 32, width: 500, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" },
  btn: (v = "default") => ({
    background: v === "primary" ? accent : v === "danger" ? "#ff3b3b22" : v === "warning" ? "#f59e0b22" : "#ffffff10",
    color: v === "primary" ? "#0f0f13" : v === "danger" ? "#ff3b3b" : v === "warning" ? "#f59e0b" : "#ccc",
    border: v === "danger" ? "1px solid #ff3b3b44" : v === "warning" ? "1px solid #f59e0b44" : "none",
    borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700,
    fontFamily: "'DM Mono','Courier New',monospace", letterSpacing: 0.5, transition: "all 0.15s",
  }),
  navBtn: (active, color) => ({
    background: active ? (color || accent) : "transparent",
    color: active ? (color ? "#fff" : "#0f0f13") : "#888",
    border: `1px solid ${active ? (color || accent) : bc}`,
    borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700,
    letterSpacing: 1, textTransform: "uppercase", transition: "all 0.15s", fontFamily: "'DM Mono','Courier New',monospace",
  }),
};

function Badge({ type, children }) {
  const map = {
    overdue: { background: "#ff3b3b22", color: "#ff3b3b", border: "1px solid #ff3b3b55" },
    pending: { background: "#f59e0b22", color: "#d97706", border: "1px solid #f59e0b55" },
    paid:    { background: "#10b98122", color: "#10b981", border: "1px solid #10b98155" },
    today:   { background: "#6366f122", color: "#6366f1", border: "1px solid #6366f155" },
    alert:   { background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b55" },
    partial: { background: "#a78bfa22", color: "#a78bfa", border: "1px solid #a78bfa55" },
  };
  return <span style={{ ...map[type], padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>{children}</span>;
}

function Modal({ title, onClose, onConfirm, confirmLabel, children }) {
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: accent }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 20 }}>×</button>
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
      <div style={{ background: "#0f0f13", borderRadius: 8, padding: 14, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
        <div>Factura: <strong>{fmt(inv.amount)}</strong></div>
        <div>Cobrado: <strong style={{ color: "#10b981" }}>{fmt(totalPaid)}</strong></div>
        <div>Saldo: <strong style={{ color: balance > 0 ? "#ff3b3b" : "#10b981" }}>{fmt(balance)}</strong></div>
      </div>
      {payments.length === 0
        ? <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin pagos registrados.</div>
        : payments.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${bc}` }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#10b981" }}>{fmt(p.amount)}</div>
              <div style={{ fontSize: 11, color: "#555" }}>{fmtDate(p.date)}{p.note ? ` · ${p.note}` : ""}</div>
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

function InvoiceRow({ inv, onMarkPaid, onPartialPay, onDelete, onViewPayments }) {
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
          <div style={{ fontSize: 11, color: "#555" }}>
            Vence: {fmtDate(inv.due_date)}{d < 0 && st !== "paid" ? ` · ${Math.abs(d)}d vencida` : ""}
            {totalPaid > 0 && <span style={{ color: "#a78bfa" }}> · Cobrado: {fmt(totalPaid)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(balance)}</div>
            {totalPaid > 0 && <div style={{ fontSize: 10, color: "#555" }}>de {fmt(inv.amount)}</div>}
          </div>
          {st === "paid" ? <Badge type="paid">Cobrada</Badge> : totalPaid > 0 ? <Badge type="partial">Parcial</Badge> : st === "overdue" ? <Badge type="overdue">Vencida</Badge> : <Badge type="pending">Pendiente</Badge>}
          {st !== "paid" && <><button style={S.btn()} onClick={() => onPartialPay(inv)}>$ Pago</button><button style={S.btn()} onClick={() => onMarkPaid(inv.id)}>✓</button></>}
          {hasPayments && <button style={{ ...S.btn(), fontSize: 11 }} onClick={() => onViewPayments(inv)}>📋 Recibos</button>}
          <button style={S.btn("danger")} onClick={() => onDelete(inv.id)}>×</button>
        </div>
      </div>
    </div>
  );
}

function AIAssistant({ client, invoices }) {
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
    const prompt = `Sos un asistente de cobranzas para una empresa argentina. Genera un mensaje de cobranza para enviar por ${channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "email" : "llamada telefonica (guion)"}.
Datos: Empresa: ${client.name}, Contacto: ${client.contact || "sin nombre"}, Deuda: ${fmt(totalDebt)}
Facturas:
${invoiceSummary}
${lastNote ? `Ultimo contacto: "${lastNote.text}" (${fmtDate(lastNote.date)})` : "Sin contactos previos"}
Tono: ${tone === "cordial" ? "Cordial y amable" : tone === "firme" ? "Firme y directo" : "Urgente"}
Escribi en espanol rioplatense, tuteo. ${channel === "whatsapp" ? "Max 5 lineas." : channel === "email" ? "Con asunto en primera linea." : "Guion de llamada."} No uses asteriscos ni markdown.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await res.json();
      setMessage(d.content?.map(b => b.text || "").join("") || "Error al generar.");
    } catch { setMessage("No se pudo conectar."); }
    setLoading(false);
  }
  function copy() { navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  const toneColors = { cordial: null, firme: "#f59e0b", urgente: "#ff3b3b" };
  return (
    <div style={{ ...S.card, borderColor: `${accent}44` }}>
      <p style={{ ...S.sectionTitle, color: accent }}>🤖 Asistente IA — Generar mensaje</p>
      {clInvs.length === 0 ? <div style={{ color: "#555", fontSize: 13 }}>Sin facturas pendientes.</div> : (
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
              <div style={{ background:"#0f0f13", border:`1px solid ${bc}`, borderRadius:8, padding:16, fontSize:13, lineHeight:1.75, whiteSpace:"pre-wrap" }}>{message}</div>
              <button style={{ ...S.btn(copied?"primary":"default"), marginTop:10, width:"100%" }} onClick={copy}>{copied ? "✓ ¡Copiado!" : "📋 Copiar mensaje"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Dashboard({ data, onGoToClient }) {
  const [sortAsc, setSortAsc] = useState(true);
  const overdueInvs = data.invoices.filter(i => getInvoiceStatus(i) === "overdue");
  const pendingInvs = data.invoices.filter(i => getInvoiceStatus(i) === "pending");
  const alertInvs = pendingInvs.filter(i => daysDiff(i.due_date) <= ALERT_DAYS);
  const toContact = data.clients.filter(c => c.next_contact && daysDiff(c.next_contact) <= 0);
  const getClient = id => data.clients.find(c => c.id === id);
  const totalOverdue = overdueInvs.reduce((a,i)=>a+getInvoiceBalance(i),0);
  const totalPending = pendingInvs.reduce((a,i)=>a+getInvoiceBalance(i),0);
  const sortedOverdue = [...overdueInvs].sort((a,b) => sortAsc ? new Date(a.due_date)-new Date(b.due_date) : new Date(b.due_date)-new Date(a.due_date));
  const Stat = ({color,label,value,sub}) => (
    <div style={{ background:surface, border:`1px solid ${color}44`, borderRadius:12, padding:20 }}>
      <div style={{ fontSize:11, color:"#666", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color, marginBottom:4, letterSpacing:-1 }}>{value}</div>
      <div style={{ fontSize:11, color:"#555" }}>{sub}</div>
    </div>
  );
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:28 }}>
        <Stat color="#ff3b3b" label="Vencidas" value={fmt(totalOverdue)} sub={`${overdueInvs.length} factura${overdueInvs.length!==1?"s":""}`} />
        <Stat color="#d97706" label="Por vencer" value={fmt(totalPending)} sub={`${pendingInvs.length} factura${pendingInvs.length!==1?"s":""}`} />
        <Stat color="#6366f1" label="Contactar hoy" value={toContact.length} sub={`cliente${toContact.length!==1?"s":""} pendiente${toContact.length!==1?"s":""}`} />
        <Stat color="#10b981" label="Total en cartera" value={fmt(totalOverdue+totalPending)} sub="por cobrar" />
      </div>
      {alertInvs.length > 0 && (
        <div style={{ ...S.card, borderColor:"#f59e0b44", marginBottom:24 }}>
          <p style={{ ...S.sectionTitle, color:"#f59e0b" }}>⚠️ Vencen pronto (próximos {ALERT_DAYS} días)</p>
          {alertInvs.map(inv => { const cl = getClient(inv.client_id); return (
            <div key={inv.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${bc}` }}>
              <div><div style={{ fontWeight:700, fontSize:14 }}>{cl?.name} <span style={{ fontWeight:400, color:"#888" }}>— {inv.number}</span></div><div style={{ fontSize:12, color:"#555" }}>Vence el {fmtDate(inv.due_date)}</div></div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}><Badge type="alert">en {daysDiff(inv.due_date)}d</Badge><strong>{fmt(getInvoiceBalance(inv))}</strong><button style={S.btn("primary")} onClick={() => onGoToClient(cl)}>Ver</button></div>
            </div>
          ); })}
        </div>
      )}
      {toContact.length > 0 && (
        <div style={{ ...S.card, borderColor:"#6366f144", marginBottom:24 }}>
          <p style={{ ...S.sectionTitle, color:"#6366f1" }}>⚡ Contactar hoy</p>
          {toContact.map(c => { const n = data.invoices.filter(i => i.client_id===c.id && getInvoiceStatus(i)!=="paid").length; return (
            <div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${bc}` }}>
              <div><div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div><div style={{ fontSize:12, color:"#666" }}>{c.contact} · {c.phone}</div></div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:12, color:"#888" }}>{n} fc. pendiente{n!==1?"s":""}</span><button style={S.btn("primary")} onClick={() => onGoToClient(c)}>Ver</button></div>
            </div>
          ); })}
        </div>
      )}
      <div style={S.card}>
        <p style={S.sectionTitle}>Facturas vencidas</p>
        {overdueInvs.length === 0 ? <div style={{ color:"#555", fontSize:13 }}>Sin facturas vencidas 🎉</div> : (
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Cliente</th><th style={S.th}>N° Factura</th>
              <th style={{ ...S.th, cursor:"pointer", userSelect:"none", color:"#aaa" }} onClick={() => setSortAsc(s=>!s)}>Vencimiento {sortAsc?"↑":"↓"}</th>
              <th style={S.th}>Días</th><th style={S.th}>Saldo</th>
            </tr></thead>
            <tbody>{sortedOverdue.map(inv => { const cl = getClient(inv.client_id); const paid = getTotalPaid(inv); return (
              <tr key={inv.id}>
                <td style={S.td}><span style={{ cursor:"pointer", color:accent }} onClick={() => onGoToClient(cl)}>{cl?.name}</span></td>
                <td style={S.td}><span style={{ color:"#888" }}>{inv.number}</span>{paid>0&&<> <Badge type="partial">Parcial</Badge></>}</td>
                <td style={S.td}>{fmtDate(inv.due_date)}</td>
                <td style={S.td}><Badge type="overdue">{Math.abs(daysDiff(inv.due_date))}d vencida</Badge></td>
                <td style={S.td}><strong>{fmt(getInvoiceBalance(inv))}</strong>{paid>0&&<div style={{ fontSize:10, color:"#555" }}>de {fmt(inv.amount)}</div>}</td>
              </tr>
            ); })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ClientDetail({ clientId, data, onBack, onSave }) {
  const cl = data.clients.find(c => c.id === clientId);
  const clInvoices = data.invoices.filter(i => i.client_id === clientId);
  const totalDebt = clInvoices.reduce((a,i)=>a+getInvoiceBalance(i),0);
  const dd = cl?.next_contact ? daysDiff(cl.next_contact) : null;
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name:cl?.name||"", contact:cl?.contact||"", phone:cl?.phone||"", email:cl?.email||"", next_contact:cl?.next_contact||"" });
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
  if (!cl) return <div style={{ color:"#555" }}>Cliente no encontrado.</div>;

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
    onSave(); setNoteModal(false); setNoteForm({ note:"", next_contact:"" });
  }
  async function addInvoice() {
    await supabase.from("invoices").insert({ client_id: clientId, number: invForm.number||"FC-????", amount: parseFloat(invForm.amount)||0, payments: [], due_date: invForm.due_date||"" });
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
    onSave(); setPayModal(null); setPayForm({ amount:"", note:"" });
  }
  async function markPaid(invId) {
    const inv = clInvoices.find(i => i.id === invId);
    const balance = getInvoiceBalance(inv);
    if (balance <= 0) return;
    const newPayment = { id:"p"+Date.now(), date: new Date().toISOString().split("T")[0], amount: balance, note: "Pago total" };
    await supabase.from("invoices").update({ payments: [...(inv.payments||[]), newPayment] }).eq("id", invId);
    onSave();
  }
  async function applyDistribution() {
    if (!distribution) return;
    for (const { inv, applied } of distribution) {
      if (applied <= 0) continue;
      const newPayment = { id:"p"+Date.now()+Math.random(), date: new Date().toISOString().split("T")[0], amount: applied, note: `Distribución ${fmt(parseFloat(distributeAmount))}` };
      await supabase.from("invoices").update({ payments: [...(inv.payments||[]), newPayment] }).eq("id", inv.id);
    }
    onSave(); setDistributeModal(false); setDistributeAmount(""); setDistribution(null);
  }
  async function deletePayment(invId, paymentId) {
    const inv = data.invoices.find(i => i.id === invId);
    const updatedPayments = (inv.payments||[]).filter(p => p.id !== paymentId);
    await supabase.from("invoices").update({ payments: updatedPayments }).eq("id", invId);
    onSave(); setHistoryModal(null);
  }
  async function deleteInvoice(invId) { await supabase.from("invoices").delete().eq("id", invId); onSave(); }

  return (
    <div>
      <button style={{ ...S.btn(), marginBottom:20 }} onClick={onBack}>← Volver</button>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <div style={S.card}>
            {editing ? (
              <>
                <p style={{ ...S.sectionTitle, color:accent }}>Editar datos</p>
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
                  <div><div style={{ fontSize:20, fontWeight:700, color:accent }}>{cl.name}</div><div style={{ fontSize:13, color:"#888", marginTop:4 }}>{cl.contact}</div></div>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:"#555", letterSpacing:1 }}>DEUDA TOTAL</div><div style={{ fontSize:22, fontWeight:700, color:totalDebt>0?"#ff3b3b":"#10b981" }}>{fmt(totalDebt)}</div></div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:13 }}>
                  {cl.phone&&<div>📞 <span style={{color:"#888"}}>{cl.phone}</span></div>}
                  {cl.email&&<div>✉️ <span style={{color:"#888"}}>{cl.email}</span></div>}
                  {cl.next_contact&&<div style={{marginTop:4}}>🗓️ Próximo contacto: <strong style={{color:dd!==null&&dd<=0?"#6366f1":"#e8e8f0"}}>{fmtDate(cl.next_contact)}</strong>{dd!==null&&dd<=0&&<> <Badge type="today">HOY</Badge></>}</div>}
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
            {(!cl.notes||cl.notes.length===0) ? <div style={{color:"#555",fontSize:13}}>Sin notas aún.</div>
              : cl.notes.map((n,i)=>(
                <div key={i} style={{ borderLeft:`2px solid ${accent}44`, paddingLeft:12, marginBottom:12 }}>
                  <div style={{fontSize:11,color:"#555",marginBottom:2}}>{fmtDate(n.date)}</div>
                  <div style={{fontSize:13}}>{n.text}</div>
                </div>
              ))}
          </div>
          <AIAssistant client={cl} invoices={data.invoices} />
        </div>
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <p style={{...S.sectionTitle,margin:0}}>Facturas</p>
            <div style={{ display:"flex", gap:8 }}>
              {clInvoices.some(i=>getInvoiceStatus(i)!=="paid") && <button style={S.btn("warning")} onClick={()=>{setDistributeAmount("");setDistribution(null);setDistributeModal(true);}}>💰 Distribuir pago</button>}
              <button style={S.btn("primary")} onClick={()=>{setInvForm({number:"",amount:"",due_date:""});setInvModal(true);}}>+ Nueva</button>
            </div>
          </div>
          {clInvoices.length===0 ? <div style={{color:"#555",fontSize:13}}>Sin facturas.</div>
            : clInvoices.map(inv=>(
              <InvoiceRow key={inv.id} inv={inv} onMarkPaid={markPaid} onPartialPay={inv=>{setPayModal(inv);setPayForm({amount:"",note:""}); }} onDelete={deleteInvoice} onViewPayments={inv=>setHistoryModal(inv)} />
            ))}
        </div>
      </div>

      {payModal && <Modal title={`Registrar pago — ${payModal.number}`} onClose={()=>setPayModal(null)} onConfirm={applyPayment} confirmLabel="Registrar pago">
        <div style={{ background:"#0f0f13", borderRadius:8, padding:14, fontSize:13 }}>
          <div>Factura: <strong>{fmt(payModal.amount)}</strong></div>
          {getTotalPaid(payModal)>0&&<div>Ya cobrado: <strong style={{color:"#a78bfa"}}>{fmt(getTotalPaid(payModal))}</strong></div>}
          <div>Saldo: <strong style={{color:"#ff3b3b"}}>{fmt(getInvoiceBalance(payModal))}</strong></div>
        </div>
        <Field label="Monto del pago ($)" type="number" value={payForm.amount} onChange={v=>setPayForm(f=>({...f,amount:v}))} />
        <Field label="Nota (opcional)" value={payForm.note} onChange={v=>setPayForm(f=>({...f,note:v}))} />
      </Modal>}

      {historyModal && <PaymentHistoryModal inv={data.invoices.find(i=>i.id===historyModal.id)||historyModal} onDeletePayment={deletePayment} onClose={()=>setHistoryModal(null)} />}

      {distributeModal && <Modal title="Distribuir pago" onClose={()=>setDistributeModal(false)} onConfirm={applyDistribution} confirmLabel="Aplicar distribución">
        <Field label="Monto total recibido ($)" type="number" value={distributeAmount} onChange={handleDistributeChange} />
        {distribution && (
          <div>
            <div style={{ fontSize:11, color:"#666", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Distribución automática (más vencidas primero)</div>
            {distribution.map(({ inv, balance, applied, leftover }) => (
              <div key={inv.id} style={{ background:"#0f0f13", borderRadius:8, padding:12, marginBottom:8, borderLeft:`3px solid ${applied>=balance?"#10b981":applied>0?"#a78bfa":"#ffffff18"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div><div style={{ fontWeight:700, fontSize:13 }}>{inv.number}</div><div style={{ fontSize:11, color:"#555" }}>Vence {fmtDate(inv.due_date)} · Saldo: {fmt(balance)}</div></div>
                  <div style={{ textAlign:"right" }}>
                    {applied>0 ? <><div style={{ fontWeight:700, fontSize:13, color:applied>=balance?"#10b981":"#a78bfa" }}>{applied>=balance?"✓ Saldada":`Aplica ${fmt(applied)}`}</div>{leftover>0&&<div style={{fontSize:11,color:"#555"}}>Queda: {fmt(leftover)}</div>}</> : <div style={{fontSize:12,color:"#444"}}>Sin alcanzar</div>}
                  </div>
                </div>
              </div>
            ))}
            {(() => { const sobrante = parseFloat(distributeAmount) - distribution.reduce((a,d)=>a+d.balance,0); return sobrante>0 ? <div style={{ background:"#10b98122", border:"1px solid #10b98144", borderRadius:8, padding:12, fontSize:13, color:"#10b981" }}>✓ Cubre toda la deuda. Sobrante: <strong>{fmt(sobrante)}</strong></div> : null; })()}
          </div>
        )}
        {!distribution && <div style={{fontSize:12,color:"#555"}}>Ingresá el monto para ver cómo se distribuye.</div>}
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
    </div>
  );
}

function ClientsView({ data, onSave, selectedClientId, setSelectedClientId }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name:"",contact:"",phone:"",email:"",next_contact:"" });
  async function addClient() {
    await supabase.from("clients").insert({ name:addForm.name||"Sin nombre", contact:addForm.contact||"", phone:addForm.phone||"", email:addForm.email||"", notes:[], next_contact:addForm.next_contact||null });
    onSave(); setAddModal(false); setAddForm({name:"",contact:"",phone:"",email:"",next_contact:""});
  }
  if (selectedClientId) return <ClientDetail clientId={selectedClientId} data={data} onBack={()=>setSelectedClientId(null)} onSave={onSave} />;
  const statusFilters = [{key:"all",label:"Todos"},{key:"overdue",label:"Con vencidas",color:"#ff3b3b"},{key:"alert",label:"Vencen pronto",color:"#f59e0b"},{key:"contact",label:"Llamar hoy",color:"#6366f1"},{key:"ok",label:"Al día",color:"#10b981"}];
  const filtered = data.clients.filter(c => {
    const matchText = c.name.toLowerCase().includes(search.toLowerCase()) || (c.contact||"").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter==="all" || getClientStatus(c,data.invoices)===statusFilter;
    return matchText && matchStatus;
  });
  const borderColorMap = {overdue:"#ff3b3b44",alert:"#f59e0b44",contact:"#6366f144",ok:bc};
  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center" }}>
        <input style={{...S.input,flex:1}} placeholder="Buscar cliente..." value={search} onChange={e=>setSearch(e.target.value)} />
        <button style={S.btn("primary")} onClick={()=>{setAddForm({name:"",contact:"",phone:"",email:"",next_contact:""});setAddModal(true);}}>+ Nuevo cliente</button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {statusFilters.map(f=><button key={f.key} style={S.navBtn(statusFilter===f.key,f.color)} onClick={()=>setStatusFilter(f.key)}>{f.label}</button>)}
      </div>
      {filtered.length===0&&<div style={{color:"#555",fontSize:13,padding:"20px 0"}}>No hay clientes en esta categoría.</div>}
      {filtered.map(c=>{
        const clInvs = data.invoices.filter(i=>i.client_id===c.id&&getInvoiceStatus(i)!=="paid");
        const debt = clInvs.reduce((a,i)=>a+getInvoiceBalance(i),0);
        const cStatus = getClientStatus(c,data.invoices);
        return (
          <div key={c.id} style={{...S.card,cursor:"pointer",borderColor:borderColorMap[cStatus]||bc}} onClick={()=>setSelectedClientId(c.id)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{c.name} <span style={{fontWeight:400,fontSize:12,color:"#666"}}>— {c.contact}</span>
                  {cStatus==="overdue"&&<> <Badge type="overdue">Vencida</Badge></>}
                  {cStatus==="alert"&&<> <Badge type="alert">Vence pronto</Badge></>}
                  {cStatus==="contact"&&<> <Badge type="today">Llamar hoy</Badge></>}
                </div>
                <div style={{fontSize:12,color:"#555",marginTop:4}}>{c.phone}{c.next_contact&&` · Recontactar: ${fmtDate(c.next_contact)}`}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,fontWeight:700,color:debt>0?(cStatus==="overdue"?"#ff3b3b":"#d97706"):"#10b981"}}>{fmt(debt)}</div>
                <div style={{fontSize:11,color:"#555"}}>{clInvs.length} factura{clInvs.length!==1?"s":""}</div>
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

function InvoicesView({ data, onSave, onGoToClient }) {
  const [filter, setFilter] = useState("all");
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ clientId:"",number:"",amount:"",due_date:"" });
  const [historyModal, setHistoryModal] = useState(null);

  async function deletePayment(invId, paymentId) {
    const inv = data.invoices.find(i => i.id === invId);
    const updatedPayments = (inv.payments||[]).filter(p => p.id !== paymentId);
    await supabase.from("invoices").update({ payments: updatedPayments }).eq("id", invId);
    onSave(); setHistoryModal(null);
  }
  async function addInvoice() {
    await supabase.from("invoices").insert({ client_id:addForm.clientId||data.clients[0]?.id, number:addForm.number||"FC-????", amount:parseFloat(addForm.amount)||0, payments:[], due_date:addForm.due_date||"" });
    onSave(); setAddModal(false); setAddForm({clientId:"",number:"",amount:"",due_date:""});
  }
  async function deleteInvoice(invId) { await supabase.from("invoices").delete().eq("id", invId); onSave(); }
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
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[["all","Todas"],["overdue","Vencidas"],["alert","Vencen pronto"],["pending","Pendientes"],["partial","Pago parcial"],["paid","Cobradas"]].map(([f,l])=>(
          <button key={f} style={S.navBtn(filter===f)} onClick={()=>setFilter(f)}>{l}</button>
        ))}
        <div style={{flex:1}}/>
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
                  <td style={S.td}><span style={{cursor:"pointer",color:accent}} onClick={()=>onGoToClient(cl)}>{cl?.name}</span></td>
                  <td style={S.td}><span style={{color:"#888"}}>{inv.number}</span></td>
                  <td style={S.td}>{fmtDate(inv.due_date)}{d<0&&st!=="paid"&&<span style={{color:"#ff3b3b",fontSize:11}}> ({Math.abs(d)}d)</span>}{d>=0&&d<=ALERT_DAYS&&st!=="paid"&&<span style={{color:"#f59e0b",fontSize:11}}> (en {d}d)</span>}</td>
                  <td style={S.td}>{st==="paid"?<Badge type="paid">Cobrada</Badge>:paid>0?<Badge type="partial">Parcial</Badge>:st==="overdue"?<Badge type="overdue">Vencida</Badge>:<Badge type="pending">Pendiente</Badge>}</td>
                  <td style={S.td}><strong>{fmt(getInvoiceBalance(inv))}</strong>{paid>0&&<div style={{fontSize:10,color:"#555"}}>de {fmt(inv.amount)}</div>}</td>
                  <td style={S.td}>
                    <div style={{display:"flex",gap:6}}>
                      {(inv.payments||[]).length>0&&<button style={{...S.btn(),fontSize:11}} onClick={()=>setHistoryModal(inv)}>📋 Recibos</button>}
                      <button style={S.btn("danger")} onClick={()=>deleteInvoice(inv.id)}>×</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length===0&&<tr><td colSpan={6} style={{...S.td,color:"#555",textAlign:"center",padding:32}}>Sin facturas en esta categoría.</td></tr>}
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
  );
}

export default function App() {
  const [data, setData] = useState({ clients:[], invoices:[] });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [selectedClientId, setSelectedClientId] = useState(null);

  const loadData = useCallback(async () => {
    const [{ data: clients }, { data: invoices }] = await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase.from("invoices").select("*").order("due_date"),
    ]);
    setData({ clients: clients||[], invoices: invoices||[] });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function goToClient(client) { if (!client) return; setSelectedClientId(client.id); setView("clients"); }

  if (loading) return <div style={{ minHeight:"100vh", background:bg, display:"flex", alignItems:"center", justifyContent:"center", color:"#666", fontFamily:"'DM Mono',monospace", fontSize:14 }}>Cargando datos...</div>;

  return (
    <div style={{ minHeight:"100vh", background:bg, color:"#e8e8f0", fontFamily:"'DM Mono','Courier New',monospace" }}>
      <header style={{ borderBottom:`1px solid ${bc}`, padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0f0f13ee", backdropFilter:"blur(8px)", position:"sticky", top:0, zIndex:50 }}>
        <span style={{ fontSize:18, fontWeight:700, letterSpacing:2, color:accent, textTransform:"uppercase" }}>⚡ Cobranzas</span>
        <nav style={{display:"flex",gap:4}}>
          {[["dashboard","Dashboard"],["clients","Clientes"],["invoices","Facturas"]].map(([v,l])=>(
            <button key={v} style={S.navBtn(view===v)} onClick={()=>{setView(v);if(v!=="clients")setSelectedClientId(null);}}>{l}</button>
          ))}
        </nav>
      </header>
      <main style={{ padding:"28px 28px", maxWidth:1100, margin:"0 auto" }}>
        {view==="dashboard"&&<Dashboard data={data} onGoToClient={goToClient} />}
        {view==="clients"&&<ClientsView data={data} onSave={loadData} selectedClientId={selectedClientId} setSelectedClientId={setSelectedClientId} />}
        {view==="invoices"&&<InvoicesView data={data} onSave={loadData} onGoToClient={goToClient} />}
      </main>
    </div>
  );
}
