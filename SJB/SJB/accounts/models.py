from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('company', 'Company'),
        ('admin', 'Admin'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    location = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True)
    profile_note = models.CharField(max_length=180, blank=True)
    email = models.EmailField(unique=True)
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.email
