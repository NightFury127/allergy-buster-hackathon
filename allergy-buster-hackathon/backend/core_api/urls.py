"""
URL configuration for the core_api app.
Defines API endpoints for user and allergy management using DRF routers.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets with it.
router = DefaultRouter()
# User endpoints: /users/, /users/{id}/, /users/me/
router.register(r'users', views.UserViewSet)
# Allergy endpoints: /allergies/, /allergies/{id}/
router.register(r'allergies', views.AllergyViewSet, basename='allergy')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]