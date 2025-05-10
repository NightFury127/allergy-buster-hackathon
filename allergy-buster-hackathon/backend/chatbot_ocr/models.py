# Models if needed
from django.db import models

class OCRScan(models.Model):
    """Stores OCR scan results for future reference."""
    uploaded_at = models.DateTimeField(auto_now_add=True)
    raw_text = models.TextField()
    detected_medicines = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"OCR Scan on {self.uploaded_at}"

class ChatMessage(models.Model):
    """Stores chat interactions for history."""
    created_at = models.DateTimeField(auto_now_add=True)
    user_message = models.TextField()
    ai_reply = models.TextField()

    def __str__(self):
        return f"Chat @ {self.created_at}"

    # Property to maintain compatibility with serializer
    @property
    def message(self):
        return self.user_message

    @property
    def response(self):
        return self.ai_reply