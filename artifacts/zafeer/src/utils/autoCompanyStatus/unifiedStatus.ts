export const calculateUnifiedStatus = (
  daysRemaining: number,
  urgentDays: number,
  highDays: number,
  mediumDays: number,
  itemName: string
): {
  status: 'منتهي' | 'طارئ' | 'عاجل' | 'متوسط' | 'ساري'
  color: {
    backgroundColor: string
    textColor: string
    borderColor: string
  }
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
} => {
  if (daysRemaining < 0) {
    const expiredDays = Math.abs(daysRemaining)
    return {
      status: 'منتهي',
      color: { backgroundColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' },
      description: `انتهى ${itemName} منذ ${expiredDays} يوم`,
      priority: 'urgent',
    }
  } else if (daysRemaining <= urgentDays) {
    const description =
      daysRemaining === 0
        ? `ينتهي ${itemName} اليوم - إجراء فوري مطلوب`
        : daysRemaining === 1
          ? `ينتهي ${itemName} غداً - إجراء فوري مطلوب`
          : `ينتهي ${itemName} خلال ${daysRemaining} أيام - إجراء فوري مطلوب`
    return {
      status: 'طارئ',
      color: { backgroundColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' },
      description,
      priority: 'urgent',
    }
  } else if (daysRemaining <= highDays) {
    return {
      status: 'عاجل',
      color: { backgroundColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
      description: `ينتهي ${itemName} خلال ${daysRemaining} يوم - يحتاج متابعة`,
      priority: 'high',
    }
  } else if (daysRemaining <= mediumDays) {
    return {
      status: 'متوسط',
      color: { backgroundColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
      description: `ينتهي ${itemName} خلال ${daysRemaining} يوم - متابعة مطلوبة`,
      priority: 'medium',
    }
  } else {
    return {
      status: 'ساري',
      color: { backgroundColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
      description: `${itemName} ساري المفعول (${daysRemaining} يوم متبقي)`,
      priority: 'low',
    }
  }
}
