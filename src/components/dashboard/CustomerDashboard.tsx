import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Gift, MapPin, Calendar, Star, Scissors, QrCode } from 'lucide-react'
import { QrScanner } from '@/components/QrScanner'

export function CustomerDashboard() {
  const { user } = useAuth()
  const [loyaltyCards, setLoyaltyCards] = useState<any[]>([])
  const [recentVisits, setRecentVisits] = useState<any[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchLoyaltyCards()
      fetchRecentVisits()
    }
  }, [user])

  const fetchLoyaltyCards = async () => {
    try {
      const { data, error } = await supabase
        .from('loyalty_cards')
        .select(`
          *,
          salons (
            name,
            address,
            loyalty_threshold,
            reward_description
          )
        `)
        .eq('customer_id', user?.id)

      if (error) throw error
      setLoyaltyCards(data || [])
    } catch (error) {
      console.error('Error fetching loyalty cards:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentVisits = async () => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          salons (name),
          profiles!visits_barber_id_fkey (full_name)
        `)
        .eq('customer_id', user?.id)
        .order('visit_date', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentVisits(data || [])
    } catch (error) {
      console.error('Error fetching recent visits:', error)
    }
  }

  const handleScanSuccess = (salonId: string) => {
    setShowScanner(false)
    // Refresh data after successful scan
    fetchLoyaltyCards()
    fetchRecentVisits()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Loyalty Cards</h1>
        <Button onClick={() => setShowScanner(true)} className="flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          Scan QR Code
        </Button>
      </div>

      {/* Loyalty Cards */}
      {loyaltyCards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scissors className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Loyalty Cards Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Visit a salon and scan their QR code to start earning rewards!
            </p>
            <Button onClick={() => setShowScanner(true)}>
              Scan Your First QR Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loyaltyCards.map((card) => {
            const progress = (card.total_visits / card.salons.loyalty_threshold) * 100
            const visitsNeeded = Math.max(0, card.salons.loyalty_threshold - card.total_visits)
            
            return (
              <Card key={card.id} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{card.salons.name}</CardTitle>
                    {card.total_visits >= card.salons.loyalty_threshold && (
                      <Badge className="bg-green-100 text-green-800">
                        <Gift className="h-3 w-3 mr-1" />
                        Reward Ready!
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {card.salons.address}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{card.total_visits}/{card.salons.loyalty_threshold} visits</span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Points:</span>
                      <span className="font-semibold">{card.total_points}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rewards Redeemed:</span>
                      <span className="font-semibold">{card.rewards_redeemed}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">Reward:</p>
                    <p className="text-sm text-blue-700">{card.salons.reward_description}</p>
                    {visitsNeeded > 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        {visitsNeeded} more visit{visitsNeeded !== 1 ? 's' : ''} needed
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Recent Visits */}
      {recentVisits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Visits</CardTitle>
            <CardDescription>Your latest salon visits and points earned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Scissors className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{visit.salons.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {visit.service_type}
                        {visit.profiles?.full_name && ` • ${visit.profiles.full_name}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(visit.visit_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${visit.amount}</p>
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      +{visit.points_earned} points
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QrScanner
          onClose={() => setShowScanner(false)}
          onSuccess={handleScanSuccess}
        />
      )}
    </div>
  )
}