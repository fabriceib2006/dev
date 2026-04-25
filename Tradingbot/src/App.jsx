import { useState, useRef, useCallback } from 'react'

// ── Auth ──────────────────────────────────────────────────────
const AUTH = { email: 'fabriceib2005@gmail.com', password: 'Fabrice@2005' }

// ── Timeframes ────────────────────────────────────────────────
const TF = [
  { id:'1D',  label:'Daily',  role:'Boss Bias',    color:'#f59e0b', icon:'👑', desc:'HTF direction lock'    },
  { id:'4H',  label:'4 Hour', role:'Manipulation', color:'#a78bfa', icon:'⚡', desc:'Pullback / Inducement' },
  { id:'1H',  label:'1 Hour', role:'Refinement',   color:'#60a5fa', icon:'🔄', desc:'Deeper context'        },
  { id:'15M', label:'15 Min', role:'Setup TF',     color:'#34d399', icon:'🎯', desc:'FVG / BOS / Sweep'     },
  { id:'3M',  label:'3 Min',  role:'Entry TF',     color:'#f87171', icon:'🔫', desc:'Trigger confirmation'  },
]
const ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000]

// ── System Prompt ─────────────────────────────────────────────
const SYS = [
  'You are KojoFX-AI, an elite ICT/SMC institutional trading analyst.',
  'You think exactly like MambaFX, KojoFX, and Viddollars.',
  'You never force trades. You never trade against the Daily bias.',
  '',
  'STEP 1 - INSTRUMENT AUTO-DETECTION:',
  'Read the ticker symbol from the chart images.',
  'Set the instrument field to exactly what you see (e.g. XAUUSD, Volatility 75 Index, Boom 1000, Crash 500, Step Index, Jump 100, EURUSD, NAS100, etc.).',
  'This works for ALL instruments: Forex, Gold, Indices, Crypto, and ALL Weltrade/Deriv synthetics.',
  'NEVER ask the user what the instrument is. Read it from the chart.',
  '',
  'TIMEFRAME ROLES:',
  '1D  = BOSS BIAS - determines the ONLY valid trade direction',
  '4H  = Manipulation Zone - CHOCH against 1D = stop hunt only, never reversal',
  '1H  = Refinement Context',
  '15M = SETUP TIMEFRAME - ALL FVG, BOS, CHOCH, Sweeps, OB identified here',
  '3M  = ENTRY TIMEFRAME - confirmation trigger only',
  '',
  'CORE RULES (NON-NEGOTIABLE):',
  '1. 1D locks bias. BULLISH = LONG only. BEARISH = SHORT only.',
  '2. 4H/1H CHOCH against 1D = manipulation. Never blocks 15M setup.',
  '3. Best 15M setup = Liquidity Sweep then 15M BOS then 15M FVG retest.',
  '4. Entry ONLY after 3M BOS or 3M FVG retest candle close.',
  '5. Risk 0.5-1%. Min RR 1:2.5. SL at 3M/15M structure.',
  '6. No clean 15M setup = noSetup true.',
  '',
  'TP PLACEMENT - GOAL IS TO HIT AT LEAST TP1 TP2 AND TP3:',
  'TP1: nearest 15M liquidity pool - almost certain same session. Close 40%.',
  'TP2: next 15M/1H structure level - highly probable same session. Close 25%.',
  'TP3: significant 15M or 1H imbalance or session high/low. Close 20%.',
  'TP4: next major 4H level or unfilled 4H FVG. Close 10%.',
  'TP5: HTF swing target or 1D premium/discount zone. Close 5%.',
  '',
  'TP SPACING:',
  'TP1 = 1.5x to 2x SL distance from entry',
  'TP2 = no more than 3x SL distance',
  'TP3 = no more than 5x SL distance',
  'TP4 = no more than 8x SL distance',
  'TP5 = no more than 12x SL distance',
  'NEVER skip visible structure to reach better RR.',
  'If opposing structure exists before a TP, place that TP just before it.',
  '',
  'TRAILING SL:',
  'After TP1: move SL to breakeven (entry price)',
  'After TP2: move SL to TP1 price',
  'After TP3: move SL to TP2 price',
  'After TP4: trail to midpoint between TP3 and TP4',
  '',
  'OUTPUT: Return ONLY valid JSON. No markdown. No backticks. No text outside the JSON object.',
  'All prices must match the instrument decimal precision shown on the chart.',
  '',
  '{"instrument":"<exact name from chart>","bias":"BULLISH or BEARISH or NEUTRAL","biasStrength":"STRONG or MODERATE or WEAK","confidence":<0-100>,"setupQuality":"A+ or A or B+ or B or C or NO_SETUP","noSetup":<true or false>,"noSetupReason":"<detailed if noSetup>","hitProbability":{"tp1":"<e.g. 90%>","tp2":"<e.g. 75%>","tp3":"<e.g. 60%>","tp4":"<e.g. 38%>","tp5":"<e.g. 20%>"},"trailingSL":{"afterTP1":"Move SL to entry price","afterTP2":"Move SL to TP1 price","afterTP3":"Move SL to TP2 price","afterTP4":"Trail to TP3-TP4 midpoint"},"analysis":{"daily":"<1D bias, premium/discount, swings, FVG/OB>","h4h1":"<4H/1H manipulation narrative>","m15":"<15M: exact FVG ranges, BOS, sweep, OB, obstacle scan>","m3Entry":"<3M trigger detail and confirmation>"},"trade":{"direction":"LONG or SHORT","entry":<n>,"sl":<n>,"slPips":<n>,"tps":[{"level":"TP1","price":<n>,"rr":"1:X","rrRatio":<n>,"distancePips":<n>,"closePercent":40,"probability":"<e.g. 90%>","notes":"<structure ref>"},{"level":"TP2","price":<n>,"rr":"1:X","rrRatio":<n>,"distancePips":<n>,"closePercent":25,"probability":"<e.g. 75%>","notes":"<ref>"},{"level":"TP3","price":<n>,"rr":"1:X","rrRatio":<n>,"distancePips":<n>,"closePercent":20,"probability":"<e.g. 60%>","notes":"<ref>"},{"level":"TP4","price":<n>,"rr":"1:X","rrRatio":<n>,"distancePips":<n>,"closePercent":10,"probability":"<e.g. 38%>","notes":"<ref>"},{"level":"TP5","price":<n>,"rr":"1:X","rrRatio":<n>,"distancePips":<n>,"closePercent":5,"probability":"<e.g. 20%>","notes":"<ref>"}]},"keyLevels":["<name: price>"],"warnings":["<obstacle or risk>"]}'
].join('\n')

// ── Helpers ───────────────────────────────────────────────────
const getBiasColor = b => b==='BULLISH'?'#00ff88':b==='BEARISH'?'#ff3366':'#a78bfa'
const getQColor    = q => ({'A+':'#00ff88','A':'#34d399','B+':'#f59e0b','B':'#fb923c','C':'#f87171','NO_SETUP':'#3a3a4e'})[q]||'#888'
const getDirColor  = d => d==='LONG'?'#00ff88':'#ff3366'
const fmtP = n => typeof n==='number'?(n>=1000?n.toFixed(2):n>=10?n.toFixed(3):n.toFixed(5)):'--'

const toB64 = f => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload = () => res({ b64: r.result.split(',')[1], type: f.type||'image/png', url: URL.createObjectURL(f) })
  r.onerror = rej
  r.readAsDataURL(f)
})

const repairJSON = str => {
  let s = str.replace(/,\s*$/,'').replace(/:\s*$/,'').replace(/,\s*"[^"]*$/,'')
  let opens=[], inStr=false, esc=false
  for(let i=0;i<s.length;i++){
    const ch=s[i]
    if(esc){esc=false;continue}
    if(ch==='\\'&&inStr){esc=true;continue}
    if(ch==='"'&&!esc){inStr=!inStr;continue}
    if(!inStr){
      if(ch==='{'||ch==='[')opens.push(ch==='{'?'}':']')
      else if(ch==='}'||ch===']')opens.pop()
    }
  }
  if(inStr)s+='"'
  return s+opens.reverse().join('')
}

// ── Login Screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [show,  setShow]  = useState(false)
  const [err,   setErr]   = useState('')
  const [loading, setLoading] = useState(false)

  const attempt = () => {
    if (!email || !pass) { setErr('Enter email and password.'); return }
    setLoading(true)
    setTimeout(() => {
      if (email.trim().toLowerCase() === AUTH.email && pass === AUTH.password) {
        onLogin()
      } else {
        setErr('Invalid credentials. Access denied.')
        setLoading(false)
      }
    }, 800)
  }

  const inp = { width:'100%', background:'#0b0b14', border:'1px solid #1e1e30', borderRadius:10, color:'#dde1f0', fontSize:14, padding:'12px 14px', outline:'none', fontFamily:'inherit' }

  return (
    <div style={{ minHeight:'100vh', background:'#08080f', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400, background:'#0e0e1a', border:'1px solid #1a1a2c', borderRadius:20, padding:36, boxShadow:'0 24px 80px rgba(0,0,0,.6)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:60, height:60, borderRadius:16, background:'linear-gradient(135deg,#f59e0b,#ef4444)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:28, boxShadow:'0 0 32px rgba(245,158,11,.4)' }}>⚡</div>
          <div style={{ fontWeight:900, fontSize:22, color:'#fff', letterSpacing:'-.5px' }}>KojoFX<span style={{ color:'#f59e0b' }}>-AI</span></div>
          <div style={{ color:'#444', fontSize:11, marginTop:4, letterSpacing:2 }}>ICT / SMC ANALYZER v2.0</div>
        </div>
        <div style={{ color:'#555', fontSize:12, textAlign:'center', marginBottom:24 }}>Private access only.</div>

        <div style={{ marginBottom:12 }}>
          <label style={{ color:'#555', fontSize:10, fontWeight:800, display:'block', marginBottom:5 }}>EMAIL</label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14 }}>✉️</span>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={e => { setEmail(e.target.value); setErr('') }}
              onKeyDown={e => e.key==='Enter' && attempt()}
              onFocus={e => e.target.style.borderColor='#f59e0b'}
              onBlur={e  => e.target.style.borderColor='#1e1e30'}
              style={{ ...inp, paddingLeft:40 }}/>
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ color:'#555', fontSize:10, fontWeight:800, display:'block', marginBottom:5 }}>PASSWORD</label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14 }}>🔒</span>
            <input type={show?'text':'password'} placeholder="password" value={pass}
              onChange={e => { setPass(e.target.value); setErr('') }}
              onKeyDown={e => e.key==='Enter' && attempt()}
              onFocus={e => e.target.style.borderColor='#f59e0b'}
              onBlur={e  => e.target.style.borderColor='#1e1e30'}
              style={{ ...inp, paddingLeft:40, paddingRight:44 }}/>
            <button onClick={() => setShow(s=>!s)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', cursor:'pointer', color:'#444', fontSize:14, padding:0 }}>{show?'🙈':'👁'}</button>
          </div>
        </div>

        {err && <div style={{ background:'#ff336610', border:'1px solid #ff336633', borderRadius:9, padding:'9px 14px', color:'#ff6688', fontSize:12, marginBottom:14, textAlign:'center' }}>⚠ {err}</div>}

        <button onClick={attempt} disabled={loading}
          style={{ width:'100%', padding:'14px 0', borderRadius:12, border:'none', background:loading?'#111':'linear-gradient(135deg,#f59e0b,#ef4444)', color:loading?'#444':'#000', fontWeight:900, fontSize:16, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {loading ? <><span style={{ width:16, height:16, border:'2px solid #333', borderTopColor:'#f59e0b', borderRadius:'50%', display:'inline-block', animation:'spin .8s linear infinite' }}/> Authenticating...</> : <>⚡ Access KojoFX-AI</>}
        </button>
        <div style={{ textAlign:'center', color:'#1e1e2e', fontSize:11, marginTop:16 }}>🔐 Secured · Private trading tool</div>
      </div>
    </div>
  )
}

// ── Confidence Ring ───────────────────────────────────────────
function Ring({ val }) {
  const r=30, circ=2*Math.PI*r, dash=(val/100)*circ
  const col = val>=75?'#00ff88':val>=50?'#f59e0b':val>=30?'#fb923c':'#ff3366'
  return (
    <div style={{ position:'relative', width:76, height:76 }}>
      <svg width={76} height={76} style={{ transform:'rotate(-90deg)' }} viewBox="0 0 76 76">
        <circle cx={38} cy={38} r={r} fill="none" stroke="#1a1a2c" strokeWidth={6}/>
        <circle cx={38} cy={38} r={r} fill="none" stroke={col} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} style={{ filter:`drop-shadow(0 0 4px ${col}60)` }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ color:col, fontWeight:900, fontSize:17, lineHeight:1, fontFamily:'monospace' }}>{val}</span>
        <span style={{ color:'#444', fontSize:8 }}>/ 100</span>
      </div>
    </div>
  )
}

// ── Upload Zone ───────────────────────────────────────────────
function Zone({ tf, img, onFile, onRemove }) {
  const [over, setOver] = useState(false)
  const ref = useRef()
  const handle = async f => {
    if (!f || !f.type.startsWith('image/')) return
    onFile(await toB64(f))
  }
  return (
    <div style={{ position:'relative' }}>
      <div onClick={() => ref.current.click()}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]) }}
        style={{ border:`2px dashed ${over?tf.color:img?tf.color+'99':'#1e1e30'}`, borderRadius:12, padding:12, cursor:'pointer', background:over?tf.color+'15':img?tf.color+'08':'#0b0b14', transition:'all .22s', minHeight:118, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, position:'relative', overflow:'hidden' }}>
        <input ref={ref} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handle(e.target.files[0])}/>
        {img ? (
          <>
            <img src={img.url} alt={tf.id} style={{ width:'100%', height:72, objectFit:'cover', borderRadius:8, opacity:.85 }}/>
            <div style={{ color:tf.color, fontSize:11, fontWeight:800 }}>✓ {tf.label} ready</div>
            <div style={{ position:'absolute', top:5, left:5, background:tf.color, color:'#000', borderRadius:4, fontSize:8, fontWeight:900, padding:'1px 6px' }}>{tf.id}</div>
          </>
        ) : (
          <>
            <div style={{ width:40, height:40, borderRadius:'50%', background:tf.color+'18', border:`1px solid ${tf.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{tf.icon}</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ color:tf.color, fontWeight:800, fontSize:12 }}>{tf.id}</div>
              <div style={{ color:'#555', fontSize:10, marginTop:1 }}>{tf.role}</div>
              <div style={{ color:'#2e2e42', fontSize:9, marginTop:2 }}>{tf.desc}</div>
            </div>
            <div style={{ color:over?tf.color:'#252535', fontSize:9 }}>{over?'Release here':'Drop or click'}</div>
          </>
        )}
      </div>
      {img && <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ position:'absolute', top:-7, right:-7, width:20, height:20, borderRadius:'50%', background:'#1a1a2c', border:`1px solid ${tf.color}60`, color:'#ff6680', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, cursor:'pointer', zIndex:10, padding:0 }}>✕</button>}
    </div>
  )
}

// ── Copy Button ───────────────────────────────────────────────
function CopyBtn({ val, color }) {
  const c = color || '#f59e0b'
  const [cp, setCp] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(String(val)).catch(()=>{}); setCp(true); setTimeout(()=>setCp(false),1400) }}
      style={{ background:cp?c+'20':'transparent', border:`1px solid ${cp?c+'50':'#1e1e30'}`, borderRadius:5, color:cp?c:'#444', cursor:'pointer', padding:'3px 7px', fontSize:10, display:'flex', alignItems:'center', gap:3, transition:'all .15s' }}>
      {cp ? '✓' : '📋'}
    </button>
  )
}

// ── TP Table ─────────────────────────────────────────────────
function TPTable({ tps, direction, entry, sl }) {
  const dirCol = getDirColor(direction)
  const tpCols = ['#60a5fa','#34d399','#a78bfa','#f59e0b','#00ff88']
  const maxPips = Math.max(...tps.map(t=>t.distancePips||0), 1)
  const [copAll, setCopAll] = useState(false)
  return (
    <div style={{ background:'#0e0e1a', border:'1px solid #1a1a2c', borderRadius:14, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', borderBottom:'1px solid #14142a', background:'#0b0b14' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:'#aaa', fontSize:11, fontWeight:800, letterSpacing:1 }}>TAKE PROFITS</span>
          <span style={{ background:dirCol+'18', border:`1px solid ${dirCol}35`, borderRadius:5, color:dirCol, fontSize:10, fontWeight:900, padding:'2px 7px' }}>{direction==='LONG'?'▲':'▼'} {direction}</span>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(tps.map(t=>`${t.level}: ${fmtP(t.price)} (${t.rr} | prob: ${t.probability||''})`).join('\n')).catch(()=>{}); setCopAll(true); setTimeout(()=>setCopAll(false),1800) }}
          style={{ background:copAll?'#00ff8818':'transparent', border:`1px solid ${copAll?'#00ff8840':'#1e1e30'}`, borderRadius:6, color:copAll?'#00ff88':'#555', cursor:'pointer', fontSize:10, fontWeight:700, padding:'5px 10px' }}>
          {copAll ? '✓ Copied!' : '📋 Copy All'}
        </button>
      </div>
      {tps.map((tp, i) => {
        const col = tpCols[i] || '#888'
        const pct = Math.min(100, (tp.distancePips/maxPips)*100)
        const rrC = tp.rrRatio>=10?'#00ff88':tp.rrRatio>=6?'#34d399':tp.rrRatio>=3?'#f59e0b':'#fb923c'
        return (
          <div key={tp.level} style={{ display:'grid', gridTemplateColumns:'36px 1fr 58px 42px 58px 32px', alignItems:'center', gap:6, padding:'10px 14px', borderBottom:i<4?'1px solid #0d0d18':'none', background:i%2===1?'#0a0a12':'transparent' }}>
            <div style={{ width:32, height:32, borderRadius:7, background:col+'18', border:`1px solid ${col}35`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:col, fontSize:7 }}>🎯</span>
              <span style={{ color:col, fontSize:9, fontWeight:900 }}>{tp.level}</span>
            </div>
            <div>
              <div style={{ color:col, fontWeight:900, fontSize:14, fontFamily:'monospace' }}>{fmtP(tp.price)}</div>
              <div style={{ height:2, borderRadius:1, background:'#1a1a2c', overflow:'hidden', margin:'3px 0' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:col }}/>
              </div>
              <div style={{ color:'#444', fontSize:9, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tp.notes||''}</div>
            </div>
            <div style={{ background:rrC+'18', borderRadius:5, padding:'3px 0', textAlign:'center', color:rrC, fontWeight:900, fontSize:10, fontFamily:'monospace' }}>{tp.rr}</div>
            <div style={{ textAlign:'center', color:'#666', fontSize:10, fontFamily:'monospace' }}>{tp.distancePips}<div style={{ color:'#333', fontSize:8 }}>pips</div></div>
            <div style={{ textAlign:'center' }}>
              <span style={{ color:col, fontSize:10, fontWeight:800 }}>{tp.probability||''}</span>
              <div style={{ color:'#333', fontSize:8 }}>close {tp.closePercent||''}%</div>
            </div>
            <CopyBtn val={fmtP(tp.price)} color={col}/>
          </div>
        )
      })}
      <div style={{ borderTop:'1px solid #0d0d18', background:'#09090f', padding:'8px 14px', display:'flex', gap:14 }}>
        {[{l:'Entry',v:fmtP(entry)},{l:'SL',v:fmtP(sl)},{l:'Best RR',v:`1:${tps[4]?tps[4].rrRatio:15}`}].map(({l,v}) => (
          <div key={l}><div style={{ color:'#2e2e42', fontSize:9, fontWeight:700 }}>{l}</div><div style={{ color:dirCol, fontWeight:800, fontSize:12, fontFamily:'monospace' }}>{v}</div></div>
        ))}
      </div>
    </div>
  )
}

// ── Analysis Tabs ─────────────────────────────────────────────
function ATabs({ analysis }) {
  const [tab, setTab] = useState('daily')
  const tabs = [
    { id:'daily',   label:'1D Bias',   icon:'👑', color:'#f59e0b' },
    { id:'h4h1',    label:'4H/1H',     icon:'⚡', color:'#a78bfa' },
    { id:'m15',     label:'15M Setup', icon:'🎯', color:'#34d399' },
    { id:'m3Entry', label:'3M Entry',  icon:'🔫', color:'#f87171' },
  ]
  const at = tabs.find(t => t.id===tab) || tabs[0]
  const txt = (analysis && analysis[tab]) || 'No analysis for this timeframe.'

  const KW = { 'BOS':'#34d399','CHOCH':'#a78bfa','FVG':'#60a5fa','OB':'#f59e0b','Liquidity Sweep':'#f87171','liquidity sweep':'#f87171','stop hunt':'#f87171','inducement':'#fb923c','Inducement':'#fb923c','BULLISH':'#00ff88','bullish':'#00ff88','BEARISH':'#ff3366','bearish':'#ff3366','LONG':'#00ff88','SHORT':'#ff3366','manipulation':'#a78bfa','Manipulation':'#a78bfa','premium':'#f87171','Premium':'#f87171','discount':'#34d399','Discount':'#34d399','Smart Money':'#f59e0b','confluence':'#60a5fa' }

  const highlight = text => {
    const keys = Object.keys(KW).sort((a,b) => b.length-a.length)
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    const re = new RegExp(`(${keys.map(esc).join('|')})|([0-9]+\\.[0-9]+)`,'g')
    const parts = []; let last=0, m
    while ((m=re.exec(text))!==null) {
      if (m.index>last) parts.push(<span key={`t${last}`}>{text.slice(last,m.index)}</span>)
      if (m[1]&&KW[m[0]]) {
        parts.push(<mark key={`k${m.index}`} style={{ background:KW[m[0]]+'18', color:KW[m[0]], borderRadius:3, padding:'0 3px', fontWeight:700, fontStyle:'normal', fontSize:'.91em' }}>{m[0]}</mark>)
      } else {
        parts.push(<span key={`n${m.index}`} style={{ color:'#dde1f0', fontFamily:'monospace', fontWeight:600, background:'#1a1a2c', borderRadius:3, padding:'0 2px', fontSize:'.91em' }}>{m[0]}</span>)
      }
      last = m.index+m[0].length
    }
    if (last<text.length) parts.push(<span key={`e${last}`}>{text.slice(last)}</span>)
    return parts
  }

  return (
    <div style={{ background:'#0e0e1a', border:'1px solid #1a1a2c', borderRadius:14, overflow:'hidden' }}>
      <div style={{ display:'flex', borderBottom:'1px solid #14142a', background:'#0b0b14' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:'10px 4px', background:'transparent', border:'none', borderBottom:`2px solid ${tab===t.id?t.color:'transparent'}`, color:tab===t.id?t.color:'#3a3a52', cursor:'pointer', fontSize:10.5, fontWeight:tab===t.id?800:600, transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
            <span style={{ fontSize:12 }}>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:'1px solid #0d0d18', background:'#09090f' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:at.color, boxShadow:`0 0 4px ${at.color}` }}/>
          <span style={{ color:at.color, fontSize:10, fontWeight:800 }}>{at.label.toUpperCase()}</span>
        </div>
        <CopyBtn val={txt} color={at.color}/>
      </div>
      <div style={{ padding:'14px 16px', color:'#9a9ab0', fontSize:12.5, lineHeight:1.85, minHeight:90 }}>{highlight(txt)}</div>
      <div style={{ borderTop:'1px solid #0d0d18', background:'#09090f', padding:'7px 14px', display:'flex', gap:5, flexWrap:'wrap' }}>
        {[['BOS','#34d399'],['CHOCH','#a78bfa'],['FVG','#60a5fa'],['OB','#f59e0b'],['SWEEP','#f87171'],['LONG','#00ff88'],['SHORT','#ff3366'],['PREMIUM','#f87171'],['DISCOUNT','#34d399']].map(([l,c]) => (
          <span key={l} style={{ background:c+'18', color:c, borderRadius:3, padding:'1px 5px', fontSize:9, fontWeight:700 }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

// ── Prop Challenge Form ───────────────────────────────────────
function PropView({ challenge, setChallenge }) {
  const [form, setForm] = useState(challenge || { name:'My Challenge', firmName:'FTMO', accountSize:10000, type:'2-phase', phase:1, profitTarget:8, dailyDD:4, maxDD:8, consistencyRule:'', timeLimitDays:30, currentBalance:10000, todayLoss:0, notes:'' })
  const sf = (k,v) => setForm(p => ({...p,[k]:v}))
  const profitAmt = ((form.accountSize||0)*(form.profitTarget||0)/100).toFixed(0)
  const dailyAmt  = ((form.accountSize||0)*(form.dailyDD||0)/100).toFixed(0)
  const maxAmt    = ((form.accountSize||0)*(form.maxDD||0)/100).toFixed(0)
  const inp = { background:'#0b0b14', border:'1px solid #1e1e30', borderRadius:8, color:'#dde1f0', fontSize:13, padding:'9px 12px', width:'100%', outline:'none', fontFamily:'inherit' }
  const lbl = { color:'#555', fontSize:10, fontWeight:800, letterSpacing:.8, display:'block', marginBottom:5 }

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:17, marginBottom:4 }}>🏆 Prop Firm Challenge</div>
      <div style={{ color:'#444', fontSize:12, marginBottom:20 }}>Configure rules - AI checks compliance on every analysis</div>
      {challenge && (
        <div style={{ background:'#f59e0b0a', border:'1px solid #f59e0b30', borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
          <div style={{ color:'#f59e0b', fontWeight:800, fontSize:13, marginBottom:8 }}>Active: {challenge.name}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[['Account',`$${(challenge.accountSize||0).toLocaleString()}`],['Target',`${challenge.profitTarget}%`],['Daily DD',`${challenge.dailyDD}%`],['Max DD',`${challenge.maxDD}%`],['Phase',`Phase ${challenge.phase}`],['Type',challenge.type]].map(([l,v]) => (
              <div key={l} style={{ background:'#0b0b14', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ color:'#444', fontSize:9, fontWeight:700 }}>{l}</div>
                <div style={{ color:'#aaa', fontWeight:800, fontSize:12 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ background:'#0e0e1a', border:'1px solid #1a1a2c', borderRadius:14, padding:18, display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div><label style={lbl}>CHALLENGE NAME</label><input value={form.name} onChange={e=>sf('name',e.target.value)} style={inp}/></div>
          <div><label style={lbl}>FIRM NAME</label><input value={form.firmName} onChange={e=>sf('firmName',e.target.value)} placeholder="FTMO, MFF..." style={inp}/></div>
        </div>
        <div>
          <label style={lbl}>ACCOUNT SIZE</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {ACCOUNT_SIZES.map(s => (
              <button key={s} onClick={() => sf('accountSize',s)} style={{ background:form.accountSize===s?'#f59e0b18':'transparent', border:`1px solid ${form.accountSize===s?'#f59e0b40':'#1e1e30'}`, borderRadius:7, color:form.accountSize===s?'#f59e0b':'#555', cursor:'pointer', fontSize:12, fontWeight:700, padding:'6px 10px' }}>${s.toLocaleString()}</button>
            ))}
          </div>
          <input type="number" placeholder="Custom..." value={form.accountSize} onChange={e=>sf('accountSize',Number(e.target.value)||0)} style={{...inp,width:160}}/>
        </div>
        <div>
          <label style={lbl}>CHALLENGE TYPE</label>
          <div style={{ display:'flex', gap:6 }}>
            {[['instant','Instant'],['1-phase','1-Phase'],['2-phase','2-Phase']].map(([v,l]) => (
              <button key={v} onClick={() => sf('type',v)} style={{ flex:1, background:form.type===v?'#60a5fa18':'transparent', border:`1px solid ${form.type===v?'#60a5fa40':'#1e1e30'}`, borderRadius:7, color:form.type===v?'#60a5fa':'#555', cursor:'pointer', fontSize:11, fontWeight:700, padding:'8px 4px' }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div><label style={lbl}>PROFIT TARGET %</label><input type="number" step="0.5" value={form.profitTarget} onChange={e=>sf('profitTarget',Number(e.target.value))} style={inp}/><div style={{ color:'#34d399', fontSize:10, marginTop:3, fontFamily:'monospace' }}>${profitAmt}</div></div>
          <div><label style={lbl}>DAILY DD %</label><input type="number" step="0.5" value={form.dailyDD} onChange={e=>sf('dailyDD',Number(e.target.value))} style={inp}/><div style={{ color:'#f87171', fontSize:10, marginTop:3, fontFamily:'monospace' }}>${dailyAmt}</div></div>
          <div><label style={lbl}>MAX DD %</label><input type="number" step="0.5" value={form.maxDD} onChange={e=>sf('maxDD',Number(e.target.value))} style={inp}/><div style={{ color:'#f87171', fontSize:10, marginTop:3, fontFamily:'monospace' }}>${maxAmt}</div></div>
          <div><label style={lbl}>TIME LIMIT (DAYS)</label><input type="number" value={form.timeLimitDays} onChange={e=>sf('timeLimitDays',Number(e.target.value))} style={inp}/></div>
          <div><label style={lbl}>CONSISTENCY RULE %</label><input type="number" step="0.5" placeholder="e.g. 40" value={form.consistencyRule} onChange={e=>sf('consistencyRule',e.target.value)} style={inp}/></div>
          <div><label style={lbl}>CURRENT BALANCE $</label><input type="number" value={form.currentBalance} onChange={e=>sf('currentBalance',Number(e.target.value))} style={inp}/></div>
        </div>
        <div><label style={lbl}>NOTES</label><textarea value={form.notes} onChange={e=>sf('notes',e.target.value)} rows={3} placeholder="Any special rules..." style={{...inp,resize:'vertical'}}/></div>
        <button onClick={() => { if(!form.name.trim()){alert('Enter challenge name');return;} setChallenge({...form}); alert('Challenge saved! Enable Prop Mode on Upload tab.') }}
          style={{ width:'100%', padding:'13px 0', borderRadius:10, border:'none', background:'linear-gradient(135deg,#f59e0b,#ef4444)', color:'#000', fontWeight:900, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          🏆 Save Challenge
        </button>
      </div>
    </div>
  )
}

// ══ MAIN APP ══════════════════════════════════════════════════
export default function App() {
  const [loggedIn,  setLoggedIn]  = useState(false)
  const [imgs,      setImgs]      = useState({})
  const [busy,      setBusy]      = useState(false)
  const [result,    setResult]    = useState(null)
  const [history,   setHistory]   = useState([])
  const [err,       setErr]       = useState('')
  const [view,      setView]      = useState('upload')
  const [propMode,  setPropMode]  = useState(false)
  const [challenge, setChallenge] = useState(null)

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)}/>

  const count    = Object.keys(imgs).length
  const allReady = count === 5
  const addImg   = (id,d) => setImgs(p => ({...p,[id]:d}))
  const delImg   = id => setImgs(p => { const n={...p}; delete n[id]; return n })

  const analyze = async fast => {
    const missing = TF.filter(t => !imgs[t.id])
    if (missing.length) { setErr(`Missing charts: ${missing.map(t=>t.id).join(', ')}`); return }
    setBusy(true); setErr('')
    try {
      const content = []
      TF.forEach((t,i) => {
        content.push({type:'text', text:`[CHART ${i+1}/5 | ${t.id} | ${t.role.toUpperCase()}]`})
        content.push({type:'image', source:{type:'base64', media_type:imgs[t.id].type, data:imgs[t.id].b64}})
      })
      let sys = SYS
      if (propMode && challenge) {
        const pa = ((challenge.accountSize||0)*(challenge.profitTarget||0)/100).toFixed(0)
        const da = ((challenge.accountSize||0)*(challenge.dailyDD||0)/100).toFixed(0)
        const ma = ((challenge.accountSize||0)*(challenge.maxDD||0)/100).toFixed(0)
        sys += `\n\nPROP FIRM CONTEXT:\nName: ${challenge.name}, Firm: ${challenge.firmName}\nAccount: $${challenge.accountSize}, Type: ${challenge.type}, Phase: ${challenge.phase}\nProfit Target: ${challenge.profitTarget}% ($${pa}), Daily DD: ${challenge.dailyDD}% ($${da}), Max DD: ${challenge.maxDD}% ($${ma})\nBalance: $${challenge.currentBalance}, Today Loss: ${challenge.todayLoss||0}%\nADD propAnalysis field: {"propAnalysis":{"respectsDailyDD":<bool>,"respectsMaxDD":<bool>,"profitContribution":"<% of target>","projectedBalance":<n>,"warnings":["<breach>"],"recommendation":"<trade or skip>"}}`
      }
      content.push({type:'text', text:'Auto-detect instrument from chart. Apply all ICT/SMC rules. Return ONLY valid JSON.'})

      // Calls our Netlify Function (not Anthropic directly - avoids CORS)
      const res = await fetch('/.netlify/functions/analyze', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          model: fast ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6',
          max_tokens: 4000,
          system: sys,
          messages: [{role:'user', content}]
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || `API Error ${res.status}`)
      let raw = (data.content||[]).map(b=>b.text||'').join('').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim()
      let parsed
      try { parsed = JSON.parse(raw) }
      catch(e1) {
        try { parsed = JSON.parse(repairJSON(raw)) }
        catch(e2) {
          const bM = raw.match(/"bias"\s*:\s*"([^"]+)"/)
          if (bM) { parsed = {bias:bM[1],biasStrength:'MODERATE',confidence:50,setupQuality:'NO_SETUP',noSetup:true,noSetupReason:'Response truncated - please retry.',analysis:{daily:'Retry.',h4h1:'',m15:'',m3Entry:''},trade:null,keyLevels:[],warnings:['Response truncated - retry.']} }
          else throw new Error('Could not parse AI response. Try Quick Analyze (Haiku).')
        }
      }
      parsed._pair = parsed.instrument || 'AUTO-DETECTED'
      parsed._ts   = new Date().toISOString()
      parsed._id   = crypto.randomUUID()
      setResult(parsed)
      setHistory(p => [parsed,...p].slice(0,10))
      setView('result')
    } catch(e) {
      setErr('Analysis failed: '+(e.message||'Unknown error.'))
    }
    setBusy(false)
  }

  const card     = { background:'#0e0e1a', border:'1px solid #1a1a2c', borderRadius:14 }
  const biasC    = result ? getBiasColor(result.bias) : '#888'
  const dirC     = result && result.trade ? getDirColor(result.trade.direction) : '#888'
  const arrow    = !result ? '' : result.bias==='BULLISH'?'▲':result.bias==='BEARISH'?'▼':'◆'

  const NavBtn = ({id, label, disabled: dis}) => {
    const active = view===id
    return (
      <button onClick={() => { if(!dis) setView(id) }} disabled={dis}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', background:active?'rgba(245,158,11,.10)':'transparent', border:`1px solid ${active?'rgba(245,158,11,.28)':'transparent'}`, borderRadius:9, color:dis?'#252535':active?'#f59e0b':'#3a3a52', fontSize:12, fontWeight:active?800:600, cursor:dis?'not-allowed':'pointer', transition:'all .2s', whiteSpace:'nowrap' }}>
        {label}
      </button>
    )
  }

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", minHeight:'100vh', background:'#08080f', color:'#dde1f0' }}>

      {/* HEADER */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#0a0a14', borderBottom:'1px solid #14142a' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'0 14px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div onClick={() => setView('upload')} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#f59e0b,#ef4444)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:'0 0 12px rgba(245,158,11,.3)' }}>⚡</div>
            <div>
              <div style={{ fontWeight:900, fontSize:14, color:'#fff', lineHeight:1 }}>KojoFX<span style={{ color:'#f59e0b' }}>-AI</span></div>
              <div style={{ fontSize:8, color:'#f59e0b', fontWeight:800, letterSpacing:1.5, marginTop:1 }}>ICT / SMC v2.0</div>
            </div>
          </div>
          <nav style={{ display:'flex', gap:2, overflow:'auto' }}>
            <NavBtn id="upload"  label="📊 Upload"/>
            <NavBtn id="result"  label="⚡ Analysis" disabled={!result}/>
            <NavBtn id="history" label={`🕒 History${history.length>0?' ('+history.length+')':''}`}/>
            <NavBtn id="prop"    label={challenge?'🏆 Challenge':'🏆 Prop Firm'}/>
          </nav>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:busy?'#f59e0b':'#00ff88', boxShadow:busy?'0 0 6px #f59e0b':'0 0 5px #00ff88' }}/>
            <span style={{ color:busy?'#f59e0b':'#1a2a1a', fontSize:9, fontWeight:700 }}>{busy?'ANALYZING':'READY'}</span>
            <button onClick={() => setLoggedIn(false)} style={{ background:'transparent', border:'1px solid #1a1a2c', borderRadius:6, color:'#444', cursor:'pointer', padding:'4px 8px', fontSize:10, fontWeight:700 }}>🚪 Exit</button>
          </div>
        </div>
        {busy && <div style={{ height:2, background:'linear-gradient(90deg,#f59e0b,#ef4444)' }}/>}
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'18px 14px 60px' }}>

        {/* UPLOAD */}
        {view==='upload' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, background:'#0b0b14', border:'1px solid #1e1e30', borderRadius:10, padding:'10px 14px' }}>
              <span style={{ fontSize:18 }}>🔍</span>
              <div>
                <div style={{ color:'#f59e0b', fontWeight:800, fontSize:13 }}>Auto-Detect Mode</div>
                <div style={{ color:'#444', fontSize:11, marginTop:2 }}>AI reads instrument from your charts. Works for Forex, Gold, Indices, Crypto, and all Weltrade Synthetics (Volatility, Boom, Crash, Step, Jump, Range Break...)</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              {TF.slice(0,4).map(tf => <Zone key={tf.id} tf={tf} img={imgs[tf.id]} onFile={d=>addImg(tf.id,d)} onRemove={()=>delImg(tf.id)}/>)}
            </div>
            <Zone tf={TF[4]} img={imgs['3M']} onFile={d=>addImg('3M',d)} onRemove={()=>delImg('3M')}/>
            <div style={{ display:'flex', gap:5, margin:'12px 0 0' }}>
              {TF.map(tf => (
                <div key={tf.id} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ height:3, borderRadius:2, background:imgs[tf.id]?tf.color:'#1a1a2a', transition:'background .35s' }}/>
                  <div style={{ color:imgs[tf.id]?tf.color:'#252535', fontSize:9, fontWeight:700, marginTop:3 }}>{tf.id}</div>
                </div>
              ))}
            </div>
            <div onClick={() => setPropMode(p=>!p)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:propMode?'#f59e0b0a':'#0b0b14', border:`1px solid ${propMode?'#f59e0b30':'#1a1a2c'}`, borderRadius:10, padding:'11px 14px', marginTop:14, cursor:'pointer', transition:'all .2s' }}>
              <div>
                <div style={{ color:propMode?'#f59e0b':'#555', fontWeight:800, fontSize:13 }}>🏆 Prop Firm Challenge Mode</div>
                <div style={{ color:'#333', fontSize:11, marginTop:2 }}>{propMode?(challenge?`Active: ${challenge.name}`:'No challenge set - go to Prop Firm tab'):'Enable to check prop firm rule compliance'}</div>
              </div>
              <span style={{ fontSize:20, color:propMode?'#f59e0b':'#333' }}>{propMode?'🟡':'⬜'}</span>
            </div>
            {propMode && !challenge && (
              <div style={{ background:'#ff336610', border:'1px solid #ff336633', borderRadius:9, padding:'9px 14px', color:'#ff6688', fontSize:12, marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
                No challenge configured.
                <button onClick={() => setView('prop')} style={{ background:'#ff336620', border:'1px solid #ff336640', borderRadius:5, color:'#ff9988', cursor:'pointer', padding:'2px 8px', fontSize:11, fontWeight:700 }}>Set up</button>
              </div>
            )}
            {err && <div style={{ background:'#ff336610', border:'1px solid #ff336633', borderRadius:9, padding:'10px 14px', color:'#ff6688', fontSize:13, marginTop:12 }}>⚠ {err}</div>}
            <button onClick={() => analyze(false)} disabled={busy||!allReady}
              style={{ width:'100%', padding:'14px 0', borderRadius:12, border:'none', marginTop:14, background:(allReady&&!busy)?'linear-gradient(135deg,#f59e0b,#ef4444)':'#111', color:(allReady&&!busy)?'#000':'#333', fontWeight:900, fontSize:15, cursor:(busy||!allReady)?'not-allowed':'pointer', transition:'all .3s', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:(allReady&&!busy)?'0 0 24px #f59e0b25':'none' }}>
              {busy ? <><span style={{ width:15, height:15, border:'2px solid #333', borderTopColor:'#f59e0b', borderRadius:'50%', display:'inline-block', animation:'spin .8s linear infinite' }}/> Analyzing charts...</> : <>⚡ Analyze Charts{propMode&&challenge?' [PROP]':''} ({count}/5)</>}
            </button>
            {allReady && !busy && (
              <button onClick={() => analyze(true)} style={{ width:'100%', padding:'9px 0', borderRadius:10, border:'1px solid #1a1a2c', background:'transparent', color:'#555', fontWeight:700, fontSize:12, marginTop:8, cursor:'pointer' }}>
                ⚡ Quick Analyze (Haiku - faster)
              </button>
            )}
            {!allReady && <div style={{ textAlign:'center', color:'#1e1e2e', fontSize:12, marginTop:8 }}>{5-count} more chart{5-count!==1?'s':''} needed</div>}
            <div style={{...card, padding:'12px 14px', marginTop:18}}>
              <div style={{ color:'#252535', fontSize:9, fontWeight:800, marginBottom:8, letterSpacing:1 }}>ICT/SMC RULES ENFORCED BY AI</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[['👑','1D bias = sole direction'],['⚡','4H/1H CHOCH = Manipulation'],['🎯','All setups on 15M only'],['🔫','Entry confirmed on 3M only'],['📏','Min RR 1:2.5, Risk 0.5-1%'],['🛡','Goal: hit TP1 + TP2 + TP3']].map(([ic,tx],i) => (
                  <div key={i} style={{ display:'flex', gap:6, alignItems:'center', color:'#333', fontSize:11 }}><span>{ic}</span>{tx}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESULT */}
        {view==='result' && result && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:biasC+'0a', border:`1px solid ${biasC}30`, borderRadius:14, padding:'18px 18px 14px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:biasC+'0c', filter:'blur(40px)', pointerEvents:'none' }}/>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ background:'#1a1a2c', borderRadius:6, color:'#dde1f0', fontWeight:800, fontSize:12, padding:'2px 9px', fontFamily:'monospace' }}>{result._pair}</span>
                  <div style={{ background:getQColor(result.setupQuality)+'18', border:`1px solid ${getQColor(result.setupQuality)}35`, borderRadius:6, padding:'3px 9px', display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:getQColor(result.setupQuality) }}/>
                    <span style={{ color:getQColor(result.setupQuality), fontSize:10, fontWeight:800 }}>{result.setupQuality}</span>
                  </div>
                </div>
                <Ring val={result.confidence}/>
              </div>
              <div style={{ color:biasC, fontSize:26, fontWeight:900, letterSpacing:-1, lineHeight:1, marginBottom:6 }}>{arrow} {result.bias}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:120, height:4, borderRadius:2, background:'#1a1a2c', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:2, background:biasC, width:result.biasStrength==='STRONG'?'100%':result.biasStrength==='MODERATE'?'60%':'30%' }}/>
                </div>
                <span style={{ color:'#444', fontSize:10 }}>{result.biasStrength}</span>
              </div>
              {result.hitProbability && (
                <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                  {Object.entries(result.hitProbability).map(([k,v]) => {
                    const cols = {tp1:'#60a5fa',tp2:'#34d399',tp3:'#a78bfa',tp4:'#f59e0b',tp5:'#00ff88'}
                    const c = cols[k] || '#888'
                    return (<div key={k} style={{ background:c+'15', border:`1px solid ${c}30`, borderRadius:6, padding:'3px 8px', textAlign:'center' }}>
                      <div style={{ color:c, fontSize:9, fontWeight:800 }}>{k.toUpperCase()}</div>
                      <div style={{ color:c, fontSize:11, fontWeight:900 }}>{v}</div>
                    </div>)
                  })}
                </div>
              )}
              {result.trade && result.trade.direction && (
                <div style={{ marginTop:10 }}>
                  <span style={{ background:dirC+'15', border:`1px solid ${dirC}35`, borderRadius:6, color:dirC, fontSize:12, fontWeight:900, padding:'4px 12px' }}>
                    {result.trade.direction==='LONG'?'▲':'▼'} {result.trade.direction}
                  </span>
                </div>
              )}
              <div style={{ marginTop:10, color:'#252535', fontSize:10, textAlign:'right' }}>{new Date(result._ts).toLocaleString()} - KojoFX-AI</div>
            </div>

            {result.noSetup ? (
              <div style={{ background:'#f59e0b08', border:'1px solid #f59e0b25', borderRadius:12, padding:'24px 18px', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>⏸</div>
                <div style={{ color:'#f59e0b', fontWeight:900, fontSize:16, marginBottom:8 }}>No Valid Setup - Wait for Confluence</div>
                <div style={{ color:'#666', fontSize:13, lineHeight:1.75 }}>{result.noSetupReason}</div>
              </div>
            ) : result.trade ? (
              <>
                <div style={{ display:'flex', gap:8 }}>
                  {[{label:'ENTRY',val:fmtP(result.trade.entry),color:'#60a5fa',icon:'🎯'},{label:'STOP LOSS',val:fmtP(result.trade.sl),color:'#ff3366',icon:'🛡'},{label:'SL PIPS',val:`${result.trade.slPips}p`,color:'#f87171',icon:'📏'}].map(item => (
                    <div key={item.label} style={{ flex:1, background:'#0b0b14', border:`1px solid ${item.color}22`, borderRadius:10, padding:'10px 11px' }}>
                      <div style={{ color:'#444', fontSize:9, fontWeight:700, marginBottom:4, letterSpacing:.8 }}>{item.icon} {item.label}</div>
                      <div style={{ color:item.color, fontWeight:900, fontSize:14, fontFamily:'monospace', marginBottom:5 }}>{item.val}</div>
                      <CopyBtn val={item.val} color={item.color}/>
                    </div>
                  ))}
                </div>
                {result.trailingSL && (
                  <div style={{...card, padding:'12px 14px'}}>
                    <div style={{ color:'#555', fontSize:10, fontWeight:800, marginBottom:8, letterSpacing:1 }}>TRAILING SL PLAN</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {Object.entries(result.trailingSL).map(([k,v]) => (
                        <div key={k} style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={{ color:'#34d399', fontSize:9, fontWeight:800, minWidth:70, flexShrink:0 }}>{k.replace('after','After ')}</span>
                          <span style={{ color:'#666', fontSize:11 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <TPTable tps={result.trade.tps} direction={result.trade.direction} entry={result.trade.entry} sl={result.trade.sl}/>
              </>
            ) : null}

            {result.propAnalysis && (
              <div style={{ background:'#0e0e1a', border:'1px solid #f59e0b30', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', borderBottom:'1px solid #14142a', background:'#0b0b14', display:'flex', alignItems:'center', gap:7 }}>
                  <span>🏆</span><span style={{ color:'#f59e0b', fontSize:11, fontWeight:800, letterSpacing:1 }}>PROP FIRM COMPLIANCE</span>
                </div>
                <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[['Daily DD',result.propAnalysis.respectsDailyDD?'OK':'BREACHED',result.propAnalysis.respectsDailyDD?'#00ff88':'#ff3366'],['Max DD',result.propAnalysis.respectsMaxDD?'OK':'BREACHED',result.propAnalysis.respectsMaxDD?'#00ff88':'#ff3366'],['Phase %',String(result.propAnalysis.profitContribution),'#60a5fa'],['Proj. Bal',`$${(result.propAnalysis.projectedBalance||0).toLocaleString()}`,'#34d399']].map(([l,v,c]) => (
                    <div key={l} style={{ background:c+'0c', border:`1px solid ${c}20`, borderRadius:8, padding:'9px 10px' }}>
                      <div style={{ color:'#444', fontSize:9, fontWeight:700, marginBottom:3 }}>{l}</div>
                      <div style={{ color:c, fontWeight:900, fontSize:13 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {result.propAnalysis.recommendation && (
                  <div style={{ margin:'0 14px 14px', background:'#f59e0b0a', border:'1px solid #f59e0b20', borderRadius:8, padding:'9px 12px' }}>
                    <div style={{ color:'#f59e0b', fontSize:9, fontWeight:800, marginBottom:4 }}>AI RECOMMENDATION</div>
                    <div style={{ color:'#aaa', fontSize:12, lineHeight:1.7 }}>{result.propAnalysis.recommendation}</div>
                  </div>
                )}
              </div>
            )}

            <ATabs analysis={result.analysis}/>

            {result.keyLevels && result.keyLevels.length > 0 && (
              <div style={card}>
                <div style={{ padding:'10px 14px', borderBottom:'1px solid #14142a', background:'#0b0b14' }}>
                  <span style={{ color:'#aaa', fontSize:11, fontWeight:800, letterSpacing:1 }}>KEY LEVELS</span>
                </div>
                {result.keyLevels.map((lv,i) => {
                  const price=(lv.match(/[0-9]+\.[0-9]+/)||[])[0]
                  const lo=lv.toLowerCase()
                  const type=lo.includes('fvg')?'FVG':lo.includes('ob')?'OB':lo.includes('sweep')?'SWP':lo.includes('bos')?'BOS':'LVL'
                  const cols={FVG:'#60a5fa',OB:'#f59e0b',SWP:'#f87171',BOS:'#34d399',LVL:'#555'}
                  const col=cols[type]
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderBottom:i<result.keyLevels.length-1?'1px solid #0d0d18':'none' }}>
                      <span style={{ background:col+'18', color:col, borderRadius:4, fontSize:8, fontWeight:900, padding:'2px 5px', minWidth:28, textAlign:'center' }}>{type}</span>
                      <span style={{ flex:1, color:'#888', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lv.replace(/:\s*[0-9.]+/,'').trim()}</span>
                      {price && <><span style={{ color:col, fontFamily:'monospace', fontWeight:700, fontSize:12, flexShrink:0 }}>{price}</span><CopyBtn val={price} color={col}/></>}
                    </div>
                  )
                })}
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div style={card}>
                <div style={{ padding:'10px 14px', borderBottom:'1px solid #14142a', background:'#0b0b14' }}>
                  <span style={{ color:'#f59e0b', fontSize:11, fontWeight:800, letterSpacing:1 }}>⚠ WARNINGS</span>
                </div>
                <div style={{ padding:'8px 0' }}>
                  {result.warnings.map((w,i) => {
                    const hi=w.toLowerCase().includes('news')||w.toLowerCase().includes('fomc')||w.toLowerCase().includes('breach')
                    const c=hi?'#ff3366':'#f59e0b'
                    return (
                      <div key={i} style={{ display:'flex', gap:8, padding:'7px 14px', margin:'0 8px 5px', background:c+'10', border:`1px solid ${c}25`, borderRadius:8 }}>
                        <span>{hi?'🚨':'⚠️'}</span>
                        <span style={{ color:c, fontSize:12, lineHeight:1.6 }}>{w}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button onClick={() => { setImgs({}); setErr(''); setView('upload') }} style={{...card, background:'transparent', color:'#555', borderRadius:9, padding:11, cursor:'pointer', fontSize:13, fontWeight:700, width:'100%', textAlign:'center', border:'1px solid #1a1a2c' }}>
              New Analysis
            </button>
          </div>
        )}

        {/* HISTORY */}
        {view==='history' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>Session History</div>
                <div style={{ color:'#444', fontSize:12, marginTop:2 }}>{history.length} analyses this session</div>
              </div>
              {history.length > 0 && <button onClick={() => setHistory([])} style={{ background:'transparent', border:'1px solid #1a1a2c', borderRadius:8, color:'#f87171', padding:'6px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}>Clear All</button>}
            </div>
            {history.length === 0 ? (
              <div style={{...card, padding:'50px 24px', textAlign:'center'}}>
                <div style={{ fontSize:36, marginBottom:14 }}>📊</div>
                <div style={{ color:'#333', fontSize:14 }}>No analyses yet.</div>
              </div>
            ) : history.map((h,i) => {
              const col = getBiasColor(h.bias)
              return (
                <div key={h._id} onClick={() => { setResult(h); setView('result') }}
                  style={{...card, padding:'12px 14px', marginBottom:8, cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'border-color .2s'}}
                  onMouseEnter={e => e.currentTarget.style.borderColor=col+'40'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#1a1a2c'}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:col, boxShadow:`0 0 5px ${col}`, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ color:'#eee', fontWeight:800, fontSize:13 }}>{h._pair}</span>
                      <span style={{ color:col, fontWeight:900, fontSize:11 }}>{h.bias==='BULLISH'?'▲':h.bias==='BEARISH'?'▼':'◆'} {h.bias}</span>
                      {h.propAnalysis && <span style={{ background:'#f59e0b12', borderRadius:4, color:'#f59e0b', fontSize:9, fontWeight:800, padding:'1px 5px' }}>PROP</span>}
                    </div>
                    <div style={{ color:'#333', fontSize:11, marginTop:2 }}>{new Date(h._ts).toLocaleString()}</div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                    <span style={{ background:getQColor(h.setupQuality)+'18', borderRadius:5, color:getQColor(h.setupQuality), fontSize:10, fontWeight:900, padding:'2px 7px' }}>{h.setupQuality}</span>
                    <span style={{ color:'#333', fontSize:11, fontFamily:'monospace' }}>C:{h.confidence}</span>
                    <span style={{ color:'#333' }}>›</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* PROP */}
        {view==='prop' && <PropView challenge={challenge} setChallenge={setChallenge}/>}

      </div>
    </div>
  )
}