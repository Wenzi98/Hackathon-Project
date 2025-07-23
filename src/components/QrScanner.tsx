import { useState, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import { QrCode, X } from 'lucide-react'

interface QrScannerProps {
  onClose: () => void
  onSuccess: (salonId: string) => void
}

export function QrScanner({ onClose, onSuccess }: QrScannerProps) {
  const { user } = useAuth()
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [salon, setSalon] = useState<any>(null)
  const [visitForm, setVisitForm] = useState({
    serviceType: '',
    amount: '',
    barberId: ''
  })
  const [barbers, setBarbers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!scannedData) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )

      scanner.render(
        (decodedText) => {
          setScannedData(decodedText)
          scanner.clear()
        },
        (error) => {
          console.log('QR scan error:', error)
        }
      )

      return () => {
        scanner.clear()
      }
    }
  }, [scannedData])

  useEffect(() => {
    if (scannedData) {
      handleScannedData(scannedData)
    }
  }, [scannedData])

  const handleScannedData = async (data: string) => {
    try {
      // Extract salon owner ID from QR code URL
      const url = new URL(data)
      const ownerId = url.pathname.split('/').pop()

      if (!ownerId) {
        toast.error('Invalid QR code')
        return
      }

      // Fetch salon data
      const { data: salonData, error: salonError } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', ownerId)
        .single()

      if (salonError) throw salonError
      setSalon(salonData)

      // Fetch barbers for this salon
      const { data: barbersData, error: barbersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'barber')

      if (barbersError) throw barbersError
      setBarbers(barbersData || [])

    } catch (error) {
      console.error('Error processing QR code:', error)
      toast.error('Invalid QR code or salon not found')
    }
  }

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!salon || !user) return

    setLoading(true)

    try {
      const amount = parseFloat(visitForm.amount)
      const pointsEarned = Math.floor(amount) // 1 point per dollar

      // Create visit record
      const { error: visitError } = await supabase
        .from('visits')
        .insert({
          customer_id: user.id,
          salon_id: salon.id,
          barber_id: visitForm.barberId || null,
          service_type: visitForm.serviceType,
          amount,
          points_earned: pointsEarned,
          visit_date: new Date().toISOString()
        })

      if (visitError) throw visitError

      // Update or create loyalty card
      const { data: existingCard, error: cardFetchError } = await supabase
        .from('loyalty_cards')
        .select('*')
        .eq('customer_id', user.id)
        .eq('salon_id', salon.id)
        .single()

      if (cardFetchError && cardFetchError.code !== 'PGRST116') throw cardFetchError

      if (existingCard) {
        // Update existing card
        const { error: updateError } = await supabase
          .from('loyalty_cards')
          .update({
            total_visits: existingCard.total_visits + 1,
            total_points: existingCard.total_points + pointsEarned,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCard.id)

        if (updateError) throw updateError
      } else {
        // Create new loyalty card
        const { error: createError } = await supabase
          .from('loyalty_cards')
          .insert({
            customer_id: user.id,
            salon_id: salon.id,
            total_visits: 1,
            total_points: pointsEarned,
            rewards_redeemed: 0
          })

        if (createError) throw createError
      }

      toast.success(`Visit recorded! You earned ${pointsEarned} points.`)
      onSuccess(salon.id)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {salon ? 'Record Your Visit' : 'Scan QR Code'}
          </DialogTitle>
          <DialogDescription>
            {salon 
              ? `Record your visit to ${salon.name}` 
              : 'Point your camera at the salon\'s QR code'
            }
          </DialogDescription>
        </DialogHeader>

        {!salon ? (
          <div id="qr-reader" className="w-full" />
        ) : (
          <form onSubmit={handleVisitSubmit} className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">{salon.name}</h3>
              <p className="text-sm text-blue-700">{salon.address}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Input
                id="serviceType"
                value={visitForm.serviceType}
                onChange={(e) => setVisitForm(prev => ({ ...prev, serviceType: e.target.value }))}
                placeholder="e.g., Haircut, Beard trim, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount Spent ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={visitForm.amount}
                onChange={(e) => setVisitForm(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            {barbers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="barber">Barber (Optional)</Label>
                <Select value={visitForm.barberId} onValueChange={(value) => setVisitForm(prev => ({ ...prev, barberId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a barber" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Recording...' : 'Record Visit'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="absolute right-4 top-4"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  )
}