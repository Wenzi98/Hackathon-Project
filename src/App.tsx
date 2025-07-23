import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { AuthForm } from '@/components/auth/AuthForm'
import { SalonOwnerDashboard } from '@/components/dashboard/SalonOwnerDashboard'
import { CustomerDashboard } from '@/components/dashboard/CustomerDashboard'
import { Button } from '@/components/ui/button'
import { LogOut, Scissors } from 'lucide-react'

function App() {
  const { user, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return <AuthForm />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Scissors className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SnipRewards</h1>
                  <p className="text-sm text-gray-500">
                    Welcome back, {profile.full_name || profile.email}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route 
              path="/" 
              element={
                profile.role === 'salon_owner' ? (
                  <SalonOwnerDashboard />
                ) : profile.role === 'customer' ? (
                  <CustomerDashboard />
                ) : (
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Dashboard Coming Soon
                    </h2>
                    <p className="text-gray-600">
                      Barber dashboard features are under development.
                    </p>
                  </div>
                )
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

export default App