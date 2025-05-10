"""
Unit tests for models in the core_api app.
Covers field constraints, relationships, __str__, CRUD, and edge cases for the Allergy model.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from core_api.models import Allergy
from django.db import IntegrityError

class AllergyModelTest(TestCase):
    """Test suite for the Allergy model."""

    def setUp(self):
        """Create a user and a sample allergy for use in tests."""
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.allergy = Allergy.objects.create(
            user=self.user,
            name='Peanuts',
            severity='severe',
            symptoms='Hives, swelling',
            triggers='Peanut butter',
            notes='Carries epipen.'
        )

    def test_allergy_str(self):
        """Test the __str__ method returns the correct string."""
        self.assertEqual(str(self.allergy), 'Peanuts - testuser')

    def test_field_constraints(self):
        """Test field constraints such as max_length and choices."""
        self.assertEqual(self.allergy._meta.get_field('name').max_length, 100)
        self.assertIn(self.allergy.severity, dict(Allergy.SEVERITY_CHOICES))

    def test_foreign_key_relationship(self):
        """Test the ForeignKey relationship to User."""
        self.assertEqual(self.allergy.user, self.user)
        self.assertIn(self.allergy, self.user.allergies.all())

    def test_create_retrieve_update_delete(self):
        """Test creating, retrieving, updating, and deleting an Allergy instance."""
        # Retrieve
        allergy = Allergy.objects.get(id=self.allergy.id)
        self.assertEqual(allergy.name, 'Peanuts')
        # Update
        allergy.name = 'Tree Nuts'
        allergy.save()
        self.assertEqual(Allergy.objects.get(id=allergy.id).name, 'Tree Nuts')
        # Delete
        allergy_id = allergy.id
        allergy.delete()
        with self.assertRaises(Allergy.DoesNotExist):
            Allergy.objects.get(id=allergy_id)

    def test_empty_name_validation(self):
        """Test that creating an allergy with an empty name raises an error."""
        with self.assertRaises(Exception):
            Allergy.objects.create(
                user=self.user,
                name='',
                severity='mild',
                symptoms='Sneezing',
                triggers='Dust',
            )

    def test_long_name_validation(self):
        """Test that creating an allergy with a name longer than 100 chars raises an error."""
        with self.assertRaises(Exception):
            Allergy.objects.create(
                user=self.user,
                name='A' * 101,
                severity='mild',
                symptoms='Sneezing',
                triggers='Dust',
            )

    def test_invalid_severity(self):
        """Test that creating an allergy with an invalid severity raises an error."""
        with self.assertRaises(Exception):
            Allergy.objects.create(
                user=self.user,
                name='Dust',
                severity='extreme',
                symptoms='Sneezing',
                triggers='Dust',
            )

    def tearDown(self):
        """Clean up test data."""
        self.user.delete() 