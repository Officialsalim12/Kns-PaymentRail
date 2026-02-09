'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import Image from 'next/image'

interface TeamImageProps {
  src: string
  alt: string
}

export default function TeamImage({ src, alt }: TeamImageProps) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="w-48 h-48 rounded-xl mx-auto mb-4 overflow-hidden bg-primary-100 flex items-center justify-center border-4 border-primary-200 relative">
      {!imageError ? (
        <Image
          src={src}
          alt={alt}
          width={192}
          height={192}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Users className="w-16 h-16 text-primary-600" />
      )}
    </div>
  )
}
