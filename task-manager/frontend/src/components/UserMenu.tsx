import React, { useState, useEffect, useRef } from 'react'
import { useUser, useClerk } from '@clerk/react'
import { getOrg, updateOrg, OrgOut } from '../api'

const UserMenu: React.FC = () => {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const [org, setOrg] = useState<OrgOut | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [orgName, setOrgName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getOrg().then((o) => { setOrg(o); setOrgName(o.name) }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRename = async () => {
    if (!orgName.trim() || orgName === org?.name) { setEditingName(false); return }
    const updated = await updateOrg(orgName.trim())
    setOrg(updated)
    setEditingName(false)
  }

  const initials = user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? '?'
  const displayName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User'

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-avatar-btn" onClick={() => setOpen((o) => !o)}>
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt={displayName} className="user-avatar-img" />
        ) : (
          <span className="user-avatar-initials">{initials}</span>
        )}
        <span className="user-avatar-name">{displayName}</span>
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="user-dropdown-name">{displayName}</div>
            <div className="user-dropdown-email">{user?.emailAddresses?.[0]?.emailAddress}</div>
          </div>

          <div className="user-dropdown-section">
            <div className="user-dropdown-label">Workspace</div>
            {editingName ? (
              <div className="user-dropdown-rename">
                <input
                  className="user-dropdown-input"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus
                />
                <button className="user-dropdown-save" onClick={handleRename}>Save</button>
              </div>
            ) : (
              <div className="user-dropdown-org" onClick={() => setEditingName(true)}>
                <span>{org?.name ?? '…'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
            )}
          </div>

          <div className="user-dropdown-divider" />

          <button
            className="user-dropdown-signout"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
