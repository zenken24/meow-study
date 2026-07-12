import { useState } from 'react'
import { randomQuote } from '../lib/quotes.js'

export default function QuoteBar() {
  const [quote, setQuote] = useState(() => randomQuote())

  function shuffle() {
    setQuote((q) => randomQuote(q.idx))
  }

  return (
    <div id="quote-bar">
      <div id="quote-text">{quote.text}</div>
      <button id="quote-shuffle" title="Next quote" onClick={shuffle}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
      </button>
    </div>
  )
}
