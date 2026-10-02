import { Building2 } from 'lucide-react'
import { useStation } from '@/station/StationContext'

/**
 * Chooses the station the whole app works in. Only users assigned to more than one station (and
 * administrators) get a choice; everyone else just sees where they are working.
 */
export function StationSwitcher() {
  const { stations, station, select } = useStation()
  if (!station) return null

  if (stations.length < 2) {
    return (
      <p className="hidden items-center gap-1.5 text-sm text-stone-700 md:flex">
        <Building2 className="size-4 text-stone-500" aria-hidden="true" />
        <span className="max-w-48 truncate font-medium">{station.name}</span>
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="hidden size-4 shrink-0 text-stone-500 sm:block" aria-hidden="true" />
      <label htmlFor="station-switcher" className="sr-only">
        Station
      </label>
      <select
        id="station-switcher"
        value={station.id}
        onChange={(e) => select(Number(e.target.value))}
        className="h-9 max-w-[11rem] rounded-md border border-stone-300 bg-white px-2 text-sm font-medium text-stone-800 hover:border-stone-400 sm:max-w-56"
      >
        {stations.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}
