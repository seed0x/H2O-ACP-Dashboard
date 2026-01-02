'use client'

import React, { useState, useCallback, useRef } from 'react'
import { marketingApi, MediaAsset } from '../../lib/api/marketing'

interface PhotoUploadProps {
  tenantId: string
  contentItemId?: string
  onUploadComplete: (assets: MediaAsset[]) => void
  onUploadError?: (error: Error) => void
  existingAssets?: MediaAsset[]
  maxFiles?: number
  accept?: string
  className?: string
}

interface FileWithPreview {
  file: File
  preview: string
  uploadProgress?: number
  uploadedAsset?: MediaAsset
  error?: string
}

export function PhotoUpload({
  tenantId,
  contentItemId,
  onUploadComplete,
  onUploadError,
  existingAssets = [],
  maxFiles = 10,
  accept = 'image/*,video/*',
  className = ''
}: PhotoUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize with existing assets
  React.useEffect(() => {
    if (existingAssets.length > 0 && files.length === 0) {
      // Convert existing assets to FileWithPreview format (read-only)
      const existing = existingAssets.map(asset => ({
        file: new File([], asset.file_name),
        preview: asset.file_url,
        uploadedAsset: asset
      }))
      setFiles(existing)
    }
  }, [existingAssets])

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: FileWithPreview[] = []
    const remainingSlots = maxFiles - files.filter(f => !f.uploadedAsset).length

    Array.from(fileList).slice(0, remainingSlots).forEach(file => {
      // Validate file type
      if (accept.includes('image/*') && file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file)
        newFiles.push({ file, preview })
      } else if (accept.includes('video/*') && file.type.startsWith('video/')) {
        // For videos, we could show a thumbnail or just a placeholder
        const preview = URL.createObjectURL(file)
        newFiles.push({ file, preview })
      } else {
        console.warn(`File ${file.name} is not an accepted type`)
      }
    })

    setFiles(prev => [...prev, ...newFiles])
  }, [files.length, maxFiles, accept])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const updated = [...prev]
      const removed = updated.splice(index, 1)[0]
      // Revoke object URL if it was a preview
      if (removed.preview && removed.preview.startsWith('blob:')) {
        URL.revokeObjectURL(removed.preview)
      }
      return updated
    })
  }, [])

  const uploadFiles = useCallback(async () => {
    const filesToUpload = files.filter(f => !f.uploadedAsset && !f.error)
    if (filesToUpload.length === 0) {
      onUploadComplete(files.filter(f => f.uploadedAsset).map(f => f.uploadedAsset!))
      return
    }

    setUploading(true)
    const uploadedAssets: MediaAsset[] = []
    const errors: Error[] = []

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileWithPreview = filesToUpload[i]
        
        setFiles(prev => prev.map(f => 
          f === fileWithPreview 
            ? { ...f, uploadProgress: 0 }
            : f
        ))

        try {
          const asset = await marketingApi.uploadMedia(
            fileWithPreview.file,
            tenantId,
            contentItemId,
            (progress) => {
              setFiles(prev => prev.map(f => 
                f === fileWithPreview 
                  ? { ...f, uploadProgress: progress }
                  : f
              ))
            }
          )

          setFiles(prev => prev.map(f => 
            f === fileWithPreview 
              ? { 
                  ...f, 
                  uploadedAsset: asset,
                  preview: asset.file_url, // Use the uploaded URL
                  uploadProgress: 100
                }
              : f
          ))

          uploadedAssets.push(asset)

          // Revoke old preview URL
          if (fileWithPreview.preview.startsWith('blob:')) {
            URL.revokeObjectURL(fileWithPreview.preview)
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          errors.push(err)
          
          setFiles(prev => prev.map(f => 
            f === fileWithPreview 
              ? { ...f, error: err.message, uploadProgress: undefined }
              : f
          ))
        }
      }

      // Combine existing and newly uploaded assets
      const allAssets = [
        ...files.filter(f => f.uploadedAsset).map(f => f.uploadedAsset!),
        ...uploadedAssets
      ]

      onUploadComplete(allAssets)

      if (errors.length > 0 && onUploadError) {
        onUploadError(new Error(`Failed to upload ${errors.length} file(s)`))
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (onUploadError) {
        onUploadError(err)
      }
    } finally {
      setUploading(false)
    }
  }, [files, tenantId, contentItemId, onUploadComplete, onUploadError])

  const downloadAsset = useCallback((asset: MediaAsset) => {
    const link = document.createElement('a')
    link.href = asset.file_url
    link.download = asset.file_name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const remainingSlots = maxFiles - files.filter(f => !f.uploadedAsset).length

  return (
    <div className={className}>
      {/* Upload Area */}
      {remainingSlots > 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' 
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-hover)]'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">📷</div>
            <div>
              <span className="text-[var(--color-primary)] font-medium">Click to upload</span>
              <span className="text-[var(--color-text-secondary)]"> or drag and drop</span>
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              Images or videos (up to {remainingSlots} more)
            </div>
          </div>
        </div>
      )}

      {/* File Preview Grid */}
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((fileWithPreview, index) => (
            <div
              key={index}
              className="relative group bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg overflow-hidden"
            >
              {/* Image/Video Preview */}
              {fileWithPreview.file.type.startsWith('image/') ? (
                <img
                  src={fileWithPreview.preview}
                  alt={fileWithPreview.file.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-[var(--color-hover)] flex items-center justify-center text-4xl">
                  🎥
                </div>
              )}

              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {fileWithPreview.uploadedAsset && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      downloadAsset(fileWithPreview.uploadedAsset!)
                    }}
                    className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    Download
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="px-3 py-1.5 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>

              {/* Upload Progress */}
              {fileWithPreview.uploadProgress !== undefined && fileWithPreview.uploadProgress < 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-hover)]">
                  <div
                    className="h-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${fileWithPreview.uploadProgress}%` }}
                  />
                </div>
              )}

              {/* Error Badge */}
              {fileWithPreview.error && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Error
                </div>
              )}

              {/* Uploaded Badge */}
              {fileWithPreview.uploadedAsset && !fileWithPreview.error && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  ✓
                </div>
              )}

              {/* File Name */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="text-white text-xs truncate">
                  {fileWithPreview.file.name || fileWithPreview.uploadedAsset?.file_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button (only show if there are files to upload) */}
      {files.some(f => !f.uploadedAsset && !f.error) && (
        <button
          onClick={uploadFiles}
          disabled={uploading}
          className="mt-4 w-full px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {uploading ? 'Uploading...' : `Upload ${files.filter(f => !f.uploadedAsset && !f.error).length} file(s)`}
        </button>
      )}
    </div>
  )
}

