'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Send, Loader2 } from 'lucide-react'

interface VoiceChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  language?: string
}

export function VoiceChatInput({ onSend, disabled, placeholder = 'Type or speak...', language = 'en-GB' }: VoiceChatInputProps) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const startListening = useCallback(() => {
    if (!isSupported) return

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = language
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' '
        } else {
          interimText += event.results[i][0].transcript
        }
      }
      if (finalText) {
        setText(prev => (prev + ' ' + finalText).trim())
        setInterim('')
      } else {
        setInterim(interimText)
      }
    }

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('Speech error:', e.error)
      }
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [isSupported, language])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    setListening(false)
    setInterim('')
  }, [])

  useEffect(() => {
    return () => { if (recognitionRef.current) try { recognitionRef.current.abort() } catch {} }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [text])

  function handleSend() {
    const msg = text.trim()
    if (!msg || disabled) return
    onSend(msg)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border border-border rounded-xl bg-card p-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text + (interim ? ' ' + interim : '')}
          onChange={e => { setText(e.target.value); setInterim('') }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-foreground text-sm outline-none resize-none min-h-[36px] max-h-[120px] py-2 px-2 placeholder-muted-foreground/50 disabled:opacity-50"
        />

        <div className="flex items-center gap-1 pb-1">
          {/* Voice button */}
          {isSupported && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={disabled}
              className={`p-2 rounded-lg transition-all ${
                listening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              } disabled:opacity-50`}
              title={listening ? 'Stop listening' : 'Voice input'}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {listening && (
        <div className="flex items-center gap-2 px-2 pt-1 text-xs text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Listening... speak now
        </div>
      )}
    </div>
  )
}
