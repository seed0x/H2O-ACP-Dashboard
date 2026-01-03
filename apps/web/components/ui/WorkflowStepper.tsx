'use client'
import { useState, useEffect } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { Textarea } from './Textarea'
import axios from 'axios'
import { API_BASE_URL } from '../../lib/config'
import { showToast } from '../Toast'
import { handleApiError } from '../../lib/error-handler'
import UilCamera from '@iconscout/react-unicons/icons/uil-camera'
import UilFileAlt from '@iconscout/react-unicons/icons/uil-file-alt'
import UilCalendarAlt from '@iconscout/react-unicons/icons/uil-calendar-alt'
import UilShoppingCart from '@iconscout/react-unicons/icons/uil-shopping-cart'
import UilEnvelopeSend from '@iconscout/react-unicons/icons/uil-envelope-send'
import UilDollarSign from '@iconscout/react-unicons/icons/uil-dollar-sign'
import UilCheckCircle from '@iconscout/react-unicons/icons/uil-check-circle'

interface WorkflowData {
  id: string
  current_step: number
  completed: boolean
  paperwork_photo_urls?: string[]
  needs_permit?: boolean
  permit_notes?: string
  needs_reschedule?: boolean
  reschedule_date?: string
  reschedule_notes?: string
  needs_parts_order?: boolean
  parts_order_notes?: string
  needs_bid?: boolean
  bid_id?: string
  needs_pricing?: boolean
  estimated_price?: number
  needs_price_approval?: boolean
  price_approval_notes?: string
}

interface WorkflowStepperProps {
  serviceCallId: string
  onComplete?: () => void
}

const STEPS = [
  { id: 0, title: 'Upload Paperwork', icon: UilCamera },
  { id: 1, title: 'Permit Check', icon: UilFileAlt },
  { id: 2, title: 'Reschedule?', icon: UilCalendarAlt },
  { id: 3, title: 'Parts Order', icon: UilShoppingCart },
  { id: 4, title: 'Send Bid?', icon: UilEnvelopeSend },
  { id: 5, title: 'Price It', icon: UilDollarSign },
  { id: 6, title: 'Price Approval', icon: UilCheckCircle },
]

export function WorkflowStepper({ serviceCallId, onComplete }: WorkflowStepperProps) {
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  
  // Step-specific state
  const [paperworkPhotos, setPaperworkPhotos] = useState<string[]>([])
  const [needsPermit, setNeedsPermit] = useState<boolean | null>(null)
  const [permitNotes, setPermitNotes] = useState('')
  const [needsReschedule, setNeedsReschedule] = useState<boolean | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [needsPartsOrder, setNeedsPartsOrder] = useState<boolean | null>(null)
  const [partsOrderNotes, setPartsOrderNotes] = useState('')
  const [needsBid, setNeedsBid] = useState<boolean | null>(null)
  const [needsPricing, setNeedsPricing] = useState<boolean | null>(null)
  const [estimatedPrice, setEstimatedPrice] = useState('')
  const [needsPriceApproval, setNeedsPriceApproval] = useState<boolean | null>(null)
  const [priceApprovalNotes, setPriceApprovalNotes] = useState('')

  useEffect(() => {
    loadWorkflow()
  }, [serviceCallId])

  async function loadWorkflow() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `${API_BASE_URL}/service-calls/${serviceCallId}/workflow`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        }
      )
      const data = response.data
      setWorkflow(data)
      setCurrentStep(data.current_step || 0)
      
      // Load step-specific data
      setPaperworkPhotos(data.paperwork_photo_urls || [])
      setNeedsPermit(data.needs_permit ?? null)
      setPermitNotes(data.permit_notes || '')
      setNeedsReschedule(data.needs_reschedule ?? null)
      setRescheduleDate(data.reschedule_date || '')
      setRescheduleNotes(data.reschedule_notes || '')
      setNeedsPartsOrder(data.needs_parts_order ?? null)
      setPartsOrderNotes(data.parts_order_notes || '')
      setNeedsBid(data.needs_bid ?? null)
      setNeedsPricing(data.needs_pricing ?? null)
      setEstimatedPrice(data.estimated_price?.toString() || '')
      setNeedsPriceApproval(data.needs_price_approval ?? null)
      setPriceApprovalNotes(data.price_approval_notes || '')
    } catch (error: unknown) {
      handleApiError(error, 'Load workflow')
    } finally {
      setLoading(false)
    }
  }

  async function saveStep() {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const updateData: Record<string, string | number | boolean | null> = {}
      
      // Save current step data
      const updatePayload: Record<string, unknown> = { ...updateData }
      if (currentStep === 0) {
        updatePayload.paperwork_photo_urls = paperworkPhotos
      } else if (currentStep === 1) {
        updateData.needs_permit = needsPermit
        updateData.permit_notes = permitNotes || undefined
      } else if (currentStep === 2) {
        updateData.needs_reschedule = needsReschedule
        updateData.reschedule_date = rescheduleDate || undefined
        updateData.reschedule_notes = rescheduleNotes || undefined
      } else if (currentStep === 3) {
        updateData.needs_parts_order = needsPartsOrder
        updateData.parts_order_notes = partsOrderNotes || undefined
      } else if (currentStep === 4) {
        updateData.needs_bid = needsBid
      } else if (currentStep === 5) {
        updateData.needs_pricing = needsPricing
        updateData.estimated_price = estimatedPrice ? parseFloat(estimatedPrice) : undefined
      } else if (currentStep === 6) {
        updateData.needs_price_approval = needsPriceApproval
        updateData.price_approval_notes = priceApprovalNotes || undefined
        updateData.completed = true
      }
      
      updateData.current_step = currentStep
      
      await axios.patch(
        `${API_BASE_URL}/service-calls/${serviceCallId}/workflow`,
        updateData,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          withCredentials: true
        }
      )
      
      showToast('Step saved', 'success')
      await loadWorkflow()
    } catch (error: unknown) {
      handleApiError(error, 'Load workflow')
    } finally {
      setSaving(false)
    }
  }

  async function nextStep() {
    await saveStep()
    
    if (currentStep < 6) {
      // Advance to next step
      const token = localStorage.getItem('token')
      try {
        await axios.post(
          `${API_BASE_URL}/service-calls/${serviceCallId}/workflow/complete-step?step=${currentStep}`,
          {},
          {
            headers: { 'Authorization': `Bearer ${token}` },
            withCredentials: true
          }
        )
        setCurrentStep(currentStep + 1)
        await loadWorkflow()
      } catch (error: unknown) {
        handleApiError(error, 'Complete workflow step')
      }
    } else {
      // Workflow complete
      if (onComplete) {
        onComplete()
      }
      showToast('Workflow completed!', 'success')
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      if (!token) {
        showToast('Authentication required', 'error')
        return
      }
      
      // Create FormData for file upload
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)  // FastAPI expects 'files' field name for List[UploadFile]
      })
      
      // Upload files to backend
      // Note: This endpoint needs to be implemented in the backend
      // Expected endpoint: POST /service-calls/{serviceCallId}/workflow/upload-paperwork
      const uploadResponse = await axios.post(
        `${API_BASE_URL}/service-calls/${serviceCallId}/workflow/upload-paperwork`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        }
      )
      
      // Get uploaded URLs from response
      const uploadedUrls = uploadResponse.data.urls || uploadResponse.data.photo_urls || []
      if (uploadedUrls.length > 0) {
        setPaperworkPhotos([...paperworkPhotos, ...uploadedUrls])
        showToast(`Uploaded ${uploadedUrls.length} photo(s)`, 'success')
      } else {
        // Fallback: If endpoint doesn't exist yet, show helpful message
        showToast('Photo upload endpoint not yet implemented. Please contact admin.', 'warning')
      }
    } catch (error: unknown) {
      // If 404, the endpoint doesn't exist yet
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        showToast('Photo upload endpoint not yet implemented. Using placeholder URLs for now.', 'info')
        // Fallback to placeholder URLs for development
        const placeholderUrls = files.map((_, i) => `https://placeholder.com/photo-${Date.now()}-${i}.jpg`)
        setPaperworkPhotos([...paperworkPhotos, ...placeholderUrls])
      } else {
        handleApiError(error, 'Upload paperwork photos')
      }
    } finally {
      setSaving(false)
      // Reset file input
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="text-center text-[var(--color-text-secondary)]">Loading workflow...</div>
      </div>
    )
  }

  if (workflow?.completed) {
    return (
      <div className="bg-[var(--color-card)] border-2 border-green-500/30 rounded-xl p-6">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <UilCheckCircle size={48} color="rgb(34, 197, 94)" />
          </div>
          <div className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Workflow Completed!
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            All steps have been completed for this service call.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">
        Completion Workflow
      </h3>
      
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-all ${
                  idx < currentStep
                    ? 'bg-green-500 text-white'
                    : idx === currentStep
                    ? 'bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/20'
                    : 'bg-[var(--color-hover)] text-[var(--color-text-secondary)]'
                }`}
              >
                {idx < currentStep ? (
                  <UilCheckCircle size={20} color="white" />
                ) : (
                  <step.icon size={20} color={idx === currentStep ? 'white' : 'var(--color-text-secondary)'} />
                )}
              </div>
              <div className={`text-xs mt-2 text-center max-w-[80px] ${
                idx === currentStep ? 'font-semibold text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
              }`}>
                {step.title}
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-2 ${
                idx < currentStep ? 'bg-green-500' : 'bg-[var(--color-border)]'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="border-t border-[var(--color-border)] pt-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Upload Photo of Paperwork
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-[var(--color-text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-hover)]"
              />
              {paperworkPhotos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {paperworkPhotos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square bg-[var(--color-hover)] rounded-lg overflow-hidden">
                      <img src={url} alt={`Paperwork ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPaperworkPhotos(paperworkPhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Do we need a permit?
              </label>
              <div className="flex gap-4">
                <Button
                  variant={needsPermit === true ? 'primary' : 'secondary'}
                  onClick={() => setNeedsPermit(true)}
                  size="sm"
                >
                  Yes
                </Button>
                <Button
                  variant={needsPermit === false ? 'primary' : 'secondary'}
                  onClick={() => setNeedsPermit(false)}
                  size="sm"
                >
                  No
                </Button>
              </div>
              {needsPermit && (
                <div className="mt-4">
                  <Textarea
                    value={permitNotes}
                    onChange={(e) => setPermitNotes(e.target.value)}
                    placeholder="Permit details and notes..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Do we need to reschedule or come back?
              </label>
              <div className="flex gap-4">
                <Button
                  variant={needsReschedule === true ? 'primary' : 'secondary'}
                  onClick={() => setNeedsReschedule(true)}
                  size="sm"
                >
                  Yes
                </Button>
                <Button
                  variant={needsReschedule === false ? 'primary' : 'secondary'}
                  onClick={() => setNeedsReschedule(false)}
                  size="sm"
                >
                  No
                </Button>
              </div>
              {needsReschedule && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Reschedule Date
                    </label>
                    <Input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      value={rescheduleNotes}
                      onChange={(e) => setRescheduleNotes(e.target.value)}
                      placeholder="Reschedule reason and notes..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Do we need to order parts?
              </label>
              <div className="flex gap-4">
                <Button
                  variant={needsPartsOrder === true ? 'primary' : 'secondary'}
                  onClick={() => setNeedsPartsOrder(true)}
                  size="sm"
                >
                  Yes
                </Button>
                <Button
                  variant={needsPartsOrder === false ? 'primary' : 'secondary'}
                  onClick={() => setNeedsPartsOrder(false)}
                  size="sm"
                >
                  No
                </Button>
              </div>
              {needsPartsOrder && (
                <div className="mt-4">
                  <Textarea
                    value={partsOrderNotes}
                    onChange={(e) => setPartsOrderNotes(e.target.value)}
                    placeholder="Parts needed and order details..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Do we need to send a bid?
              </label>
              <div className="flex gap-4">
                <Button
                  variant={needsBid === true ? 'primary' : 'secondary'}
                  onClick={() => setNeedsBid(true)}
                  size="sm"
                >
                  Yes
                </Button>
                <Button
                  variant={needsBid === false ? 'primary' : 'secondary'}
                  onClick={() => setNeedsBid(false)}
                  size="sm"
                >
                  No
                </Button>
              </div>
              {needsBid && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-sm text-blue-400">
                    💡 You can create a bid from the service call detail page after completing this workflow.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Do we need to price it?
              </label>
              <div className="flex gap-4">
                <Button
                  variant={needsPricing === true ? 'primary' : 'secondary'}
                  onClick={() => setNeedsPricing(true)}
                  size="sm"
                >
                  Yes
                </Button>
                <Button
                  variant={needsPricing === false ? 'primary' : 'secondary'}
                  onClick={() => setNeedsPricing(false)}
                  size="sm"
                >
                  No
                </Button>
              </div>
              {needsPricing && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Estimated Price ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Do you need price approval?
              </label>
              <div className="flex gap-4">
                <Button
                  variant={needsPriceApproval === true ? 'primary' : 'secondary'}
                  onClick={() => setNeedsPriceApproval(true)}
                  size="sm"
                >
                  Yes
                </Button>
                <Button
                  variant={needsPriceApproval === false ? 'primary' : 'secondary'}
                  onClick={() => setNeedsPriceApproval(false)}
                  size="sm"
                >
                  No
                </Button>
              </div>
              {needsPriceApproval && (
                <div className="mt-4">
                  <Textarea
                    value={priceApprovalNotes}
                    onChange={(e) => setPriceApprovalNotes(e.target.value)}
                    placeholder="Price approval details and notes..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-6 border-t border-[var(--color-border)]">
          <Button
            variant="secondary"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            size="sm"
          >
            ← Previous
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={saveStep}
              disabled={saving}
              size="sm"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              onClick={nextStep}
              disabled={saving}
              size="sm"
            >
              {currentStep === 6 ? 'Complete Workflow' : 'Next Step →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

