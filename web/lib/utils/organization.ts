export function getOrganizationAbbreviation(name: string): string {
  if (!name) return 'O'
  
  const words = name.trim().split(/\s+/).filter(word => word.length > 0)
  
  if (words.length === 0) return 'O'
  
  if (words.length === 1) {
    const word = words[0]
    if (word.length <= 3) {
      return word.toUpperCase()
    }
    return word.substring(0, 3).toUpperCase()
  }
  
  return words
    .slice(0, 3)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
}
export interface StandardizedOrganizationData {
  name: string
  organization_type: string
  admin_email: string
  phone_number: string | null
  description: string | null
  status?: string
  logo_url?: string | null
}

export function standardizeOrganizationData(data: {
  name: string
  organization_type: string
  admin_email: string
  phone_number?: string | null
  description?: string | null
  status?: string
  logo_url?: string | null
}): StandardizedOrganizationData {
  const trimmedName = (data.name || '').trim()
  const trimmedOrgType = (data.organization_type || '').trim()
  const trimmedAdminEmail = (data.admin_email || '').trim()
  
  const phoneNumber = data.phone_number 
    ? (data.phone_number.trim() || null)
    : null
  
  const description = data.description 
    ? (data.description.trim() || null)
    : null
  
  const status = (data.status && data.status.trim()) || 'pending'
  
  return {
    name: trimmedName,
    organization_type: trimmedOrgType,
    admin_email: trimmedAdminEmail,
    phone_number: phoneNumber,
    description: description,
    status: status,
    logo_url: data.logo_url || null,
  }
}