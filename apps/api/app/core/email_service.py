"""Email service for sending review requests"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from .config import settings

logger = logging.getLogger(__name__)

def send_review_request_email(
    to_email: str,
    customer_name: str,
    review_url: str,
    company_name: str = "H2O Plumbing"
) -> bool:
    """
    Send a review request email to a customer
    
    Args:
        to_email: Customer email address
        customer_name: Customer name
        review_url: URL to the review form
        company_name: Company name for email signature
    
    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.smtp_host or not settings.smtp_user:
        logger.warning("SMTP not configured, skipping email send")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Share Your Experience with {company_name}"
        msg['From'] = settings.smtp_from_email or settings.smtp_user
        msg['To'] = to_email
        
        # Create HTML email body
        html_body = f"""
        <html>
          <body>
            <h2>Thank You for Choosing {company_name}!</h2>
            <p>Hi {customer_name},</p>
            <p>We hope you're satisfied with our service. Your feedback is important to us and helps us improve.</p>
            <p>Please take a moment to share your experience:</p>
            <p><a href="{review_url}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px;">Leave a Review</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>{review_url}</p>
            <p>Thank you for your time!</p>
            <p>Best regards,<br>{company_name}</p>
          </body>
        </html>
        """
        
        # Plain text version
        text_body = f"""
        Thank You for Choosing {company_name}!
        
        Hi {customer_name},
        
        We hope you're satisfied with our service. Your feedback is important to us and helps us improve.
        
        Please take a moment to share your experience:
        {review_url}
        
        Thank you for your time!
        
        Best regards,
        {company_name}
        """
        
        # Attach parts
        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        
        logger.info(f"Review request email sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send review request email to {to_email}: {str(e)}")
        return False

def send_review_reminder_email(
    to_email: str,
    customer_name: str,
    review_url: str,
    company_name: str = "H2O Plumbing"
) -> bool:
    """
    Send a reminder email for a pending review request
    
    Args:
        to_email: Customer email address
        customer_name: Customer name
        review_url: URL to the review form
        company_name: Company name for email signature
    
    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.smtp_host or not settings.smtp_user:
        logger.warning("SMTP not configured, skipping email send")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Reminder: Share Your Experience with {company_name}"
        msg['From'] = settings.smtp_from_email or settings.smtp_user
        msg['To'] = to_email
        
        html_body = f"""
        <html>
          <body>
            <h2>We'd Love to Hear From You!</h2>
            <p>Hi {customer_name},</p>
            <p>We noticed you haven't had a chance to share your feedback yet. Your opinion matters to us!</p>
            <p>Please take a moment to leave a review:</p>
            <p><a href="{review_url}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block; border-radius: 4px;">Leave a Review</a></p>
            <p>Or copy and paste this link: {review_url}</p>
            <p>Thank you!</p>
            <p>Best regards,<br>{company_name}</p>
          </body>
        </html>
        """
        
        text_body = f"""
        We'd Love to Hear From You!
        
        Hi {customer_name},
        
        We noticed you haven't had a chance to share your feedback yet. Your opinion matters to us!
        
        Please take a moment to leave a review:
        {review_url}
        
        Thank you!
        
        Best regards,
        {company_name}
        """
        
        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        
        logger.info(f"Review reminder email sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send review reminder email to {to_email}: {str(e)}")
        return False


