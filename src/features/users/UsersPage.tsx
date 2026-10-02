import { PageHeader } from '@/components/PageHeader'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { useSearchState } from '@/lib/useSearchState'
import { DepartmentsTab } from './DepartmentsTab'
import { EmploymentsTab } from './EmploymentsTab'
import { PermissionsTab } from './PermissionsTab'
import { RolesTab } from './RolesTab'
import { UsersTab } from './UsersTab'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'departments', label: 'Departments' },
  { id: 'employments', label: 'Employments' },
]

/** The whole staff directory in one place: who can sign in, what role they hold, where they work. */
export function UsersPage() {
  const s = useSearchState()
  const tab = TABS.some((t) => t.id === s.get('tab')) ? s.get('tab') : 'users'

  return (
    <>
      <PageHeader
        title="Users & Staff"
        description="Accounts, the roles people hold and what each role may do, the departments they belong to and their employment records."
      />
      <Tabs tabs={TABS} value={tab} onChange={(id) => s.replace({ tab: id })} label="Staff directory" />
      <TabPanel id="users" value={tab}><UsersTab /></TabPanel>
      <TabPanel id="roles" value={tab}><RolesTab /></TabPanel>
      <TabPanel id="permissions" value={tab}><PermissionsTab /></TabPanel>
      <TabPanel id="departments" value={tab}><DepartmentsTab /></TabPanel>
      <TabPanel id="employments" value={tab}><EmploymentsTab /></TabPanel>
    </>
  )
}
