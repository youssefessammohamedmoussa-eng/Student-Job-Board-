from django.contrib import admin
from .models import Job

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('title_en', 'company_en', 'location', 'job_type', 'created_at')
    list_filter = ('job_type', 'location', 'field')
    search_fields = ('title_en', 'title_ar', 'company_en', 'company_ar')