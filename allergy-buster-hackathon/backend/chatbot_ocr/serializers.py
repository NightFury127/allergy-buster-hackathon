"""
Serializers for the chatbot_ocr app.
Transform model instances to and from JSON for API usage.
"""
from rest_framework import serializers
from .models import ChatMessage, OCRScan

class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for the ChatMessage model.
    """
    class Meta:
        model = ChatMessage
        fields = ['id', 'created_at', 'user_message', 'ai_reply']
        read_only_fields = ['id', 'created_at']

class OCRScanSerializer(serializers.ModelSerializer):
    """
    Serializer for the OCRScan model.
    """
    class Meta:
        model = OCRScan
        fields = ['id', 'uploaded_at', 'raw_text', 'detected_medicines']
        read_only_fields = ['id', 'uploaded_at']
