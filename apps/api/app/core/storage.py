"""
Storage service for uploading files to S3 or Cloudflare R2
"""
import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)

# Maximum file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024

# Allowed MIME types
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']
ALLOWED_MIME_TYPES = ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES


def get_s3_client():
    """Get boto3 S3 client configured for S3 or R2"""
    if settings.storage_provider == 'r2':
        if not settings.storage_endpoint_url:
            raise ValueError("STORAGE_ENDPOINT_URL is required for R2 storage")
        
        return boto3.client(
            's3',
            endpoint_url=settings.storage_endpoint_url,
            aws_access_key_id=settings.storage_access_key_id,
            aws_secret_access_key=settings.storage_secret_access_key,
            region_name=settings.storage_region
        )
    else:  # S3
        return boto3.client(
            's3',
            aws_access_key_id=settings.storage_access_key_id,
            aws_secret_access_key=settings.storage_secret_access_key,
            region_name=settings.storage_region
        )


def validate_file(file_content: bytes, mime_type: Optional[str] = None) -> tuple[bool, Optional[str]]:
    """
    Validate file size and type
    Returns: (is_valid, error_message)
    """
    if len(file_content) > MAX_FILE_SIZE:
        return False, f"File size exceeds maximum of {MAX_FILE_SIZE / (1024*1024):.0f}MB"
    
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        return False, f"File type {mime_type} is not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
    
    return True, None


def upload_file(
    file_content: bytes,
    file_name: str,
    tenant_id: str,
    folder: str = "media",
    mime_type: Optional[str] = None
) -> str:
    """
    Upload file to S3/R2 storage
    
    Args:
        file_content: File content as bytes
        file_name: Original file name
        tenant_id: Tenant ID for organizing files
        folder: Folder path in bucket (default: "media")
        mime_type: MIME type of the file
    
    Returns:
        Public URL of the uploaded file
    
    Raises:
        ValueError: If storage is not configured or file is invalid
        ClientError: If upload fails
    """
    if not settings.storage_bucket:
        raise ValueError("STORAGE_BUCKET is not configured")
    
    if not settings.storage_access_key_id or not settings.storage_secret_access_key:
        raise ValueError("Storage credentials are not configured")
    
    # Validate file
    is_valid, error_msg = validate_file(file_content, mime_type)
    if not is_valid:
        raise ValueError(error_msg)
    
    # Generate object key: tenant_id/folder/unique_filename
    import uuid
    file_ext = os.path.splitext(file_name)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    object_key = f"{tenant_id}/{folder}/{unique_filename}"
    
    try:
        s3_client = get_s3_client()
        
        # Upload file
        extra_args = {}
        if mime_type:
            extra_args['ContentType'] = mime_type
        
        s3_client.put_object(
            Bucket=settings.storage_bucket,
            Key=object_key,
            Body=file_content,
            **extra_args
        )
        
        # Generate public URL
        if settings.storage_provider == 'r2':
            # R2 public URL format
            if settings.storage_endpoint_url:
                # Extract domain from endpoint URL
                endpoint_domain = settings.storage_endpoint_url.replace('https://', '').replace('http://', '')
                public_url = f"https://{settings.storage_bucket}.{endpoint_domain}/{object_key}"
            else:
                public_url = f"https://{settings.storage_bucket}.r2.cloudflarestorage.com/{object_key}"
        else:
            # S3 public URL format
            if settings.storage_region:
                public_url = f"https://{settings.storage_bucket}.s3.{settings.storage_region}.amazonaws.com/{object_key}"
            else:
                public_url = f"https://{settings.storage_bucket}.s3.amazonaws.com/{object_key}"
        
        logger.info(f"Uploaded file {file_name} to {object_key}")
        return public_url
    
    except ClientError as e:
        logger.error(f"Failed to upload file to storage: {e}")
        raise


def generate_presigned_url(object_key: str, expiration: int = 3600) -> str:
    """
    Generate a presigned URL for temporary access to a file
    
    Args:
        object_key: S3/R2 object key
        expiration: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Presigned URL
    """
    try:
        s3_client = get_s3_client()
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.storage_bucket, 'Key': object_key},
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        raise


def delete_file(object_key: str) -> bool:
    """
    Delete a file from storage
    
    Args:
        object_key: S3/R2 object key
    
    Returns:
        True if successful, False otherwise
    """
    try:
        s3_client = get_s3_client()
        s3_client.delete_object(
            Bucket=settings.storage_bucket,
            Key=object_key
        )
        logger.info(f"Deleted file {object_key}")
        return True
    except ClientError as e:
        logger.error(f"Failed to delete file: {e}")
        return False

