import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', leftIcon, rightIcon, id, type, ...props }, ref) => {
        const inputId = id || props.name
        const [showPassword, setShowPassword] = useState(false)
        const isPasswordField = type === 'password'

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        type={isPasswordField && showPassword ? 'text' : type}
                        className={`
              block w-full rounded-lg border shadow-sm transition-colors duration-200 ease-in-out
              focus:ring-2 focus:ring-offset-0 focus:outline-none sm:text-sm
              ${error
                                ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500'
                            }
              ${leftIcon ? 'pl-10' : 'px-4'}
              ${rightIcon || isPasswordField ? 'pr-10' : 'px-4'}
              py-2.5
              ${className}
            `}
                        {...props}
                    />
                    {isPasswordField ? (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    ) : rightIcon ? (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                            {rightIcon}
                        </div>
                    ) : null}
                </div>
                {error ? (
                    <p className="mt-1.5 text-sm text-red-600">{error}</p>
                ) : helperText ? (
                    <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
                ) : null}
            </div>
        )
    }
)

Input.displayName = 'Input'

export default Input
