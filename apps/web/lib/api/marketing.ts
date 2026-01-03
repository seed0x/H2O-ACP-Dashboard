import { apiGet, apiPost, apiPatch, apiDelete, apiClient } from './client'
import { API_BASE_URL } from '../config'
import { handleApiError } from '../error-handler'

// Types
export interface ContentItem {
  id: string
  tenant_id: string
  title: string
  base_caption?: string
  media_urls?: string[]
  content_category?: string
  status: 'Idea' | 'Draft' | 'Needs Approval' | 'Scheduled' | 'Posted'
  owner: string
  reviewer?: string
  created_at: string
  updated_at: string
  media_assets?: MediaAsset[]
  cta_type?: string
  cta_url?: string
  tags?: string[]
  target_city?: string
  draft_due_date?: string
  notes?: string
  source_type?: string
  source_ref?: string
  offer_id?: string
  template_id?: string
}

export interface MediaAsset {
  id: string
  tenant_id: string
  content_item_id?: string
  file_name: string
  file_url: string
  file_type: 'image' | 'video'
  file_size?: number
  mime_type?: string
  intent_tags?: string[]
  created_at: string
}

export interface PostInstance {
  id: string
  tenant_id: string
  content_item_id?: string
  channel_account_id: string
  caption_override?: string
  scheduled_for?: string
  status: 'Planned' | 'Draft' | 'Scheduled' | 'Posted' | 'Failed'
  suggested_category?: string
  posted_at?: string
  post_url?: string
  gbp_post_type?: string
  gbp_cta_type?: string
  gbp_location_targeting?: string
  content_item?: ContentItem
  channel_account?: ChannelAccount
  created_at: string
  updated_at: string
}

export interface ChannelAccount {
  id: string
  tenant_id: string
  channel_id: string
  name: string
  posts_per_week?: number
  schedule_times?: string[]
  schedule_timezone?: string
  brand_diet?: Record<string, number>
  channel?: MarketingChannel
}

export interface MarketingChannel {
  id: string
  key: string
  display_name: string
  supports_autopost: boolean
}

export interface CreateContentItemRequest {
  tenant_id: string
  title: string
  base_caption?: string
  content_category?: string
  status?: string
  owner: string
  media_urls?: string[]
  cta_type?: string
  cta_url?: string
  tags?: string[]
  target_city?: string
  draft_due_date?: string
  notes?: string
  source_type?: string
  source_ref?: string
  offer_id?: string
  template_id?: string
}

export interface UpdateContentItemRequest {
  title?: string
  base_caption?: string
  content_category?: string
  status?: string
  reviewer?: string
  owner?: string
  cta_type?: string
  cta_url?: string
  tags?: string[]
  target_city?: string
  draft_due_date?: string
  notes?: string
  source_type?: string
  source_ref?: string
  offer_id?: string
  template_id?: string
  media_urls?: string[]
}

export interface CreatePostInstancesRequest {
  content_item_id: string
  channel_account_ids: string[]
  scheduled_for?: string
}

export interface UpdatePostInstanceRequest {
  content_item_id?: string
  caption_override?: string
  scheduled_for?: string
  status?: string
  gbp_post_type?: string
  gbp_cta_type?: string
  gbp_location_targeting?: string
}

// API Client
export const marketingApi = {
  // Content Items
  listContentItems: async (tenantId: string, filters?: {
    status?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<ContentItem[]> => {
    try {
      const params = new URLSearchParams({ tenant_id: tenantId })
      if (filters?.status) params.append('status', filters.status)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.offset) params.append('offset', String(filters.offset))
      
      return await apiGet<ContentItem[]>(`/marketing/content-items?${params}`)
    } catch (error) {
      handleApiError(error, 'Load content items')
      throw error
    }
  },

  getContentItem: async (itemId: string): Promise<ContentItem> => {
    try {
      return await apiGet<ContentItem>(`/marketing/content-items/${itemId}`)
    } catch (error) {
      handleApiError(error, 'Load content item')
      throw error
    }
  },

  createContentItem: async (data: CreateContentItemRequest): Promise<ContentItem> => {
    try {
      return await apiPost<ContentItem>('/marketing/content-items', data)
    } catch (error) {
      handleApiError(error, 'Create content item')
      throw error
    }
  },

  updateContentItem: async (itemId: string, data: UpdateContentItemRequest): Promise<ContentItem> => {
    try {
      return await apiPatch<ContentItem>(`/marketing/content-items/${itemId}`, data)
    } catch (error) {
      handleApiError(error, 'Update content item')
      throw error
    }
  },

  deleteContentItem: async (itemId: string): Promise<void> => {
    try {
      await apiDelete(`/marketing/content-items/${itemId}`)
    } catch (error) {
      handleApiError(error, 'Delete content item')
      throw error
    }
  },

  // Post Instances
  listPostInstances: async (tenantId: string, filters?: {
    content_item_id?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<PostInstance[]> => {
    try {
      const params = new URLSearchParams({ tenant_id: tenantId })
      if (filters?.content_item_id) params.append('content_item_id', filters.content_item_id)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.offset) params.append('offset', String(filters.offset))
      
      return await apiGet<PostInstance[]>(`/marketing/post-instances?${params}`)
    } catch (error) {
      handleApiError(error, 'Load post instances')
      throw error
    }
  },

  getPostInstance: async (instanceId: string): Promise<PostInstance> => {
    try {
      return await apiGet<PostInstance>(`/marketing/post-instances/${instanceId}`)
    } catch (error) {
      handleApiError(error, 'Load post instance')
      throw error
    }
  },

  updatePostInstance: async (instanceId: string, data: UpdatePostInstanceRequest): Promise<PostInstance> => {
    try {
      return await apiPatch<PostInstance>(`/marketing/post-instances/${instanceId}`, data)
    } catch (error) {
      handleApiError(error, 'Update post instance')
      throw error
    }
  },

  createPostInstances: async (tenantId: string, data: CreatePostInstancesRequest): Promise<PostInstance[]> => {
    try {
      return await apiPost<PostInstance[]>(`/marketing/post-instances/bulk?tenant_id=${tenantId}`, data)
    } catch (error) {
      handleApiError(error, 'Create post instances')
      throw error
    }
  },

  markPostPosted: async (instanceId: string, data: {
    posted_at?: string
    post_url?: string
    screenshot_url?: string
    posted_manually: boolean
  }): Promise<PostInstance> => {
    try {
      return await apiPost<PostInstance>(`/marketing/post-instances/${instanceId}/mark-posted`, data)
    } catch (error) {
      handleApiError(error, 'Mark post as posted')
      throw error
    }
  },

  // Media Upload
  uploadMedia: async (
    file: File,
    tenantId: string,
    contentItemId?: string,
    intentTags?: string[],
    onProgress?: (progress: number) => void
  ): Promise<MediaAsset> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const params = new URLSearchParams({ tenant_id: tenantId })
      if (contentItemId) params.append('content_item_id', contentItemId)
      if (intentTags && intentTags.length > 0) {
        params.append('intent_tags', intentTags.join(','))
      }
      
      const res = await apiClient.post<MediaAsset>(`/marketing/media/upload?${params}`, formData, {
        // Don't set Content-Type header - axios will set it automatically with boundary for FormData
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(percentCompleted)
          }
        }
      })
      return res.data
    } catch (error) {
      handleApiError(error, 'Upload media')
      throw error
    }
  },

  // Calendar
  getCalendar: async (
    tenantId: string,
    startDate: Date,
    endDate: Date,
    includeUnscheduled = false
  ): Promise<Record<string, PostInstance[]>> => {
    try {
      const params = new URLSearchParams({
        tenant_id: tenantId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
      if (includeUnscheduled) params.append('include_unscheduled', 'true')
      
      return await apiGet<Record<string, PostInstance[]>>(`/marketing/calendar?${params}`)
    } catch (error) {
      handleApiError(error, 'Load calendar')
      throw error
    }
  },

  // Channel Accounts
  listChannelAccounts: async (tenantId: string): Promise<ChannelAccount[]> => {
    try {
      return await apiGet<ChannelAccount[]>(`/marketing/channel-accounts?tenant_id=${tenantId}`)
    } catch (error) {
      handleApiError(error, 'Load channel accounts')
      throw error
    }
  },

  // Channels
  listChannels: async (tenantId: string): Promise<MarketingChannel[]> => {
    try {
      return await apiGet<MarketingChannel[]>(`/marketing/channels?tenant_id=${tenantId}`)
    } catch (error) {
      handleApiError(error, 'Load channels')
      throw error
    }
  },

  // Scheduler
  topoffScheduler: async (tenantId: string, days = 28): Promise<{
    instances_created: number
    instances_skipped: number
    accounts_processed: number
  }> => {
    try {
      return await apiPost(`/marketing/scheduler/topoff?tenant_id=${tenantId}&days=${days}`, {})
    } catch (error) {
      handleApiError(error, 'Top off scheduler')
      throw error
    }
  },

  getContentTemplate: async (category: string): Promise<{
    category: string
    title: string
    caption: string
    title_options: string[]
  }> => {
    try {
      return await apiGet(`/marketing/scheduler/template/${category}`)
    } catch (error) {
      handleApiError(error, 'Get content template')
      throw error
    }
  },

  // Local SEO Topics
  listLocalSEOTopics: async (tenantId: string, filters?: {
    status?: string
    service_type?: string
    city?: string
    limit?: number
    offset?: number
  }): Promise<LocalSEOTopic[]> => {
    try {
      const params = new URLSearchParams({ tenant_id: tenantId })
      if (filters?.status) params.append('status', filters.status)
      if (filters?.service_type) params.append('service_type', filters.service_type)
      if (filters?.city) params.append('city', filters.city)
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.offset) params.append('offset', String(filters.offset))
      
      return await apiGet<LocalSEOTopic[]>(`/marketing/local-seo-topics?${params}`)
    } catch (error) {
      handleApiError(error, 'Load local SEO topics')
      throw error
    }
  },

  createLocalSEOTopic: async (data: {
    tenant_id: string
    service_type: string
    city: string
    status?: string
    target_url?: string
    notes?: string
  }): Promise<LocalSEOTopic> => {
    try {
      return await apiPost<LocalSEOTopic>('/marketing/local-seo-topics', data)
    } catch (error) {
      handleApiError(error, 'Create local SEO topic')
      throw error
    }
  },

  updateLocalSEOTopic: async (topicId: string, data: {
    status?: string
    last_posted_at?: string
    last_post_instance_id?: string
    target_url?: string
    notes?: string
  }): Promise<LocalSEOTopic> => {
    try {
      return await apiPatch<LocalSEOTopic>(`/marketing/local-seo-topics/${topicId}`, data)
    } catch (error) {
      handleApiError(error, 'Update local SEO topic')
      throw error
    }
  },

  getCoverageGaps: async (tenantId: string): Promise<{
    not_started: number
    needs_update: number
    total_gaps: number
  }> => {
    try {
      return await apiGet(`/marketing/local-seo-topics/coverage-gaps?tenant_id=${tenantId}`)
    } catch (error) {
      handleApiError(error, 'Load coverage gaps')
      throw error
    }
  },

  // Offers
  listOffers: async (tenantId: string, filters?: {
    is_active?: boolean
    service_type?: string
    limit?: number
    offset?: number
  }): Promise<Offer[]> => {
    try {
      const params = new URLSearchParams({ tenant_id: tenantId })
      if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
      if (filters?.service_type) params.append('service_type', filters.service_type)
      if (filters?.limit) params.append('limit', String(filters.limit))
      if (filters?.offset) params.append('offset', String(filters.offset))
      
      return await apiGet<Offer[]>(`/marketing/offers?${params}`)
    } catch (error) {
      handleApiError(error, 'Load offers')
      throw error
    }
  },

  listActiveOffers: async (tenantId: string): Promise<Offer[]> => {
    try {
      return await apiGet<Offer[]>(`/marketing/offers/active?tenant_id=${tenantId}`)
    } catch (error) {
      handleApiError(error, 'Load active offers')
      throw error
    }
  },

  createOffer: async (data: {
    tenant_id: string
    title: string
    description?: string
    service_type?: string
    valid_from: string
    valid_to: string
    discount_type: string
    discount_value?: number
    terms?: string
    is_active?: boolean
    coupon_code?: string
    website_url?: string
    sync_source?: string
    external_id?: string
  }): Promise<Offer> => {
    try {
      return await apiPost<Offer>('/marketing/offers', data)
    } catch (error) {
      handleApiError(error, 'Create offer')
      throw error
    }
  },

  updateOffer: async (offerId: string, data: Partial<Offer>): Promise<Offer> => {
    try {
      return await apiPatch<Offer>(`/marketing/offers/${offerId}`, data)
    } catch (error) {
      handleApiError(error, 'Update offer')
      throw error
    }
  },

  deleteOffer: async (offerId: string): Promise<void> => {
    try {
      await apiDelete(`/marketing/offers/${offerId}`)
    } catch (error) {
      handleApiError(error, 'Delete offer')
      throw error
    }
  },

  // Content Mix Tracking
  getContentMixSummary: async (tenantId: string, weeks: number = 4): Promise<ContentMixSummary[]> => {
    try {
      return await apiGet<ContentMixSummary[]>(`/marketing/content-mix/summary?tenant_id=${tenantId}&weeks=${weeks}`)
    } catch (error) {
      handleApiError(error, 'Load content mix summary')
      throw error
    }
  },

  // Seasonal Events
  listSeasonalEvents: async (tenantId: string, filters?: {
    start_date?: string
    end_date?: string
    event_type?: string
    city?: string
  }): Promise<SeasonalEvent[]> => {
    try {
      const params = new URLSearchParams({ tenant_id: tenantId })
      if (filters?.start_date) params.append('start_date', filters.start_date)
      if (filters?.end_date) params.append('end_date', filters.end_date)
      if (filters?.event_type) params.append('event_type', filters.event_type)
      if (filters?.city) params.append('city', filters.city)
      
      return await apiGet<SeasonalEvent[]>(`/marketing/seasonal-events?${params}`)
    } catch (error) {
      handleApiError(error, 'Load seasonal events')
      throw error
    }
  },

  getUpcomingEvents: async (tenantId: string, days: number = 30): Promise<SeasonalEvent[]> => {
    try {
      return await apiGet<SeasonalEvent[]>(`/marketing/seasonal-events/upcoming?tenant_id=${tenantId}&days=${days}`)
    } catch (error) {
      handleApiError(error, 'Load upcoming events')
      throw error
    }
  },

  createSeasonalEvent: async (data: {
    tenant_id: string
    event_type: string
    name: string
    start_date: string
    end_date: string
    city?: string
    content_suggestions?: string
    is_recurring?: boolean
  }): Promise<SeasonalEvent> => {
    try {
      return await apiPost<SeasonalEvent>('/marketing/seasonal-events', data)
    } catch (error) {
      handleApiError(error, 'Create seasonal event')
      throw error
    }
  },

  updateSeasonalEvent: async (eventId: string, data: Partial<SeasonalEvent>): Promise<SeasonalEvent> => {
    try {
      return await apiPatch<SeasonalEvent>(`/marketing/seasonal-events/${eventId}`, data)
    } catch (error) {
      handleApiError(error, 'Update seasonal event')
      throw error
    }
  },

  deleteSeasonalEvent: async (eventId: string): Promise<void> => {
    try {
      await apiDelete(`/marketing/seasonal-events/${eventId}`)
    } catch (error) {
      handleApiError(error, 'Delete seasonal event')
      throw error
    }
  },

  // Review-to-Content Pipeline
  getFlaggedReviews: async (tenantId: string, includeConverted: boolean = false): Promise<FlaggedReview[]> => {
    try {
      return await apiGet<FlaggedReview[]>(`/marketing/reviews/flagged-for-content?tenant_id=${tenantId}&include_converted=${includeConverted}`)
    } catch (error) {
      handleApiError(error, 'Load flagged reviews')
      throw error
    }
  },

  flagReviewForContent: async (reviewId: string, flag: boolean = true): Promise<void> => {
    try {
      await apiPost(`/marketing/reviews/${reviewId}/flag-for-content?flag=${flag}`, {})
    } catch (error) {
      handleApiError(error, flag ? 'Flag review' : 'Unflag review')
      throw error
    }
  },

  convertReviewToContent: async (reviewId: string, data: {
    review_id: string
    channel_account_ids: string[]
    scheduled_for?: string
    custom_caption?: string
  }): Promise<ContentItem> => {
    try {
      return await apiPost<ContentItem>(`/marketing/reviews/${reviewId}/convert-to-content`, data)
    } catch (error) {
      handleApiError(error, 'Convert review to content')
      throw error
    }
  }
}

// Additional Types
export interface LocalSEOTopic {
  id: string
  tenant_id: string
  service_type: string
  city: string
  status: 'not_started' | 'in_progress' | 'published' | 'needs_update'
  last_posted_at?: string
  last_post_instance_id?: string
  target_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  tenant_id: string
  title: string
  description?: string
  service_type?: string
  valid_from: string
  valid_to: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_service'
  discount_value?: number
  terms?: string
  is_active: boolean
  coupon_code?: string
  website_url?: string
  sync_source?: string
  external_id?: string
  created_at: string
  updated_at: string
}

export interface ContentMixSummary {
  channel_account_id: string
  channel_account_name: string
  week_start_date: string
  educational: { actual: number; target: number; percentage: number }
  authority: { actual: number; target: number; percentage: number }
  promo: { actual: number; target: number; percentage: number }
  local_relevance: { actual: number; target: number; percentage: number }
  overall_health: 'good' | 'warning' | 'critical'
  warnings: string[]
}

export interface SeasonalEvent {
  id: string
  tenant_id: string
  event_type: string
  name: string
  start_date: string
  end_date: string
  city?: string
  content_suggestions?: string
  is_recurring: boolean
  created_at: string
  updated_at: string
}

export interface FlaggedReview {
  id: string
  rating: number
  comment?: string
  customer_name: string
  is_converted: boolean
  content_item_id?: string
  created_at: string
}

// OAuth API
export const oauthApi = {
  // Get Google authorization URL
  getGoogleAuthUrl: async (channelAccountId: string): Promise<{ authorization_url: string; state: string }> => {
    try {
      return await apiGet<{ authorization_url: string; state: string }>(
        `/oauth/google/authorize?channel_account_id=${channelAccountId}`
      )
    } catch (error) {
      handleApiError(error, 'Get Google auth URL')
      throw error
    }
  },

  // Disconnect Google OAuth
  disconnectGoogle: async (channelAccountId: string): Promise<void> => {
    try {
      await apiPost(`/oauth/google/disconnect/${channelAccountId}`, {})
    } catch (error) {
      handleApiError(error, 'Disconnect Google')
      throw error
    }
  },

  // Get Google Business locations
  getGoogleLocations: async (channelAccountId: string): Promise<{ locations: Array<{ id: string; name: string; address: any }> }> => {
    try {
      return await apiGet<{ locations: Array<{ id: string; name: string; address: any }> }>(
        `/oauth/google/locations/${channelAccountId}`
      )
    } catch (error) {
      handleApiError(error, 'Get Google locations')
      throw error
    }
  }
}

