import json
from urllib.parse import urlencode

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import render, redirect
from django.urls import reverse

from jobs.models import Job
from .models import User


def backend_to_frontend_role(role):
    return 'user' if role == 'student' else role


def role_dashboard_url(role):
    if role == 'student':
        return reverse('dashboard-user')
    if role == 'company':
        return reverse('dashboard-company')
    if role == 'admin':
        return reverse('dashboard-admin')
    return reverse('home')


def safe_return_target(value, fallback):
    value = (value or '').strip()
    if value.startswith(('/', 'http://', 'https://', 'file:///')):
        return value
    return fallback


def build_unique_username(base_value):
    base = (base_value or 'user').strip().lower().replace(' ', '_')
    base = ''.join(ch for ch in base if ch.isalnum() or ch in {'_', '.', '@', '+', '-'}) or 'user'
    candidate = base
    counter = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f'{base}_{counter}'
        counter += 1
    return candidate


def get_social_provider_name(user):
    social_account = user.social_auth.first() if user.is_authenticated else None
    provider = getattr(social_account, 'provider', '')
    if provider == 'google-oauth2':
        return 'Google'
    if provider == 'facebook':
        return 'Facebook'
    return 'Email and password'


def start_social_auth(request, *, provider, credential_key, credential_secret, provider_label):
    role = (request.GET.get('role') or 'student').strip().lower()
    if role == 'user':
        role = 'student'

    if role not in {'student', 'company'}:
        messages.error(request, 'Admin accounts should use email and password.')
        return redirect('auth')

    if not getattr(settings, credential_key, '') or not getattr(settings, credential_secret, ''):
        messages.error(
            request,
            f'{provider_label} sign-in is not configured yet. Add {credential_key} and {credential_secret}.'
        )
        return redirect('auth')

    request.session['role'] = role
    request.session['sjb_return_to'] = request.GET.get('return_to', '').strip()

    params = urlencode({'next': reverse('auth-bridge')})
    return redirect(f"{reverse('social:begin', args=[provider])}?{params}")

def login_user(request):
    if request.method == 'POST':
        post_data = request.POST.copy()
        identifier = post_data.get('username', '').strip().lower()

        # Try to resolve email to the actual username for authentication
        # This allows users to type their Email in the app even if Admin uses Username
        try:
            user_obj = User.objects.get(email=identifier)
            post_data['username'] = user_obj.username
        except User.DoesNotExist:
            post_data['username'] = identifier

        form = AuthenticationForm(request, data=post_data) 
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('auth-bridge')
        else:
            return render(request, 'auth.html', {'form': form, 'error': 'Invalid email or password.'})
    else:
        form = AuthenticationForm()
    return render(request, 'auth.html', {'form': form})

def logout_user(request):
    logout(request)
    return redirect('home')

def register_user(request):
    if request.method == 'POST':
        full_name = request.POST.get('name', '').strip()
        email = request.POST.get('email', '').strip().lower()
        password = request.POST.get('password')
        role = request.POST.get('role', 'student')
        phone = request.POST.get('phone', '').strip()
        location = request.POST.get('location', '').strip()
        profile_note = request.POST.get('profile_note', '').strip()

        # Map frontend "user" tab to backend "student" role
        if role == 'user':
            role = 'student'

        if User.objects.filter(email=email).exists():
            return render(request, 'signup.html', {'error': 'Email already registered.'})

        # Create user using name as username (slugified) for Admin login
        # This allows using Email in the app but a clean Username in Django Admin
        username = build_unique_username(full_name or email.split('@')[0])
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role,
            location=location,
            phone=phone,
            profile_note=profile_note
        )

        # Optional: Split name into First/Last name fields
        if full_name:
            name_parts = full_name.split(' ', 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
            user.save()

        login(request, user)
        return redirect('auth-bridge')

    return render(request, 'signup.html')


def start_google_auth(request):
    return start_social_auth(
        request,
        provider='google-oauth2',
        credential_key='SOCIAL_AUTH_GOOGLE_OAUTH2_KEY',
        credential_secret='SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET',
        provider_label='Google'
    )


def start_facebook_auth(request):
    return start_social_auth(
        request,
        provider='facebook',
        credential_key='SOCIAL_AUTH_FACEBOOK_KEY',
        credential_secret='SOCIAL_AUTH_FACEBOOK_SECRET',
        provider_label='Facebook'
    )


@login_required
def auth_bridge(request):
    user = request.user
    frontend_role = backend_to_frontend_role(user.role)
    fallback_target = role_dashboard_url(user.role)
    target_url = safe_return_target(request.session.pop('sjb_return_to', ''), fallback_target)

    user_payload = {
        'email': user.email,
        'name': user.get_full_name() or user.username,
        'location': user.location or '',
        'phone': user.phone or '',
        'role': frontend_role,
        'profileNote': user.profile_note or '',
        'authProvider': (user.social_auth.first().provider if user.social_auth.exists() else 'password'),
    }

    context = {
        'frontend_role': frontend_role,
        'user_payload_json': json.dumps(user_payload),
        'target_url': target_url,
    }
    return render(request, 'auth-bridge.html', context)


@login_required
def profile_page(request):
    context = {
        'auth_provider': get_social_provider_name(request.user),
        'dashboard_url': role_dashboard_url(request.user.role),
        'profile_note_label': (
            'University / Major' if request.user.role == 'student'
            else 'Industry / Website' if request.user.role == 'company'
            else 'Department / Admin Title'
        ),
    }
    return render(request, 'profile.html', context)

def is_admin(user):
    return user.is_authenticated and user.role == 'admin'

@login_required
@user_passes_test(is_admin, login_url='auth')
def admin_dashboard(request):
    context = {
        'user_count': User.objects.count(),
        'job_count': Job.objects.count(),
    }
    return render(request, 'dashboard-admin.html', context)
