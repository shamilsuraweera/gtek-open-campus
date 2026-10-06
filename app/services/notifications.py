import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class NotificationService:
    @staticmethod
    def send_email(to: str, subject: str, body: str):
        # Stub for email sending
        print(f"[EMAIL OUTBOX] To: {to} | Subject: {subject} | Body: {body}")
        return True

    @staticmethod
    def send_sms(to: str, message: str):
        # Stub for SMS sending
        print(f"[SMS OUTBOX] To: {to} | Message: {message}")
        return True
