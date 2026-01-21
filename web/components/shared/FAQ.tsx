'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'What payment methods do you support?',
    answer: 'KNS MultiRail integrates with Monime payment gateway, which supports various payment methods including mobile money, bank transfers, cards, and digital wallets. All payments are processed securely through Monime\'s infrastructure and tracked in realtime within your organization\'s dashboard. Payment methods available depend on what Monime supports in your region.',
  },
  {
    question: 'How does the pricing work?',
    answer: 'KNS MultiRail is currently in pilot phase. We offer flexible pricing based on your organization\'s needs. Since we integrate with Monime for payment processing, transaction fees are determined by Monime\'s pricing structure. Contact us to discuss pricing plans tailored to your organization\'s transaction volume and requirements. We offer transparent pricing with no hidden fees.',
  },
  {
    question: 'How long does it take to set up?',
    answer: 'Setting up your organization on KNS MultiRail is quick and straightforward. After registering your organization, you can immediately start adding members, creating payment tabs, and configuring your payment settings. The entire setup process typically takes just a few minutes. Once your organization admin approves member registrations, members can start making payments right away through the integrated Monime payment gateway.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, security is our top priority. KNS MultiRail uses a multitenant architecture that ensures complete data isolation between organizations. Each organization\'s data is completely separated and secure. We implement rolebased access control with three distinct roles: Super Admin, Organization Admin, and Member, each with appropriate permissions. All data transmission is encrypted, and we follow enterprise-grade security practices to protect your payment and member information.',
  },
  {
    question: 'Can I customize payment tabs for different members?',
    answer: 'Yes! Organization admins can always add payment tabs for members. You can create custom payment tabs with different amounts, descriptions, payment types (payment or donation), and monthly costs as needed.',
  },
  {
    question: 'Do you offer transaction volume discounts?',
    answer: 'Since we\'re currently in pilot phase, we\'re open to discussing custom pricing arrangements based on your organization\'s transaction volume. While payment processing fees are determined by Monime, we can work with you to create pricing plans that scale with your needs. Contact us to discuss volume discounts and custom pricing options for your organization.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about using KNS MultiRail
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:border-primary-300"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 pr-8">
                  {faq.question}
                </h3>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
