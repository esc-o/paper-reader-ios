import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppearance } from '../lib/appearance'
import { displayName, useAuth } from '../lib/auth'
import { formatRgb, parseRgb, useTone } from '../lib/tone'
import './MePage.css'

const FEEDBACK_TO = 'findme@xxko.ink'

export function MePage() {
  const { t, i18n } = useTranslation()
  const { user, error, signIn, signOut, clearError } = useAuth()
  const { mode, setAppearance } = useAppearance()
  const { tone, saveTone } = useTone()
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketBody, setTicketBody] = useState('')
  const [ticketError, setTicketError] = useState('')
  const [toneText, setToneText] = useState(tone ? formatRgb(tone) : '')
  const [toneError, setToneError] = useState('')
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en'
  const name = user ? displayName(user) || t('auth.friend') : ''

  function sendTicket(event: FormEvent) {
    event.preventDefault()
    const title = ticketTitle.trim()
    const body = ticketBody.trim()
    if (!title || !body) {
      setTicketError(t('me.ticketNeed'))
      return
    }
    setTicketError('')
    const subject = encodeURIComponent(`[Paper Reader] ${title}`)
    const mail = encodeURIComponent(`${body}\n\n— Paper Reader`)
    const link = document.createElement('a')
    link.href = `mailto:${FEEDBACK_TO}?subject=${subject}&body=${mail}`
    link.click()
  }

  function applyTone(event: FormEvent) {
    event.preventDefault()
    const next = parseRgb(toneText)
    if (!next) {
      setToneError(t('me.toneInvalid'))
      return
    }
    setToneError('')
    setToneText(formatRgb(next))
    saveTone(next)
  }

  return (
    <div className="me">
      <p className="card-label">{t('me.kicker')}</p>
      <h1 className="me-title">{t('nav.me')}</h1>

      <section className="me-card">
        <h2>{t('me.account')}</h2>
        {user ? (
          <div className="me-row">
            <p>{t('auth.greeting', { name })}</p>
            <button type="button" className="me-button" onClick={() => void signOut()}>
              {t('auth.logout')}
            </button>
          </div>
        ) : (
          <>
            <p className="me-copy">{t('me.loggedOut')}</p>
            <button
              type="button"
              className="me-button solid"
              onClick={() => {
                clearError()
                void signIn()
              }}
            >
              {t('auth.login')}
            </button>
          </>
        )}
        {error && <p className="me-error">{error}</p>}
      </section>

      <section className="me-card">
        <h2>{t('me.theme')}</h2>
        <div className="me-choice" role="group" aria-label={t('appearance.label')}>
          <button type="button" className={mode === 'day' ? 'on' : undefined} onClick={() => setAppearance('day')}>
            {t('appearance.day')}
          </button>
          <button type="button" className={mode === 'night' ? 'on' : undefined} onClick={() => setAppearance('night')}>
            {t('appearance.night')}
          </button>
        </div>
      </section>

      <section className="me-card">
        <h2>{t('me.language')}</h2>
        <p className="me-copy">{t('me.languageLead')}</p>
        <div className="me-choice" role="group" aria-label={t('me.language')}>
          <button type="button" className={lang === 'zh' ? 'on' : undefined} onClick={() => void i18n.changeLanguage('zh')}>
            {t('me.chinese')}
          </button>
          <button type="button" className={lang === 'en' ? 'on' : undefined} onClick={() => void i18n.changeLanguage('en')}>
            {t('me.english')}
          </button>
        </div>
      </section>

      <section className="me-card">
        <h2>{t('me.feedback')}</h2>
        <p className="me-copy">{t('me.feedbackLead')}</p>
        <form className="me-form" onSubmit={sendTicket}>
          <label>
            {t('me.ticketTitle')}
            <input value={ticketTitle} onChange={(event) => setTicketTitle(event.target.value)} />
          </label>
          <label>
            {t('me.ticketBody')}
            <textarea rows={5} value={ticketBody} onChange={(event) => setTicketBody(event.target.value)} />
          </label>
          {ticketError && <p className="me-error">{ticketError}</p>}
          <button type="submit" className="me-button solid">{t('me.send')}</button>
        </form>
      </section>

      <section className="me-card">
        <h2>{t('me.tone')}</h2>
        <p className="me-copy">{t('me.toneLead')}</p>
        <form className="me-form" onSubmit={applyTone}>
          <label>
            {t('me.tone')}
            <input
              value={toneText}
              placeholder={t('me.tonePlaceholder')}
              spellCheck={false}
              onChange={(event) => setToneText(event.target.value)}
            />
          </label>
          {tone && <span className="tone-swatch" style={{ background: `rgb(${tone.r} ${tone.g} ${tone.b})` }} />}
          {toneError && <p className="me-error">{toneError}</p>}
          <div className="me-actions">
            <button type="submit" className="me-button solid">{t('me.toneApply')}</button>
            <button
              type="button"
              className="me-button"
              onClick={() => {
                setToneText('')
                setToneError('')
                saveTone(null)
              }}
            >
              {t('me.toneReset')}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
