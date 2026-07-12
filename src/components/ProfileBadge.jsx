import { useTheme } from '../context/ThemeContext.jsx'

export default function ProfileBadge() {
  const { username, avatarUrl } = useTheme()
  if (!username && !avatarUrl) return null

  return (
    <div id="profile-badge">
      <span className="profile-badge-name">{username}</span>
      <div className="profile-badge-avatar">
        {avatarUrl ? <img src={avatarUrl} alt={username} /> : <span>{(username || '?').charAt(0).toUpperCase()}</span>}
      </div>
    </div>
  )
}