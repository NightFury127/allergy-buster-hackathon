"""
Unit tests for views in the core_api app.
Covers authentication, permissions, CRUD operations, custom actions, error handling, and edge cases for UserViewSet and AllergyViewSet.
"""
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from core_api.models import Allergy

class UserViewSetTest(APITestCase):
    """Test suite for the UserViewSet."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass', email='test@example.com')
        self.client = APIClient()
        self.client.login(username='testuser', password='testpass')

    def test_me_action_authenticated(self):
        """Test the /users/me/ endpoint for authenticated user."""
        url = reverse('user-me') if 'user-me' in [u.name for u in self.client.handler._view_resolver.url_patterns] else '/api/core/users/me/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_user_list_requires_authentication(self):
        """Test that user list endpoint requires authentication."""
        self.client.logout()
        url = reverse('user-list') if 'user-list' in [u.name for u in self.client.handler._view_resolver.url_patterns] else '/api/core/users/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class AllergyViewSetTest(APITestCase):
    """Test suite for the AllergyViewSet."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.other_user = User.objects.create_user(username='otheruser', password='otherpass')
        self.client = APIClient()
        self.client.login(username='testuser', password='testpass')
        self.allergy = Allergy.objects.create(
            user=self.user,
            name='Peanuts',
            severity='severe',
            symptoms='Hives, swelling',
            triggers='Peanut butter',
            notes='Carries epipen.'
        )

    def test_list_allergies(self):
        """Test listing allergies for the authenticated user."""
        url = reverse('allergy-list') if 'allergy-list' in [u.name for u in self.client.handler._view_resolver.url_patterns] else '/api/core/allergies/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Peanuts')

    def test_create_allergy(self):
        """Test creating a new allergy for the authenticated user."""
        url = reverse('allergy-list') if 'allergy-list' in [u.name for u in self.client.handler._view_resolver.url_patterns] else '/api/core/allergies/'
        data = {
            'name': 'Dust',
            'severity': 'mild',
            'symptoms': 'Sneezing',
            'triggers': 'Dust',
            'notes': 'Occurs in spring.'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Allergy.objects.filter(user=self.user).count(), 2)

    def test_retrieve_allergy(self):
        """Test retrieving a specific allergy."""
        url = reverse('allergy-detail', args=[self.allergy.id]) if 'allergy-detail' in [u.name for u in self.client.handler._view_resolver.url_patterns] else f'/api/core/allergies/{self.allergy.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Peanuts')

    def test_update_allergy(self):
        """Test updating an existing allergy."""
        url = reverse('allergy-detail', args=[self.allergy.id]) if 'allergy-detail' in [u.name for u in self.client.handler._view_resolver.url_patterns] else f'/api/core/allergies/{self.allergy.id}/'
        data = {
            'name': 'Eggs',
            'severity': 'moderate',
            'symptoms': 'Rash',
            'triggers': 'Eggs',
            'notes': 'Avoid omelets.'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.allergy.refresh_from_db()
        self.assertEqual(self.allergy.name, 'Eggs')
        self.assertEqual(self.allergy.severity, 'moderate')

    def test_delete_allergy(self):
        """Test deleting an allergy."""
        url = reverse('allergy-detail', args=[self.allergy.id]) if 'allergy-detail' in [u.name for u in self.client.handler._view_resolver.url_patterns] else f'/api/core/allergies/{self.allergy.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Allergy.objects.filter(id=self.allergy.id).exists())

    def test_allergy_permissions(self):
        """Test that a user cannot access another user's allergies."""
        self.client.logout()
        self.client.login(username='otheruser', password='otherpass')
        url = reverse('allergy-detail', args=[self.allergy.id]) if 'allergy-detail' in [u.name for u in self.client.handler._view_resolver.url_patterns] else f'/api/core/allergies/{self.allergy.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_allergy_invalid_data(self):
        """Test creating an allergy with invalid data returns errors."""
        url = reverse('allergy-list') if 'allergy-list' in [u.name for u in self.client.handler._view_resolver.url_patterns] else '/api/core/allergies/'
        data = {
            'name': '',
            'severity': 'extreme',
            'symptoms': '',
            'triggers': '',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
        self.assertIn('severity', response.data) 