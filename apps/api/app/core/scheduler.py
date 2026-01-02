"""
Background job scheduler using APScheduler
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler = None

def get_scheduler() -> AsyncIOScheduler:
    """Get or create the scheduler instance"""
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
    return scheduler

def start_scheduler():
    """Start the scheduler"""
    global scheduler
    if scheduler is None:
        scheduler = get_scheduler()
    
    if not scheduler.running:
        scheduler.start()
        logger.info("✓ Background scheduler started")
    else:
        logger.info("Scheduler already running")

def shutdown_scheduler():
    """Shutdown the scheduler"""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped")






