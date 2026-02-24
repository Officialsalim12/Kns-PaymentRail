import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LandingNavbar from '@/components/shared/LandingNavbar'
import FAQ from '@/components/shared/FAQ'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Solutions from '@/components/landing/Solutions'
import PaymentMethods from '@/components/landing/PaymentMethods'
import WhyChoose from '@/components/landing/WhyChoose'
import Security from '@/components/landing/Security'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default async function HomePage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch (error: any) {
    console.error('Session error:', error?.message)
  }

  if (user) {
    const role = user.profile?.role
    if (role === 'super_admin') {
      redirect('/super-admin')
    } else if (role === 'org_admin') {
      redirect('/admin')
    } else if (role === 'member') {
      redirect('/member')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />

      <Hero />
      <Features />
      <PaymentMethods />
      <WhyChoose />
      <Security />
      <Solutions />

      <div id="faq">
        <FAQ />
      </div>

      <CTA />
      <Footer />
    </div>
  )
}
