import { useState, useMemo, useRef, useCallback } from "react";

// --- Verbesserte Hilfsfunktionen ---
const generateId = () => {
  // Nutze crypto.randomUUID wenn verfügbar, Fallback zu Math.random
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, "");
    }
  } catch {}
  return Math.random().toString(36).substr(2, 9);
};

const formatCurrency = (val) => {
  const num = Number(val);
  const amount = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
};
// --- Ende Verbesserte Hilfsfunktionen ---

const DEFAULT_CATEGORIES = {
  "Licht": ["Hardware", "Kabel & Stecker", "Steuerung", "Montage", "Sonstiges"],
  "Audio": ["Lautsprecher", "Verstärker", "Mischpult", "DSP/Controller", "Mikrofone", "Kabel & Stecker", "Montage", "Sonstiges"],
  "Video": ["Displays", "Projektion", "Kamera", "Mediensteuerung", "Kabel & Stecker", "Montage", "Sonstiges"],
  "Netzwerk": ["Switches", "Kabel & Stecker", "Racks", "Sonstiges"],
  "Steuerung": ["Controller", "Panels", "Software/Lizenzen", "Sonstiges"],
  "Allgemein": ["Montage & Zubehör", "Verbrauchsmaterial", "Transport", "Sonstiges"],
};

const INITIAL_PROJECT = {
  id: generateId(),
  name: "Neues AV-Projekt",
  categories: DEFAULT_CATEGORIES,
  items: [],
  receipts: [],
  receiptLines: [],
};

const TABS = [
  { id: "calc", label: "Kalkulation", icon: "📐" },
  { id: "table", label: "Artikeltabelle", icon: "📋" },
  { id: "receipts", label: "Belege", icon: "🧾" },
  { id: "assign", label: "Zuordnung", icon: "🔗" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
];

// ─── Shared UI Components ────────────────────────────────────────────────────

function Card({ children, className = "" }) {
  return <div className={`rounded-lg border border-zinc-800 bg-zinc-900/70 backdrop-blur-sm ${className}`}>{children}</div>;
}

function Button({ children, onClick, variant = "primary", size = "md", className = "", disabled = false }) {
  const base = "font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed";
  const v = {
    primary: "bg-amber-500 text-zinc-950 hover:bg-amber-400 active:bg-amber-600",
    secondary: "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700",
    danger: "bg-red-900/60 text-red-200 hover:bg-red-800/70 border border-red-800/50",
    ghost: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
  };
  const s = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-1.5 text-sm", lg: "px-5 py-2.5 text-sm" };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${v[variant]} ${s[size]} ${className}`}>{children}</button>;
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-zinc-500 font-medium tracking-wide uppercase">{label}</label>}
      <input {...props} className={`bg-zinc-800/80 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-colors ${props.className || ""}`} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-zinc-500 font-medium tracking-wide uppercase">{label}</label>}
      <select {...props} className={`bg-zinc-800/80 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-colors ${props.className || ""}`}>{children}</select>
    </div>
  );
}

function Badge({ children, color = "zinc" }) {
  const c = {
    zinc: "bg-zinc-800 text-zinc-300",
    amber: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    green: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    red: "bg-red-500/15 text-red-400 border border-red-500/20",
    blue: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
    purple: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c[color]}`}>{children}</span>;
}

function ProgressBar({ value, max, showLabel = true }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 150) : 0;
  const color = pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {showLabel && <span className="text-xs text-zinc-500 w-12 text-right">{pct.toFixed(0)}%</span>}
    </div>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3 opacity-40">{icon}</div>
      <p className="text-zinc-400 font-medium">{title}</p>
      <p className="text-zinc-600 text-sm mt-1">{description}</p>
    </div>
  );
}

function ConfirmDelete({ message, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/30 rounded-md px-3 py-2">
      <span className="text-xs text-red-300">{message}</span>
      <Button variant="danger" size="sm" onClick={onConfirm}>Ja</Button>
      <Button variant="ghost" size="sm" onClick={onCancel}>Nein</Button>
    </div>
  );
}

// ─── PDF INVOICE IMPORT MODULE ───────────────────────────────────────────────

async function extractTextFromPDF(file) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  return fullText;
}

let _pdfjsLoaded = null;
function loadPdfJs() {
  if (_pdfjsLoaded) return _pdfjsLoaded;
  _pdfjsLoaded = new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("PDF.js konnte nicht geladen werden"));
    document.head.appendChild(script);
  });
  return _pdfjsLoaded;
}

async function parseInvoiceWithAI(pdfText) {
  const systemPrompt = `Du bist ein Rechnungsparser für AV-Installationen (Audio, Video, Licht, Steuerung).
Extrahiere aus dem Rechnungstext folgende Informationen:

1. Rechnungsmetadaten:
   - supplier: Lieferant/Firma
   - date: Rechnungsdatum (YYYY-MM-DD)
   - invoiceNumber: Rechnungsnummer
   - totalGross: Gesamtbetrag brutto (Zahl)

2. Einzelpositionen (Array "lines"):
   - description: Artikelbezeichnung (kurz und prägnant)
   - qty: Menge (Zahl)
   - unitPrice: Einzelpreis netto (Zahl)
   - lineTotal: Positionssumme (Zahl)

Antworte NUR mit validem JSON, kein Markdown, keine Backticks, kein sonstiger Text.
Beispiel:
{"supplier":"Thomann","date":"2026-01-15","invoiceNumber":"TH-123","totalGross":1234.56,"lines":[{"description":"JBL Control 25-1","qty":4,"unitPrice":189.00,"lineTotal":756.00}]}

Wenn du Versandkosten, Verpackung oder ähnliche Nebenkosten findest, liste sie als eigene Position.
Benutze Dezimalpunkte, keine Kommas für Zahlen.
Wenn du etwas nicht erkennen kannst, verwende sinnvolle Standardwerte (qty: 1, unitPrice: 0).`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Bitte parse diese Rechnung:\n\n${pdfText.substring(0, 6000)}` }
      ],
    }),
  });

  const data = await response.json();
  const text = data.content
    .map(item => (item.type === "text" ? item.text : ""))
    .filter(Boolean)
    .join("\n");

  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function PdfImportModal({ onClose, onImport }) {
  const [status, setStatus] = useState("idle"); // idle | reading | parsing | preview | error
  const [pdfText, setPdfText] = useState("");
  const [pdfBase64, setPdfBase64] = useState(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [editLines, setEditLines] = useState([]);
  const [editMeta, setEditMeta] = useState({ supplier: "", date: "", invoiceNumber: "", totalGross: 0 });
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Bitte eine PDF-Datei auswählen.");
      setStatus("error");
      return;
    }

    try {
      setStatus("reading");
      setError("");
      setPdfFileName(file.name);

      // Read as base64 for storage
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Datei konnte nicht gelesen werden"));
        r.readAsDataURL(file);
      });
      setPdfBase64(base64);

      const text = await extractTextFromPDF(file);
      setPdfText(text);

      if (text.trim().length < 20) {
        setError("Die PDF scheint keinen extrahierbaren Text zu enthalten (evtl. gescanntes Bild). Bitte eine textbasierte PDF verwenden.");
        setStatus("error");
        return;
      }

      setStatus("parsing");
      const result = await parseInvoiceWithAI(text);
      setParsed(result);
      setEditMeta({
        supplier: result.supplier || "",
        date: result.date || new Date().toISOString().split("T")[0],
        invoiceNumber: result.invoiceNumber || "",
        totalGross: result.totalGross || 0,
      });
      setEditLines((result.lines || []).map(l => ({
        id: generateId(),
        description: l.description || "",
        qty: l.qty || 1,
        unitPrice: l.unitPrice || 0,
        lineTotal: l.lineTotal || (l.qty || 1) * (l.unitPrice || 0),
        include: true,
      })));
      setStatus("preview");
    } catch (err) {
      console.error(err);
      setError(`Fehler: ${err.message}`);
      setStatus("error");
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const toggleLine = (id) => {
    setEditLines(ls => ls.map(l => l.id === id ? { ...l, include: !l.include } : l));
  };

  const updateLine = (id, field, value) => {
    setEditLines(ls => ls.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === "qty" || field === "unitPrice") {
        updated.lineTotal = (updated.qty || 0) * (updated.unitPrice || 0);
      }
      return updated;
    }));
  };

  const removeLine = (id) => {
    setEditLines(ls => ls.filter(l => l.id !== id));
  };

  const addEmptyLine = () => {
    setEditLines(ls => [...ls, { id: generateId(), description: "", qty: 1, unitPrice: 0, lineTotal: 0, include: true }]);
  };

  const doImport = () => {
    const receipt = {
      id: generateId(),
      supplier: editMeta.supplier,
      date: editMeta.date,
      number: editMeta.invoiceNumber,
      totalGross: editMeta.totalGross,
      notes: "PDF-Import",
      pdfBase64: pdfBase64 || null,
      pdfFileName: pdfFileName || null,
    };
    const lines = editLines
      .filter(l => l.include && l.description)
      .map(l => ({
        id: generateId(),
        receiptId: receipt.id,
        description: l.description,
        qty: l.qty,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        itemId: null,
      }));
    onImport(receipt, lines);
    onClose();
  };

  const includedTotal = editLines.filter(l => l.include).reduce((s, l) => s + l.lineTotal, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl">📄</div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">PDF Rechnung importieren</h2>
              <p className="text-xs text-zinc-500">
                {status === "idle" && "PDF hochladen, Positionen werden automatisch erkannt"}
                {status === "reading" && "PDF wird gelesen..."}
                {status === "parsing" && "KI analysiert die Rechnung..."}
                {status === "preview" && "Erkannte Positionen prüfen und importieren"}
                {status === "error" && "Fehler aufgetreten"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Upload Area */}
          {(status === "idle" || status === "error") && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-amber-500/50 rounded-xl p-12 text-center cursor-pointer transition-colors group"
            >
              <div className="text-5xl mb-4 opacity-50 group-hover:opacity-80 transition-opacity">📄</div>
              <p className="text-zinc-300 font-medium mb-1">PDF hierher ziehen oder klicken</p>
              <p className="text-xs text-zinc-500">Rechnungs-PDF von Thomann, Amazon, Musikhaus, etc.</p>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-950/40 border border-red-800/30 rounded-lg px-4 py-3">
              <p className="text-sm text-red-300">{error}</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setStatus("idle"); setError(""); }}>
                Erneut versuchen
              </Button>
            </div>
          )}

          {/* Loading States */}
          {(status === "reading" || status === "parsing") && (
            <div className="flex flex-col items-center py-16">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                  {status === "reading" ? "📄" : "🤖"}
                </div>
              </div>
              <p className="text-zinc-300 font-medium">
                {status === "reading" ? "PDF wird gelesen..." : "KI analysiert Rechnungspositionen..."}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {status === "parsing" && "Die Positionen werden automatisch erkannt und aufgelistet"}
              </p>
            </div>
          )}

          {/* Preview & Edit */}
          {status === "preview" && (
            <div className="space-y-5">

              {/* Invoice Metadata */}
              <Card className="p-4">
                <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-3">Rechnungsdaten</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input label="Lieferant" value={editMeta.supplier}
                    onChange={e => setEditMeta(m => ({ ...m, supplier: e.target.value }))} />
                  <Input label="Datum" type="date" value={editMeta.date}
                    onChange={e => setEditMeta(m => ({ ...m, date: e.target.value }))} />
                  <Input label="Rechnungsnummer" value={editMeta.invoiceNumber}
                    onChange={e => setEditMeta(m => ({ ...m, invoiceNumber: e.target.value }))} />
                  <Input label="Gesamtbetrag brutto (€)" type="number" step="0.01" value={editMeta.totalGross}
                    onChange={e => setEditMeta(m => ({ ...m, totalGross: parseFloat(e.target.value) || 0 }))} />
                </div>
              </Card>

              {/* Detected Lines */}
              <Card className="overflow-hidden">
                <div className="px-4 py-2.5 bg-purple-500/5 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge color="purple">{editLines.filter(l => l.include).length} Positionen</Badge>
                    <span className="text-sm font-semibold text-zinc-300">Erkannte Rechnungspositionen</span>
                  </div>
                  <span className="text-sm text-zinc-400">Summe: {formatCurrency(includedTotal)}</span>
                </div>

                <div className="divide-y divide-zinc-800/50">
                  {editLines.map((line, idx) => (
                    <div key={line.id} className={`px-4 py-3 flex items-center gap-3 transition-colors ${line.include ? "bg-transparent" : "bg-zinc-950/50 opacity-50"}`}>
                      <input type="checkbox" checked={line.include} onChange={() => toggleLine(line.id)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/30" />
                      <span className="text-xs text-zinc-600 w-6">{idx + 1}.</span>
                      <input className="flex-1 bg-zinc-800/60 border border-zinc-700/50 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/60"
                        value={line.description} onChange={e => updateLine(line.id, "description", e.target.value)} />
                      <input className="w-16 bg-zinc-800/60 border border-zinc-700/50 rounded px-2 py-1 text-sm text-zinc-200 text-right focus:outline-none focus:border-amber-500/60"
                        type="number" min="1" step="1" value={line.qty}
                        onChange={e => updateLine(line.id, "qty", parseInt(e.target.value) || 0)} />
                      <span className="text-xs text-zinc-600">×</span>
                      <input className="w-24 bg-zinc-800/60 border border-zinc-700/50 rounded px-2 py-1 text-sm text-zinc-200 text-right focus:outline-none focus:border-amber-500/60"
                        type="number" min="0" step="0.01" value={line.unitPrice}
                        onChange={e => updateLine(line.id, "unitPrice", parseFloat(e.target.value) || 0)} />
                      <span className="text-sm text-zinc-300 font-medium w-24 text-right">{formatCurrency(line.lineTotal)}</span>
                      <button onClick={() => {
                        const newPrice = Math.round(line.unitPrice * 1.19 * 100) / 100;
                        updateLine(line.id, "unitPrice", newPrice);
                      }} title="+19% MwSt"
                        className="px-1.5 py-0.5 text-xs rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors whitespace-nowrap">
                        +19%
                      </button>
                      <button onClick={() => removeLine(line.id)} className="text-zinc-600 hover:text-red-400 text-sm">✕</button>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={addEmptyLine}>+ Position hinzufügen</Button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      setEditLines(ls => ls.map(l => {
                        const newPrice = Math.round(l.unitPrice * 1.19 * 100) / 100;
                        return { ...l, unitPrice: newPrice, lineTotal: Math.round(l.qty * newPrice * 100) / 100 };
                      }));
                    }}
                      className="px-2 py-1 text-xs rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors whitespace-nowrap">
                      Alle +19% MwSt
                    </button>
                    {Math.abs(includedTotal - editMeta.totalGross) > 0.01 && editMeta.totalGross > 0 && (
                      <span className="text-xs text-amber-400">
                        ⚠️ Differenz: {formatCurrency(editMeta.totalGross - includedTotal)}
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Raw text toggle */}
              <details className="group">
                <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">
                  Extrahierter PDF-Text anzeigen ▸
                </summary>
                <pre className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-500 overflow-auto max-h-48 whitespace-pre-wrap">
                  {pdfText}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === "preview" && (
          <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/80">
            <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">
                {editLines.filter(l => l.include).length} Positionen → Belege
              </span>
              <Button onClick={doImport} disabled={editLines.filter(l => l.include && l.description).length === 0}>
                ✓ Importieren
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category Management Inline ──────────────────────────────────────────────

function CategoryManager({ categories, setCategories }) {
  const [newGewerk, setNewGewerk] = useState("");
  const [newSub, setNewSub] = useState({});
  const [expanded, setExpanded] = useState(false);

  const addGewerk = () => {
    const g = newGewerk.trim();
    if (!g || categories[g]) return;
    setCategories(c => ({ ...c, [g]: ["Sonstiges"] }));
    setNewGewerk("");
  };

  const addSub = (gewerk) => {
    const s = (newSub[gewerk] || "").trim();
    if (!s || categories[gewerk].includes(s)) return;
    setCategories(c => ({ ...c, [gewerk]: [...c[gewerk], s] }));
    setNewSub(ns => ({ ...ns, [gewerk]: "" }));
  };

  const removeGewerk = (g) => setCategories(c => { const n = { ...c }; delete n[g]; return n; });
  const removeSub = (g, s) => setCategories(c => ({ ...c, [g]: c[g].filter(x => x !== s) }));

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-800/50 border-b border-zinc-800 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm font-semibold text-zinc-300">⚙️ Kategorien verwalten</span>
        <span className="text-zinc-500 text-sm">{expanded ? "▾" : "▸"}</span>
      </div>
      {expanded && (
        <div className="p-4 space-y-3">
          {Object.entries(categories).map(([gewerk, subs]) => (
            <div key={gewerk} className="border border-zinc-800 rounded-md p-3 bg-zinc-900/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-amber-400">{gewerk}</span>
                <Button variant="ghost" size="sm" onClick={() => removeGewerk(gewerk)}>✕</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {subs.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded">
                    {s}
                    <button onClick={() => removeSub(gewerk, s)} className="text-zinc-600 hover:text-red-400 ml-0.5">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Neue Unterkategorie" className="flex-1 bg-zinc-800/80 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60"
                  value={newSub[gewerk] || ""} onChange={e => setNewSub(ns => ({ ...ns, [gewerk]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addSub(gewerk)} />
                <Button variant="secondary" size="sm" onClick={() => addSub(gewerk)}>+</Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <input placeholder="Neues Gewerk (z.B. Rigging)" className="flex-1 bg-zinc-800/80 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60"
              value={newGewerk} onChange={e => setNewGewerk(e.target.value)} onKeyDown={e => e.key === "Enter" && addGewerk()} />
            <Button onClick={addGewerk} disabled={!newGewerk.trim()}>+ Gewerk</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── KALKULATION TAB ─────────────────────────────────────────────────────────

function CalcTab({ project, setProject }) {
  const cats = project.categories;
  const gewerke = Object.keys(cats);
  const [form, setForm] = useState({ name: "", gewerk: gewerke[0] || "", sub: cats[gewerke[0]]?.[0] || "", qty: 1, unitPrice: 0, notes: "" });
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const updateGewerk = (g) => {
    const subs = cats[g] || [];
    setForm(f => ({ ...f, gewerk: g, sub: subs[0] || "" }));
  };

  const resetForm = () => {
    const g = gewerke[0] || "";
    setForm({ name: "", gewerk: g, sub: cats[g]?.[0] || "", qty: 1, unitPrice: 0, notes: "" });
    setEditId(null);
  };

  const saveItem = () => {
    if (!form.name || form.qty <= 0) return;
    if (editId) {
      setProject(p => ({ ...p, items: p.items.map(i => i.id === editId ? { ...i, ...form, total: form.qty * form.unitPrice } : i) }));
    } else {
      setProject(p => ({ ...p, items: [...p.items, { id: generateId(), ...form, total: form.qty * form.unitPrice }] }));
    }
    resetForm();
  };

  const deleteItem = (id) => {
    setProject(p => ({ ...p, items: p.items.filter(i => i.id !== id), receiptLines: p.receiptLines.filter(rl => rl.itemId !== id) }));
    setDeleteId(null);
  };

  const startEdit = (item) => {
    setForm({ name: item.name, gewerk: item.gewerk, sub: item.sub, qty: item.qty, unitPrice: item.unitPrice, notes: item.notes || "" });
    setEditId(item.id);
  };

  const totalSoll = project.items.reduce((s, i) => s + i.total, 0);

  const grouped = useMemo(() => {
    const g = {};
    project.items.forEach(item => {
      if (!g[item.gewerk]) g[item.gewerk] = {};
      if (!g[item.gewerk][item.sub]) g[item.gewerk][item.sub] = [];
      g[item.gewerk][item.sub].push(item);
    });
    return g;
  }, [project.items]);

  const setCategories = (fn) => setProject(p => ({ ...p, categories: typeof fn === "function" ? fn(p.categories) : fn }));

  return (
    <div className="space-y-6">
      <CategoryManager categories={project.categories} setCategories={setCategories} />

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">{editId ? "✏️ Position bearbeiten" : "➕ Neue Kalkulationsposition"}</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-2">
            <Input label="Bezeichnung" placeholder="z.B. JBL Control 25-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <Select label="Gewerk" value={form.gewerk} onChange={e => updateGewerk(e.target.value)}>
            {gewerke.map(g => <option key={g}>{g}</option>)}
          </Select>
          <Select label="Unterkategorie" value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))}>
            {(cats[form.gewerk] || []).map(s => <option key={s}>{s}</option>)}
          </Select>
          <Input label="Menge" type="number" min="1" step="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: parseInt(e.target.value) || 0 }))} />
          <Input label="Einzelpreis (€)" type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} />
          <div className="col-span-2">
            <Input label="Notizen" placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={saveItem} disabled={!form.name}>{editId ? "Speichern" : "Hinzufügen"}</Button>
            {editId && <Button variant="ghost" onClick={resetForm}>Abbrechen</Button>}
          </div>
        </div>
      </Card>

      {project.items.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <span className="text-sm text-zinc-400">{project.items.length} Positionen</span>
          <span className="text-lg font-bold text-amber-400">Soll: {formatCurrency(totalSoll)}</span>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon="📐" title="Noch keine Positionen" description="Füge oben die erste Kalkulationsposition hinzu" />
      ) : (
        Object.entries(grouped).map(([gewerk, subs]) => {
          const gewerkTotal = Object.values(subs).flat().reduce((s, i) => s + i.total, 0);
          return (
            <Card key={gewerk} className="overflow-hidden">
              <div className="px-4 py-2.5 bg-amber-500/5 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-bold text-amber-400">{gewerk}</span>
                <span className="text-xs text-zinc-400">{formatCurrency(gewerkTotal)}</span>
              </div>
              {Object.entries(subs).map(([sub, items]) => {
                const subTotal = items.reduce((s, i) => s + i.total, 0);
                return (
                  <div key={sub}>
                    <div className="px-4 py-1.5 bg-zinc-800/30 border-b border-zinc-800/50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{sub}</span>
                      <span className="text-xs text-zinc-500">{formatCurrency(subTotal)}</span>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {items.map(item => (
                        <div key={item.id} className="px-4 py-2.5 flex items-center gap-4 hover:bg-zinc-800/20 transition-colors group">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-200 font-medium truncate">{item.name}</p>
                            {item.notes && <p className="text-xs text-zinc-600 truncate">{item.notes}</p>}
                          </div>
                          <span className="text-xs text-zinc-500 w-16 text-right">{item.qty} Stk</span>
                          <span className="text-xs text-zinc-500 w-20 text-right">à {formatCurrency(item.unitPrice)}</span>
                          <span className="text-sm text-zinc-200 font-medium w-24 text-right">{formatCurrency(item.total)}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>✏️</Button>
                            {deleteId === item.id ? (
                              <ConfirmDelete message="Löschen?" onConfirm={() => deleteItem(item.id)} onCancel={() => setDeleteId(null)} />
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setDeleteId(item.id)}>🗑️</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })
      )}
    </div>
  );
}

// ─── ARTIKELTABELLE TAB ──────────────────────────────────────────────────────

function TableTab({ project, onNavigateReceipt }) {
  const [sortKey, setSortKey] = useState("gewerk");
  const [sortDir, setSortDir] = useState("asc");
  const [filterGewerk, setFilterGewerk] = useState("all");
  const [filterSub, setFilterSub] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);

  const istPerItem = useMemo(() => {
    const m = {};
    project.receiptLines.forEach(rl => { if (rl.itemId) m[rl.itemId] = (m[rl.itemId] || 0) + rl.lineTotal; });
    return m;
  }, [project.receiptLines]);

  const linesPerItem = useMemo(() => {
    const m = {};
    project.receiptLines.forEach(rl => {
      if (rl.itemId) { if (!m[rl.itemId]) m[rl.itemId] = []; m[rl.itemId].push(rl); }
    });
    return m;
  }, [project.receiptLines]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let items = project.items.map(i => ({
      ...i,
      ist: istPerItem[i.id] || 0,
      diff: i.total - (istPerItem[i.id] || 0),
      lines: linesPerItem[i.id] || [],
    }));
    if (filterGewerk !== "all") items = items.filter(i => i.gewerk === filterGewerk);
    if (filterSub !== "all") items = items.filter(i => i.sub === filterSub);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.notes?.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [project.items, istPerItem, linesPerItem, filterGewerk, filterSub, search, sortKey, sortDir]);

  const totalSoll = filtered.reduce((s, i) => s + i.total, 0);
  const totalIst = filtered.reduce((s, i) => s + i.ist, 0);
  const totalDiff = totalSoll - totalIst;

  const getReceipt = (receiptId) => project.receipts.find(r => r.id === receiptId);

  const SortHeader = ({ label, field, align = "left" }) => (
    <th className={`px-3 py-2.5 cursor-pointer hover:text-zinc-300 select-none text-${align}`} onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && <span className="text-amber-400">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );

  const gewerke = Object.keys(project.categories);
  const subsForFilter = filterGewerk !== "all" ? (project.categories[filterGewerk] || []) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="Suche" placeholder="Artikelname…" value={search} onChange={e => setSearch(e.target.value)} className="w-52" />
        <Select label="Gewerk" value={filterGewerk} onChange={e => { setFilterGewerk(e.target.value); setFilterSub("all"); }}>
          <option value="all">Alle Gewerke</option>
          {gewerke.map(g => <option key={g}>{g}</option>)}
        </Select>
        {filterGewerk !== "all" && (
          <Select label="Unterkategorie" value={filterSub} onChange={e => setFilterSub(e.target.value)}>
            <option value="all">Alle</option>
            {subsForFilter.map(s => <option key={s}>{s}</option>)}
          </Select>
        )}
        <div className="ml-auto text-sm text-zinc-400">{filtered.length} Artikel</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="Keine Artikel gefunden" description={project.items.length === 0 ? "Erstelle zuerst Positionen in der Kalkulation" : "Filter anpassen"} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/30">
                  <th className="px-3 py-2.5 w-6"></th>
                  <SortHeader label="Gewerk" field="gewerk" />
                  <SortHeader label="Unterkategorie" field="sub" />
                  <SortHeader label="Bezeichnung" field="name" />
                  <SortHeader label="Menge" field="qty" align="right" />
                  <SortHeader label="Einzelpreis" field="unitPrice" align="right" />
                  <SortHeader label="Soll" field="total" align="right" />
                  <SortHeader label="Ist" field="ist" align="right" />
                  <SortHeader label="Differenz" field="diff" align="right" />
                  <th className="px-3 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const isExpanded = expandedRow === item.id;
                  return [
                    <tr key={item.id}
                      className={`hover:bg-zinc-800/20 transition-colors cursor-pointer border-b border-zinc-800/50 ${isExpanded ? "bg-zinc-800/20" : ""}`}
                      onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                    >
                      <td className="px-3 py-2.5 text-zinc-600 text-xs">
                        {item.lines.length > 0 ? (isExpanded ? "▾" : "▸") : "·"}
                      </td>
                      <td className="px-3 py-2.5"><Badge color="amber">{item.gewerk}</Badge></td>
                      <td className="px-3 py-2.5 text-zinc-400 text-xs">{item.sub}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-zinc-200 font-medium">{item.name}</span>
                        {item.notes && <span className="text-zinc-600 text-xs ml-2">({item.notes})</span>}
                        {item.lines.length > 0 && (
                          <span className="ml-2 text-xs text-zinc-600">({item.lines.length} Beleg{item.lines.length > 1 ? "e" : ""})</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-400">{item.qty}</td>
                      <td className="px-3 py-2.5 text-right text-zinc-400">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2.5 text-right text-zinc-200 font-medium">{formatCurrency(item.total)}</td>
                      <td className="px-3 py-2.5 text-right text-amber-400">{formatCurrency(item.ist)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${item.diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {item.diff >= 0 ? "+" : ""}{formatCurrency(item.diff)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {item.ist === 0 ? <Badge color="zinc">Offen</Badge>
                          : item.ist <= item.total ? <Badge color="green">Im Budget</Badge>
                          : <Badge color="red">Über Budget</Badge>}
                      </td>
                    </tr>,
                    isExpanded && item.lines.length > 0 && (
                      <tr key={`${item.id}-lines`}>
                        <td colSpan={10} className="p-0">
                          <div className="bg-zinc-950/50 border-b border-zinc-800">
                            <div className="px-6 py-2 text-xs text-zinc-500 uppercase font-semibold tracking-wider">
                              Zugeordnete Belegpositionen
                            </div>
                            {item.lines.map(rl => {
                              const receipt = getReceipt(rl.receiptId);
                              return (
                                <div key={rl.id} className="px-6 py-2 flex items-center gap-3 hover:bg-zinc-800/20 transition-colors border-t border-zinc-800/30">
                                  <span className="text-xs text-zinc-600">↳</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm text-zinc-300">{rl.description}</span>
                                  </div>
                                  <span className="text-xs text-zinc-500">{rl.qty} × {formatCurrency(rl.unitPrice)}</span>
                                  <span className="text-sm text-zinc-200 font-medium w-24 text-right">{formatCurrency(rl.lineTotal)}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onNavigateReceipt(rl.receiptId); }}
                                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
                                  >
                                    🧾 {receipt?.supplier} · {receipt?.number}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ),
                    isExpanded && item.lines.length === 0 && (
                      <tr key={`${item.id}-empty`}>
                        <td colSpan={10} className="p-0">
                          <div className="bg-zinc-950/50 border-b border-zinc-800 px-6 py-3">
                            <span className="text-xs text-zinc-600">Noch keine Belegpositionen zugeordnet</span>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-700 bg-zinc-800/30 font-semibold text-sm">
                  <td></td>
                  <td colSpan={5} className="px-3 py-2.5 text-zinc-300">Summe</td>
                  <td className="px-3 py-2.5 text-right text-zinc-100">{formatCurrency(totalSoll)}</td>
                  <td className="px-3 py-2.5 text-right text-amber-400">{formatCurrency(totalIst)}</td>
                  <td className={`px-3 py-2.5 text-right ${totalDiff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {totalDiff >= 0 ? "+" : ""}{formatCurrency(totalDiff)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── BELEGE TAB ──────────────────────────────────────────────────────────────

function ReceiptsTab({ project, setProject, externalExpandedId, clearExternalExpanded }) {
  const [form, setForm] = useState({ supplier: "", date: new Date().toISOString().split("T")[0], number: "", totalGross: 0, notes: "" });
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [lineForm, setLineForm] = useState({ description: "", qty: 1, unitPrice: 0 });
  const [showPdfImport, setShowPdfImport] = useState(false);

  // Handle external navigation (from table/dashboard "jump to receipt")
  const effectiveExpandedId = externalExpandedId || expandedId;
  const handleToggleExpand = (id) => {
    if (externalExpandedId) clearExternalExpanded?.();
    setExpandedId(effectiveExpandedId === id ? null : id);
  };

  const resetForm = () => { setForm({ supplier: "", date: new Date().toISOString().split("T")[0], number: "", totalGross: 0, notes: "" }); setEditId(null); };

  const saveReceipt = () => {
    if (!form.supplier) return;
    if (editId) {
      setProject(p => ({ ...p, receipts: p.receipts.map(r => r.id === editId ? { ...r, ...form } : r) }));
    } else {
      setProject(p => ({ ...p, receipts: [...p.receipts, { id: generateId(), ...form }] }));
    }
    resetForm();
  };

  const deleteReceipt = (id) => {
    setProject(p => ({ ...p, receipts: p.receipts.filter(r => r.id !== id), receiptLines: p.receiptLines.filter(rl => rl.receiptId !== id) }));
    setDeleteId(null);
  };

  const addLine = (receiptId) => {
    if (!lineForm.description) return;
    const line = { id: generateId(), receiptId, ...lineForm, lineTotal: lineForm.qty * lineForm.unitPrice, itemId: null };
    setProject(p => ({ ...p, receiptLines: [...p.receiptLines, line] }));
    setLineForm({ description: "", qty: 1, unitPrice: 0 });
  };

  const deleteLine = (lineId) => {
    setProject(p => ({ ...p, receiptLines: p.receiptLines.filter(rl => rl.id !== lineId) }));
  };

  const addVatToLine = (lineId) => {
    setProject(p => ({
      ...p,
      receiptLines: p.receiptLines.map(rl => {
        if (rl.id !== lineId) return rl;
        const newUnitPrice = Math.round(rl.unitPrice * 1.19 * 100) / 100;
        return { ...rl, unitPrice: newUnitPrice, lineTotal: Math.round(rl.qty * newUnitPrice * 100) / 100 };
      }),
    }));
  };

  const addVatToAllLines = (receiptId) => {
    setProject(p => ({
      ...p,
      receiptLines: p.receiptLines.map(rl => {
        if (rl.receiptId !== receiptId) return rl;
        const newUnitPrice = Math.round(rl.unitPrice * 1.19 * 100) / 100;
        return { ...rl, unitPrice: newUnitPrice, lineTotal: Math.round(rl.qty * newUnitPrice * 100) / 100 };
      }),
    }));
  };

  const handlePdfImport = (receipt, lines) => {
    setProject(p => ({
      ...p,
      receipts: [...p.receipts, receipt],
      receiptLines: [...p.receiptLines, ...lines],
    }));
    if (externalExpandedId) clearExternalExpanded?.();
    setExpandedId(receipt.id);
  };

  return (
    <div className="space-y-6">
      {showPdfImport && (
        <PdfImportModal onClose={() => setShowPdfImport(false)} onImport={handlePdfImport} />
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <Card className="flex-1 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">{editId ? "✏️ Beleg bearbeiten" : "➕ Neuer Beleg"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2"><Input label="Lieferant" placeholder="z.B. Thomann, Amazon" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            <Input label="Datum" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <Input label="Belegnummer" placeholder="RE-12345" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
            <Input label="Betrag brutto (€)" type="number" min="0" step="0.01" value={form.totalGross} onChange={e => setForm(f => ({ ...f, totalGross: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={saveReceipt} disabled={!form.supplier}>{editId ? "Speichern" : "Beleg anlegen"}</Button>
            {editId && <Button variant="ghost" onClick={resetForm}>Abbrechen</Button>}
          </div>
        </Card>
      </div>

      {/* PDF Import Button */}
      <div
        onClick={() => setShowPdfImport(true)}
        className="border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 rounded-lg px-6 py-4 flex items-center gap-4 cursor-pointer transition-colors group bg-purple-500/5 hover:bg-purple-500/10"
      >
        <div className="w-12 h-12 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📄</div>
        <div>
          <p className="text-sm font-semibold text-purple-300">PDF Rechnung importieren</p>
          <p className="text-xs text-zinc-500">Rechnung als PDF hochladen – Positionen werden automatisch per KI erkannt</p>
        </div>
        <Badge color="purple" className="ml-auto">NEU</Badge>
      </div>

      {project.receipts.length === 0 ? (
        <EmptyState icon="🧾" title="Noch keine Belege" description="Lege oben einen Beleg an oder importiere eine PDF-Rechnung" />
      ) : (
        project.receipts.map(receipt => {
          const lines = project.receiptLines.filter(rl => rl.receiptId === receipt.id);
          const linesTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
          const assignedCount = lines.filter(l => l.itemId).length;
          const expanded = effectiveExpandedId === receipt.id;
          return (
            <Card key={receipt.id} className="overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                onClick={() => handleToggleExpand(receipt.id)}>
                <span className="text-lg">{expanded ? "▾" : "▸"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-zinc-200 font-medium">{receipt.supplier}</p>
                    {receipt.notes === "PDF-Import" && <Badge color="purple">PDF</Badge>}
                    {receipt.pdfBase64 && !receipt.notes?.includes("PDF-Import") && <Badge color="blue">📎 PDF</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500">{receipt.number} · {receipt.date}</p>
                </div>
                <Badge color={lines.length === 0 ? "red" : assignedCount === lines.length ? "green" : "amber"}>
                  {lines.length === 0 ? "Keine Pos." : `${assignedCount}/${lines.length} zugeordnet`}
                </Badge>
                <span className="text-sm font-medium text-zinc-200 w-24 text-right">{formatCurrency(receipt.totalGross)}</span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setForm({ supplier: receipt.supplier, date: receipt.date, number: receipt.number, totalGross: receipt.totalGross, notes: receipt.notes || "" });
                    setEditId(receipt.id);
                  }}>✏️</Button>
                  {deleteId === receipt.id ? (
                    <ConfirmDelete message="Löschen?" onConfirm={() => deleteReceipt(receipt.id)} onCancel={() => setDeleteId(null)} />
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(receipt.id)}>🗑️</Button>
                  )}
                </div>
              </div>
              {expanded && (
                <div className="border-t border-zinc-800 px-4 py-4 space-y-3 bg-zinc-950/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Belegpositionen</p>
                    {receipt.pdfBase64 && (
                      <button onClick={() => downloadReceiptPdf(receipt)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50 transition-colors">
                        📄 PDF anzeigen ({receipt.pdfFileName || "Rechnung.pdf"})
                      </button>
                    )}
                  </div>
                  {lines.length > 0 && (
                    <div className="space-y-1">
                      {lines.map(line => {
                        const assignedItem = project.items.find(i => i.id === line.itemId);
                        return (
                          <div key={line.id} className="flex items-center gap-3 px-3 py-2 bg-zinc-800/40 rounded-md">
                            <div className="flex-1 min-w-0"><span className="text-sm text-zinc-300">{line.description}</span></div>
                            <span className="text-xs text-zinc-500">{line.qty}×{formatCurrency(line.unitPrice)}</span>
                            <span className="text-sm text-zinc-200 font-medium w-20 text-right">{formatCurrency(line.lineTotal)}</span>
                            <button onClick={() => addVatToLine(line.id)} title="Einzelpreis +19% MwSt"
                              className="px-1.5 py-0.5 text-xs rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors whitespace-nowrap">
                              +19%
                            </button>
                            {assignedItem ? <Badge color="green">{assignedItem.gewerk}: {assignedItem.name}</Badge> : <Badge color="red">Nicht zugeordnet</Badge>}
                            <Button variant="ghost" size="sm" onClick={() => deleteLine(line.id)}>✕</Button>
                          </div>
                        );
                      })}
                      {Math.abs(linesTotal - receipt.totalGross) > 0.01 && (
                        <div className="flex items-center gap-3 px-3">
                          <p className="text-xs text-amber-400">⚠️ Differenz: {formatCurrency(receipt.totalGross - linesTotal)}</p>
                          <button onClick={() => addVatToAllLines(receipt.id)}
                            className="px-2 py-1 text-xs rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors whitespace-nowrap">
                            Alle Positionen +19% MwSt
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-end gap-2 pt-2">
                    <Input label="Beschreibung" placeholder="Positionsbezeichnung" value={lineForm.description} onChange={e => setLineForm(f => ({ ...f, description: e.target.value }))} />
                    <Input label="Menge" type="number" min="1" step="1" value={lineForm.qty} className="w-20" onChange={e => setLineForm(f => ({ ...f, qty: parseInt(e.target.value) || 0 }))} />
                    <Input label="Einzelpreis" type="number" min="0" step="0.01" value={lineForm.unitPrice} className="w-28" onChange={e => setLineForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} />
                    <Button size="md" onClick={() => addLine(receipt.id)} disabled={!lineForm.description}>+ Position</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

// ─── ZUORDNUNG TAB ───────────────────────────────────────────────────────────

function AssignTab({ project, setProject }) {
  const unassigned = project.receiptLines.filter(rl => !rl.itemId);
  const assigned = project.receiptLines.filter(rl => rl.itemId);

  const assignLine = (lineId, itemId) => {
    setProject(p => ({ ...p, receiptLines: p.receiptLines.map(rl => rl.id === lineId ? { ...rl, itemId: itemId || null } : rl) }));
  };

  const getReceipt = (receiptId) => project.receipts.find(r => r.id === receiptId);

  const itemsByGewerk = useMemo(() => {
    const g = {};
    project.items.forEach(i => {
      if (!g[i.gewerk]) g[i.gewerk] = [];
      g[i.gewerk].push(i);
    });
    return g;
  }, [project.items]);

  const renderLine = (line) => {
    const receipt = getReceipt(line.receiptId);
    return (
      <div key={line.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200">{line.description}</p>
          <p className="text-xs text-zinc-600">{receipt?.supplier} · {receipt?.number} · {formatCurrency(line.lineTotal)}</p>
        </div>
        <span className="text-sm font-medium text-zinc-300 w-24 text-right">{formatCurrency(line.lineTotal)}</span>
        <select
          className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm text-zinc-200 w-64 focus:outline-none focus:border-amber-500/60"
          value={line.itemId || ""} onChange={e => assignLine(line.id, e.target.value)}>
          <option value="">— Nicht zugeordnet —</option>
          {Object.entries(itemsByGewerk).map(([gewerk, items]) => (
            <optgroup key={gewerk} label={gewerk}>
              {items.map(item => <option key={item.id} value={item.id}>{item.sub}: {item.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
    );
  };

  const totalLines = project.receiptLines.length;

  return (
    <div className="space-y-6">
      {totalLines === 0 ? (
        <EmptyState icon="🔗" title="Keine Belegpositionen" description="Erstelle zuerst Belege und füge dort Positionen hinzu" />
      ) : (
        <>
          <div className="flex items-center gap-4 px-4 py-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <div className="flex-1"><ProgressBar value={assigned.length} max={totalLines} /></div>
            <span className="text-sm text-zinc-400">{assigned.length}/{totalLines} zugeordnet</span>
          </div>
          {unassigned.length > 0 && (
            <Card>
              <div className="px-4 py-2.5 bg-red-950/20 border-b border-zinc-800 flex items-center gap-2">
                <Badge color="red">{unassigned.length}</Badge>
                <span className="text-sm font-semibold text-zinc-300">Nicht zugeordnet</span>
              </div>
              <div className="divide-y divide-zinc-800/70">{unassigned.map(renderLine)}</div>
            </Card>
          )}
          {assigned.length > 0 && (
            <Card>
              <div className="px-4 py-2.5 bg-emerald-950/20 border-b border-zinc-800 flex items-center gap-2">
                <Badge color="green">{assigned.length}</Badge>
                <span className="text-sm font-semibold text-zinc-300">Zugeordnet</span>
              </div>
              <div className="divide-y divide-zinc-800/70">{assigned.map(renderLine)}</div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── DASHBOARD TAB ───────────────────────────────────────────────────────────

function DashboardTab({ project, onNavigateReceipt }) {
  const [expandedGewerk, setExpandedGewerk] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);

  const totalSoll = project.items.reduce((s, i) => s + i.total, 0);
  const istPerItem = useMemo(() => {
    const m = {};
    project.receiptLines.forEach(rl => { if (rl.itemId) m[rl.itemId] = (m[rl.itemId] || 0) + rl.lineTotal; });
    return m;
  }, [project.receiptLines]);
  const totalIst = Object.values(istPerItem).reduce((s, v) => s + v, 0);
  const unassignedTotal = project.receiptLines.filter(rl => !rl.itemId).reduce((s, rl) => s + rl.lineTotal, 0);
  const diff = totalSoll - totalIst;

  // Gewerk → Sub → Items hierarchy
  const hierarchy = useMemo(() => {
    const gewerke = [...new Set(project.items.map(i => i.gewerk))];
    return gewerke.map(g => {
      const gItems = project.items.filter(i => i.gewerk === g);
      const subs = [...new Set(gItems.map(i => i.sub))];
      const subDetails = subs.map(s => {
        const sItems = gItems.filter(i => i.sub === s);
        const soll = sItems.reduce((acc, i) => acc + i.total, 0);
        const ist = sItems.reduce((acc, i) => acc + (istPerItem[i.id] || 0), 0);
        return {
          sub: s, soll, ist, diff: soll - ist,
          items: sItems.map(i => ({
            ...i,
            ist: istPerItem[i.id] || 0,
            diffVal: i.total - (istPerItem[i.id] || 0),
            lines: project.receiptLines.filter(rl => rl.itemId === i.id),
          })),
        };
      });
      const soll = gItems.reduce((acc, i) => acc + i.total, 0);
      const ist = gItems.reduce((acc, i) => acc + (istPerItem[i.id] || 0), 0);
      return { gewerk: g, soll, ist, diff: soll - ist, subs: subDetails };
    });
  }, [project.items, project.receiptLines, istPerItem]);

  const getReceipt = (receiptId) => project.receipts.find(r => r.id === receiptId);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Soll (Kalkulation)", value: formatCurrency(totalSoll), color: "text-zinc-100" },
          { label: "Ist (Belege)", value: formatCurrency(totalIst), color: "text-amber-400" },
          { label: "Differenz", value: formatCurrency(diff), color: diff >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Nicht zugeordnet", value: formatCurrency(unassignedTotal), color: unassignedTotal > 0 ? "text-red-400" : "text-zinc-500" },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Total Progress */}
      {totalSoll > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Gesamtbudget-Auslastung</span>
            <span className="text-sm font-medium text-zinc-300">{formatCurrency(totalIst)} / {formatCurrency(totalSoll)}</span>
          </div>
          <ProgressBar value={totalIst} max={totalSoll} />
        </Card>
      )}

      {/* Gewerk → Sub → Item → ReceiptLines Drill-Down */}
      {hierarchy.map(g => (
        <Card key={g.gewerk} className="overflow-hidden">
          {/* Gewerk Header */}
          <div
            className="px-4 py-3 bg-amber-500/5 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 transition-colors"
            onClick={() => setExpandedGewerk(expandedGewerk === g.gewerk ? null : g.gewerk)}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm">{expandedGewerk === g.gewerk ? "▾" : "▸"}</span>
              <span className="text-sm font-bold text-amber-400">{g.gewerk}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32"><ProgressBar value={g.ist} max={g.soll} showLabel={false} /></div>
              <div className="flex gap-3 text-xs">
                <span className="text-zinc-500">Soll: {formatCurrency(g.soll)}</span>
                <span className="text-amber-400">Ist: {formatCurrency(g.ist)}</span>
                <span className={g.diff >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {g.diff >= 0 ? "+" : ""}{formatCurrency(g.diff)}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Categories */}
          {expandedGewerk === g.gewerk && g.subs.map(sub => (
            <div key={sub.sub}>
              <div className="px-4 py-2 bg-zinc-800/30 border-b border-zinc-800/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-6">{sub.sub}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-zinc-500">{formatCurrency(sub.soll)}</span>
                  <span className="text-amber-400">{formatCurrency(sub.ist)}</span>
                  <span className={sub.diff >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {sub.diff >= 0 ? "+" : ""}{formatCurrency(sub.diff)}
                  </span>
                </div>
              </div>

              {/* Items in this sub */}
              {sub.items.map(item => {
                const isExpanded = expandedItem === item.id;
                return (
                  <div key={item.id}>
                    <div
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-800/20 transition-colors cursor-pointer border-b border-zinc-800/30"
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    >
                      <span className="text-xs text-zinc-600 pl-8">{isExpanded ? "▾" : "▸"}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-zinc-200 font-medium">{item.name}</span>
                        {item.notes && <span className="text-xs text-zinc-600 ml-2">({item.notes})</span>}
                      </div>
                      <span className="text-xs text-zinc-500">{item.qty} Stk</span>
                      <span className="text-xs text-zinc-400 w-20 text-right">{formatCurrency(item.total)}</span>
                      <span className="text-xs text-amber-400 w-20 text-right">{formatCurrency(item.ist)}</span>
                      <span className={`text-xs font-medium w-20 text-right ${item.diffVal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {item.diffVal >= 0 ? "+" : ""}{formatCurrency(item.diffVal)}
                      </span>
                      {item.lines.length > 0 ? (
                        <Badge color="green">{item.lines.length} Beleg{item.lines.length > 1 ? "e" : ""}</Badge>
                      ) : (
                        <Badge color="zinc">Offen</Badge>
                      )}
                    </div>

                    {/* Expanded: Receipt Lines */}
                    {isExpanded && item.lines.length > 0 && (
                      <div className="bg-zinc-950/40 border-b border-zinc-800/30">
                        {item.lines.map(rl => {
                          const receipt = getReceipt(rl.receiptId);
                          return (
                            <div key={rl.id} className="px-4 py-2 flex items-center gap-3 pl-16 hover:bg-zinc-800/20 transition-colors">
                              <span className="text-xs text-zinc-600">↳</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-zinc-400">{rl.description}</span>
                              </div>
                              <span className="text-xs text-zinc-500">{rl.qty}×{formatCurrency(rl.unitPrice)}</span>
                              <span className="text-xs text-zinc-300 font-medium w-20 text-right">{formatCurrency(rl.lineTotal)}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); onNavigateReceipt(rl.receiptId); }}
                                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
                                title={`Beleg: ${receipt?.supplier} ${receipt?.number}`}
                              >
                                🧾 {receipt?.supplier}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isExpanded && item.lines.length === 0 && (
                      <div className="bg-zinc-950/40 border-b border-zinc-800/30 px-4 py-3 pl-16">
                        <span className="text-xs text-zinc-600">Noch keine Belegpositionen zugeordnet</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      ))}

      {project.items.length === 0 && <EmptyState icon="📊" title="Noch keine Daten" description="Starte mit der Kalkulation" />}
    </div>
  );
}

// ─── PROJECT SAVE / LOAD / EXPORT ────────────────────────────────────────────

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function saveProject(project) {
  const saveData = {
    _version: 2,
    _type: "av-kostentracker-project",
    _savedAt: new Date().toISOString(),
    project: project,
  };
  const json = JSON.stringify(saveData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `${project.name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "").replace(/\s+/g, "_")}.avproj.json`);
}

function exportCSV(project) {
  const istPerItem = {};
  project.receiptLines.forEach(rl => { if (rl.itemId) istPerItem[rl.itemId] = (istPerItem[rl.itemId] || 0) + rl.lineTotal; });
  let csv = "Gewerk;Unterkategorie;Bezeichnung;Menge;Einzelpreis;Soll;Ist;Differenz\n";
  project.items.forEach(item => {
    const ist = istPerItem[item.id] || 0;
    csv += `${item.gewerk};${item.sub};${item.name};${item.qty};${item.unitPrice.toFixed(2)};${item.total.toFixed(2)};${ist.toFixed(2)};${(item.total - ist).toFixed(2)}\n`;
  });
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${project.name.replace(/\s/g, "_")}_Kostentracking.csv`);
}

function downloadReceiptPdf(receipt) {
  if (!receipt.pdfBase64) return;
  const binary = atob(receipt.pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  downloadBlob(blob, receipt.pdfFileName || `${receipt.supplier}_${receipt.number}.pdf`);
}

function ProjectToolbar({ project, setProject }) {
  const loadInputRef = useRef(null);
  const pdfAttachRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleLoad = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data._type !== "av-kostentracker-project" || !data.project) {
        alert("Ungültige Projektdatei.");
        return;
      }
      setProject(data.project);
    } catch (err) {
      alert(`Fehler beim Laden: ${err.message}`);
    }
    e.target.value = "";
  };

  const handleAttachPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show a selection of which receipt to attach to
    const receiptsWithoutPdf = project.receipts.filter(r => !r.pdfBase64);
    if (receiptsWithoutPdf.length === 0) {
      alert("Alle Belege haben bereits eine PDF angehängt.");
      return;
    }
    const names = receiptsWithoutPdf.map((r, i) => `${i + 1}. ${r.supplier} (${r.number})`).join("\n");
    const choice = prompt(`An welchen Beleg anhängen?\n\n${names}\n\nNummer eingeben:`);
    if (!choice) return;
    const idx = parseInt(choice) - 1;
    if (idx < 0 || idx >= receiptsWithoutPdf.length) return;
    const receiptId = receiptsWithoutPdf[idx].id;
    const base64 = await fileToBase64(file);
    setProject(p => ({
      ...p,
      receipts: p.receipts.map(r =>
        r.id === receiptId ? { ...r, pdfBase64: base64, pdfFileName: file.name } : r
      ),
    }));
    e.target.value = "";
  };

  return (
    <div className="relative flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => saveProject(project)}>💾 Speichern</Button>
      <Button variant="secondary" size="sm" onClick={() => loadInputRef.current?.click()}>📂 Laden</Button>
      <input ref={loadInputRef} type="file" accept=".json,.avproj.json" className="hidden" onChange={handleLoad} />
      <div className="relative">
        <Button variant="ghost" size="sm" onClick={() => setShowMenu(!showMenu)}>⋯</Button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-50 w-52" onMouseLeave={() => setShowMenu(false)}>
            <button onClick={() => { exportCSV(project); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
              📥 CSV exportieren
            </button>
            <button onClick={() => { pdfAttachRef.current?.click(); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
              📎 PDF an Beleg anhängen
            </button>
            <hr className="border-zinc-700 my-1" />
            <button onClick={() => { if (confirm("Neues Projekt starten? Ungespeicherte Daten gehen verloren.")) setProject({ ...INITIAL_PROJECT, id: generateId() }); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
              🆕 Neues Projekt
            </button>
            <button onClick={() => { setProject(DEMO_PROJECT); setShowMenu(false); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
              🎮 Demo laden
            </button>
          </div>
        )}
      </div>
      <input ref={pdfAttachRef} type="file" accept=".pdf" className="hidden" onChange={handleAttachPdf} />
    </div>
  );
}

// <-- NEU: Lokales Login-Modal (blockierend, Default admin / !Lob12preis!) -->
const DEFAULT_USER = { username: "admin", password: "!Lob12preis!" };

function LoginModal({ onLogin }) {
  const [username, setUsername] = useState(DEFAULT_USER.username);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    if (!username.trim()) return setError("Benutzername erforderlich");
    if (!password) return setError("Passwort erforderlich");
    if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
      onLogin({ username });
    } else {
      setError("Ungültige Anmeldedaten");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Anmelden</h2>
        <p className="text-xs text-zinc-500 mb-4">Bitte mit Benutzername und Passwort anmelden.</p>
        <div className="space-y-3">
          <Input label="Benutzername" value={username} onChange={e => setUsername(e.target.value)} />
          <Input label="Passwort" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-xs text-red-400">{error}</div>}
          <div className="flex items-center gap-2 mt-2">
            <Button onClick={submit}>Anmelden</Button>
            <Button variant="ghost" onClick={() => { setPassword(""); setError(""); }}>Zurücksetzen</Button>
          </div>
          <div className="text-xs text-zinc-500 mt-2">Standard: <span className="font-medium">admin</span> / <span className="font-medium">!Lob12preis!</span></div>
        </div>
      </div>
    </div>
  );
}
// <-- Ende NEU -->

// ─── DEMO DATA ───────────────────────────────────────────────────────────────

const DEMO_PROJECT = {
  id: generateId(),
  name: "Demo: Festinstallation Konferenzraum",
  categories: DEFAULT_CATEGORIES,
  items: [
    { id: "d1", name: "JBL Control 25-1", gewerk: "Audio", sub: "Lautsprecher", qty: 8, unitPrice: 189, total: 1512, notes: "Deckenmontage" },
    { id: "d2", name: "Crown CDi 1000", gewerk: "Audio", sub: "Verstärker", qty: 2, unitPrice: 890, total: 1780, notes: "" },
    { id: "d3", name: "Sommer SC-Club 225", gewerk: "Audio", sub: "Kabel & Stecker", qty: 200, unitPrice: 1.20, total: 240, notes: "Meterware" },
    { id: "d4", name: "Neutrik NL4FX", gewerk: "Audio", sub: "Kabel & Stecker", qty: 16, unitPrice: 4.50, total: 72, notes: "Speakon" },
    { id: "d5", name: "BSS BLU-50", gewerk: "Audio", sub: "DSP/Controller", qty: 1, unitPrice: 1250, total: 1250, notes: "" },
    { id: "d6", name: "K&M 24471", gewerk: "Audio", sub: "Montage", qty: 8, unitPrice: 35, total: 280, notes: "Wandhalter" },
    { id: "d7", name: "Samsung QB65R", gewerk: "Video", sub: "Displays", qty: 2, unitPrice: 1450, total: 2900, notes: "65 Zoll" },
    { id: "d8", name: "HDMI 2.0 Kabel 10m", gewerk: "Video", sub: "Kabel & Stecker", qty: 4, unitPrice: 28, total: 112, notes: "" },
    { id: "d9", name: "Cameo ZENIT W600", gewerk: "Licht", sub: "Hardware", qty: 4, unitPrice: 620, total: 2480, notes: "LED Wash" },
    { id: "d10", name: "DMX Kabel 10m", gewerk: "Licht", sub: "Kabel & Stecker", qty: 6, unitPrice: 12, total: 72, notes: "" },
  ],
  receipts: [
    { id: "r1", supplier: "Thomann", date: "2026-02-15", number: "TH-2026-44821", totalGross: 3572, notes: "" },
    { id: "r2", supplier: "Kabelscheune", date: "2026-02-18", number: "KS-10234", totalGross: 316.50, notes: "" },
    { id: "r3", supplier: "Samsung Direct", date: "2026-02-20", number: "SD-88102", totalGross: 2788, notes: "" },
  ],
  receiptLines: [
    { id: "rl1", receiptId: "r1", description: "JBL Control 25-1 (8 Stk)", qty: 8, unitPrice: 185, lineTotal: 1480, itemId: "d1" },
    { id: "rl2", receiptId: "r1", description: "Crown CDi 1000 (2 Stk)", qty: 2, unitPrice: 859, lineTotal: 1718, itemId: "d2" },
    { id: "rl3", receiptId: "r1", description: "BSS BLU-50", qty: 1, unitPrice: 1199, lineTotal: 1199, itemId: "d5" },
    { id: "rl4", receiptId: "r2", description: "SC-Club 225 (200m)", qty: 200, unitPrice: 1.15, lineTotal: 230, itemId: "d3" },
    { id: "rl5", receiptId: "r2", description: "Neutrik NL4FX (16 Stk)", qty: 16, unitPrice: 4.20, lineTotal: 67.20, itemId: "d4" },
    { id: "rl6", receiptId: "r2", description: "Versandkosten", qty: 1, unitPrice: 19.30, lineTotal: 19.30, itemId: null },
    { id: "rl7", receiptId: "r3", description: "Samsung QB65R (2 Stk)", qty: 2, unitPrice: 1394, lineTotal: 2788, itemId: "d7" },
  ],
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function CostTracker() {
  const [project, setProject] = useState(INITIAL_PROJECT);
  const [activeTab, setActiveTab] = useState("calc");
  const [editingName, setEditingName] = useState(false);
  const [receiptExpandedId, setReceiptExpandedId] = useState(null);

  const unassignedCount = project.receiptLines.filter(rl => !rl.itemId).length;

  const navigateToReceipt = useCallback((receiptId) => {
    setReceiptExpandedId(receiptId);
    setActiveTab("receipts");
  }, []);

  // <-- NEU: Auth state & handlers -->
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("av_user") || "null");
    } catch {
      return null;
    }
  });

  const handleLogin = (u) => {
    setUser(u);
    try { localStorage.setItem("av_user", JSON.stringify(u)); } catch {}
  };

  const handleLogout = () => {
    setUser(null);
    try { localStorage.removeItem("av_user"); } catch {}
  };
  // <-- Ende NEU -->

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />

      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-amber-500 flex items-center justify-center text-zinc-950 font-bold text-sm">AV</div>
            {editingName ? (
              <input autoFocus className="bg-transparent border-b border-amber-500 text-lg font-semibold text-zinc-100 focus:outline-none"
                value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))}
                onBlur={() => setEditingName(false)} onKeyDown={e => e.key === "Enter" && setEditingName(false)} />
            ) : (
              <h1 className="text-lg font-semibold text-zinc-100 cursor-pointer hover:text-amber-400 transition-colors"
                onClick={() => setEditingName(true)} title="Klicken zum Bearbeiten">{project.name}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ProjectToolbar project={project} setProject={setProject} />
            {/* NEU: User-Anzeige / Logout */}
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-zinc-300">👤 {user.username}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>Abmelden</Button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors relative ${activeTab === tab.id ? "text-amber-400 bg-zinc-900/50" : "text-zinc-500 hover:text-zinc-300"}`}>
                <span className="mr-1.5">{tab.icon}</span>{tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />}
                {tab.id === "assign" && unassignedCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-red-500 text-white rounded-full">{unassignedCount}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "calc" && <CalcTab project={project} setProject={setProject} />}
        {activeTab === "table" && <TableTab project={project} onNavigateReceipt={navigateToReceipt} />}
        {activeTab === "receipts" && <ReceiptsTab project={project} setProject={setProject} externalExpandedId={receiptExpandedId} clearExternalExpanded={() => setReceiptExpandedId(null)} />}
        {activeTab === "assign" && <AssignTab project={project} setProject={setProject} />}
        {activeTab === "dashboard" && <DashboardTab project={project} onNavigateReceipt={navigateToReceipt} />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-zinc-700">
          AV Kostentracker · {project.receipts.filter(r => r.pdfBase64).length} PDFs angehängt · 💾 Speichern sichert alles inkl. PDFs als .avproj.json
        </p>
      </footer>

      {/* NEU: Login-Overlay, erscheint wenn kein eingeloggter User */}
      {!user && <LoginModal onLogin={handleLogin} />}
    </div>
  );
}
