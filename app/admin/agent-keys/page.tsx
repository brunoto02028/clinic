'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Copy, Key, Trash2, Plus, Eye, EyeOff } from 'lucide-react'

interface AgentApiKey {
  id: string
  name: string
  key: string
  permissions: {
    instagram: boolean
    leads: boolean
    patients: boolean
    appointments: boolean
    analytics: boolean
  }
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  createdBy?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function AgentKeysPage() {
  const [keys, setKeys] = useState<AgentApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewKeyForm, setShowNewKeyForm] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  
  const [newKey, setNewKey] = useState({
    name: '',
    permissions: {
      instagram: false,
      leads: false,
      patients: false,
      appointments: false,
      analytics: false,
    },
    expiresInDays: 0,
  })

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/admin/agent-keys')
      const data = await res.json()
      setKeys(data.keys || [])
    } catch (error) {
      console.error('Failed to fetch keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const createKey = async () => {
    if (!newKey.name) {
      alert('Please enter a name for the API key')
      return
    }

    try {
      const res = await fetch('/api/admin/agent-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setKeys([data.key, ...keys])
        setShowNewKeyForm(false)
        setNewKey({
          name: '',
          permissions: {
            instagram: false,
            leads: false,
            patients: false,
            appointments: false,
            analytics: false,
          },
          expiresInDays: 0,
        })
        alert('API Key created successfully! Make sure to copy it now - you won\'t be able to see it again.')
      } else {
        alert('Failed to create key: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to create key:', error)
      alert('Failed to create key')
    }
  }

  const toggleKeyStatus = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/agent-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      })
      
      if (res.ok) {
        setKeys(keys.map(k => k.id === id ? { ...k, isActive } : k))
      }
    } catch (error) {
      console.error('Failed to toggle key:', error)
    }
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/agent-keys?id=${id}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setKeys(keys.filter(k => k.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete key:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const toggleKeyVisibility = (id: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(id)) {
      newVisible.delete(id)
    } else {
      newVisible.add(id)
    }
    setVisibleKeys(newVisible)
  }

  const maskKey = (key: string) => {
    return key.substring(0, 15) + '...' + key.substring(key.length - 8)
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">OpenClaw Agent API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage API keys for external agents to access your clinic data
          </p>
        </div>
        <Button onClick={() => setShowNewKeyForm(!showNewKeyForm)}>
          <Plus className="w-4 h-4 mr-2" />
          New API Key
        </Button>
      </div>

      {showNewKeyForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>
              Generate a new API key for OpenClaw Agent access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., OpenClaw Marketing Agent"
                value={newKey.name}
                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 mt-2">
                {Object.keys(newKey.permissions).map((perm) => (
                  <div key={perm} className="flex items-center justify-between">
                    <Label htmlFor={perm} className="capitalize">{perm}</Label>
                    <Switch
                      id={perm}
                      checked={newKey.permissions[perm as keyof typeof newKey.permissions]}
                      onCheckedChange={(checked) =>
                        setNewKey({
                          ...newKey,
                          permissions: { ...newKey.permissions, [perm]: checked },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="expiresInDays">Expires In (days, 0 = never)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="0"
                value={newKey.expiresInDays}
                onChange={(e) => setNewKey({ ...newKey, expiresInDays: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={createKey}>Create Key</Button>
              <Button variant="outline" onClick={() => setShowNewKeyForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {keys.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No API keys created yet. Click &ldquo;New API Key&rdquo; to create one.
            </CardContent>
          </Card>
        ) : (
          keys.map((key) => (
            <Card key={key.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">{key.name}</h3>
                      {key.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
                        {visibleKeys.has(key.id) ? key.key : maskKey(key.key)}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleKeyVisibility(key.id)}
                      >
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(key.key)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.entries(key.permissions).map(([perm, enabled]) =>
                        enabled ? (
                          <Badge key={perm} variant="outline" className="capitalize">
                            {perm}
                          </Badge>
                        ) : null
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Created: {new Date(key.createdAt).toLocaleString()}</p>
                      {key.lastUsedAt && (
                        <p>Last used: {new Date(key.lastUsedAt).toLocaleString()}</p>
                      )}
                      {key.expiresAt && (
                        <p>Expires: {new Date(key.expiresAt).toLocaleString()}</p>
                      )}
                      {key.createdBy && (
                        <p>
                          Created by: {key.createdBy.firstName} {key.createdBy.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Switch
                      checked={key.isActive}
                      onCheckedChange={(checked) => toggleKeyStatus(key.id, checked)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteKey(key.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>How to use the Agent API from OpenClaw</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Base URL</h4>
            <code className="bg-muted px-3 py-1 rounded block">
              https://bpr.clinic/api/agent
            </code>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the Authorization header:
            </p>
            <code className="bg-muted px-3 py-1 rounded block text-sm">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Available Endpoints</h4>
            <div className="space-y-2 text-sm">
              <div className="bg-muted p-3 rounded">
                <strong>POST /api/agent/instagram/publish</strong>
                <p className="text-muted-foreground">Publish Instagram posts</p>
                <code className="block mt-2 text-xs">
                  {`{ "caption": "Your post text", "imageUrl": "https://...", "scheduleAt": "2026-03-20T10:00:00Z" }`}
                </code>
              </div>
              <div className="bg-muted p-3 rounded">
                <strong>GET /api/agent/leads?limit=50&status=new&daysAgo=7</strong>
                <p className="text-muted-foreground">Fetch new leads/contacts</p>
              </div>
              <div className="bg-muted p-3 rounded">
                <strong>GET /api/agent/patients?limit=100&search=john</strong>
                <p className="text-muted-foreground">Fetch patient data</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Python Example (OpenClaw)</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`import requests

API_KEY = "bpr_agent_..."
BASE_URL = "https://bpr.clinic/api/agent"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Publish Instagram post
response = requests.post(
    f"{BASE_URL}/instagram/publish",
    headers=headers,
    json={
        "caption": "New post from OpenClaw!",
        "imageUrl": "https://example.com/image.jpg"
    }
)

print(response.json())

# Get leads
leads = requests.get(
    f"{BASE_URL}/leads?status=new&daysAgo=7",
    headers=headers
)

print(leads.json())`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
