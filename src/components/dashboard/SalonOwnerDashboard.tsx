import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import { QRCodeSVG } from 'react-qr-code'
import { Users, TrendingUp, Gift, Store, QrCode, MessageSquare } from 'lucide-react'

export function SalonOwnerDashboard() {
  const { user } = useAuth()
  const [salon, setSalon] = useState<any>(null)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalVisits: 0,
    totalRevenue: 0,
    rewardsRedeemed: 0
  })
  const [salonForm, setSalonForm] = useState({
    name: '',
    address: '',
    phone: '',
    loyaltyThreshold: 10,
    rewardDescription: 'Free haircut after 10 visits'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSalon()
      fetchStats()
    }
  }, [user])

  const fetchSalon = async () => {
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setSalon(data)
        setSalonForm({
          name: data.name,
          address: data.address,
          phone: data.phone,
          loyaltyThreshold: data.loyalty_threshold,
          rewardDescription: data.reward_description
        })
      }
    } catch (error) {
      console.error('Error fetching salon:', error)
    }
  }

  const fetchStats = async () => {
    try {
      // Get salon first
      const { data: salonData } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_id', user?.id)
        .single()

      if (!salonData) return

      // Fetch stats
      const [customersResult, visitsResult, rewardsResult] = await Promise.all([
        supabase
          .from('loyalty_cards')
          .select('id')
          .eq('salon_id', salonData.id),
        supabase
          .from('visits')
          .select('amount')
          .eq('salon_id', salonData.id),
        supabase
          .from('loyalty_cards')
          .select('rewards_redeemed')
          .eq('salon_id', salonData.id)
      ])

      const totalRevenue = visitsResult.data?.reduce((sum, visit) => sum + visit.amount, 0) || 0
      const totalRewards = rewardsResult.data?.reduce((sum, card) => sum + card.rewards_redeemed, 0) || 0

      setStats({
        totalCustomers: customersResult.data?.length || 0,
        totalVisits: visitsResult.data?.length || 0,
        totalRevenue,
        rewardsRedeemed: totalRewards
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSalonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const qrCode = `${window.location.origin}/scan/${user?.id}`
      
      if (salon) {
        // Update existing salon
        const { error } = await supabase
          .from('salons')
          .update({
            name: salonForm.name,
            address: salonForm.address,
            phone: salonForm.phone,
            loyalty_threshold: salonForm.loyaltyThreshold,
            reward_description: salonForm.rewardDescription,
            updated_at: new Date().toISOString()
          })
          .eq('id', salon.id)

        if (error) throw error
      } else {
        // Create new salon
        const { error } = await supabase
          .from('salons')
          .insert({
            name: salonForm.name,
            address: salonForm.address,
            phone: salonForm.phone,
            owner_id: user?.id!,
            qr_code: qrCode,
            loyalty_threshold: salonForm.loyaltyThreshold,
            reward_description: salonForm.rewardDescription
          })

        if (error) throw error
      }

      toast.success('Salon updated successfully!')
      fetchSalon()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Salon Dashboard</h1>
        <Badge variant="secondary" className="text-sm">
          <Store className="h-4 w-4 mr-1" />
          Salon Owner
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rewards Redeemed</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rewardsRedeemed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salon Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Salon Information</CardTitle>
            <CardDescription>
              Set up your salon details and loyalty program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalonSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Salon Name</Label>
                <Input
                  id="name"
                  value={salonForm.name}
                  onChange={(e) => setSalonForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={salonForm.address}
                  onChange={(e) => setSalonForm(prev => ({ ...prev, address: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={salonForm.phone}
                  onChange={(e) => setSalonForm(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Loyalty Threshold (visits for reward)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  value={salonForm.loyaltyThreshold}
                  onChange={(e) => setSalonForm(prev => ({ ...prev, loyaltyThreshold: parseInt(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward">Reward Description</Label>
                <Textarea
                  id="reward"
                  value={salonForm.rewardDescription}
                  onChange={(e) => setSalonForm(prev => ({ ...prev, rewardDescription: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (salon ? 'Update Salon' : 'Create Salon')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* QR Code */}
        {salon && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Your Salon QR Code
              </CardTitle>
              <CardDescription>
                Customers scan this to check in and earn loyalty points
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border">
                <QRCodeSVG value={salon.qr_code} size={200} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Print this QR code and display it at your salon counter
              </p>
              <Button 
                onClick={() => window.print()} 
                variant="outline"
                className="w-full"
              >
                Print QR Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}