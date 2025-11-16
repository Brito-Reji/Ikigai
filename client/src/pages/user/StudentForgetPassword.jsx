import api from '@/api/axiosConfig.js'
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'

function StudentForgetPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [emailSent, setEmailSent] = useState(false)
    let navigate = useNavigate()

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    const sendOtp = async (e) => {
        e.preventDefault()
        setError('')

        if (!email) {
            setError('Please enter your email address')
            return
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address')
            return
        }

        setLoading(true)

        try {
            let response = await api.post('/auth/send-otp', {
                email,
            })

            console.log(response)
            
            if (response.data.success) {
                setEmailSent(true)
                setTimeout(() => {
                    navigate('/verify-otp', {
                        state: {
                            email,
                            forget: true
                        }
                    })
                }, 1500)
            }
        } catch (err) {
            console.error('Error sending OTP:', err)
            setError(err.response?.data?.message || 'Failed to send OTP. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Back to Login Link */}
                    <Link 
                        to="/login" 
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6 transition"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Back to Login</span>
                    </Link>

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Mail className="w-8 h-8 text-indigo-600" />
                        </div>
                    </div>

                    {/* Title and Description */}
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
                        Forgot Password?
                    </h1>
                    <p className="text-gray-600 text-center mb-8">
                        {emailSent 
                            ? 'OTP has been sent to your email!'
                            : 'Enter your email address and we\'ll send you an OTP to reset your password'
                        }
                    </p>

                    {emailSent ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <Mail className="w-5 h-5 text-green-600" />
                                <span className="text-green-700 font-medium">
                                    Check your email for the OTP
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 text-center">
                                Redirecting to verification page...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={sendOtp} className="space-y-6">
                            {/* Email Input */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            setError('')
                                        }}
                                        placeholder="Enter your email"
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600 text-center">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium transition flex items-center justify-center space-x-2 ${
                                    loading
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-indigo-700'
                                }`}
                            >
                                <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                                {!loading && <ArrowRight className="w-5 h-5" />}
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

export default StudentForgetPassword