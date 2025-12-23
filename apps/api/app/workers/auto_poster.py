"""
Auto-posting worker that publishes scheduled posts when they're due
"""
import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select, and_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import AsyncSessionLocal
from .. import models

logger = logging.getLogger(__name__)


class AutoPoster:
    """Background worker that publishes scheduled posts"""
    
    CHECK_INTERVAL = 60  # Check every 60 seconds
    
    async def run_forever(self):
        """Main worker loop"""
        logger.info("AutoPoster worker started")
        
        while True:
            try:
                await self.check_and_publish()
                await asyncio.sleep(self.CHECK_INTERVAL)
            except Exception as e:
                logger.error(f"AutoPoster error: {e}", exc_info=True)
                await asyncio.sleep(self.CHECK_INTERVAL)
    
    async def check_and_publish(self):
        """Find and publish posts that are due"""
        async with AsyncSessionLocal() as session:
            try:
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                
                # Find posts due for publishing
                # Status must be 'Scheduled', scheduled_for <= now, autopost_enabled = True, and must have content
                query = select(models.PostInstance).where(
                    and_(
                        models.PostInstance.status == 'Scheduled',
                        models.PostInstance.scheduled_for <= now,
                        models.PostInstance.autopost_enabled == True,
                        models.PostInstance.content_item_id.isnot(None)  # Must have content
                    )
                ).options(
                    joinedload(models.PostInstance.content_item).selectinload(models.ContentItem.media_assets),
                    joinedload(models.PostInstance.channel_account).joinedload(models.ChannelAccount.channel)
                )
                
                result = await session.execute(query)
                due_posts = result.unique().scalars().all()
                
                if due_posts:
                    logger.info(f"Found {len(due_posts)} posts due for publishing")
                
                for post in due_posts:
                    try:
                        await self.publish_post(post, session)
                    except Exception as e:
                        logger.error(f"Failed to publish post {post.id}: {e}", exc_info=True)
                        await self.mark_failed(post, str(e), session)
                
                await session.commit()
            except Exception as e:
                logger.error(f"Error in check_and_publish: {e}", exc_info=True)
                await session.rollback()
    
    async def publish_post(self, post: models.PostInstance, session: AsyncSession):
        """Publish a single post to its channel"""
        logger.info(f"Publishing post {post.id} to channel account {post.channel_account_id}")
        
        # Get platform publisher
        publisher = self.get_publisher(post.channel_account)
        
        if not publisher:
            raise ValueError(f"No publisher available for platform: {post.channel_account.channel.name if post.channel_account.channel else 'unknown'}")
        
        # Create publish job to track this attempt
        publish_job = models.PublishJob(
            tenant_id=post.tenant_id,
            post_instance_id=post.id,
            attempt_no=1,  # Could check for existing jobs and increment
            method='api',
            provider=post.channel_account.oauth_provider or 'unknown',
            status='in_progress'
        )
        session.add(publish_job)
        await session.flush()  # Get the ID
        
        try:
            # Get caption (use override if available, otherwise use content item caption)
            caption = post.caption_override or (post.content_item.base_caption if post.content_item else '')
            
            # Get media URLs
            media_urls = []
            if post.content_item and post.content_item.media_assets:
                media_urls = [asset.file_url for asset in post.content_item.media_assets]
            
            # Publish via platform-specific publisher
            result = await publisher.publish(
                caption=caption,
                media_urls=media_urls,
                account=post.channel_account
            )
            
            # Update post status
            post.status = 'Posted'
            post.posted_at = datetime.now(timezone.utc).replace(tzinfo=None)
            post.post_url = result.get('url') or result.get('post_url')
            post.publish_job_id = publish_job.id
            
            # Update publish job
            publish_job.status = 'completed'
            publish_job.response_ref = result.get('id') or result.get('post_id')
            
            logger.info(f"Successfully published post {post.id} - URL: {post.post_url}")
            
        except Exception as e:
            # Mark publish job as failed
            publish_job.status = 'failed'
            publish_job.error = str(e)
            raise
    
    async def mark_failed(self, post: models.PostInstance, error: str, session: AsyncSession):
        """Mark post as failed"""
        post.status = 'Failed'
        post.last_error = error
        logger.error(f"Post {post.id} marked as failed: {error}")
    
    def get_publisher(self, account: models.ChannelAccount):
        """Get platform-specific publisher"""
        # Import publishers (will be created if they don't exist)
        try:
            from ..publishers import get_publisher_for_account
            return get_publisher_for_account(account)
        except ImportError:
            # If publishers module doesn't exist, return a stub publisher
            logger.warning("Publishers module not found, using stub publisher")
            from ..publishers.stub import StubPublisher
            return StubPublisher()


class StubPublisher:
    """Stub publisher for platforms without full implementation"""
    
    async def publish(self, caption: str, media_urls: list, account: models.ChannelAccount) -> dict:
        """Stub publish method - logs instead of actually publishing"""
        logger.warning(f"StubPublisher: Would publish to {account.name} ({account.channel.name if account.channel else 'unknown'}): {caption[:50]}...")
        # Return a mock result
        return {
            "url": f"https://stub.example.com/post/{account.id}",
            "id": "stub_post_id",
            "status": "posted"
        }


async def main():
    """Entry point for running the worker"""
    worker = AutoPoster()
    await worker.run_forever()


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run the worker
    asyncio.run(main())

