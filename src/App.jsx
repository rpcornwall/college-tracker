import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const SPREADSHEET_ID = "1y9sLLigViMNRYCX_7TIA0_WiOsYjF6DB8S0Fh2ywr_M";
const API_KEY        = "AIzaSyBTvRvSty6KMtj2kT8EIV8j826iQlTJsF0";
const CLIENT_ID      = "120235897665-brejdqs5gbh3stinh1ujcet6ttjagpe9.apps.googleusercontent.com";
const SCOPES         = "https://www.googleapis.com/auth/spreadsheets";
const DISCOVERY_DOC  = "https://sheets.googleapis.com/$discovery/rest?version=v4";

const SHEET_NAMES = { schools:"Schools", activities:"Activities", scholarships:"Scholarships", contacts:"Contacts" };

const DIV_COLORS = {
  "D-I":   { bg:"#4a6fa5", light:"#eef2f9" },
  "D-II":  { bg:"#5a9175", light:"#eef6f1" },
  "D-III": { bg:"#c17b3a", light:"#fdf3e8" },
  "NAIA":  { bg:"#9b6bb5", light:"#f5eeff" },
};
const STATUS_COLORS = {
  "Researching":"#94a3b8","Interested":"#60a5fa","Contacted Coach":"#f59e0b",
  "Visited":"#a78bfa","Applied":"#38bdf8","Accepted":"#4ade80",
  "Declined":"#f87171","Committed":"#ec4899",
};
const STATUSES       = ["Researching","Interested","Contacted Coach","Visited","Applied","Accepted","Declined","Committed"];
const DIVISIONS      = ["D-I","D-II","D-III","NAIA"];
const AFFILIATIONS   = ["Catholic – Jesuit","Catholic – Benedictine","Catholic – Dominican","Catholic – Franciscan","Catholic – Holy Cross","Catholic – Unaffiliated","Non-Catholic Christian","Non-sectarian","Other"];
const ACTIVITY_TYPES = ["Recruiting Questionnaire Submitted","Introductory Email Sent","Coach Email Received","Phone / Video Call","Coach Texted / DM'd","Unofficial Campus Visit","Official Campus Visit","Volleyball Camp Attended","Showcase / Tournament","Highlight Video Sent","Coach Watched Me Play","Verbal Offer Received","Other"];
const SCHOL_TYPES    = ["Athletic","Academic / Merit","Need-Based","Nursing-Specific","Catholic / Faith-Based","National / Outside","Other"];
const SCHOL_STATUSES = ["Researching","Will Apply","Applied","Awarded","Declined","Not Eligible"];
const COACH_TITLES   = ["Head Coach","Associate Head Coach","Assistant Coach","Recruiting Coordinator","Volunteer Coach","Other"];

const PRELOADED_SCHOOLS = [
  { name:"Bellarmine University", location:"Louisville, KY", religiousAffiliation:"Catholic – Unaffiliated", campusSetting:"Suburban", enrollmentSize:"~2,350", division:"D-I", conference:"ASUN", acceptRate:"94%", facultyRatio:"13:1", usNewsRank:"#202 National", nursingRank:"Lansing School of Nursing; 142 BSN grads/yr", appDeadline:"", appStatus:"Researching", stickerPrice:"~$43,000/yr", netPrice:"~$24,432/yr", starred:"true", notes:"Norton Scholars up to $45K. Hospital-specific scholarships available. Best affordability of all D-I options." },
  { name:"Catholic Univ. of America", location:"Washington, D.C.", religiousAffiliation:"Catholic – Unaffiliated", campusSetting:"Urban", enrollmentSize:"~3,180", division:"D-III", conference:"Landmark", acceptRate:"84%", facultyRatio:"11:1", usNewsRank:"#169 National; #75 Best Value", nursingRank:"#28 Undergrad Nursing Nationally", appDeadline:"", appStatus:"Researching", stickerPrice:"~$60,000/yr", netPrice:"~$33,417/yr", starred:"true", notes:"Highest nursing ranking. Own Metro stop. Only pontifically chartered Catholic university in the US." },
  { name:"Marymount University", location:"Arlington, VA", religiousAffiliation:"Catholic – Unaffiliated", campusSetting:"Suburban", enrollmentSize:"~2,216", division:"D-III", conference:"Atlantic East", acceptRate:"81%", facultyRatio:"14:1", usNewsRank:"Carnegie Research 2025", nursingRank:"BSN flagship program; 148 full-time faculty", appDeadline:"", appStatus:"Researching", stickerPrice:"~$41,000/yr", netPrice:"~$28,147/yr", starred:"false", notes:"Most affordable Mid-Atlantic Catholic option. D.C. suburb. 98% receive some aid." },
  { name:"Loyola Univ. New Orleans", location:"New Orleans, LA", religiousAffiliation:"Catholic – Jesuit", campusSetting:"Urban", enrollmentSize:"~3,032", division:"D-III", conference:"SCAC", acceptRate:"Open", facultyRatio:"13:1", usNewsRank:"#222 National", nursingRank:"#4 Catholic Nursing School in South", appDeadline:"", appStatus:"Researching", stickerPrice:"~$48,000/yr", netPrice:"~$20,712/yr", starred:"false", notes:"Best net price (~$20,712/yr). Avg institutional aid ~$41,698. 99% receive aid." },
  { name:"Ave Maria University", location:"Ave Maria, FL", religiousAffiliation:"Catholic – Unaffiliated", campusSetting:"Rural", enrollmentSize:"~1,326", division:"NAIA", conference:"GAA", acceptRate:"45%", facultyRatio:"12:1", usNewsRank:"#175 National Liberal Arts", nursingRank:"Top major; state-of-the-art sim lab", appDeadline:"", appStatus:"Researching", stickerPrice:"~$28,815/yr", netPrice:"~$21,131/yr", starred:"false", notes:"100% of students receive grant/scholarship aid. NAIA athletic scholarships available." },
];

// ─── UTILITIES ───────────────────────────────────────────────────────────────
const uid     = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
const today   = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—";
const daysUntil = d => { if (!d) return null; return Math.ceil((new Date(d + "T12:00:00") - new Date()) / 86400000); };

// ─── GAPI LAYER ──────────────────────────────────────────────────────────────
let gapiReady = false;
let tokenClient = null;
let accessToken = null;

const loadGapi = () => new Promise(resolve => {
  if (window.gapi) { resolve(); return; }
  const s = document.createElement("script");
  s.src = "https://apis.google.com/js/api.js";
  s.onload = () => window.gapi.load("client", async () => {
    await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: [DISCOVERY_DOC] });
    gapiReady = true;
    resolve();
  });
  document.head.appendChild(s);
});

const loadGis = () => new Promise(resolve => {
  if (window.google?.accounts) { resolve(); return; }
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client";
  s.onload = () => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: SCOPES,
      callback: r => {
        if (r.access_token) {
          accessToken = r.access_token;
          window.gapi.client.setToken({ access_token: r.access_token });
        }
      },
    });
    resolve();
  };
  document.head.appendChild(s);
});

const requestToken = () => new Promise((resolve, reject) => {
  if (!tokenClient) { reject("GIS not loaded"); return; }
  tokenClient.callback = r => {
    if (r.error) { reject(r.error); return; }
    if (r.access_token) {
      accessToken = r.access_token;
      window.gapi.client.setToken({ access_token: r.access_token });
    }
    resolve(r);
  };
  tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
});

const sheetsRead = async sheetName => {
  const r = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: sheetName });
  const rows = r.result.values || [];
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => { const o = {}; headers.forEach((h, i) => o[h] = row[i] || ""); return o; });
};

const sheetsAppend = async (sheetName, record) => {
  const r = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!1:1` });
  const headers = (r.result.values || [[]])[0];
  const row = headers.map(h => record[h] !== undefined ? record[h] : "");
  await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID, range: sheetName, valueInputOption: "RAW",
    resource: { values: [row] },
  });
};

const sheetsUpdate = async (sheetName, id, updates) => {
  const r = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: sheetName });
  const rows = r.result.values || [];
  if (!rows.length) return;
  const headers = rows[0];
  const idCol = headers.indexOf("id");
  const rowIdx = rows.findIndex((row, i) => i > 0 && row[idCol] === id);
  if (rowIdx < 0) return;
  updates.updatedAt = new Date().toISOString();
  const updated = headers.map((h, i) => updates[h] !== undefined ? updates[h] : rows[rowIdx][i] || "");
  await window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A${rowIdx + 1}`,
    valueInputOption: "RAW", resource: { values: [updated] },
  });
};

const sheetsDelete = async (sheetName, id) => {
  const meta = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.result.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) return;
  const sheetId = sheet.properties.sheetId;
  const r = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: sheetName });
  const rows = r.result.values || [];
  const headers = rows[0] || [];
  const idCol = headers.indexOf("id");
  const rowIdx = rows.findIndex((row, i) => i > 0 && row[idCol] === id);
  if (rowIdx < 0) return;
  await window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests: [{ deleteDimension: { range: { sheetId, dimension:"ROWS", startIndex:rowIdx, endIndex:rowIdx+1 } } }] },
  });
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("ct-styles")) return;
  const el = document.createElement("style");
  el.id = "ct-styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --cream:#fdf8f3;--rose:#e8a598;--rose-light:#fdf0ee;--rose-mid:#f5c9c1;
      --sage:#8aac8e;--sage-light:#eef4ef;--sage-dark:#5a8a5f;
      --sand:#d4b896;--sand-light:#faf4ec;
      --text:#3d2f28;--text-mid:#7a6560;--text-light:#b8a49e;
      --border:#ecddd6;--white:#ffffff;
      --shadow-sm:0 2px 8px rgba(61,47,40,.06);
      --shadow-md:0 4px 20px rgba(61,47,40,.10);
      --shadow-lg:0 8px 40px rgba(61,47,40,.14);
      --r-sm:10px;--r-md:16px;--r-lg:24px;
    }
    body{font-family:'DM Sans',sans-serif;background:var(--cream);color:var(--text)}
    h1,h2,h3,h4{font-family:'Fraunces',serif}
    input,select,textarea,button{font-family:'DM Sans',sans-serif}
    .ct-app{min-height:100vh;display:flex;flex-direction:column}
    .ct-nav{background:var(--white);border-bottom:1.5px solid var(--border);padding:0 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:var(--shadow-sm)}
    .ct-brand{display:flex;align-items:center;gap:10px;padding:14px 0}
    .ct-brand h1{font-size:1.2em;color:var(--text);font-style:italic;font-weight:600;white-space:nowrap}
    .ct-tabs{display:flex;gap:0}
    .ct-tab{padding:18px 14px;font-size:.81em;font-weight:500;color:var(--text-mid);border:none;background:none;cursor:pointer;border-bottom:3px solid transparent;transition:all .15s;white-space:nowrap}
    .ct-tab:hover{color:var(--text)}
    .ct-tab.active{color:var(--rose);border-bottom-color:var(--rose);font-weight:600}
    .ct-main{flex:1;padding:28px 24px;max-width:1100px;margin:0 auto;width:100%}
    .card{background:var(--white);border-radius:var(--r-md);border:1.5px solid var(--border);padding:20px;box-shadow:var(--shadow-sm)}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:var(--r-sm);border:none;font-size:.87em;font-weight:600;cursor:pointer;transition:all .15s}
    .btn-primary{background:var(--rose);color:#fff}
    .btn-primary:hover{background:#d4907f;transform:translateY(-1px);box-shadow:var(--shadow-sm)}
    .btn-secondary{background:var(--sand-light);color:var(--text);border:1.5px solid var(--border)}
    .btn-secondary:hover{background:var(--border)}
    .btn-ghost{background:none;color:var(--text-mid);border:1.5px solid var(--border)}
    .btn-ghost:hover{color:var(--text);border-color:var(--text-mid)}
    .btn-danger{background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5}
    .btn-danger:hover{background:#fecaca}
    .btn-sm{padding:5px 12px;font-size:.8em}
    .badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:.73em;font-weight:600}
    .field{margin-bottom:14px}
    .label{display:block;font-size:.74em;font-weight:600;color:var(--text-mid);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
    .inp{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:.9em;color:var(--text);background:var(--cream);outline:none;transition:border-color .15s}
    .inp:focus{border-color:var(--rose-mid);background:var(--white)}
    .sel{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:.9em;color:var(--text);background:var(--cream);outline:none;cursor:pointer}
    .sel:focus{border-color:var(--rose-mid)}
    .ta{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:.9em;color:var(--text);background:var(--cream);outline:none;resize:vertical;min-height:80px}
    .ta:focus{border-color:var(--rose-mid)}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
    .overlay{position:fixed;inset:0;background:rgba(61,47,40,.5);z-index:200;display:flex;justify-content:center;overflow-y:auto;padding:20px;backdrop-filter:blur(3px)}
    .modal{background:var(--white);border-radius:var(--r-lg);width:100%;max-width:640px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);margin:auto 0;flex-shrink:0}
    .modal-wide{max-width:780px}
    .modal-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px 14px;border-bottom:1.5px solid var(--border);position:sticky;top:0;background:var(--white);border-radius:var(--r-lg) var(--r-lg) 0 0;z-index:10}
    .modal-head h3{font-size:1.05em;color:var(--text)}
    .modal-body{padding:18px 22px 22px}
    .modal-foot{display:flex;gap:10px;justify-content:flex-end;margin-top:8px}
    .stat-box{background:var(--cream);border-radius:var(--r-sm);padding:10px 13px}
    .stat-lbl{font-size:.7em;color:var(--text-light);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
    .stat-val{font-size:.93em;font-weight:600;color:var(--text)}
    .sec-title{font-family:'Fraunces',serif;font-size:1.35em;color:var(--text);margin-bottom:4px}
    .sec-sub{font-size:.87em;color:var(--text-mid);margin-bottom:20px}
    .empty{text-align:center;padding:48px 20px;color:var(--text-light)}
    .empty-icon{font-size:2.5em;margin-bottom:10px}
    .alert{padding:10px 14px;border-radius:var(--r-sm);font-size:.85em;margin-bottom:14px;line-height:1.5}
    .alert-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
    .alert-info{background:var(--rose-light);border:1px solid var(--rose-mid);color:#8a3a2a}
    .alert-success{background:var(--sage-light);border:1px solid #a7d4aa;color:#2d6630}
    .school-card{background:var(--white);border-radius:var(--r-md);border:1.5px solid var(--border);padding:18px;cursor:pointer;transition:all .18s}
    .school-card:hover{border-color:var(--rose-mid);box-shadow:var(--shadow-md);transform:translateY(-2px)}
    .tab-row{display:flex;gap:4px;background:var(--white);border-radius:var(--r-sm);padding:4px;border:1.5px solid var(--border)}
    .sub-tab{flex:1;padding:7px 4px;border:none;border-radius:var(--r-sm);cursor:pointer;font-size:.79em;font-weight:400;background:transparent;color:var(--text-mid);transition:all .15s}
    .sub-tab.active{background:var(--rose);color:#fff;font-weight:600}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .fade{animation:fadeIn .22s ease forwards}
    @media(max-width:640px){
      .ct-nav{padding:0 12px}
      .ct-tab{padding:16px 9px;font-size:.74em}
      .ct-main{padding:16px 12px}
      .grid2{grid-template-columns:1fr}
      .modal,.modal-wide{max-width:100%;border-radius:var(--r-md)}
    }
  `;
  document.head.appendChild(el);
};

// ─── ICONS ───────────────────────────────────────────────────────────────────
const paths = {
  plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12", edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6", arrow:"M19 12H5M12 5l-7 7 7 7", check:"M20 6L9 17l-5-5",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  phone:"M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.15 9.11a19.79 19.79 0 01-3.07-8.67A2 2 0 012.06 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  google:"M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
};
const Ic = ({ n, s=16 }) => <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={paths[n]}/></svg>;

// ─── SIGN-IN SCREEN ──────────────────────────────────────────────────────────
const SignIn = ({ onSignIn, loading, error }) => (
  <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--cream)",padding:20}}>
    <div className="fade" style={{textAlign:"center",maxWidth:420}}>
      <div style={{fontSize:"3em",marginBottom:16}}>🏐</div>
      <h1 style={{fontFamily:"Fraunces,serif",fontSize:"2em",fontStyle:"italic",color:"var(--text)",marginBottom:10}}>My College Journey</h1>
      <p style={{color:"var(--text-mid)",fontSize:".93em",marginBottom:28,lineHeight:1.65}}>Track your volleyball recruiting, schools, and scholarships — all in one place. Your data saves automatically to Google Sheets so you and your family can access it anywhere.</p>
      <div className="card" style={{padding:28}}>
        {error && <div className="alert alert-warn" style={{marginBottom:16}}>{error}</div>}
        <p style={{fontSize:".87em",color:"var(--text-mid)",marginBottom:18,lineHeight:1.5}}>Sign in with the Google account that owns your College Tracker spreadsheet.</p>
        <button onClick={onSignIn} disabled={loading} className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"12px 20px",fontSize:".93em",gap:10}}>
          <Ic n="google" s={18}/>{loading ? "Connecting…" : "Sign in with Google"}
        </button>
        <p style={{fontSize:".76em",color:"var(--text-light)",marginTop:14,lineHeight:1.5}}>Your data stays in your own Google Sheet — only you and people you share it with can see it.</p>
      </div>
    </div>
  </div>
);

// ─── MODAL ───────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
  <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal fade ${wide ? "modal-wide" : ""}`}>
      <div className="modal-head">
        <h3>{title}</h3>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{padding:"4px 8px"}}><Ic n="x" s={15}/></button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
);

// ─── SCHOOL FORM ─────────────────────────────────────────────────────────────
const SchoolForm = ({ init={}, onSave, onClose, saving }) => {
  const [f, setF] = useState({ name:"",location:"",religiousAffiliation:"Catholic – Jesuit",campusSetting:"Suburban",enrollmentSize:"",division:"D-I",conference:"",acceptRate:"",facultyRatio:"",usNewsRank:"",nursingRank:"",appDeadline:"",appStatus:"Researching",stickerPrice:"",netPrice:"",starred:"false",notes:"", ...init });
  const s = (k, v) => setF(p => ({ ...p, [k]:v }));
  return (
    <div>
      <div className="grid2">
        <div className="field"><label className="label">School Name *</label><input className="inp" value={f.name} onChange={e=>s("name",e.target.value)} placeholder="e.g. Creighton University"/></div>
        <div className="field"><label className="label">Location</label><input className="inp" value={f.location} onChange={e=>s("location",e.target.value)} placeholder="City, State"/></div>
        <div className="field"><label className="label">Religious Affiliation</label><select className="sel" value={f.religiousAffiliation} onChange={e=>s("religiousAffiliation",e.target.value)}>{AFFILIATIONS.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label className="label">Campus Setting</label><select className="sel" value={f.campusSetting} onChange={e=>s("campusSetting",e.target.value)}>{["Urban","Suburban","Rural"].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label className="label">Division</label><select className="sel" value={f.division} onChange={e=>s("division",e.target.value)}>{DIVISIONS.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label className="label">Conference</label><input className="inp" value={f.conference} onChange={e=>s("conference",e.target.value)} placeholder="e.g. Big East"/></div>
        <div className="field"><label className="label">Enrollment Size</label><input className="inp" value={f.enrollmentSize} onChange={e=>s("enrollmentSize",e.target.value)} placeholder="e.g. ~4,647"/></div>
        <div className="field"><label className="label">Acceptance Rate</label><input className="inp" value={f.acceptRate} onChange={e=>s("acceptRate",e.target.value)} placeholder="e.g. 72%"/></div>
        <div className="field"><label className="label">Student-Faculty Ratio</label><input className="inp" value={f.facultyRatio} onChange={e=>s("facultyRatio",e.target.value)} placeholder="e.g. 11:1"/></div>
        <div className="field"><label className="label">Sticker Price (full COA)</label><input className="inp" value={f.stickerPrice} onChange={e=>s("stickerPrice",e.target.value)} placeholder="e.g. ~$60,000/yr"/></div>
        <div className="field"><label className="label">Avg Net Price (with aid)</label><input className="inp" value={f.netPrice} onChange={e=>s("netPrice",e.target.value)} placeholder="e.g. ~$28,000/yr"/></div>
        <div className="field"><label className="label">US News Ranking</label><input className="inp" value={f.usNewsRank} onChange={e=>s("usNewsRank",e.target.value)} placeholder="e.g. #117 National"/></div>
        <div className="field"><label className="label">Nursing Program Notes</label><input className="inp" value={f.nursingRank} onChange={e=>s("nursingRank",e.target.value)} placeholder="e.g. #28 Undergrad Nursing"/></div>
        <div className="field"><label className="label">Application Deadline</label><input type="date" className="inp" value={f.appDeadline} onChange={e=>s("appDeadline",e.target.value)}/></div>
        <div className="field"><label className="label">Application Status</label><select className="sel" value={f.appStatus} onChange={e=>s("appStatus",e.target.value)}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></div>
      </div>
      <div className="field"><label className="label">Notes</label><textarea className="ta" value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Why interested, key facts, reminders…"/></div>
      <div className="field" style={{display:"flex",alignItems:"center",gap:8}}>
        <input type="checkbox" id="strd" checked={f.starred==="true"||f.starred===true} onChange={e=>s("starred",String(e.target.checked))} style={{width:16,height:16,cursor:"pointer"}}/>
        <label htmlFor="strd" style={{fontSize:".87em",color:"var(--text-mid)",cursor:"pointer"}}>Mark as priority school</label>
      </div>
      <div className="modal-foot">
        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button onClick={()=>{ if (!f.name.trim()) return; onSave(f); }} disabled={saving} className="btn btn-primary">{saving?"Saving…":"Save School"}</button>
      </div>
    </div>
  );
};

// ─── ACTIVITY FORM ────────────────────────────────────────────────────────────
const ActivityForm = ({ schools, init={}, onSave, onClose, saving }) => {
  const [f, setF] = useState({ schoolId:schools[0]?.id||"",type:"Introductory Email Sent",date:today(),title:"",notes:"",followUpDate:"",followUpDone:"false", ...init });
  const s = (k, v) => setF(p => ({ ...p, [k]:v }));
  return (
    <div>
      <div className="grid2">
        <div className="field"><label className="label">School *</label><select className="sel" value={f.schoolId} onChange={e=>s("schoolId",e.target.value)}>{schools.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></div>
        <div className="field"><label className="label">Activity Type</label><select className="sel" value={f.type} onChange={e=>s("type",e.target.value)}>{ACTIVITY_TYPES.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label className="label">Date *</label><input type="date" className="inp" value={f.date} onChange={e=>s("date",e.target.value)}/></div>
        <div className="field"><label className="label">Summary</label><input className="inp" value={f.title} onChange={e=>s("title",e.target.value)} placeholder="e.g. Emailed Coach Smith"/></div>
        <div className="field"><label className="label">Follow-up Date</label><input type="date" className="inp" value={f.followUpDate} onChange={e=>s("followUpDate",e.target.value)}/></div>
        <div className="field" style={{display:"flex",alignItems:"center",gap:8,paddingTop:22}}>
          <input type="checkbox" id="fud" checked={f.followUpDone==="true"||f.followUpDone===true} onChange={e=>s("followUpDone",String(e.target.checked))} style={{width:16,height:16,cursor:"pointer"}}/>
          <label htmlFor="fud" style={{fontSize:".87em",color:"var(--text-mid)",cursor:"pointer"}}>Follow-up complete</label>
        </div>
      </div>
      <div className="field"><label className="label">Notes</label><textarea className="ta" value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="What happened? What was discussed? Next steps?"/></div>
      <div className="modal-foot">
        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button onClick={()=>{ if (!f.schoolId||!f.date) return; onSave(f); }} disabled={saving} className="btn btn-primary" style={{background:"var(--sage-dark)"}}>{saving?"Saving…":"Save Activity"}</button>
      </div>
    </div>
  );
};

// ─── SCHOLARSHIP FORM ─────────────────────────────────────────────────────────
const ScholarshipForm = ({ schools, init={}, onSave, onClose, saving }) => {
  const [f, setF] = useState({ schoolId:"outside",name:"",type:"Academic / Merit",amount:"",deadline:"",status:"Researching",renewable:"false",requirements:"",appLink:"",notes:"", ...init });
  const s = (k, v) => setF(p => ({ ...p, [k]:v }));
  const opts = [{ id:"outside", name:"Outside / National" }, ...schools];
  return (
    <div>
      <div className="grid2">
        <div className="field"><label className="label">School / Source *</label><select className="sel" value={f.schoolId} onChange={e=>s("schoolId",e.target.value)}>{opts.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
        <div className="field"><label className="label">Scholarship Name</label><input className="inp" value={f.name} onChange={e=>s("name",e.target.value)} placeholder="e.g. Norton Scholars Award"/></div>
        <div className="field"><label className="label">Type</label><select className="sel" value={f.type} onChange={e=>s("type",e.target.value)}>{SCHOL_TYPES.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label className="label">Amount / Value</label><input className="inp" value={f.amount} onChange={e=>s("amount",e.target.value)} placeholder="e.g. $20,000/yr"/></div>
        <div className="field"><label className="label">Application Deadline</label><input type="date" className="inp" value={f.deadline} onChange={e=>s("deadline",e.target.value)}/></div>
        <div className="field"><label className="label">Status</label><select className="sel" value={f.status} onChange={e=>s("status",e.target.value)}>{SCHOL_STATUSES.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field" style={{display:"flex",alignItems:"center",gap:8,paddingTop:22}}>
          <input type="checkbox" id="ren" checked={f.renewable==="true"||f.renewable===true} onChange={e=>s("renewable",String(e.target.checked))} style={{width:16,height:16,cursor:"pointer"}}/>
          <label htmlFor="ren" style={{fontSize:".87em",color:"var(--text-mid)",cursor:"pointer"}}>Renewable each year</label>
        </div>
        <div className="field"><label className="label">Application Link</label><input className="inp" value={f.appLink} onChange={e=>s("appLink",e.target.value)} placeholder="https://…"/></div>
      </div>
      <div className="field"><label className="label">Requirements</label><textarea className="ta" style={{minHeight:60}} value={f.requirements} onChange={e=>s("requirements",e.target.value)} placeholder="Min GPA, required essays, eligibility…"/></div>
      <div className="field"><label className="label">Notes</label><textarea className="ta" style={{minHeight:60}} value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Other notes…"/></div>
      <div className="modal-foot">
        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button onClick={()=>{ if (!f.schoolId) return; onSave(f); }} disabled={saving} className="btn btn-primary" style={{background:"#c17b3a"}}>{saving?"Saving…":"Save Scholarship"}</button>
      </div>
    </div>
  );
};

// ─── CONTACT FORM ─────────────────────────────────────────────────────────────
const ContactForm = ({ schools, init={}, onSave, onClose, saving }) => {
  const [f, setF] = useState({ schoolId:schools[0]?.id||"",name:"",title:"Head Coach",email:"",phone:"",notes:"",lastContactDate:"", ...init });
  const s = (k, v) => setF(p => ({ ...p, [k]:v }));
  return (
    <div>
      <div className="grid2">
        <div className="field"><label className="label">School *</label><select className="sel" value={f.schoolId} onChange={e=>s("schoolId",e.target.value)}>{schools.map(sc=><option key={sc.id} value={sc.id}>{sc.name}</option>)}</select></div>
        <div className="field"><label className="label">Coach Name *</label><input className="inp" value={f.name} onChange={e=>s("name",e.target.value)} placeholder="e.g. Coach Sarah Johnson"/></div>
        <div className="field"><label className="label">Title / Role</label><select className="sel" value={f.title} onChange={e=>s("title",e.target.value)}>{COACH_TITLES.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label className="label">Email</label><input className="inp" type="email" value={f.email} onChange={e=>s("email",e.target.value)} placeholder="coach@university.edu"/></div>
        <div className="field"><label className="label">Phone</label><input className="inp" value={f.phone} onChange={e=>s("phone",e.target.value)} placeholder="Optional"/></div>
        <div className="field"><label className="label">Last Contact Date</label><input type="date" className="inp" value={f.lastContactDate} onChange={e=>s("lastContactDate",e.target.value)}/></div>
      </div>
      <div className="field"><label className="label">Notes</label><textarea className="ta" value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Met at camp, preferred contact method, notes from calls…"/></div>
      <div className="modal-foot">
        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
        <button onClick={()=>{ if (!f.schoolId||!f.name.trim()) return; onSave(f); }} disabled={saving} className="btn btn-primary" style={{background:"#9b6bb5"}}>{saving?"Saving…":"Save Contact"}</button>
      </div>
    </div>
  );
};

// ─── RECRUITING RULES ─────────────────────────────────────────────────────────
const RecruitingRules = () => {
  const [open, setOpen] = useState(false);
  const rules = [
    { div:"D-I",   color:"#4a6fa5", contact:"June 15 after sophomore year",      offer:"June 15 after soph. year", official:"Aug 1 before junior year",       offCampus:"Aug 1 before junior year" },
    { div:"D-II",  color:"#5a9175", contact:"Anytime (in-person after June 15 soph.)", offer:"June 15 after soph. year", official:"June 15 after soph. year",  offCampus:"June 15 after soph. year" },
    { div:"D-III", color:"#c17b3a", contact:"Anytime — no restrictions",          offer:"Anytime",                  official:"Jan 1 of junior year",          offCampus:"After sophomore year" },
    { div:"NAIA",  color:"#9b6bb5", contact:"Anytime — no restrictions",          offer:"Anytime",                  official:"Anytime",                       offCampus:"Anytime" },
  ];
  return (
    <div className="card" style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:"1.2em"}}>📋</span>
          <div>
            <div style={{fontWeight:600,fontSize:".93em",color:"var(--text)"}}>Recruiting Rules by Division</div>
            <div style={{fontSize:".76em",color:"var(--text-mid)"}}>When coaches can initiate contact with you — tap to {open?"hide":"expand"}</div>
          </div>
        </div>
        <span style={{color:"var(--text-light)"}}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div className="fade" style={{marginTop:16}}>
          <div className="alert alert-info" style={{marginBottom:14}}>
            <strong>Key rule:</strong> There are <em>no restrictions</em> on when <strong>you</strong> can contact coaches at any level, any time. Email, call, or DM coaches whenever you want! The rules below only limit when coaches can initiate contact with <em>you</em>.
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:".8em"}}>
              <thead>
                <tr style={{background:"var(--cream)"}}>
                  {["Division","Coach Can Contact You","Verbal Offers","Official Visits","Off-Campus Contact"].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:"left",borderBottom:"1.5px solid var(--border)",color:"var(--text-mid)",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map(r=>(
                  <tr key={r.div} style={{borderBottom:"1px solid var(--border)"}}>
                    <td style={{padding:"7px 10px"}}><span className="badge" style={{background:r.color,color:"#fff"}}>{r.div}</span></td>
                    <td style={{padding:"7px 10px",color:"var(--text)"}}>{r.contact}</td>
                    <td style={{padding:"7px 10px",color:"var(--text)"}}>{r.offer}</td>
                    <td style={{padding:"7px 10px",color:"var(--text)"}}>{r.official}</td>
                    <td style={{padding:"7px 10px",color:"var(--text)"}}>{r.offCampus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{fontSize:".75em",color:"var(--text-light)",marginTop:10}}>Source: NCAA Volleyball Recruiting Rules 2025–26. Always verify with individual programs — rules are subject to change.</p>
        </div>
      )}
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({ schools, activities, scholarships, contacts }) => {
  const divCounts = DIVISIONS.reduce((a,d)=>{ a[d]=schools.filter(s=>s.division===d).length; return a; }, {});
  const statusCounts = STATUSES.reduce((a,st)=>{ a[st]=schools.filter(s=>s.appStatus===st).length; return a; }, {});

  const deadlines = [
    ...schools.filter(s=>s.appDeadline).map(s=>({ label:`Apply: ${s.name}`, date:s.appDeadline, color:"var(--rose)" })),
    ...scholarships.filter(s=>s.deadline).map(s=>({ label:`Scholarship: ${s.name||"Unnamed"}`, date:s.deadline, color:"#c17b3a" })),
    ...activities.filter(a=>a.followUpDate&&a.followUpDone!=="true"&&a.followUpDone!==true)
      .map(a=>{ const sc=schools.find(s=>s.id===a.schoolId); return { label:`Follow up: ${sc?.name||"School"}`, date:a.followUpDate, color:"var(--sage-dark)", overdue:daysUntil(a.followUpDate)<0 }; }),
  ].filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);

  const recent = [...activities].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const awarded = scholarships.filter(s=>s.status==="Awarded");
  const starred = schools.filter(s=>s.starred==="true"||s.starred===true);

  return (
    <div className="fade">
      <div style={{marginBottom:22}}>
        <h2 className="sec-title">Welcome back, Ellie!</h2>
        <p className="sec-sub">Here's where your college journey stands today.</p>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:18}}>
        {[
          { label:"Schools Tracked", value:schools.length, icon:"🏫", bg:"var(--rose-light)" },
          { label:"Activities Logged", value:activities.length, icon:"🏐", bg:"var(--sage-light)" },
          { label:"Scholarships", value:scholarships.length, icon:"🏆", bg:"#fdf3e8" },
          { label:"Priority Schools", value:starred.length, icon:"⭐", bg:"#fffde7" },
        ].map(({ label,value,icon,bg })=>(
          <div key={label} className="card" style={{background:bg,border:"none",textAlign:"center",padding:"16px 10px"}}>
            <div style={{fontSize:"1.5em",marginBottom:4}}>{icon}</div>
            <div style={{fontFamily:"Fraunces,serif",fontSize:"1.9em",fontWeight:700,color:"var(--text)",lineHeight:1}}>{value}</div>
            <div style={{fontSize:".72em",color:"var(--text-mid)",marginTop:4}}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div className="card">
          <div style={{fontWeight:600,fontSize:".88em",marginBottom:12}}>Schools by Division</div>
          {DIVISIONS.map(d=>{
            const dc = DIV_COLORS[d];
            const pct = schools.length ? Math.round(divCounts[d]/schools.length*100) : 0;
            return (
              <div key={d} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span className="badge" style={{background:dc.bg,color:"#fff",minWidth:46,justifyContent:"center"}}>{d}</span>
                <div style={{flex:1,height:7,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:dc.bg,borderRadius:4,transition:"width .5s"}}/>
                </div>
                <span style={{fontSize:".84em",fontWeight:600,color:"var(--text)",minWidth:14}}>{divCounts[d]}</span>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div style={{fontWeight:600,fontSize:".88em",marginBottom:12}}>Schools by Status</div>
          {STATUSES.filter(st=>statusCounts[st]>0).map(st=>(
            <div key={st} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:".81em",color:"var(--text-mid)"}}>{st}</span>
              <span className="badge" style={{background:STATUS_COLORS[st]+"22",color:STATUS_COLORS[st],fontSize:".76em"}}>{statusCounts[st]}</span>
            </div>
          ))}
          {!schools.length && <p style={{fontSize:".82em",color:"var(--text-light)"}}>No schools yet</p>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div className="card">
          <div style={{fontWeight:600,fontSize:".88em",marginBottom:12}}>Upcoming Deadlines</div>
          {!deadlines.length
            ? <p style={{fontSize:".82em",color:"var(--text-light)"}}>No deadlines set yet. Add application or scholarship deadlines to track them here.</p>
            : deadlines.map((x,i)=>{
              const d = daysUntil(x.date);
              return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--border)"}}>
                  <div>
                    <div style={{fontSize:".82em",fontWeight:500,color:"var(--text)"}}>{x.label}</div>
                    <div style={{fontSize:".73em",color:"var(--text-light)"}}>{fmtDate(x.date)}</div>
                  </div>
                  <span style={{fontSize:".73em",fontWeight:700,color:d<0?"#dc2626":d<=7?"#d97706":"var(--sage-dark)",background:d<0?"#fee2e2":d<=7?"#fffbeb":"var(--sage-light)",padding:"2px 8px",borderRadius:10,whiteSpace:"nowrap",marginLeft:8}}>
                    {d<0?`${Math.abs(d)}d overdue`:d===0?"Today":`${d}d`}
                  </span>
                </div>
              );
            })
          }
        </div>

        <div className="card">
          <div style={{fontWeight:600,fontSize:".88em",marginBottom:12}}>Recent Activity</div>
          {!recent.length
            ? <p style={{fontSize:".82em",color:"var(--text-light)"}}>No activities yet. Start by logging a recruiting questionnaire or email to a coach!</p>
            : recent.map(a=>{
              const sc = schools.find(s=>s.id===a.schoolId);
              return (
                <div key={a.id} style={{padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:".82em",fontWeight:500,color:"var(--text)"}}>{a.title||a.type}</span>
                    <span style={{fontSize:".73em",color:"var(--text-light)"}}>{fmtDate(a.date)}</span>
                  </div>
                  <div style={{fontSize:".74em",color:"var(--text-mid)"}}>{sc?.name||"Unknown"} · {a.type}</div>
                </div>
              );
            })
          }
        </div>
      </div>

      {awarded.length>0 && (
        <div className="card alert-success" style={{marginBottom:14,border:"1.5px solid #a7d4aa"}}>
          <div style={{fontWeight:600,fontSize:".9em",marginBottom:6}}>Scholarships Awarded!</div>
          {awarded.map(s=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",fontSize:".85em",marginTop:4}}>
              <span>{s.name||"Unnamed scholarship"}</span><strong>{s.amount}</strong>
            </div>
          ))}
        </div>
      )}

      <RecruitingRules/>
    </div>
  );
};

// ─── SCHOOLS LIST ─────────────────────────────────────────────────────────────
const SchoolsList = ({ schools, activities, scholarships, contacts, onAdd, onView, saving }) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ div:"All", status:"All", starred:false });
  const [sort, setSort] = useState("name");

  const filtered = schools
    .filter(s=>filter.div==="All"||s.division===filter.div)
    .filter(s=>filter.status==="All"||s.appStatus===filter.status)
    .filter(s=>!filter.starred||(s.starred==="true"||s.starred===true))
    .sort((a,b)=>{
      if (sort==="name") return a.name.localeCompare(b.name);
      if (sort==="status") return STATUSES.indexOf(a.appStatus)-STATUSES.indexOf(b.appStatus);
      return 0;
    });

  return (
    <div className="fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 className="sec-title">My Schools</h2>
          <p className="sec-sub">{schools.length} school{schools.length!==1?"s":""} on your list</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="btn btn-primary"><Ic n="plus" s={15}/>Add School</button>
      </div>

      <div className="card" style={{padding:"10px 14px",marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <select className="sel" style={{width:"auto",fontSize:".82em",padding:"6px 10px"}} value={filter.div} onChange={e=>setFilter(p=>({...p,div:e.target.value}))}>
          <option value="All">All Divisions</option>{DIVISIONS.map(d=><option key={d}>{d}</option>)}
        </select>
        <select className="sel" style={{width:"auto",fontSize:".82em",padding:"6px 10px"}} value={filter.status} onChange={e=>setFilter(p=>({...p,status:e.target.value}))}>
          <option value="All">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select className="sel" style={{width:"auto",fontSize:".82em",padding:"6px 10px"}} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="name">Sort: A–Z</option>
          <option value="status">Sort: Status</option>
        </select>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:".82em",color:"var(--text-mid)",cursor:"pointer"}}>
          <input type="checkbox" checked={filter.starred} onChange={e=>setFilter(p=>({...p,starred:e.target.checked}))} style={{width:14,height:14}}/>Priority only
        </label>
        <span style={{marginLeft:"auto",fontSize:".78em",color:"var(--text-light)"}}>{filtered.length} shown</span>
      </div>

      {!filtered.length
        ? <div className="empty"><div className="empty-icon">🏫</div><p>No schools match your filters.<br/>Try adjusting or add a new school!</p></div>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
          {filtered.map(sc=>{
            const dc = DIV_COLORS[sc.division]||DIV_COLORS["D-I"];
            const myActs = activities.filter(a=>a.schoolId===sc.id).length;
            const mySchols = scholarships.filter(s=>s.schoolId===sc.id).length;
            const myConts = contacts.filter(c=>c.schoolId===sc.id).length;
            const days = sc.appDeadline ? daysUntil(sc.appDeadline) : null;
            return (
              <div key={sc.id} className="school-card" onClick={()=>onView(sc)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                      <span className="badge" style={{background:dc.bg,color:"#fff",fontSize:".7em"}}>{sc.division}</span>
                      {(sc.starred==="true"||sc.starred===true)&&<span style={{fontSize:".9em"}}>⭐</span>}
                    </div>
                    <div style={{fontFamily:"Fraunces,serif",fontWeight:600,fontSize:"1.05em",color:"var(--text)",lineHeight:1.2}}>{sc.name}</div>
                    <div style={{fontSize:".76em",color:"var(--text-mid)",marginTop:3}}>{sc.location}{sc.religiousAffiliation?` · ${sc.religiousAffiliation}`:""}</div>
                  </div>
                  <span className="badge" style={{background:STATUS_COLORS[sc.appStatus]+"22",color:STATUS_COLORS[sc.appStatus],fontSize:".7em",whiteSpace:"nowrap",marginLeft:8}}>{sc.appStatus}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                  <div className="stat-box"><div className="stat-lbl">Net Price</div><div className="stat-val" style={{fontSize:".87em"}}>{sc.netPrice||"—"}</div></div>
                  <div className="stat-box"><div className="stat-lbl">Acceptance</div><div className="stat-val" style={{fontSize:".87em"}}>{sc.acceptRate||"—"}</div></div>
                </div>
                {sc.conference&&<div style={{fontSize:".74em",color:"var(--text-mid)",marginBottom:8}}>{sc.conference} Conference</div>}
                <div style={{display:"flex",gap:8,fontSize:".73em",color:"var(--text-light)",borderTop:"1px solid var(--border)",paddingTop:8}}>
                  <span>🏐 {myActs}</span><span>🏆 {mySchols}</span><span>👤 {myConts}</span>
                  {days!==null&&<span style={{marginLeft:"auto",fontWeight:700,color:days<0?"#dc2626":days<=30?"#d97706":"var(--sage-dark)"}}>
                    {days<0?`${Math.abs(days)}d overdue`:days===0?"Due today":`${days}d`}
                  </span>}
                </div>
              </div>
            );
          })}
        </div>
      }

      {showForm&&<Modal title="Add New School" onClose={()=>setShowForm(false)} wide><SchoolForm onSave={async d=>{await onAdd(d);setShowForm(false);}} onClose={()=>setShowForm(false)} saving={saving}/></Modal>}
    </div>
  );
};

// ─── SCHOOL DETAIL ────────────────────────────────────────────────────────────
const SchoolDetail = ({ school, schools, activities, scholarships, contacts, onClose, onEdit, onDelete, onAddActivity, onAddScholarship, onAddContact, onDeleteActivity, onDeleteScholarship, onDeleteContact, saving }) => {
  const dc = DIV_COLORS[school.division]||DIV_COLORS["D-I"];
  const myActs   = activities.filter(a=>a.schoolId===school.id).sort((a,b)=>b.date.localeCompare(a.date));
  const mySchols = scholarships.filter(s=>s.schoolId===school.id);
  const myConts  = contacts.filter(c=>c.schoolId===school.id);
  const [tab, setTab] = useState("overview");
  const [actForm, setActForm] = useState(false);
  const [scholForm, setScholForm] = useState(false);
  const [contForm, setContForm] = useState(false);
  const [editForm, setEditForm] = useState(false);
  const [delConfirm, setDelConfirm] = useState(null);

  const handleDelete = async () => {
    if (!delConfirm) return;
    if (delConfirm.type==="activity") await onDeleteActivity(delConfirm.id);
    if (delConfirm.type==="scholarship") await onDeleteScholarship(delConfirm.id);
    if (delConfirm.type==="contact") await onDeleteContact(delConfirm.id);
    setDelConfirm(null);
  };

  return (
    <div className="fade">
      <button onClick={onClose} className="btn btn-ghost btn-sm" style={{marginBottom:16}}><Ic n="arrow" s={14}/>Back to Schools</button>

      <div className="card" style={{marginBottom:14,borderLeft:`5px solid ${dc.bg}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span className="badge" style={{background:dc.bg,color:"#fff"}}>{school.division}</span>
              {school.conference&&<span style={{fontSize:".81em",color:dc.bg,fontWeight:600}}>{school.conference}</span>}
              {(school.starred==="true"||school.starred===true)&&<span>⭐</span>}
            </div>
            <h2 style={{fontFamily:"Fraunces,serif",fontSize:"1.45em",color:"var(--text)",marginBottom:4}}>{school.name}</h2>
            <p style={{fontSize:".84em",color:"var(--text-mid)"}}>{[school.location,school.religiousAffiliation,school.campusSetting,school.enrollmentSize&&`${school.enrollmentSize} students`].filter(Boolean).join(" · ")}</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span className="badge" style={{background:STATUS_COLORS[school.appStatus]+"22",color:STATUS_COLORS[school.appStatus],padding:"4px 12px"}}>{school.appStatus}</span>
            <button onClick={()=>setEditForm(true)} className="btn btn-ghost btn-sm"><Ic n="edit" s={13}/>Edit</button>
            <button onClick={onDelete} className="btn btn-danger btn-sm"><Ic n="trash" s={13}/></button>
          </div>
        </div>
      </div>

      <div className="tab-row" style={{marginBottom:14}}>
        {[["overview","Overview"],["recruiting","Recruiting"],["scholarships","Scholarships"],["contacts","Coaches"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`sub-tab${tab===t?" active":""}`}>{l}</button>
        ))}
      </div>

      {tab==="overview"&&(
        <div className="fade">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:10,marginBottom:14}}>
            {[["Sticker Price",school.stickerPrice],["Net Price (w/ aid)",school.netPrice],["Acceptance Rate",school.acceptRate],["Student-Faculty",school.facultyRatio],["US News Rank",school.usNewsRank],["App Deadline",school.appDeadline?fmtDate(school.appDeadline):"Not set"]].map(([l,v])=>(
              <div key={l} className="stat-box"><div className="stat-lbl">{l}</div><div className="stat-val" style={{fontSize:".87em"}}>{v||"—"}</div></div>
            ))}
          </div>
          {school.nursingRank&&<div className="alert alert-info" style={{marginBottom:10}}><strong>Nursing:</strong> {school.nursingRank}</div>}
          {school.notes&&<div className="alert alert-warn"><strong>Notes:</strong> {school.notes}</div>}
        </div>
      )}

      {tab==="recruiting"&&(
        <div className="fade">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:".88em"}}>{myActs.length} activit{myActs.length!==1?"ies":"y"}</div>
            <button onClick={()=>setActForm(true)} className="btn btn-primary btn-sm" style={{background:"var(--sage-dark)"}}><Ic n="plus" s={13}/>Log Activity</button>
          </div>
          {!myActs.length
            ? <div className="empty" style={{padding:24}}><div className="empty-icon">🏐</div><p>No activities yet.<br/>Log your first contact or camp visit!</p></div>
            : myActs.map(a=>{
              const overdue = a.followUpDate&&a.followUpDone!=="true"&&a.followUpDone!==true&&daysUntil(a.followUpDate)<0;
              return (
                <div key={a.id} className="card" style={{marginBottom:10,padding:"12px 14px",borderLeft:`3px solid ${overdue?"#dc2626":"var(--sage)"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:".77em",fontWeight:600,color:"var(--sage-dark)",background:"var(--sage-light)",padding:"1px 8px",borderRadius:10}}>{a.type}</span>
                        <span style={{fontSize:".73em",color:"var(--text-light)"}}>{fmtDate(a.date)}</span>
                      </div>
                      {a.title&&<div style={{fontSize:".87em",fontWeight:500,color:"var(--text)",marginBottom:2}}>{a.title}</div>}
                      {a.notes&&<div style={{fontSize:".81em",color:"var(--text-mid)",lineHeight:1.5}}>{a.notes}</div>}
                      {a.followUpDate&&<div style={{fontSize:".73em",marginTop:4,color:overdue?"#dc2626":"var(--text-mid)"}}>
                        {overdue?"Overdue follow-up: ":"Follow up by: "}{fmtDate(a.followUpDate)}{(a.followUpDone==="true"||a.followUpDone===true)?" Done":""}
                      </div>}
                    </div>
                    <button onClick={()=>setDelConfirm({type:"activity",id:a.id})} className="btn btn-ghost btn-sm" style={{padding:"3px 6px"}}><Ic n="trash" s={13}/></button>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {tab==="scholarships"&&(
        <div className="fade">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:".88em"}}>{mySchols.length} scholarship{mySchols.length!==1?"s":""}</div>
            <button onClick={()=>setScholForm(true)} className="btn btn-primary btn-sm" style={{background:"#c17b3a"}}><Ic n="plus" s={13}/>Add Scholarship</button>
          </div>
          {!mySchols.length
            ? <div className="empty" style={{padding:24}}><div className="empty-icon">🏆</div><p>No scholarships tracked yet.<br/>Add athletic, academic, or outside scholarships!</p></div>
            : mySchols.map(s=>(
              <div key={s.id} className="card" style={{marginBottom:10,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{fontWeight:600,fontSize:".9em",color:"var(--text)"}}>{s.name||"Unnamed"}</span>
                      <span className="badge" style={{background:"#c17b3a22",color:"#c17b3a",fontSize:".7em"}}>{s.type}</span>
                      <span className="badge" style={{background:s.status==="Awarded"?"var(--sage-light)":"var(--cream)",color:s.status==="Awarded"?"var(--sage-dark)":"var(--text-mid)",fontSize:".7em"}}>{s.status}</span>
                    </div>
                    {s.amount&&<div style={{fontSize:".85em",fontWeight:700,color:"#c17b3a"}}>{s.amount}</div>}
                    {s.deadline&&<div style={{fontSize:".76em",color:"var(--text-mid)"}}>Deadline: {fmtDate(s.deadline)}</div>}
                    {(s.renewable==="true"||s.renewable===true)&&<div style={{fontSize:".73em",color:"var(--sage-dark)",marginTop:2}}>Renewable</div>}
                    {s.appLink&&<a href={s.appLink} target="_blank" rel="noreferrer" style={{fontSize:".73em",color:"var(--rose)",display:"block",marginTop:2}}>Application link</a>}
                  </div>
                  <button onClick={()=>setDelConfirm({type:"scholarship",id:s.id})} className="btn btn-ghost btn-sm" style={{padding:"3px 6px"}}><Ic n="trash" s={13}/></button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab==="contacts"&&(
        <div className="fade">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:".88em"}}>{myConts.length} coach contact{myConts.length!==1?"s":""}</div>
            <button onClick={()=>setContForm(true)} className="btn btn-primary btn-sm" style={{background:"#9b6bb5"}}><Ic n="plus" s={13}/>Add Coach</button>
          </div>
          {!myConts.length
            ? <div className="empty" style={{padding:24}}><div className="empty-icon">👤</div><p>No coaches saved yet.<br/>Add the head coach to get started!</p></div>
            : myConts.map(c=>(
              <div key={c.id} className="card" style={{marginBottom:10,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:".9em",color:"var(--text)",marginBottom:1}}>{c.name}</div>
                    <div style={{fontSize:".76em",color:"var(--text-mid)",marginBottom:5}}>{c.title}</div>
                    {c.email&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:".79em",color:"var(--text-mid)",marginBottom:2}}><Ic n="mail" s={12}/><a href={`mailto:${c.email}`} style={{color:"var(--rose)",textDecoration:"none"}}>{c.email}</a></div>}
                    {c.phone&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:".79em",color:"var(--text-mid)",marginBottom:2}}><Ic n="phone" s={12}/>{c.phone}</div>}
                    {c.lastContactDate&&<div style={{fontSize:".73em",color:"var(--text-light)",marginTop:3}}>Last contact: {fmtDate(c.lastContactDate)}</div>}
                    {c.notes&&<div style={{fontSize:".78em",color:"var(--text-mid)",marginTop:4,fontStyle:"italic"}}>{c.notes}</div>}
                  </div>
                  <button onClick={()=>setDelConfirm({type:"contact",id:c.id})} className="btn btn-ghost btn-sm" style={{padding:"3px 6px"}}><Ic n="trash" s={13}/></button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {actForm&&<Modal title="Log Recruiting Activity" onClose={()=>setActForm(false)}><ActivityForm schools={[school]} init={{schoolId:school.id}} onSave={async d=>{await onAddActivity(d);setActForm(false);}} onClose={()=>setActForm(false)} saving={saving}/></Modal>}
      {scholForm&&<Modal title="Add Scholarship" onClose={()=>setScholForm(false)}><ScholarshipForm schools={[school]} init={{schoolId:school.id}} onSave={async d=>{await onAddScholarship(d);setScholForm(false);}} onClose={()=>setScholForm(false)} saving={saving}/></Modal>}
      {contForm&&<Modal title="Add Coach Contact" onClose={()=>setContForm(false)}><ContactForm schools={[school]} init={{schoolId:school.id}} onSave={async d=>{await onAddContact(d);setContForm(false);}} onClose={()=>setContForm(false)} saving={saving}/></Modal>}
      {editForm&&<Modal title="Edit School" onClose={()=>setEditForm(false)} wide><SchoolForm init={school} onSave={async d=>{await onEdit(d);setEditForm(false);}} onClose={()=>setEditForm(false)} saving={saving}/></Modal>}

      {delConfirm&&(
        <Modal title="Confirm Delete" onClose={()=>setDelConfirm(null)}>
          <p style={{fontSize:".9em",color:"var(--text-mid)",marginBottom:20}}>Are you sure you want to delete this {delConfirm.type}? This cannot be undone.</p>
          <div className="modal-foot">
            <button onClick={()=>setDelConfirm(null)} className="btn btn-ghost">Cancel</button>
            <button onClick={handleDelete} className="btn btn-danger">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── RECRUITING SECTION ───────────────────────────────────────────────────────
const RecruitingSection = ({ activities, schools, onAdd, onDelete, saving }) => {
  const [showForm, setShowForm] = useState(false);
  const [filterSchool, setFilterSchool] = useState("All");
  const [filterType, setFilterType] = useState("All");

  const filtered = activities
    .filter(a=>filterSchool==="All"||a.schoolId===filterSchool)
    .filter(a=>filterType==="All"||a.type===filterType)
    .sort((a,b)=>b.date.localeCompare(a.date));

  const overdueFollowUps = activities.filter(a=>a.followUpDate&&a.followUpDone!=="true"&&a.followUpDone!==true&&daysUntil(a.followUpDate)<0);

  return (
    <div className="fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 className="sec-title">Recruiting Tracker</h2>
          <p className="sec-sub">{activities.length} activit{activities.length!==1?"ies":"y"} logged across {schools.length} school{schools.length!==1?"s":""}</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="btn btn-primary" style={{background:"var(--sage-dark)"}}><Ic n="plus" s={15}/>Log Activity</button>
      </div>

      <RecruitingRules/>

      {overdueFollowUps.length>0&&(
        <div className="alert alert-warn" style={{marginBottom:14}}>
          <strong>{overdueFollowUps.length} overdue follow-up{overdueFollowUps.length!==1?"s":""}!</strong> Don't forget to follow up with coaches who reached out.
        </div>
      )}

      <div className="card" style={{padding:"10px 14px",marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <select className="sel" style={{width:"auto",fontSize:".82em",padding:"6px 10px"}} value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
          <option value="All">All Schools</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="sel" style={{width:"auto",fontSize:".82em",padding:"6px 10px"}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All Activity Types</option>{ACTIVITY_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <span style={{marginLeft:"auto",fontSize:".78em",color:"var(--text-light)"}}>{filtered.length} shown</span>
      </div>

      {!filtered.length
        ? <div className="empty"><div className="empty-icon">🏐</div><p>No activities logged yet.<br/>Start by submitting a recruiting questionnaire or emailing a coach!</p></div>
        : filtered.map(a=>{
          const sc = schools.find(s=>s.id===a.schoolId);
          const dc = sc ? (DIV_COLORS[sc.division]||DIV_COLORS["D-I"]) : DIV_COLORS["D-I"];
          const overdue = a.followUpDate&&a.followUpDone!=="true"&&a.followUpDone!==true&&daysUntil(a.followUpDate)<0;
          return (
            <div key={a.id} className="card" style={{marginBottom:10,padding:"14px 16px",borderLeft:`4px solid ${overdue?"#dc2626":"var(--sage)"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                    {sc&&<span className="badge" style={{background:dc.bg,color:"#fff",fontSize:".7em"}}>{sc.division}</span>}
                    {sc&&<span style={{fontWeight:600,fontSize:".84em",color:"var(--text)"}}>{sc.name}</span>}
                    <span style={{fontSize:".73em",color:"var(--text-light)"}}>{fmtDate(a.date)}</span>
                  </div>
                  <div style={{fontSize:".77em",fontWeight:600,color:"var(--sage-dark)",background:"var(--sage-light)",padding:"1px 8px",borderRadius:10,display:"inline-block",marginBottom:4}}>{a.type}</div>
                  {a.title&&<div style={{fontSize:".87em",fontWeight:500,color:"var(--text)",marginTop:3}}>{a.title}</div>}
                  {a.notes&&<div style={{fontSize:".81em",color:"var(--text-mid)",marginTop:2,lineHeight:1.5}}>{a.notes}</div>}
                  {a.followUpDate&&<div style={{fontSize:".73em",marginTop:4,color:overdue?"#dc2626":"var(--text-mid)"}}>
                    {overdue?"Overdue: ":"Follow up: "}{fmtDate(a.followUpDate)}{(a.followUpDone==="true"||a.followUpDone===true)?" Done":""}
                  </div>}
                </div>
                <button onClick={()=>onDelete(a.id)} className="btn btn-ghost btn-sm" style={{padding:"3px 6px"}}><Ic n="trash" s={13}/></button>
              </div>
            </div>
          );
        })
      }

      {showForm&&<Modal title="Log Recruiting Activity" onClose={()=>setShowForm(false)}><ActivityForm schools={schools} onSave={async d=>{await onAdd(d);setShowForm(false);}} onClose={()=>setShowForm(false)} saving={saving}/></Modal>}
    </div>
  );
};

// ─── SCHOLARSHIPS SECTION ─────────────────────────────────────────────────────
const ScholarshipsSection = ({ scholarships, schools, onAdd, onDelete, saving }) => {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const filtered = scholarships
    .filter(s=>filterType==="All"||s.type===filterType)
    .filter(s=>filterStatus==="All"||s.status===filterStatus)
    .sort((a,b)=>a.deadline.localeCompare(b.deadline)||a.name.localeCompare(b.name));

  const awarded = scholarships.filter(s=>s.status==="Awarded");
  const totalAwarded = awarded.reduce((sum,s)=>{
    const amt = parseFloat((s.amount||"").replace(/[^0-9.]/g,""))||0;
    return sum + amt;
  }, 0);

  return (
    <div className="fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 className="sec-title">Scholarship Tracker</h2>
          <p className="sec-sub">{scholarships.length} scholarship{scholarships.length!==1?"s":""} tracked · {awarded.length} awarded</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="btn btn-primary" style={{background:"#c17b3a"}}><Ic n="plus" s={15}/>Add Scholarship</button>
      </div>

      {awarded.length>0&&(
        <div className="alert alert-success" style={{marginBottom:14}}>
          <strong>{awarded.length} scholarship{awarded.length!==1?"s":""} awarded!</strong>{" "}
          {awarded.map(s=>s.name||"Unnamed").join(", ")}
        </div>
      )}

      <div className="card" style={{padding:"10px 14px",marginBottom:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <select className="sel" style={{width:"auto",fontSize:".82em",padding:"6px 10px"}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All Types</option>{SCHOL_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <select className="sel" style={{width:"auto",fontSize:".82em",padding:"6px 10px"}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>{SCHOL_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <span style={{marginLeft:"auto",fontSize:".78em",color:"var(--text-light)"}}>{filtered.length} shown</span>
      </div>

      {!filtered.length
        ? <div className="empty"><div className="empty-icon">🏆</div><p>No scholarships tracked yet.<br/>Add athletic, academic, nursing-specific, or national scholarships!</p></div>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {filtered.map(s=>{
            const sc = schools.find(sc=>sc.id===s.schoolId);
            const days = s.deadline ? daysUntil(s.deadline) : null;
            return (
              <div key={s.id} className="card" style={{borderLeft:`4px solid ${s.status==="Awarded"?"var(--sage-dark)":"var(--sand)"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,flexWrap:"wrap"}}>
                      <span className="badge" style={{background:"#c17b3a22",color:"#c17b3a",fontSize:".7em"}}>{s.type}</span>
                      <span className="badge" style={{background:s.status==="Awarded"?"var(--sage-light)":s.status==="Applied"?"#dbeafe":"var(--cream)",color:s.status==="Awarded"?"var(--sage-dark)":s.status==="Applied"?"#1e40af":"var(--text-mid)",fontSize:".7em"}}>{s.status}</span>
                    </div>
                    <div style={{fontWeight:600,fontSize:".93em",color:"var(--text)",marginBottom:2}}>{s.name||"Unnamed Scholarship"}</div>
                    {sc&&<div style={{fontSize:".76em",color:"var(--text-mid)",marginBottom:4}}>{sc.name}</div>}
                    {!sc&&s.schoolId==="outside"&&<div style={{fontSize:".76em",color:"var(--text-mid)",marginBottom:4}}>Outside / National</div>}
                    {s.amount&&<div style={{fontWeight:700,color:"#c17b3a",fontSize:".88em"}}>{s.amount}</div>}
                    {s.deadline&&<div style={{fontSize:".74em",marginTop:3,color:days!==null&&days<0?"#dc2626":days!==null&&days<=14?"#d97706":"var(--text-mid)"}}>
                      Deadline: {fmtDate(s.deadline)}{days!==null&&<span style={{marginLeft:6,fontWeight:600}}>{days<0?`(${Math.abs(days)}d overdue)`:days===0?"(Today)":`(${days}d)`}</span>}
                    </div>}
                    {(s.renewable==="true"||s.renewable===true)&&<div style={{fontSize:".73em",color:"var(--sage-dark)",marginTop:2}}>Renewable</div>}
                    {s.appLink&&<a href={s.appLink} target="_blank" rel="noreferrer" style={{fontSize:".73em",color:"var(--rose)",display:"block",marginTop:3}}>Apply here</a>}
                  </div>
                  <button onClick={()=>onDelete(s.id)} className="btn btn-ghost btn-sm" style={{padding:"3px 6px"}}><Ic n="trash" s={13}/></button>
                </div>
              </div>
            );
          })}
        </div>
      }

      {showForm&&<Modal title="Add Scholarship" onClose={()=>setShowForm(false)}><ScholarshipForm schools={schools} onSave={async d=>{await onAdd(d);setShowForm(false);}} onClose={()=>setShowForm(false)} saving={saving}/></Modal>}
    </div>
  );
};

// ─── CONTACTS SECTION ─────────────────────────────────────────────────────────
const ContactsSection = ({ contacts, schools, onAdd, onDelete, saving }) => {
  const [showForm, setShowForm] = useState(false);
  const [filterSchool, setFilterSchool] = useState("All");

  const filtered = contacts
    .filter(c=>filterSchool==="All"||c.schoolId===filterSchool)
    .sort((a,b)=>a.name.localeCompare(b.name));

  return (
    <div className="fade">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 className="sec-title">Coach Contacts</h2>
          <p className="sec-sub">{contacts.length} contact{contacts.length!==1?"s":""} saved</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="btn btn-primary" style={{background:"#9b6bb5"}}><Ic n="plus" s={15}/>Add Contact</button>
      </div>

      {contacts.length>0&&(
        <div className="alert alert-info" style={{marginBottom:14}}>
          <strong>Remember:</strong> You can reach out to coaches at <em>any</em> division at any time — there are no restrictions on <em>you</em> initiating contact. Don't wait for them to contact you first!
        </div>
      )}

      {contacts.length>1&&(
        <div className="card" style={{padding:"10px 14px",marginBottom:14}}>
          <select className="sel" style={{width:"auto",fontSize:".82em",padding:"6px 10px"}} value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
            <option value="All">All Schools</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {!filtered.length
        ? <div className="empty"><div className="empty-icon">👤</div><p>No coach contacts saved yet.<br/>Add coaches you've been in touch with — or coaches you want to contact!</p></div>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {filtered.map(c=>{
            const sc = schools.find(s=>s.id===c.schoolId);
            const dc = sc ? (DIV_COLORS[sc.division]||DIV_COLORS["D-I"]) : DIV_COLORS["D-I"];
            return (
              <div key={c.id} className="card" style={{borderLeft:"4px solid #9b6bb5"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:".93em",color:"var(--text)",marginBottom:1}}>{c.name}</div>
                    <div style={{fontSize:".76em",color:"#9b6bb5",fontWeight:600,marginBottom:5}}>{c.title}</div>
                    {sc&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <span className="badge" style={{background:dc.bg,color:"#fff",fontSize:".68em"}}>{sc.division}</span>
                      <span style={{fontSize:".78em",color:"var(--text-mid)"}}>{sc.name}</span>
                    </div>}
                    {c.email&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:".8em",marginBottom:3}}><Ic n="mail" s={12}/><a href={`mailto:${c.email}`} style={{color:"var(--rose)",textDecoration:"none"}}>{c.email}</a></div>}
                    {c.phone&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:".8em",color:"var(--text-mid)",marginBottom:3}}><Ic n="phone" s={12}/>{c.phone}</div>}
                    {c.lastContactDate&&<div style={{fontSize:".73em",color:"var(--text-light)",marginTop:2}}>Last contact: {fmtDate(c.lastContactDate)}</div>}
                    {c.notes&&<div style={{fontSize:".78em",color:"var(--text-mid)",marginTop:5,fontStyle:"italic",lineHeight:1.4}}>{c.notes}</div>}
                  </div>
                  <button onClick={()=>onDelete(c.id)} className="btn btn-ghost btn-sm" style={{padding:"3px 6px"}}><Ic n="trash" s={13}/></button>
                </div>
              </div>
            );
          })}
        </div>
      }

      {showForm&&<Modal title="Add Coach Contact" onClose={()=>setShowForm(false)}><ContactForm schools={schools} onSave={async d=>{await onAdd(d);setShowForm(false);}} onClose={()=>setShowForm(false)} saving={saving}/></Modal>}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  injectStyles();

  const [gapiLoaded, setGapiLoaded]   = useState(false);
  const [signedIn, setSignedIn]       = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [tab, setTab]                 = useState("dashboard");
  const [viewSchool, setViewSchool]   = useState(null);

  const [schools,      setSchools]      = useState([]);
  const [activities,   setActivities]   = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [contacts,     setContacts]     = useState([]);

  useEffect(() => {
    Promise.all([loadGapi(), loadGis()]).then(() => setGapiLoaded(true)).catch(console.error);
  }, []);

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      await requestToken();
      setSignedIn(true);
    } catch (e) {
      setAuthError("Sign-in failed. Please try again.");
      setAuthLoading(false);
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sc, ac, sh, co] = await Promise.all([
        sheetsRead(SHEET_NAMES.schools),
        sheetsRead(SHEET_NAMES.activities),
        sheetsRead(SHEET_NAMES.scholarships),
        sheetsRead(SHEET_NAMES.contacts),
      ]);
      setSchools(sc);
      setActivities(ac);
      setScholarships(sh);
      setContacts(co);

      if (sc.length === 0) {
        const toSeed = PRELOADED_SCHOOLS.map(s => ({ ...s, id:uid(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }));
        for (const s of toSeed) await sheetsAppend(SHEET_NAMES.schools, s);
        setSchools(toSeed);
      }
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (signedIn) loadAll(); }, [signedIn, loadAll]);

  const addRecord = async (sheetKey, setter, record) => {
    setSaving(true);
    const full = { ...record, id:uid(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    await sheetsAppend(SHEET_NAMES[sheetKey], full);
    setter(prev => [...prev, full]);
    setSaving(false);
    return full;
  };

  const editRecord = async (sheetKey, setter, id, updates) => {
    setSaving(true);
    await sheetsUpdate(SHEET_NAMES[sheetKey], id, updates);
    setter(prev => prev.map(r => r.id===id ? { ...r, ...updates } : r));
    if (viewSchool?.id===id) setViewSchool(prev => ({ ...prev, ...updates }));
    setSaving(false);
  };

  const delRecord = async (sheetKey, setter, id) => {
    setSaving(true);
    await sheetsDelete(SHEET_NAMES[sheetKey], id);
    setter(prev => prev.filter(r => r.id!==id));
    setSaving(false);
  };

  const delSchool = async id => {
    setSaving(true);
    await sheetsDelete(SHEET_NAMES.schools, id);
    setSchools(prev => prev.filter(r=>r.id!==id));
    for (const a of activities.filter(a=>a.schoolId===id)) await sheetsDelete(SHEET_NAMES.activities, a.id);
    setActivities(prev => prev.filter(a=>a.schoolId!==id));
    for (const s of scholarships.filter(s=>s.schoolId===id)) await sheetsDelete(SHEET_NAMES.scholarships, s.id);
    setScholarships(prev => prev.filter(s=>s.schoolId!==id));
    for (const c of contacts.filter(c=>c.schoolId===id)) await sheetsDelete(SHEET_NAMES.contacts, c.id);
    setContacts(prev => prev.filter(c=>c.schoolId!==id));
    setSaving(false);
    setViewSchool(null);
    setTab("schools");
  };

  if (!gapiLoaded || !signedIn) {
    return <SignIn onSignIn={handleSignIn} loading={authLoading||!gapiLoaded} error={authError}/>;
  }

  const NAV_TABS = [
    { id:"dashboard",    label:"Dashboard" },
    { id:"schools",      label:"My Schools" },
    { id:"recruiting",   label:"Recruiting" },
    { id:"scholarships", label:"Scholarships" },
    { id:"contacts",     label:"Coaches" },
  ];

  return (
    <div className="ct-app">
      <nav className="ct-nav">
        <div className="ct-brand">
          <span>🏐</span>
          <h1>Ellie's College Journey</h1>
        </div>
        <div className="ct-tabs">
          {NAV_TABS.map(t=>(
            <button key={t.id} onClick={()=>{ setTab(t.id); setViewSchool(null); }} className={`ct-tab${tab===t.id&&!viewSchool?" active":""}`}>{t.label}</button>
          ))}
        </div>
        <button onClick={loadAll} className="btn btn-ghost btn-sm" style={{marginLeft:8}} title="Refresh data"><Ic n="refresh" s={14}/></button>
      </nav>

      <main className="ct-main">
        {loading
          ? <div style={{textAlign:"center",padding:60,color:"var(--text-mid)"}}>
              <div style={{fontSize:"2em",marginBottom:12}}>⏳</div>
              <p>Loading your college tracker…</p>
            </div>
          : viewSchool
            ? <SchoolDetail
                school={viewSchool}
                schools={schools}
                activities={activities}
                scholarships={scholarships}
                contacts={contacts}
                onClose={()=>setViewSchool(null)}
                onEdit={d=>editRecord("schools",setSchools,viewSchool.id,d)}
                onDelete={()=>delSchool(viewSchool.id)}
                onAddActivity={d=>addRecord("activities",setActivities,d)}
                onAddScholarship={d=>addRecord("scholarships",setScholarships,d)}
                onAddContact={d=>addRecord("contacts",setContacts,d)}
                onDeleteActivity={id=>delRecord("activities",setActivities,id)}
                onDeleteScholarship={id=>delRecord("scholarships",setScholarships,id)}
                onDeleteContact={id=>delRecord("contacts",setContacts,id)}
                saving={saving}
              />
            : tab==="dashboard"    ? <Dashboard schools={schools} activities={activities} scholarships={scholarships} contacts={contacts}/>
            : tab==="schools"      ? <SchoolsList schools={schools} activities={activities} scholarships={scholarships} contacts={contacts} onAdd={d=>addRecord("schools",setSchools,d)} onView={sc=>setViewSchool(sc)} saving={saving}/>
            : tab==="recruiting"   ? <RecruitingSection activities={activities} schools={schools} onAdd={d=>addRecord("activities",setActivities,d)} onDelete={id=>delRecord("activities",setActivities,id)} saving={saving}/>
            : tab==="scholarships" ? <ScholarshipsSection scholarships={scholarships} schools={schools} onAdd={d=>addRecord("scholarships",setScholarships,d)} onDelete={id=>delRecord("scholarships",setScholarships,id)} saving={saving}/>
            : tab==="contacts"     ? <ContactsSection contacts={contacts} schools={schools} onAdd={d=>addRecord("contacts",setContacts,d)} onDelete={id=>delRecord("contacts",setContacts,id)} saving={saving}/>
            : null
        }
      </main>
    </div>
  );
}
