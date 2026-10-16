import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, Bot, CheckCircle2, ChevronRight, CircleAlert, Clock3, CreditCard, RefreshCw, Search, ShieldCheck, Sparkles } from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const money = (n, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)

function App() {
  const [transactions, setTransactions] = useState([])
  const [merchantDecisions, setMerchantDecisions] = useState([])
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')  
  const [selectedId, setSelectedId] = useState(null)
  useEffect(() => {
    setNote('')
    setMessage('')
  }, [selectedId])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [decision, setDecision] = useState('')
  const [investigation, setInvestigation] = useState(null)
  const [investigating, setInvestigating] = useState(false)
  const [investigationError, setInvestigationError] = useState('')
  const [investigationOpen, setInvestigationOpen] = useState(false)
  const [historyItem, setHistoryItem] = useState(null)
  const [investigationHistory, setInvestigationHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('trustai-investigation-history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        'trustai-investigation-history',
        JSON.stringify(investigationHistory)
      )
    } catch (error) {
      console.error('Failed to save investigation history:', error)
    }
  }, [investigationHistory])

  async function load() {
    setLoading(true); setError('')
    try {
      const [transactionsRes, decisionsRes] = await Promise.all([
      fetch(`${API}/api/transactions`),
      fetch(`${API}/api/merchant-decisions`),
    ])

    if (!transactionsRes.ok) {
      throw new Error(`Transactions API returned ${transactionsRes.status}`)
    }

    if (!decisionsRes.ok) {
      throw new Error(`Merchant decisions API returned ${decisionsRes.status}`)
    }

    const data = await transactionsRes.json()
    const decisions = await decisionsRes.json()

    setTransactions(data)
    setMerchantDecisions(decisions)
    setSelectedId(current => current && data.some(t => t.id === current) ? current : data[0]?.id)
    } catch (e) {
    setError(`Could not reach the API at ${API}. Start the FastAPI backend and refresh.`)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  const filtered = useMemo(() => transactions.filter(t =>
    `${t.id} ${t.customer} ${t.status}`.toLowerCase().includes(query.toLowerCase())
  ), [transactions, query])
  const selected = transactions.find(t => t.id === selectedId)
  const high = transactions.filter(t => t.assessment.level === 'HIGH').length
  const review = transactions.filter(t => t.status === 'PENDING_REVIEW').length
  const volume = transactions.reduce((sum, t) => sum + t.amount, 0)

  async function submitReview(nextDecision) {
    if (!selected) return
    if (nextDecision === 'REJECT' && !note.trim()) {
      setMessage('Please provide a review note before rejecting this order.')
      return
    }
    setDecision(nextDecision); setMessage('')
    try {
      const res = await fetch(`${API}/api/transactions/${selected.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: nextDecision, note })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Request failed')
      setMerchantDecisions((current) => {
        const updatedDecision = {
          transaction_id: selected.id,
          decision: data.decision,
          note: data.note,
        }

        const exists = current.some(
          (item) => item.transaction_id === selected.id
        )

        return exists
          ? current.map((item) =>
              item.transaction_id === selected.id ? updatedDecision : item
            )
          : [...current, updatedDecision]
      })

      setMessage(
        `Demo decision recorded for ${selected.id}: ${nextDecision.replaceAll('_', ' ')}.`
      )
    } catch (e) { setMessage(`Could not record decision: ${e.message}`) }
  }

  async function investigateTransaction() {
    if (!selected || investigating) return

    setInvestigating(true)
    setInvestigation(null)
    setInvestigationError('')

    try {
      const res = await fetch(
        `${API}/api/transactions/${selected.id}/investigate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question:
              'Explain the transaction risk signals, why they were triggered, and what checks a human reviewer should perform.',
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.detail || `Investigation failed (${res.status})`
        )
      }

      setInvestigation(data)
      setInvestigationOpen(true)
      setInvestigationHistory((prev) => [
        {
          transactionId: selected.id,
          result: data,
          timestamp: new Date().toLocaleString(),
        },
        ...prev,
      ])
    } catch (e) {
      setInvestigationError(
        e.message || 'Could not complete the investigation.'
      )
    } finally {
      setInvestigating(false)
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><ShieldCheck size={22}/></div><div><strong>TrustAI</strong><span>PAYMENT INTELLIGENCE</span></div></div>
      <div className="workspace"><span className="workspace-dot"/> Demo workspace <span className="chev">⌄</span></div>
      <nav>
        <div className="nav-label">WORKSPACE</div>
        <a className="nav-item active"><Activity size={17}/> Risk overview</a>
        <a className="nav-item"><CreditCard size={17}/> Transactions <span className="nav-count">{transactions.length}</span></a>
        <a className="nav-item"><Bot size={17}/> AI investigations <span className="soon">MVP</span></a>
      </nav>
      <div className="sidebar-bottom"><div className="secure-icon"><ShieldCheck size={16}/></div><div><strong>Sandbox environment</strong><span>Synthetic demo data only</span></div><span className="green-dot"/></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumbs">Workspace <ChevronRight size={14}/> <strong>Risk overview</strong></div><div className="top-right"><span className="live-dot"/> Demo mode <div className="avatar">TC</div></div></header>
      <section className="page-heading"><div><div className="eyebrow"><Sparkles size={14}/> AI-POWERED PAYMENT INTELLIGENCE</div><h1>Risk overview</h1><p>Investigate payment signals, understand risk, and make informed review decisions.</p></div><button className="button secondary" onClick={load}><RefreshCw size={15}/> Refresh data</button></section>

      {error && (
        <div
          className="error-banner"
          role="alert"
          style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
        >
          <CircleAlert size={18} />{error}
        </div>
      )}
      <div className="demo-notice"><CircleAlert size={16}/><span><strong>Prototype mode:</strong> Risk indicators are calculated from synthetic example data. They are not PayPal fraud scores or production fraud detection.</span></div>

      <section className="metrics">
        <Metric icon={<CreditCard size={18}/>} label="Sample transactions" value={loading ? '—' : transactions.length} note="Synthetic demo records" trend="neutral"/>
        <Metric icon={<CircleAlert size={18}/>} label="High-risk indicators" value={loading ? '—' : high} note="Requires manual investigation" trend="warning"/>
        <Metric icon={<Clock3 size={18}/>} label="Pending review" value={loading ? '—' : review} note="Demo transaction status" trend="neutral"/>
        <Metric icon={<Activity size={18}/>} label="Sample payment volume" value={loading ? '—' : money(volume, 'USD')} note="Across demo records" trend="positive"/>
      </section>

      <section className="content-grid">
        <div className="panel transactions-panel">
          <div className="panel-heading"><div><h2>Recent transactions</h2><p>Choose a transaction to inspect its risk evidence.</p></div><span className="small-tag">{filtered.length} records</span></div>
          <div className="search-wrap"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, ID, or status…"/></div>
          <div className="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>AMOUNT</th><th>RISK</th><th>STATUS</th></tr></thead><tbody>
            {filtered.map(t => <tr key={t.id} onClick={() => {setSelectedId(t.id);setMessage('');setInvestigation(null);setInvestigationError('');setInvestigationOpen(false);setHistoryItem(null)}} className={selectedId === t.id ? 'selected-row' : ''}>
              <td><div className="tx-id">{t.id}</div><div className="tx-customer">{t.customer}</div></td>
              <td className="amount">{money(t.amount, t.currency)}</td>
              <td><RiskBadge level={t.assessment.level}/><div className="score">{t.assessment.score}/100 indicator score</div></td>
              <td><StatusBadge status={t.status}/></td>
            </tr>)}
            {!loading && filtered.length === 0 && <tr><td colSpan="4" className="empty">No transactions match that search.</td></tr>}
          </tbody></table></div>
          <div className="table-footer"><span>Demo data · No real customer records</span><span>Updated just now</span></div>
        </div>

        <div className="panel detail-panel">
          {selected ? <>
            <div className="panel-heading detail-heading"><div><div className="eyebrow">INVESTIGATION</div><h2>Transaction details</h2></div><span className="detail-icon"><ShieldCheck size={19}/></span></div>
            <div className="detail-amount"><span>{selected.id}</span><strong>{money(selected.amount, selected.currency)}</strong><div><StatusBadge status={selected.status}/><span className="customer-name">{selected.customer}</span></div></div>
            
            {(() => {
              const savedDecision = merchantDecisions.find(
                (item) => item.transaction_id === selected.id
              )

              return (
                <div className="recommendation">
                  <div className="recommendation-title">
                    <ShieldCheck size={15} /> Merchant decision
                  </div>

                  {savedDecision ? (
                    <>
                      <strong>
                        {savedDecision.decision.replaceAll('_', ' ')}
                      </strong>
                      <p>
                        {savedDecision.note || 'No review note provided.'}
                      </p>
                    </>
                  ) : (
                    <p>No decision recorded for this transaction yet.</p>
                  )}
                </div>
              )
            })()}

            <div className="risk-summary"><div className={`risk-ring ${selected.assessment.level.toLowerCase()}`}><strong>{selected.assessment.score}</strong><span> / 100</span></div><div><RiskBadge level={selected.assessment.level}/><p>Rule-based prototype indicator</p></div></div>
            <div className="section-title">Risk evidence <span>{selected.assessment.evidence.length} signals</span></div>
            {selected.assessment.evidence.length ? <div className="evidence-list">{selected.assessment.evidence.map((ev, i) => <div className="evidence" key={i}><div className="evidence-mark"><CircleAlert size={15}/></div><div className="evidence-copy"><strong>{ev.signal}</strong><p>{ev.detail}</p></div><span className="points">+{ev.points}</span></div>)}</div> : <div className="no-evidence"><CheckCircle2 size={17}/><span>No elevated signals triggered by the current demo rules.</span></div>} 
            <div className="recommendation">
              <div className="recommendation-title">
                <Sparkles size={15} /> Suggested next step
              </div>
              <p>{selected.assessment.recommendation}</p>
            </div>

            <div className="recommendation">
              <div className="recommendation-title">
                <Bot size={16} /> Gemini investigation copilot
              </div>

              <p>
                Get an AI-generated explanation of this transaction's risk
                signals and practical checks for your review.
              </p>

              <button
                className="button primary"
                onClick={investigateTransaction}
                disabled={investigating}
              >
                <Sparkles size={15} />
                {investigating ? 'Investigating…' : 'Investigate with Gemini'}
              </button>

              {investigationError && (
                <div
                  className="inline-message"
                  role="alert"
                  style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                >
                  {investigationError}
                </div>
              )}

              {/* {investigation && (
                <div className="evidence-list">
                  <div className="section-title">
                    AI explanation
                    <span>{investigation.mode === 'ai' ? 'Gemini' : 'Demo mode'}</span>
                  </div>

                  <div className="evidence">
                    <div className="evidence-copy">
                      <p style={{ whiteSpace: 'pre-wrap' }}>
                        {investigation.answer}
                      </p>
                    </div>
                  </div>

                  {investigation.suggested_checks?.length > 0 && (
                    <>
                      <div className="section-title">Suggested reviewer checks</div>
                      {investigation.suggested_checks.map((check, index) => (
                        <div className="evidence" key={index}>
                          <div className="evidence-mark">
                            <CheckCircle2 size={15} />
                          </div>
                          <div className="evidence-copy">
                            <p>{check}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  <p className="disclaimer">
                    {investigation.disclaimer}
                  </p>
                </div>
              )} */}
            </div>
            
            <div className="section-title">
              Investigation history
              <span>
                {
                  investigationHistory.filter(
                    (item) => item.transactionId === selected.id
                  ).length
                } records
              </span>
            </div>

            {investigationHistory.filter(
              (item) => item.transactionId === selected.id
            ).length === 0 ? (
              <div className="no-evidence">
                <Clock3 size={17} />
                <span>No previous investigations for this transaction.</span>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {investigationHistory
                  .filter((item) => item.transactionId === selected.id)
                  .map((item, index) => (
                    <button
                      key={`${item.timestamp}-${index}`}
                      type="button"
                      onClick={() => {
                        setHistoryItem(item)
                      }}
                      title="Open full investigation report"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        background: 'var(--panel-background, #fff)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: '3px',
                        }}
                      >
                        Investigation {
                          investigationHistory.filter(
                            (entry) => entry.transactionId === selected.id
                          ).length - index
                        }
                        {' · '}
                        {item.timestamp}
                      </div>

                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'var(--muted-color, #6b7280)',
                        }}
                      >
                        Investigation report available
                      </div>
                    </button>
                  ))}
              </div>
            )}

            <div className="section-title">
              Merchant review <span>Human decision</span>
            </div>

            {!merchantDecisions.some(
              (item) =>
                item.transaction_id === selected.id &&
                item.decision === 'REJECT'
            ) && (
              <div>
                <textarea value={note} onChange={e=>setNote(e.target.value)} required={true} placeholder="Explain why this order is being rejected or reviewed..." rows={2}/>
              </div>
            )}
            
            {(() => {
              const savedDecision = merchantDecisions.find(
                (item) => item.transaction_id === selected.id
              )
              const isRejected = savedDecision?.decision === 'REJECT'

              return (
                <>
                  {isRejected ? (
                    <div
                      className="inline-message"
                      role="status"
                      style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                    >
                      This order has been rejected and is closed. No further decisions are allowed.
                    </div>
                  ) : (
                    <div className="action-grid">
                      <button
                        className="button secondary"
                        onClick={() => submitReview('REVIEW')}
                      >
                        Keep for review
                      </button>

                      <button
                        className="button primary"
                        onClick={() => submitReview('APPROVE_FOR_FULFILLMENT')}
                      >
                        Approve fulfillment
                      </button>

                      <button
                        className="button danger"
                        onClick={() => submitReview('REJECT')}
                      >
                        Reject order
                      </button>
                    </div>
                  )}
                </>
              )
            })()}

            {message && (
              <div
                className="inline-message"
                role={message.startsWith('Demo decision recorded') ? 'status' : 'alert'}
                style={message.startsWith('Demo decision recorded')
                  ? { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
                  : { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
              >
                {message}
              </div>
            )}
            <p className="disclaimer">These actions record a prototype review decision only. They do not change PayPal transaction status or move money.</p>
          </> : <div className="loading-state">{loading ? 'Loading transactions…' : 'Select a transaction to begin.'}</div>}
        </div>
      </section>

      <section className="copilot-banner"><div className="copilot-icon"><Bot size={23}/></div><div className="copilot-copy"><h3>TrustAI investigation copilot</h3><p>The dashboard is ready for an evidence-grounded AI assistant. Gemini AI investigation is connected. Review transaction risk signals, supporting evidence, and recommended verification checks before making a decision.</p></div><span className="coming-soon">NEXT MILESTONE</span><ArrowUpRight className="banner-arrow" size={20}/></section>
      
      {(investigationOpen || historyItem) && selected && (
        <div
          onClick={() => {
            setInvestigationOpen(false)
            setHistoryItem(null)
          }}
          style={{

            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="investigation-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              color: '#1f2937',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <div>
                <h2 id="investigation-modal-title">
                  {historyItem ? 'Previous Investigation' : 'AI Investigation'}
                </h2>
                <p>
                  {historyItem
                    ? `${historyItem.transactionId} · ${historyItem.timestamp}`
                    : `${selected.id} · ${selected.assessment.level} RISK · ${selected.assessment.score}/100`}
                </p>
              </div>

              <button
                className="button secondary"
                onClick={() => {
                  setInvestigationOpen(false)
                  setHistoryItem(null)
                }}
              >
                Close ✕
              </button>
            </div>

            <div className="recommendation">
              <div className="recommendation-title">
                <Bot size={16} /> Gemini investigation copilot
              </div>

              <p>
                Review the supplied transaction evidence and the AI-generated
                explanation before making a human review decision.
              </p>

              <button
                className="button primary"
                onClick={investigateTransaction}
                disabled={investigating}
              >
                <Sparkles size={15} />
                {investigating ? 'Investigating…' : 'Investigate with Gemini'}
              </button>

              {investigationError && (
                <div
                  className="inline-message"
                  role="alert"
                  style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                >
                  {investigationError}
                </div>
              )}
            </div>

            {(historyItem || investigation) && (
              <div style={{ marginTop: '24px' }}>
                <div className="section-title">
                  AI explanation
                  <span>
                    {(historyItem ? historyItem.result : investigation).mode === 'ai' ? 'Gemini' : 'Demo mode'}
                  </span>
                </div>

                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    lineHeight: 1.7,
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    background: '#f9fafb',
                  }}
                >
                  {(historyItem ? historyItem.result : investigation).answer}
                </div>

                {(historyItem ? historyItem.result : investigation).suggested_checks?.length > 0 && (
                  <>
                    <div className="section-title" style={{ marginTop: '20px' }}>
                      Suggested reviewer checks
                    </div>
                    {(historyItem ? historyItem.result : investigation).suggested_checks.map((check, index) => (
                      <div className="evidence" key={index}>
                        <div className="evidence-mark">
                          <CheckCircle2 size={15} />
                        </div>
                        <div className="evidence-copy">
                          <p>{check}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <p className="disclaimer">
                  {(historyItem ? historyItem.result : investigation).disclaimer}
                </p>
              </div>
            )}

            {/* <div style={{ marginTop: '24px' }}>
              <div className="section-title">
                Investigation history
                <span>
                  {investigationHistory.filter(
                    (item) => item.transactionId === selected.id
                  ).length} records
                </span>
              </div>

              <div
                style={{
                  maxHeight: '240px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {investigationHistory
                  .filter((item) => item.transactionId === selected.id)
                  .map((item, index) => (
                    <details
                      key={`${item.timestamp}-${index}`}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                        Investigation{' '}
                        {investigationHistory.filter(
                          (entry) => entry.transactionId === selected.id
                        ).length - index}
                        {' · '}
                        {item.timestamp}
                      </summary>
                    </details>
                  ))}
              </div>
            </div> */}
          </div>
        </div>
      )}

      <footer><span>TrustAI Copilot · Hackathon prototype</span><span><span className="green-dot"/> API-backed demo · Gemini AI investigation enabled · PayPal integration not connected</span></footer>
    </main>
  </div>
}

function Metric({ icon, label, value, note, trend }) {
  return <div className="metric-card"><div className={`metric-icon ${trend}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>
}
function RiskBadge({ level }) {
  return <span className={`risk-badge ${level.toLowerCase()}`}><span/> {level} RISK</span>
}
function StatusBadge({ status }) {
  const label = status.replaceAll('_', ' ')
  return <span className={`status-badge ${status.toLowerCase()}`}>{label}</span>
}



export default App
