import { useAuth } from '@/auth/AuthContext'
import { can } from '@/auth/permissions'
import { PageHeader } from '@/components/PageHeader'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { useSearchState } from '@/lib/useSearchState'
import { GradesTab } from './GradesTab'
import { PricesTab } from './PricesTab'

const TABS = [
  { id: 'prices', label: 'Prices' },
  { id: 'grades', label: 'Grades' },
]

/** Configuration of what the station pays: which grades exist, and the price of each. */
export function PricesPage() {
  const { user } = useAuth()
  const s = useSearchState()
  const tab = TABS.some((t) => t.id === s.get('tab')) ? s.get('tab') : 'prices'
  const canManagePrices = can(user, 'managePrices')
  const canManageGrades = can(user, 'manageGrades')

  return (
    <>
      <PageHeader
        title="Prices & Grades"
        description="Decide which grades the station awards and what each one is paid per kg. Nothing here is fixed in code; deliveries already graded keep the price they were graded at."
      />
      <Tabs tabs={TABS} value={tab} onChange={(id) => s.set({ tab: id })} label="Prices and grades" />
      <TabPanel id="prices" value={tab}>
        <PricesTab canManage={canManagePrices} />
      </TabPanel>
      <TabPanel id="grades" value={tab}>
        <GradesTab canManage={canManageGrades} />
      </TabPanel>
    </>
  )
}
