'use client'

import { useState } from 'react'
import { Users, Zap, User } from 'lucide-react'

interface TeamMemberImageProps {
  src: string
  alt: string
  fallbackIcon: 'users' | 'zap' | 'user'
}

const iconMap = {
  users: Users,
  zap: Zap,
  user: User,
}

export default function TeamMemberImage({ src, alt, fallbackIcon }: TeamMemberImageProps) {
  const [imageError, setImageError] = useState(false)
  const Icon = iconMap[fallbackIcon]

  return (
    <div className="w-32 h-32 rounded-full mx-auto mb-4 overflow-hidden bg-primary-100 flex items-center justify-center border-4 border-primary-200 relative">
      {!imageError ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Icon className="w-12 h-12 text-primary-600" />
      )}
    </div>
  )
}
