'use client'

import { useState } from 'react'
import { Search, X, RefreshCcw, User } from 'lucide-react'
import NextImage from 'next/image'

interface Member {
  id: string
  full_name: string
  membership_id: string
  status: string
  users: {
    profile_photo_url: string | null
    bio: string | null
    admission_date: string | null
    show_public_profile: boolean
  } | null
}

interface Props {
  initialMembers: Member[]
}

const normalizeDateInputValue = (value: string | null | undefined) => {
  if (!value) return ''
  if (value.length >= 10) return value.slice(0, 10)
  return value
}

const formatDateForDisplay = (value: string | null | undefined) => {
  if (!value) return null
  const normalized = normalizeDateInputValue(value)
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return normalized
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

export default function MemberDirectory({ initialMembers }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filteredMembers = initialMembers.filter((member) => {
    // Search query filter (Name and Membership ID)
    const query = searchQuery.toLowerCase().trim()
    const matchesQuery = !query || 
      member.full_name?.toLowerCase().includes(query) || 
      member.membership_id?.toLowerCase().includes(query)

    // Date range filter (Admission Date from User Profile)
    let matchesDate = true
    const admissionDateStr = member.users?.admission_date
    if (admissionDateStr) {
      const admissionDate = new Date(admissionDateStr).getTime()
      if (startDate) {
        const start = new Date(startDate).getTime()
        if (admissionDate < start) matchesDate = false
      }
      if (endDate) {
        const end = new Date(endDate).getTime()
        const endOfDay = end + (24 * 60 * 60 * 1000) - 1
        if (admissionDate > endOfDay) matchesDate = false
      }
    } else if (startDate || endDate) {
      // If filtering by date but member has no admission date, don't show them
      matchesDate = false
    }

    return matchesQuery && matchesDate
  })

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row gap-4">
          {/* Search Box */}
          <div className="relative group flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-600">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or membership ID..."
              className="block w-full pl-12 pr-12 py-3 border border-gray-100 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 text-sm font-medium transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Date Filters */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="relative flex-1 sm:flex-none sm:w-44">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-100 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 text-sm font-medium transition-all"
              />
              <span className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-gray-400 uppercase tracking-wider italic">Joined After</span>
            </div>
            <div className="relative flex-1 sm:flex-none sm:w-44">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-100 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 text-sm font-medium transition-all"
              />
              <span className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-bold text-gray-400 uppercase tracking-wider italic">Joined Before</span>
            </div>
            
            {(searchQuery || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStartDate('')
                  setEndDate('')
                }}
                className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-xs uppercase tracking-widest whitespace-nowrap"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} shown
          </p>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No members found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Try adjusting your search query or filters to find what you're looking for.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setStartDate('')
              setEndDate('')
            }}
            className="mt-6 text-sm font-bold text-primary-600 hover:text-primary-700 underline underline-offset-4"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  <th className="px-6 py-4">Member Profile</th>
                  <th className="px-6 py-4">Membership ID</th>
                  <th className="px-6 py-4">About</th>
                  <th className="px-6 py-4 whitespace-nowrap">Admission date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 italic">
                {filteredMembers.map((member) => {
                  const statusDot =
                    member.status === 'active'
                      ? 'bg-green-500'
                      : member.status === 'inactive'
                      ? 'bg-gray-400'
                      : member.status === 'suspended'
                      ? 'bg-red-500'
                      : 'bg-amber-500'

                  const isPublic = member.users?.show_public_profile ?? true
                  const bio = isPublic ? member.users?.bio : null
                  const admissionDate = isPublic ? member.users?.admission_date : null

                  return (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 min-w-[240px]">
                          <div className="relative w-11 h-11 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-gray-100 group-hover:scale-105 transition-transform">
                            {member.users?.profile_photo_url ? (
                              <NextImage
                                src={member.users.profile_photo_url}
                                alt={member.full_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
                              <p className="text-sm font-bold text-gray-900 truncate not-italic">{member.full_name}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 ml-4">
                              Member
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-md">{member.membership_id}</span>
                      </td>

                      <td className="px-6 py-4">
                        {bio ? (
                          <p className="text-xs text-gray-600 line-clamp-2 min-w-[300px] leading-relaxed">
                            {bio}
                          </p>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{isPublic ? 'No bio provided' : 'Private Profile'}</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {admissionDate ? (
                          <span className="text-sm font-bold text-gray-700 not-italic">
                            {formatDateForDisplay(admissionDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">{isPublic ? 'Unknown' : 'Private'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
