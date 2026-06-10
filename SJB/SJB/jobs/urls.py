from django.urls import path
from . import views

urlpatterns = [
    path('api/', views.get_jobs_api, name='jobs_api'),
    path('api/create/', views.create_job_api, name='create_job_api'),
]
