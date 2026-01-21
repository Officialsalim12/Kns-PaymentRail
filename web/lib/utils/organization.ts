/**
 * Get organization abbreviation from name
 * Takes first letter of each word, up to 3 letters
 */
export function getOrganizationAbbreviation(name: string): string {
  if (!name) return 'O'
  
  const words = name.trim().split(/\s+/).filter(word => word.length > 0)
  
  if (words.length === 0) return 'O'
  
  // If single word, take first 2-3 characters
  if (words.length === 1) {
    const word = words[0]
    if (word.length <= 3) {
      return word.toUpperCase()
    }
    return word.substring(0, 3).toUpperCase()
  }
  
  // If multiple words, take first letter of each word (up to 3 words)
  return words
    .slice(0, 3)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
}

/**
 * Standardize organization data to match standard structure
 * This ensures all newly created accounts follow the same setup logic:
 * - All text fields are trimmed
 * - Empty strings are converted to null for optional fields
 * - Status defaults to 'pending' if not provided
 * 
 * These standards are hardcoded and do not depend on any reference organization.
 */
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
  // Trim all text fields
  const trimmedName = (data.name || '').trim()
  const trimmedOrgType = (data.organization_type || '').trim()
  const trimmedAdminEmail = (data.admin_email || '').trim()
  
  // For optional fields: trim if present, convert empty strings to null
  const phoneNumber = data.phone_number 
    ? (data.phone_number.trim() || null)
    : null
  
  const description = data.description 
    ? (data.description.trim() || null)
    : null
  
  // Status defaults to 'pending' if not provided or empty
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