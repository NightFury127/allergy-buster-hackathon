"""
Unit tests for serializers in the core_api app.
Covers serialization, deserialization, validation, and read-only fields for UserSerializer and AllergySerializer.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from core_api.models import Allergy
from core_api.serializers import UserSerializer, AllergySerializer
from rest_framework.exceptions import ValidationError
from datetime import datetime

class UserSerializerTest(TestCase):
    """Test suite for the UserSerializer."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass',
            first_name='Test',
            last_name='User'
        )

    def test_user_serialization(self):
        """Test serializing a User instance."""
        serializer = UserSerializer(self.user)
        data = serializer.data
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['email'], 'test@example.com')
        self.assertEqual(data['first_name'], 'Test')
        self.assertEqual(data['last_name'], 'User')
        self.assertIn('id', data)

    def test_user_read_only_fields(self):
        """Test that id is read-only."""
        serializer = UserSerializer(self.user)
        self.assertIn('id', serializer.data)

class AllergySerializerTest(TestCase):
    """Test suite for the AllergySerializer."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.allergy = Allergy.objects.create(
            user=self.user,
            name='Peanuts',
            severity='severe',
            symptoms='Hives, swelling',
            triggers='Peanut butter',
            notes='Carries epipen.'
        )

    def test_allergy_serialization(self):
        """Test serializing an Allergy instance."""
        serializer = AllergySerializer(self.allergy)
        data = serializer.data
        self.assertEqual(data['name'], 'Peanuts')
        self.assertEqual(data['severity'], 'severe')
        self.assertEqual(data['symptoms'], 'Hives, swelling')
        self.assertEqual(data['triggers'], 'Peanut butter')
        self.assertEqual(data['notes'], 'Carries epipen.')
        self.assertIn('id', data)
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)

    def test_allergy_deserialization_valid(self):
        """Test deserializing valid data into an Allergy instance."""
        data = {
            'name': 'Dust',
            'severity': 'mild',
            'symptoms': 'Sneezing',
            'triggers': 'Dust',
            'notes': 'Occurs in spring.'
        }
        serializer = AllergySerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        allergy = serializer.save(user=self.user)
        self.assertEqual(allergy.name, 'Dust')
        self.assertEqual(allergy.severity, 'mild')

    def test_allergy_deserialization_invalid_name(self):
        """Test deserialization fails with empty or too long name."""
        data = {
            'name': '',
            'severity': 'mild',
            'symptoms': 'Sneezing',
            'triggers': 'Dust',
        }
        serializer = AllergySerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)

        data['name'] = 'A' * 101
        serializer = AllergySerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)

    def test_allergy_deserialization_invalid_severity(self):
        """Test deserialization fails with invalid severity."""
        data = {
            'name': 'Dust',
            'severity': 'extreme',
            'symptoms': 'Sneezing',
            'triggers': 'Dust',
        }
        serializer = AllergySerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('severity', serializer.errors)

    def test_allergy_read_only_fields(self):
        """Test that id, created_at, and updated_at are read-only."""
        serializer = AllergySerializer(self.allergy)
        self.assertIn('id', serializer.data)
        self.assertIn('created_at', serializer.data)
        self.assertIn('updated_at', serializer.data)
        # Attempt to update read-only fields
        data = serializer.data.copy()
        data['name'] = 'Eggs'
        data['id'] = 999
        data['created_at'] = datetime.now().isoformat()
        data['updated_at'] = datetime.now().isoformat()
        serializer = AllergySerializer(self.allergy, data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_allergy = serializer.save()
        self.assertEqual(updated_allergy.name, 'Eggs')
        self.assertNotEqual(updated_allergy.id, 999) 