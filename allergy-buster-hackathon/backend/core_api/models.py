"""
Models for the core_api app.
Defines the Allergy model, which stores user allergy information.
"""
import logging
from django.db import models
from django.contrib.auth.models import User

# Set up a logger for this module
logger = logging.getLogger(__name__)

class Allergy(models.Model):
    """
    Model representing an allergy record for a user.
    Stores severity, symptoms, triggers, and optional notes.
    """
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='allergies',
        db_index=True,  # Index for efficient user-based queries
        help_text="The user who has this allergy."
    )
    name = models.CharField(
        max_length=100,
        db_index=True,  # Index for efficient name-based queries
        help_text="Name of the allergen."
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        help_text="Severity of the allergy: mild, moderate, or severe."
    )
    symptoms = models.TextField(
        help_text="Symptoms experienced due to the allergy."
    )
    triggers = models.TextField(
        help_text="Known triggers for the allergy."
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes about the allergy."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the allergy record was created."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the allergy record was last updated."
    )

    def __str__(self):
        """String representation of the Allergy object."""
        return f"{self.name} - {self.user.username}"

    class Meta:
        verbose_name_plural = "Allergies"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'name']),
        ]