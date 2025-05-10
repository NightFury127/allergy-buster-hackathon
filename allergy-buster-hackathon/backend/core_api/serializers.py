"""
Serializers for the core_api app.
Transform model instances to and from JSON for API usage.
Includes validation and security best practices.
"""
import logging
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Allergy

# Set up a logger for this module
logger = logging.getLogger(__name__)

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for Django's built-in User model.
    Exposes only non-sensitive fields.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class AllergySerializer(serializers.ModelSerializer):
    """
    Serializer for the Allergy model.
    Includes validation for name and severity fields.
    """
    class Meta:
        model = Allergy
        fields = [
            'id', 'name', 'severity', 'symptoms', 'triggers', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        """
        Validate that the allergy name is not empty and is of reasonable length.
        """
        if not value or not value.strip():
            logger.warning("Validation error: Allergy name cannot be empty.")
            raise serializers.ValidationError("Allergy name cannot be empty.")
        if len(value) > 100:
            logger.warning("Validation error: Allergy name is too long.")
            raise serializers.ValidationError("Allergy name is too long (max 100 characters).")
        return value

    def validate_severity(self, value):
        """
        Validate that the severity is one of the allowed choices.
        """
        valid_choices = dict(Allergy.SEVERITY_CHOICES).keys()
        if value not in valid_choices:
            logger.warning(f"Validation error: Invalid severity '{value}'.")
            raise serializers.ValidationError(f"Severity must be one of: {', '.join(valid_choices)}.")
        return value 