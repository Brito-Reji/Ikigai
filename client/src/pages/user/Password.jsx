import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, X } from 'lucide-react'
import api from '@/api/axiosConfig.js'

function ResetPassword() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const email = location.state?.email
    const otpVerified = location.state?.otpVerified

    useEffect(() => {
        // Redirect if not coming from OTP verification
        if (!email || !otpVerified) {
            navigate('/forgot-password')
        }
    }, [email, otpVerified, navigate])

    const validatePassword = (pwd) => {
        const minLength = pwd.length >= 8
        const hasUpperCase = /[A-Z]/.test(pwd)
        const hasLowerCase = /[a-z]/.test(pwd)
        const hasNumber = /\d/.test(pwd)
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd)

        return {
            minLength,
            hasUpperCase,
            hasLowerCase,
            hasNumber,
            hasSpecialChar,
            isValid: minLength && hasUpperCase && hasLowerCase && hasNumber
        }
    }

    const passwordValidation = validatePassword(password)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!password) {
            setError('Please enter a password')
            return
        }

        if (!passwordValidation.isValid) {
            setError('Please meet all password requirements')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const response = await api.post('/auth/reset-password', {
                email,
                newPassword: password
            })

            if (response.data.success) {
                setSuccess(true)
                setTimeout(() => {
                    navigate('/login', { replace: true })
                }, 2000)
            }
        } catch (err) {
            console.error('Error resetting password:', err)
            setError(err.response?.data?.message || 'Failed to reset password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                            success ? 'bg-green-100' : 'bg-indigo-100'
                        }`}>
                            {success ? (
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            ) : (
                                <Lock className="w-8 h-8 text-indigo-600" />
                            )}
                        </div>
                    </div>

                    {/* Title and Description */}
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
                        {success ? 'Password Reset!' : 'Reset Your Password'}
                    </h1>
                    <p className="text-gray-600 text-center mb-8">
                        {success 
                            ? 'Your password has been successfully reset'
                            : 'Please enter your new password'
                        }
                    </p>

                    {success ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-green-700 font-medium">
                                    Redirecting to login...
                                </span>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* New Password Input */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            setError('')
                                        }}
                                        placeholder="Enter new password"
                                        className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Requirements */}
                            {password && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700">Password must contain:</p>
                                    <div className="space-y-1">
                                        <PasswordRequirement met={passwordValidation.minLength} text="At least 8 characters" />
                                        <PasswordRequirement met={passwordValidation.hasUpperCase} text="One uppercase letter" />
                                        <PasswordRequirement met={passwordValidation.hasLowerCase} text="One lowercase letter" />
                                        <PasswordRequirement met={passwordValidation.hasNumber} text="One number" />
                                    </div>
                                </div>
                            )}

                            {/* Confirm Password Input */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value)
                                            setError('')
                                        }}
                                        placeholder="Confirm new password"
                                        className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Match Indicator */}
                            {confirmPassword && (
                                <div className={`flex items-center gap-2 text-sm ${
                                    password === confirmPassword ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {password === confirmPassword ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Passwords match</span>
                                        </>
                                    ) : (
                                        <>
                                            <X className="w-4 h-4" />
                                            <span>Passwords do not match</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600 text-center">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
                                className={`w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium transition ${
                                    loading || !passwordValidation.isValid || password !== confirmPassword
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-indigo-700'
                                }`}
                            >
                                {loading ? 'Resetting Password...' : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Help Text */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Remember your password?{' '}
                    <Link to="/login" className="text-indigo-600 hover:underline font-medium">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    )
}

// Helper component for password requirements
function PasswordRequirement({ met, text }) {
    return (
        <div className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-gray-500'}`}>
            {met ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span>{text}</span>
        </div>
    )
}

export default ResetPassword