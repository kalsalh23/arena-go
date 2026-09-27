import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

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

export function useVillageFilter(villages, value, onChange, allLabel = 'كل القرى') {
  return (
    <div className="chips">
      <button className={`chip ${value === '' ? 'active' : ''}`} onClick={() => onChange('')}>
        {allLabel}
      </button>
      {(villages || []).map((v) => (
        <button key={v.id} className={`chip ${value === v.id ? 'active' : ''}`} onClick={() => onChange(v.id)}>
          {v.name}
        </button>
      ))}
    </div>
  )
}
