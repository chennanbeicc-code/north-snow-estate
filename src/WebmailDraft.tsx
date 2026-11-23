import { useState } from 'react'
import providers from '../shared/mail-providers.json'

export const contactAddress = 'chennanbeicc@gmail.com'
const subject = '来自雪落山庄的来信'

export default function WebmailDraft({ reply, body }: { reply: string; body: string }) {
  const domain = reply.trim().toLowerCase().split('@')[1]
  const detected = providers.find(provider => provider.domains.includes(domain))
  const [selection, setSelection] = useState({ domain, id: '' })
  const [feedback, setFeedback] = useState('')
  const [manual, setManual] = useState('')
  const id = (selection.domain === domain && selection.id) || detected?.id || ''
  const provider = providers.find(item => item.id === id)
  const text = body.trim() + (reply.trim() ? '\r\n\r\n回信邮箱：' + reply.trim() : '')
  let href = provider?.website
  if (id === 'gmail') {
    const query = new URLSearchParams({ view: 'cm', fs: '1', to: contactAddress, su: subject, body: text })
    href += '?' + query.toString()
  } else if (id === 'app') {
    href = 'mailto:' + contactAddress + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text)
  }

  async function copy(value: string, label: string) {
    setManual('')
    try {
      await navigator.clipboard.writeText(value)
      setFeedback(label + '已复制。')
    } catch {
      setManual(value)
      setFeedback('请选中下方文字并复制。')
    }
  }

  return <div className="webmail-draft">
    <label>使用哪个邮箱
      <select value={id} onChange={event => {
        setSelection({ domain, id: event.target.value }); setFeedback(''); setManual('')
      }}>
        <option value="" disabled>选择发信邮箱</option>
        {providers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        <option value="app">其他 · 本机邮件应用</option>
      </select>
    </label>
    {id && <>
      <p>{id === 'gmail' ? '打开 Gmail 后核对收件人和正文，确认发送。'
        : id === 'app' ? '使用已设置的邮件应用打开信稿。也可以复制信稿到自己的邮箱。'
        : '在网页邮箱里点「写信」，粘贴收件人和正文后发送。'}</p>
      <div className="webmail-actions">
        <a className="mail-launch" href={body.trim() ? href : undefined} aria-disabled={!body.trim()}
          target={id === 'app' ? undefined : '_blank'} rel="noopener noreferrer"
          onClick={event => {
            if (!body.trim() || !event.currentTarget.closest('form')?.reportValidity()) event.preventDefault()
          }}>{provider ? '打开 ' + provider.name : '打开邮件应用'}</a>
        <button type="button" onClick={() => copy(contactAddress,'收件人')}>复制收件人</button>
        <button type="button" disabled={!body.trim()} onClick={() => copy(text,'正文')}>复制正文</button>
      </div>
      <span role="status">{feedback}</span>
      {manual && <textarea readOnly aria-label="手动复制" value={manual} autoFocus onFocus={event => event.target.select()}/>}
    </>}
  </div>
}
