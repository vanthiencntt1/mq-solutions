'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';

export function AdminRoleForm({
  pending,
  onCreate,
}: {
  pending: boolean;
  onCreate(name: string, permissions: string[]): Promise<boolean>;
}) {
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onCreate(roleName, rolePermissions)) {
      setRoleName('');
      setRolePermissions([]);
    }
  }

  return (
    <Card>
      <details>
        <summary className="text-ink-navy cursor-pointer font-semibold">Tạo vai trò tùy chỉnh</summary>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <FormField id="role-name" label="Mã vai trò" hint="Viết hoa, ví dụ MQ_SUPPORT">
            <Input
              id="role-name"
              required
              pattern="[A-Z][A-Z0-9_]{2,49}"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value.toUpperCase())}
            />
          </FormField>
          <fieldset>
            <legend className="text-ink-navy mb-2 text-sm font-medium">Quyền được cấp</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(PERMISSIONS).map((permission) => (
                <label key={permission} className="text-ink-navy flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rolePermissions.includes(permission)}
                    onChange={(e) =>
                      setRolePermissions((current) =>
                        e.target.checked
                          ? [...current, permission]
                          : current.filter((item) => item !== permission),
                      )
                    }
                  />
                  {permission}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={pending || rolePermissions.length === 0}>
            Tạo vai trò
          </Button>
        </form>
      </details>
    </Card>
  );
}
