'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, X } from 'lucide-react'
import { getOrganizationAbbreviation, standardizeOrganizationData } from '@/lib/utils/organization'

interface Organization {
  id: string
  name: string
  organization_type: string
  admin_email: string
  phone_number: string | null
  description: string | null
  logo_url: string | null
}

interface Props {
  organization: Organization | null
}

export default function OrganizationSettings({ organization: initialOrganization }: Props) {
  const router = useRouter()
  const [organization, setOrganization] = useState(initialOrganization)
  const [formData, setFormData] = useState({
    name: initialOrganization?.name || '',
    organization_type: initialOrganization?.organization_type || '',
    phone_number: initialOrganization?.phone_number || '',
    description: initialOrganization?.description || '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }

      setLogoFile(file)
      setError(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Organization name is required')
      }
      if (!formData.organization_type.trim()) {
        throw new Error('Organization type is required')
      }

      let logoUrl = organization?.logo_url || null

      // Upload new logo if provided
      if (logoFile) {
        // Delete old logo if exists
        if (organization?.logo_url) {
          const oldPath = organization.logo_url.split('/').pop()
          if (oldPath) {
            await supabase.storage
              .from('logos')
              .remove([`organizations/${oldPath}`])
          }
        }

        // Upload new logo
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${organization?.id}-${Date.now()}.${fileExt}`
        const filePath = `organizations/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Failed to upload logo: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath)

        logoUrl = publicUrl
      }

      // Update organization with standardized data matching Faith UBC structure
      const standardizedData = standardizeOrganizationData({
        name: formData.name,
        organization_type: formData.organization_type,
        admin_email: organization?.admin_email || '', // Keep existing admin_email
        phone_number: formData.phone_number || null,
        description: formData.description || null,
        logo_url: logoUrl,
        status: organization?.status || 'pending', // Keep existing status
      })

      const updateData: {
        name: string
        organization_type: string
        phone_number: string | null
        description: string | null
        logo_url?: string | null
      } = {
        name: standardizedData.name,
        organization_type: standardizedData.organization_type,
        phone_number: standardizedData.phone_number,
        description: standardizedData.description,
      }

      // Only include logo_url if it changed
      if (logoFile || logoUrl !== organization?.logo_url) {
        updateData.logo_url = standardizedData.logo_url
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organization?.id)

      if (updateError) {
        throw new Error(`Failed to update organization: ${updateError.message}`)
      }

      // Update local state with standardized data
      setOrganization(prev => prev ? {
        ...prev,
        name: standardizedData.name,
        organization_type: standardizedData.organization_type,
        phone_number: standardizedData.phone_number,
        description: standardizedData.description,
        logo_url: standardizedData.logo_url
      } : null)
      
      setLogoFile(null)
      setLogoPreview(null)
      
      const hasChanges = logoFile || 
        formData.name.trim() !== initialOrganization?.name ||
        formData.organization_type.trim() !== initialOrganization?.organization_type ||
        (formData.phone_number.trim() || null) !== (initialOrganization?.phone_number || null) ||
        (formData.description.trim() || null) !== (initialOrganization?.description || null)
      
      if (hasChanges) {
        setSuccess('Organization updated successfully!')
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      }
      
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!organization) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">Organization not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Organization Settings</h1>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Logo</h2>
            
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-32 w-32 object-contain rounded-lg border border-gray-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      title="Remove new logo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={formData.name || organization.name}
                    className="h-32 w-32 object-contain rounded-lg border border-gray-300 bg-white"
                  />
                ) : (
                  <div className="h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
                    <span className="text-2xl font-bold text-gray-400">
                      {getOrganizationAbbreviation(formData.name || organization.name)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">
                  Upload New Logo
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Choose File</span>
                    <input
                      id="logo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </label>
                  {logoFile && (
                    <span className="text-sm text-gray-600">{logoFile.name}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Recommended: Square image, max 5MB. Formats: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="organization_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Type *
                </label>
                <input
                  id="organization_type"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.organization_type}
                  onChange={(e) => setFormData({ ...formData, organization_type: e.target.value })}
                  placeholder="e.g., Non-profit, Club, Association"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {organization.admin_email}
                </p>
                <p className="mt-1 text-xs text-gray-500">Admin email cannot be changed</p>
              </div>
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone_number"
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of your organization..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

