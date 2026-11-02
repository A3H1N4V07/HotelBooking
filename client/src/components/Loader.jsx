import React from 'react'

function Loader() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-secondary py-5" style={{ minHeight: '60vh' }}>
      <div className="spinner-border text-warning mb-3" style={{ width: 48, height: 48 }} role="status" />
      <span className="small">Loading…</span>
    </div>
  )
}

export default Loader
