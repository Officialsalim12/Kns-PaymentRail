'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Edit2, Save, X, Phone, Mail, MapPin, CreditCard, Shield, Camera, Home, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserProfileProps {
  user: {
    id: string
    email: string
    profile?: {
      full_name: string | null
      phone_number: string | null
      profile_photo_url: string | null
      role: string
      id_number?: string | null
      address?: string | null
    }
  }
}

export default function UserProfile({ user }: UserProfileProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Safety check for user and profile
  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">User data not available</p>
      </div>
    )
  }

  const [previewUrl, setPreviewUrl] = useState<string | null>(user.profile?.profile_photo_url || null)
  const [imageSrc, setImageSrc] = useState<string | null>(user.profile?.profile_photo_url || null)
  const [formData, setFormData] = useState({
    full_name: user.profile?.full_name || '',
    phone_number: user.profile?.phone_number || '',
    address: user.profile?.address || '',
    id_number: user.profile?.id_number || '',
  })

  // Update image src with cache-busting timestamp only on client side
  useEffect(() => {
    if (previewUrl) {
      setImageSrc(`${previewUrl}?t=${Date.now()}`)
    } else {
      setImageSrc(null)
    }
  }, [previewUrl])

  // Update preview URL when user profile changes
  useEffect(() => {
    if (user.profile?.profile_photo_url) {
      setPreviewUrl(user.profile.profile_photo_url)
    } else {
      setPreviewUrl(null)
    }
  }, [user.profile?.profile_photo_url])

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      // Note: id_number is system-generated and cannot be updated
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number || null,
          address: formData.address || null,
          // id_number is excluded - it's system-generated and not editable
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setIsEditing(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: user.profile?.full_name || '',
      phone_number: user.profile?.phone_number || '',
      address: user.profile?.address || '',
      id_number: user.profile?.id_number || '',
    })
    setPreviewUrl(user.profile?.profile_photo_url || null)
    setIsEditing(false)
    setError(null)
  }

  const handleDeletePhoto = async () => {
    if (!previewUrl || !user.profile?.profile_photo_url) return
    
    if (!confirm('Are you sure you want to delete your profile photo?')) {
      return
    }

    setUploadingPhoto(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Extract the path from the URL
      const urlParts = user.profile.profile_photo_url.split('/')
      const pathIndex = urlParts.findIndex(part => part === 'avatars')
      
      if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
        const oldPath = urlParts.slice(pathIndex + 1).join('/')
        
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([oldPath])
        
        if (deleteError) {
          console.warn('Error deleting photo from storage:', deleteError)
          // Continue anyway - might already be deleted
        }
      }

      // Update database to remove the URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_photo_url: null })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setPreviewUrl(null)
      router.refresh()
    } catch (err: any) {
      console.error('Photo deletion error:', err)
      setError(err.message || 'Failed to delete photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const getHomeRoute = () => {
    const role = user.profile?.role
    if (role === 'super_admin') {
      return '/super-admin'
    } else if (role === 'org_admin') {
      return '/admin'
    } else if (role === 'member') {
      return '/member'
    }
    return '/'
  }

  const handleReturnHome = () => {
    router.push(getHomeRoute())
  }

  // Resize image to avatar size (400x400 max, maintains aspect ratio)
  const resizeImage = (file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.9): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to convert canvas to blob'))
              }
            },
            file.type || 'image/jpeg',
            quality
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    setUploadingPhoto(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Resize image to avatar size
      const resizedBlob = await resizeImage(file, 400, 400, 0.85)
      const resizedFile = new File([resizedBlob], file.name, { type: file.type || 'image/jpeg' })

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(resizedFile)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `profiles/${fileName}`

      // Delete old photo if exists
      if (user.profile?.profile_photo_url) {
        try {
          // Extract the path from the URL
          const urlParts = user.profile.profile_photo_url.split('/')
          const pathIndex = urlParts.findIndex(part => part === 'avatars')
          if (pathIndex !== -1 && pathIndex < urlParts.length - 1) {
            const oldPath = urlParts.slice(pathIndex + 1).join('/')
            await supabase.storage.from('avatars').remove([oldPath])
          }
        } catch (e) {
          // Ignore errors when deleting old photo
          console.warn('Error deleting old photo:', e)
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedFile, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      console.log('Uploaded photo URL:', publicUrl)
      console.log('File path:', filePath)
      console.log('Bucket: avatars')

      // Verify the file exists
      const { data: fileList } = await supabase.storage
        .from('avatars')
        .list('profiles', {
          limit: 100,
          search: fileName
        })
      
      console.log('File list after upload:', fileList)

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_photo_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      // Verify URL is accessible
      try {
        const testResponse = await fetch(publicUrl, { method: 'HEAD' })
        console.log('Image URL accessibility test:', testResponse.status, testResponse.ok)
        if (!testResponse.ok) {
          console.warn('Image URL might not be accessible:', publicUrl)
        }
      } catch (fetchError) {
        console.warn('Could not verify image URL:', fetchError)
      }

      setPreviewUrl(publicUrl)
      router.refresh()
    } catch (err: any) {
      console.error('Photo upload error:', err)
      setError(err.message || 'Failed to upload photo')
      setPreviewUrl(user.profile?.profile_photo_url || null)
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin'
      case 'org_admin':
        return 'Admin'
      case 'member':
        return 'Member'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700'
      case 'org_admin':
        return 'bg-blue-100 text-blue-700'
      case 'member':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full">
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Profile Dashboard</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your account information and preferences</p>
          </div>
          {!isEditing ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={handleReturnHome}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
              >
                <Home className="h-4 w-4" />
                <span>Return to Home</span>
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                <p className="font-semibold mb-1 text-sm sm:text-base">Something went wrong</p>
                <p className="text-xs sm:text-sm break-words">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          <div className="flex-shrink-0 flex flex-col items-center lg:items-start">
            <div className="relative group">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center overflow-hidden border-2 sm:border-4 border-white shadow-xl relative">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={user.profile?.full_name || 'User'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image load error for URL:', previewUrl)
                      // Silently fall back to default avatar icon instead of showing error
                      setPreviewUrl(null)
                    }}
                    onLoad={() => {
                      setError(null)
                    }}
                  />
                ) : (
                  <User className="h-16 w-16 sm:h-20 sm:w-20 text-primary-600" />
                )}
              </div>
              {isEditing && (
                <>
                  <label className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-primary-600 text-white rounded-full p-2 sm:p-3 cursor-pointer hover:bg-primary-700 active:bg-primary-800 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 z-10">
                    <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                  {previewUrl && (
                    <button
                      onClick={handleDeletePhoto}
                      disabled={uploadingPhoto}
                      className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-600 text-white rounded-full p-2 sm:p-3 cursor-pointer hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete profile photo"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                </>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black bg-opacity-60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 sm:border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-2 sm:mt-3 text-center lg:text-left max-w-[140px] sm:max-w-[160px] px-2">
                Click the camera icon to upload a new profile photo
              </p>
            )}
            {previewUrl && process.env.NODE_ENV === 'development' && (
              <details className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg text-xs w-full max-w-[180px] sm:max-w-[200px]">
                <summary className="font-semibold text-gray-700 cursor-pointer mb-1 sm:mb-2 text-xs">Debug Info</summary>
                <p className="break-all text-gray-600 text-[10px] mb-2">{previewUrl}</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await fetch(previewUrl, { method: 'HEAD' })
                      alert(`Image URL Status: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`)
                    } catch (err: any) {
                      alert(`Error: ${err.message}`)
                    }
                  }}
                  className="text-primary-600 hover:text-primary-800 underline text-[10px]"
                >
                  Test URL
                </button>
              </details>
            )}
          </div>

          <div className="flex-1 w-full min-w-0">
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-600 flex-shrink-0" />
                    <span>Full Name</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg border border-gray-200 break-words">
                      {user.profile?.full_name || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-600 flex-shrink-0" />
                    <span>Email Address</span>
                  </label>
                  <p className="text-sm sm:text-base text-gray-900 font-medium px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg border border-gray-200 break-words break-all">
                    {user.email}
                  </p>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-600 flex-shrink-0" />
                    <span>Phone Number</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg border border-gray-200 break-words">
                      {user.profile?.phone_number || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-600 flex-shrink-0" />
                    <span>ID Number</span>
                  </label>
                  <p className="text-sm sm:text-base text-gray-900 font-medium px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg border border-gray-200 break-words">
                    {user.profile?.id_number || <span className="text-gray-400 italic">System generated - Not editable</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">ID numbers are system-generated and cannot be edited</p>
                </div>

                <div className="md:col-span-2 space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-600 flex-shrink-0" />
                    <span>Address</span>
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white resize-none"
                      placeholder="Enter your address"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-gray-900 font-medium px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[60px] break-words">
                      {user.profile?.address || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-600 flex-shrink-0" />
                    <span>Role</span>
                  </label>
                  <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold ${getRoleColor(user.profile?.role || '')} border`}>
                    {getRoleDisplay(user.profile?.role || '')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

