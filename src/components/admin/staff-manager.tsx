'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAdminStaff, api } from '@/hooks/api'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner, EmptyState, ButtonWithLoading } from '@/components/restaurant/loading-states'
import { ConfirmDialog } from '@/components/restaurant/confirm-dialog'
import { ROLE_LABELS, PERMISSIONS } from '@/lib/auth'
import { ALL_ROLES, NON_SUPER_ROLES } from '@/lib/validations'
import { hasPermission, canAccessRole } from '@/lib/auth'

const ROLE_TINT: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  RESTAURANT_OWNER: 'bg-orange-100 text-orange-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  KITCHEN_STAFF: 'bg-amber-100 text-amber-700',
  WAITER: 'bg-green-100 text-green-700',
  CASHIER: 'bg-slate-100 text-slate-700',
}

/** Roles that the current user is allowed to assign */
function getAssignableRoles(myRole: string): readonly string[] {
  if (myRole === 'SUPER_ADMIN') return ALL_ROLES
  return NON_SUPER_ROLES.filter((r) => canAccessRole(myRole, r))
}

export function StaffManager() {
  const { data, isLoading } = useAdminStaff()
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)

  const myRole = ((session?.user as any)?.role as string) || ''
  const assignableRoles = getAssignableRoles(myRole)

  const handleNew = () => {
    setEditing({
      name: '',
      email: '',
      password: '',
      role: assignableRoles[0] || 'WAITER',
      phone: '',
      active: true,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editing.id) {
        const patch: any = {
          name: editing.name,
          role: editing.role,
          active: editing.active,
          phone: editing.phone,
        }
        if (editing.password) patch.password = editing.password
        await api(`/api/admin/staff/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
        toast.success('Staff updated')
      } else {
        await api(`/api/admin/staff`, {
          method: 'POST',
          body: JSON.stringify(editing),
        })
        toast.success('Staff created')
      }
      qc.invalidateQueries({ queryKey: ['admin-staff'] })
      setOpen(false)
      setEditing(null)
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    }
  }

  const handleToggleActive = async (u: any) => {
    try {
      await api(`/api/admin/staff/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !u.active }),
      })
      qc.invalidateQueries({ queryKey: ['admin-staff'] })
      toast.success(u.active ? 'Deactivated' : 'Activated')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  const handleDelete = async (u: any) => {
    try {
      await api(`/api/admin/staff/${u.id}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['admin-staff'] })
      toast.success('Staff deactivated')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">{data?.length || 0} team members</p>
        </div>
        <Button onClick={handleNew} className="bg-orange-600 text-white hover:bg-orange-700">
          <Plus className="mr-2 h-4 w-4" /> Add staff
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
      ) : !data?.length ? (
        <EmptyState title="No staff" description="Add your first team member." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Permissions</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u: any) => {
                  const userPerms = Object.entries(PERMISSIONS)
                    .filter(([, roles]) => roles.includes(u.role))
                    .map(([perm]) => perm.replace(/\./g, ' ').replace(/_/g, ' '))
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={ROLE_TINT[u.role] || ''}>
                          {u.role === 'SUPER_ADMIN' && <ShieldCheck className="mr-1 h-3 w-3" />}
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex max-w-[200px] flex-wrap gap-1">
                          {userPerms.slice(0, 4).map((p) => (
                            <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                              {p}
                            </span>
                          ))}
                          {userPerms.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{userPerms.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Switch
                          checked={u.active}
                          onCheckedChange={() => handleToggleActive(u)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditing(u)
                              setOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <ConfirmDialog
                            trigger={
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            }
                            title={`Remove ${u.name}?`}
                            description="This will deactivate the user. Their audit history will be preserved."
                            confirmLabel="Remove"
                            variant="destructive"
                            onConfirm={() => handleDelete(u)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit staff' : 'Add staff'}</DialogTitle>
            <DialogDescription>
              Choose a role carefully — it controls what they can access.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Full name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editing.email}
                  disabled={!!editing.id}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div>
                <Label>{editing.id ? 'New password (optional)' : 'Password'}</Label>
                <Input
                  type="password"
                  value={editing.password || ''}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                  placeholder={editing.id ? 'Leave blank to keep current' : 'Min 6 characters'}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={editing.role}
                  onValueChange={(v) => setEditing({ ...editing, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r === 'SUPER_ADMIN' && '🛡️ '}{ROLE_LABELS[r] || r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editing.role && (
                  <div className="mt-2 rounded-lg border bg-slate-50 p-2">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Permissions for {ROLE_LABELS[editing.role] || editing.role}</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(PERMISSIONS)
                        .filter(([, roles]) => roles.includes(editing.role))
                        .map(([perm]) => (
                          <span key={perm} className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                            {perm.replace(/\./g, ' ').replace(/_/g, ' ')}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Phone (optional)</Label>
                <Input value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              {editing.id && (
                <label className="flex items-center gap-2">
                  <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                  <span className="text-sm">Active</span>
                </label>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <ButtonWithLoading
              onClick={handleSave}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {editing?.id ? 'Save' : 'Create'}
            </ButtonWithLoading>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
