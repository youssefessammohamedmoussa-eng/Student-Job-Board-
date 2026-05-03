import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Job

def get_jobs_api(request):
    jobs = Job.objects.all().order_by('-created_at')
    data = []
    for j in jobs:
        data.append({
            "id": j.id,
            "title": {"en": j.title_en, "ar": j.title_ar},
            "company": {"en": j.company_en, "ar": j.company_ar},
            "field": j.field,
            "location": j.location,
            "type": j.job_type,
            "salary": j.salary,
            "description": {"en": j.description_en, "ar": j.description_ar},
            "requirements": {
                "en": j.requirements_en.split('\n') if j.requirements_en else [],
                "ar": j.requirements_ar.split('\n') if j.requirements_ar else []
            }
        })
    return JsonResponse(data, safe=False)

@csrf_exempt
def create_job_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Mapping the frontend fields to the bilingual Model
            # For now, we use the same text for both languages since the form is monolingual
            job = Job.objects.create(
                title_en=data.get('title'),
                title_ar=data.get('title'),
                company_en=data.get('company', 'Unknown Company'),
                company_ar=data.get('company', 'شركة غير معروفة'),
                location=data.get('location'),
                job_type=data.get('type'),
                description_en=data.get('description'),
                description_ar=data.get('description'),
                field="General", # Default field
                requirements_en="No specific requirements listed.",
                requirements_ar="لا توجد متطلبات محددة."
            )
            return JsonResponse({"status": "success", "job_id": job.id})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
    
    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)