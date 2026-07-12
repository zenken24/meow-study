import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useNotify } from '../../context/NotificationContext.jsx'

export default function SettingsPanel() {
  const { session } = useAuth()
  const { theme, setTheme, backgroundMode, setBackgroundMode, setCustomBackgroundUrl } = useTheme()
  const { notify } = useNotify()

  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const fileInputRef = useRef(null)
  const bgInputRef = useRef(null)

  useEffect(() => { loadProfile() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('user_id', session.user.id).maybeSingle()
    if (data) {
      setUsername(data.username || '')
      setAvatarUrl(data.avatar_url || null)
    }
  }

  async function saveUsername() {
    await supabase.from('profiles').upsert(
      { user_id: session.user.id, username, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    notify('Username saved \u2727')
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = `${session.user.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { notify('Couldn\u2019t upload that image.'); return }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(pub.publicUrl)
    await supabase.from('profiles').upsert(
      { user_id: session.user.id, avatar_url: pub.publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    notify('Profile picture updated \u2727')
  }

  async function handleBackgroundUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = `${session.user.id}/bg-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('backgrounds').upload(path, file, { upsert: true })
    if (error) { notify('Couldn\u2019t upload that background.'); return }
    const { data: pub } = supabase.storage.from('backgrounds').getPublicUrl(path)
    setCustomBackgroundUrl(pub.publicUrl)
    notify('Background updated \u2727')
  }

  async function changeEmail() {
    if (!newEmail.trim()) return
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    if (error) { notify(error.message); return }
    notify('Check your inbox to confirm the new email address.')
    setNewEmail('')
  }

  async function changePassword() {
    if (newPassword.length < 6) { notify('Password should be at least 6 characters.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { notify(error.message); return }
    notify('Password updated \u2727')
    setNewPassword('')
  }

  return (
    <section id="panel-settings">
      <div className="panel-head"><h2>Settings</h2></div>

      <div className="settings-group">
        <div className="settings-label">Profile</div>
        <div className="avatar-row">
          <div className="avatar-preview" onClick={() => fileInputRef.current?.click()}>
            {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span>+</span>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          <div className="settings-field">
            <label>Username</label>
            <div className="settings-inline">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your username" />
              <button className="btn ghost" onClick={saveUsername}>Save</button>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-label">Appearance</div>
        <div className="settings-field">
          <label>Theme</label>
          <div className="chips">
            <button className={'chip' + (theme === 'dark' ? ' active' : '')} onClick={() => setTheme('dark')}>Dark</button>
            <button className={'chip' + (theme === 'light' ? ' active' : '')} onClick={() => setTheme('light')}>Light</button>
          </div>
        </div>
        <div className="settings-field">
          <label>Background</label>
          <div className="chips">
            <button className={'chip' + (backgroundMode === 'default' ? ' active' : '')} onClick={() => setBackgroundMode('default')}>Default</button>
            <button className={'chip' + (backgroundMode === 'custom' ? ' active' : '')} onClick={() => bgInputRef.current?.click()}>Custom image</button>
            <button className={'chip' + (backgroundMode === 'none' ? ' active' : '')} onClick={() => setBackgroundMode('none')}>None</button>
          </div>
          <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBackgroundUpload} />
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-label">Account</div>
        <div className="settings-field">
          <label>Change email (currently {session?.user?.email})</label>
          <div className="settings-inline">
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com" />
            <button className="btn ghost" onClick={changeEmail}>Update</button>
          </div>
        </div>
        <div className="settings-field">
          <label>Change password</label>
          <div className="settings-inline">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="new password" />
            <button className="btn ghost" onClick={changePassword}>Update</button>
          </div>
        </div>
      </div>
    </section>
  )
}
