'use client'

import React from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts'
import { formatCurrency } from '@/lib/currency'
import { format } from 'date-fns'

interface ChartData {
    date: string
    amount: number
    count: number
    label?: string
}

interface CommonProps {
    data: ChartData[]
    height?: number
    className?: string
    showCount?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-xs">
                <p className="font-bold text-gray-900 mb-1">{label}</p>
                <p className="text-primary-600 font-medium">
                    Revenue: {formatCurrency(payload[0].value)}
                </p>
                {payload[1] && (
                    <p className="text-gray-500">
                        Transactions: {payload[1].value}
                    </p>
                )}
            </div>
        )
    }
    return null
}

export function RevenueAreaChart({ data, height = 300, className = '' }: CommonProps) {
    return (
        <div className={`w-full ${className}`} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        dy={10}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        tickFormatter={(value: number) => `$${value / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorAmount)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

export function TransactionBarChart({ data, height = 300, className = '' }: CommonProps) {
    return (
        <div className={`w-full ${className}`} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        dy={10}
                    />
                    <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        tickFormatter={(value: number) => `$${value / 1000}k`}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="amount" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="right" dataKey="count" name="Transactions" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
