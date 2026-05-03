from django.db import models

class Job(models.Model):
    title_en = models.CharField(max_length=255)
    title_ar = models.CharField(max_length=255)
    company_en = models.CharField(max_length=255)
    company_ar = models.CharField(max_length=255)
    field = models.CharField(max_length=100)
    location = models.CharField(max_length=100) # e.g. Egypt
    job_type = models.CharField(max_length=50) # e.g. Entry Level
    salary = models.CharField(max_length=100, blank=True)
    
    description_en = models.TextField()
    description_ar = models.TextField()
    
    # Requirements stored as text, we will split by lines in the view
    requirements_en = models.TextField(help_text="Enter each requirement on a new line")
    requirements_ar = models.TextField(help_text="Enter each requirement on a new line")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title_en} at {self.company_en}"