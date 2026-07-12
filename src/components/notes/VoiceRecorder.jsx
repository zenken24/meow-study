import { useRef, useState } from 'react'

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition

export default function VoiceRecorder({ existingUrl, existingTranscript, onSave }) {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState(existingTranscript || '')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const recognitionRef = useRef(null)

  async function start() {
    setTranscript('')
    chunksRef.current = []
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
    }
    recorder.start()
    mediaRecorderRef.current = recorder
    setRecording(true)

    if (SpeechRecognitionCtor) {
      const rec = new SpeechRecognitionCtor()
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (e) => {
        let text = ''
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
        setTranscript(text)
      }
      rec.start()
      recognitionRef.current = rec
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop()
    recognitionRef.current?.stop()
    setRecording(false)
    setTimeout(() => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      onSave(blob, transcript)
    }, 200)
  }

  return (
    <div className="voice-wrap">
      {!SpeechRecognitionCtor && (
        <div className="voice-note-hint">Live transcription needs Chrome — recording still works everywhere.</div>
      )}
      <div className="voice-controls">
        {!recording
          ? <button className="btn" onClick={start}>● Record</button>
          : <button className="btn" onClick={stop}>■ Stop</button>}
      </div>
      {transcript && <div className="voice-transcript">{transcript}</div>}
      {existingUrl && !recording && (
        <audio controls src={existingUrl} style={{ width: '100%', marginTop: 12 }} />
      )}
    </div>
  )
}
