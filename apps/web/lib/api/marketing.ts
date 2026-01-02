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
}

export interface UpdateContentItemRequest {
  title?: string
  base_caption?: string
  content_category?: string
  status?: string
  reviewer?: string
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
    onProgress?: (progress: number) => void
  ): Promise<MediaAsset> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const params = new URLSearchParams({ tenant_id: tenantId })
      if (contentItemId) params.append('content_item_id', contentItemId)
      
      const res = await apiClient.post<MediaAsset>(`/marketing/media/upload?${params}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
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
  }
}

