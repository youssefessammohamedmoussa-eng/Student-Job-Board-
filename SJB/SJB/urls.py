"""
URL configuration for SJB project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from accounts import views as accounts_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('jobs-data/', include('jobs.urls')),
    path('social-auth/', include('social_django.urls', namespace='social')),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('jobs/', TemplateView.as_view(template_name='jobs.html'), name='jobs'),
    path('index/', TemplateView.as_view(template_name='index.html'), name='index'),
    path('job/', TemplateView.as_view(template_name='job.html'), name='job'),
    path('signup/', accounts_views.register_user, name='signup'),
    path('auth/', accounts_views.login_user, name='auth'),
    path('auth/bridge/', accounts_views.auth_bridge, name='auth-bridge'),
    path('oauth/google/', accounts_views.start_google_auth, name='google-login'),
    path('oauth/facebook/', accounts_views.start_facebook_auth, name='facebook-login'),
    path('profile/', accounts_views.profile_page, name='profile'),
    path('logout/', accounts_views.logout_user, name='logout'),
    path('dashboard-user/', TemplateView.as_view(template_name='dashboard-user.html'), name='dashboard-user'),
    path('dashboard-company/', TemplateView.as_view(template_name='dashboard-company.html'), name='dashboard-company'),
    path('dashboard-admin/', TemplateView.as_view(template_name='dashboard-admin.html'), name='dashboard-admin'),
]
