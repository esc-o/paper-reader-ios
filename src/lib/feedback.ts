import { registerPlugin } from '@capacitor/core'

export type FeedbackKind = 'bug' | 'suggestion' | 'other'

export type FeedbackSubmit = {
  kind: FeedbackKind
  message: string
  email?: string
  loggedIn: boolean
}

type FeedbackPlugin = {
  submit: (options: FeedbackSubmit) => Promise<void>
}

const Feedback = registerPlugin<FeedbackPlugin>('Feedback', {
  web: {
    async submit() {
      throw Object.assign(new Error('web'), { code: 'web' })
    },
  },
})

export async function submitFeedback(options: FeedbackSubmit): Promise<void> {
  await Feedback.submit(options)
}
