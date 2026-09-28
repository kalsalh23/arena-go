import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

export function useVillages() {
  return useQuery({
    queryKey: ['villages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('villages').select('*').eq('is_active', true).order('name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

// Dropdown list filter (المنطقة) — replaces chip rows.
export function VillageSelect({ villages, value, onChange, label = 'المنطقة' }) {
  return (
    <div className="filter-select">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{label}: الكل</option>
        {(villages || []).map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
      <Icon name="chevD" size={15} />
    </div>
  )
}

// Generic dropdown for any filter list (النوع، الحالة…).
export function ListSelect({ label, value, onChange, options }) {
  return (
    <div className="filter-select">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{label}: الكل</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
      <Icon name="chevD" size={15} />
    </div>
  )
}
