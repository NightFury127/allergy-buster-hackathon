"""
Views for the core_api app.
Implements API endpoints for user and allergy management with security, efficiency, and logging.
"""
import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from django.contrib.auth.models import User
from .models import Allergy
from .serializers import UserSerializer, AllergySerializer

# Set up a logger for this module
logger = logging.getLogger(__name__)

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing User objects.
    Only authenticated users can access these endpoints.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Retrieve the current authenticated user's information.
        """
        try:
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error retrieving user info: {e}")
            raise APIException("An error occurred while retrieving user information.")

class AllergyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Allergy objects for the authenticated user.
    Only authenticated users can access these endpoints.
    """
    serializer_class = AllergySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return allergies belonging to the current user.
        Uses select_related for efficiency.
        """
        return Allergy.objects.select_related('user').filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        Save a new allergy for the current user. Logs errors if saving fails.
        """
        try:
            serializer.save(user=self.request.user)
        except Exception as e:
            logger.error(f"Error creating allergy: {e}")
            raise APIException("An error occurred while creating the allergy record.")