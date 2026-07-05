// 게이트별 장비 그룹핑
export function groupEquipmentsByGate(equipments) {
  const grouped = {}
  
  equipments?.forEach((eq) => {
    const gateKey = `gate_${eq.gateIdx || 'unknown'}`
    
    if (!grouped[gateKey]) {
      grouped[gateKey] = {
        gateIdx: eq.gateIdx,
        gateName: `Gate ${eq.gateIdx || '미배정'}`,
        equipments: [],
        totalCount: 0,
        locations: new Set(),
      }
    }
    
    grouped[gateKey].equipments.push(eq)
    grouped[gateKey].totalCount += eq.equipmentCount || 1
    
    if (eq.workLocation) {
      grouped[gateKey].locations.add(eq.workLocation)
    }
  })

  return Object.values(grouped)
    .sort((a, b) => (a.gateIdx || 999) - (b.gateIdx || 999))
    .map((g) => ({
      ...g,
      locations: Array.from(g.locations),
    }))
}

// 게이트 혼잡도 계산
export function calculateGateCongestion(count) {
  if (count >= 5) return '혼잡'
  if (count >= 3) return '보통'
  return '순조'
}

export function getGateCongestionColor(level) {
  if (level === '혼잡') return 'text-rose-700 bg-rose-100 border-rose-200'
  if (level === '보통') return 'text-amber-700 bg-amber-100 border-amber-200'
  return 'text-emerald-700 bg-emerald-100 border-emerald-200'
}

export function equipmentTypeLabel(name) {
  if (!name) return '기타'
  if (name.includes('크레인')) return '크레인'
  if (name.includes('펌프')) return '펌프차'
  if (name.includes('고소')) return '고소작업대'
  if (name.includes('스캐폴딩')) return '스캐폴딩'
  return '중장비'
}

export function getEquipmentIcon(name) {
  const type = equipmentTypeLabel(name)
  const icons = {
    '크레인': '🏗️',
    '펌프차': '🚛',
    '고소작업대': '⬆️',
    '스캐폴딩': '🔨',
    '중장비': '📦',
    '기타': '📦',
  }
  return icons[type] || '📦'
}