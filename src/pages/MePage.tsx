import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppearance } from '../lib/appearance'
import { displayName, useAuth } from '../lib/auth'
import { submitFeedback, type FeedbackKind } from '../lib/feedback'
import { formatRgb, parseRgb, useTone } from '../lib/tone'
import './MePage.css'

export function MePage() {
  const { t, i18n } = useTranslation()
  const { user, error, signIn, signOut, clearError } = useAuth()
  const { preference, setAppearance } = useAppearance()
  const { tone, saveTone } = useTone()
  const [ticketKind, setTicketKind] = useState<FeedbackKind>('bug')
  const [ticketBody, setTicketBody] = useState('')
  const [ticketEmail, setTicketEmail] = useState('')
  const [emailEdited, setEmailEdited] = useState(false)
  const [ticketError, setTicketError] = useState('')
  const [ticketSuccess, setTicketSuccess] = useState(false)
  const [ticketSending, setTicketSending] = useState(false)
  const [toneText, setToneText] = useState(tone ? formatRgb(tone) : '')
  const [toneError, setToneError] = useState('')
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en'
  const name = user ? displayName(user) || t('auth.friend') : ''
  const emailValue = emailEdited ? ticketEmail : ticketEmail || user?.email || ''

  async function sendTicket(event: FormEvent) {
    event.preventDefault()
    const body = ticketBody.trim()
    if (!body) {
      setTicketError(t('me.ticketNeed'))
      setTicketSuccess(false)
      return
    }
    setTicketError('')
    setTicketSuccess(false)
    setTicketSending(true)
    try {
      await submitFeedback({
        kind: ticketKind,
        message: body,
        email: emailValue.trim() || undefined,
        loggedIn: Boolean(user),
      })
      setTicketBody('')
      setTicketSuccess(true)
    } catch {
      setTicketError(t('me.ticketRetry'))
    } finally {
      setTicketSending(false)
    }
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
          <button type="button" className={preference === 'day' ? 'on' : undefined} onClick={() => setAppearance('day')}>
            {t('appearance.day')}
          </button>
          <button type="button" className={preference === 'night' ? 'on' : undefined} onClick={() => setAppearance('night')}>
            {t('appearance.night')}
          </button>
          <button type="button" className={preference === 'system' ? 'on' : undefined} onClick={() => setAppearance('system')}>
            {t('appearance.system')}
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
        {ticketSuccess ? (
          <div className="me-success-card">
            <p className="me-success">{t('me.ticketThanks')}</p>
            <button type="button" className="me-button solid" onClick={() => setTicketSuccess(false)}>
              {t('me.ticketClose')}
            </button>
          </div>
        ) : (
          <>
            <p className="me-copy">{t('me.feedbackLead')}</p>
            <form className="me-form" onSubmit={(event) => void sendTicket(event)}>
              <label>
                {t('me.ticketKind')}
                <select
                  value={ticketKind}
                  disabled={ticketSending}
                  onChange={(event) => setTicketKind(event.target.value as FeedbackKind)}
                >
                  <option value="bug">{t('me.ticketKindBug')}</option>
                  <option value="suggestion">{t('me.ticketKindSuggestion')}</option>
                  <option value="other">{t('me.ticketKindOther')}</option>
                </select>
              </label>
              <label>
                {t('me.ticketBody')}
                <textarea
                  rows={6}
                  value={ticketBody}
                  disabled={ticketSending}
                  required
                  onChange={(event) => setTicketBody(event.target.value)}
                />
              </label>
              <label>
                {t('me.ticketEmail')}
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={emailValue}
                  disabled={ticketSending}
                  placeholder={t('me.ticketEmailHint')}
                  onChange={(event) => {
                    setEmailEdited(true)
                    setTicketEmail(event.target.value)
                  }}
                />
              </label>
              {ticketError && <p className="me-error">{ticketError}</p>}
              <button type="submit" className="me-button solid" disabled={ticketSending}>
                {ticketSending ? t('me.ticketSending') : t('me.send')}
              </button>
            </form>
          </>
        )}
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
