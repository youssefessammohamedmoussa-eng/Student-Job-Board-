def set_default_role(backend, user, response, *args, **kwargs):
    if not user.role:
        # Get the role from the session (passed from the login page)
        # Default to 'student' if nothing was passed
        role = backend.strategy.session_get('role') or 'student'
        user.role = role
        user.save()