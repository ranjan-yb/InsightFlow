from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException,
    Query,
    status
)

from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user

from app.models.user import User
from app.models.dataset import Dataset

from app.schemas.dataset import (
    DatasetResponse,
    DatasetPreviewResponse
)

from app.utils.file_validator import validate_csv

from app.services.upload_service import upload_dataset
from app.services.preview_service import get_dataset_preview

from app.schemas.dataset import DatasetQualityResponse
from app.services.quality_service import profile_dataset


from pathlib import Path

from app.schemas.cleaning import (
    CleaningRequest,
    CleaningResponse
)

from app.services.cleaning_service import clean_dataset
from app.models.cleaning_report import CleaningReport

from app.schemas.cleaning import CleaningHistoryResponse

from fastapi.responses import FileResponse


from app.services.analytics_service import get_dataset_overview
from app.schemas.analytics import AnalyticsOverviewResponse


from app.services.analytics_service import calculate_kpi
from app.schemas.analytics import KPIRequest, KPIResponse

from app.services.analytics_service import group_by_analysis
from app.schemas.analytics import GroupByRequest

from app.services.analytics_service import filter_dataset
from app.schemas.analytics import DataFilterRequest


from app.services.analytics_service import generate_chart
from app.schemas.analytics import ChartRequest


from app.schemas.analytics import AnalyticsDashboardResponse
from app.services.analytics_service import get_dashboard_summary


from fastapi.responses import FileResponse
from app.services.export_service import export_excel, export_pdf

router = APIRouter(
    prefix="/datasets",
    tags=["Datasets"]
)


# UPLOAD CSV
@router.post(
    "/upload",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    file_size = await validate_csv(file)

    dataset = await upload_dataset(
        file=file,
        file_size=file_size,
        current_user=current_user,
        db=db
    )

    return dataset


# GET ALL USER DATASETS
@router.get(
    "/",
    response_model=list[DatasetResponse]
)
def get_user_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    datasets = db.query(Dataset).filter(
        Dataset.user_id == current_user.id
    ).order_by(
        Dataset.created_at.desc()
    ).all()

    return datasets


# GET DATASET PREVIEW
@router.get(
    "/{dataset_id}/preview",
    response_model=DatasetPreviewResponse
)
def preview_dataset(
    dataset_id: int,
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    return get_dataset_preview(
        dataset=dataset,
        limit=limit
    )



@router.get(
    "/{dataset_id}/quality",
    response_model=DatasetQualityResponse
)
def get_dataset_quality(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    return profile_dataset(dataset)



@router.post(
    "/{dataset_id}/clean",
    response_model=CleaningResponse
)
def clean_dataset_endpoint(
    dataset_id: int,
    config: CleaningRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify dataset ownership
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    # 2. Run the cleaning engine
    result = clean_dataset(dataset, config)

    cleaned_path = Path(result["cleaned_file_path"])

    try:
        # 3. Save cleaning report
        cleaning_report = CleaningReport(
            dataset_id=dataset.id,
            cleaned_file_path=str(cleaned_path),
            configuration=config.model_dump(),
            report=result["report"]
        )

        db.add(cleaning_report)

        # 4. Update the latest cleaned file path
        dataset.cleaned_file_path = str(cleaned_path)
        dataset.status = "cleaned"

        db.commit()
        db.refresh(cleaning_report)

        return {
            "report_id": cleaning_report.id,
            "dataset_id": dataset.id,
            "filename": dataset.original_filename,
            "cleaned_filename": cleaned_path.name,
            "cleaning_report": result["report"],
            "created_at": cleaning_report.created_at
        }

    except Exception:
        db.rollback()

        if cleaned_path.exists():
            cleaned_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Failed to save cleaning report"
        )



@router.get("/{dataset_id}/download")
def download_cleaned_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    if not dataset.cleaned_file_path:
        raise HTTPException(
            status_code=404,
            detail="No cleaned dataset available"
        )

    file_path = Path(dataset.cleaned_file_path)

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Cleaned CSV file not found"
        )

    return FileResponse(
        path=file_path,
        media_type="text/csv",
        filename=f"cleaned_{dataset.original_filename}"
    )



@router.get(
    "/{dataset_id}/cleaning-history",
    response_model=list[CleaningHistoryResponse]
)
def get_cleaning_history(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    reports = (
        db.query(CleaningReport)
        .filter(CleaningReport.dataset_id == dataset.id)
        .order_by(CleaningReport.created_at.desc())
        .all()
    )

    return [
        {
            "report_id": report.id,
            "dataset_id": report.dataset_id,
            "cleaned_filename": Path(
                report.cleaned_file_path
            ).name,
            "configuration": report.configuration,
            "report": report.report,
            "created_at": report.created_at
        }
        for report in reports
    ]


@router.get(
    "/{dataset_id}/analytics/overview",
    response_model=AnalyticsOverviewResponse
)
def get_analytics_overview(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    file_path = Path(dataset.cleaned_file_path or dataset.file_path)

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Dataset file not found"
        )

    result = get_dataset_overview(file_path)

    return {
        "dataset_id": dataset.id,
        "filename": dataset.original_filename,
        **result
    }


@router.post(
    "/{dataset_id}/analytics/kpi",
    response_model=KPIResponse
)
def get_dataset_kpi(
    dataset_id: int,
    request: KPIRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    file_path = Path(dataset.cleaned_file_path or dataset.file_path)

    if not file_path.is_file():
        raise HTTPException(404, detail="Dataset file not found")

    try:
        result = calculate_kpi(
            file_path=file_path,
            column=request.column,
            operation=request.operation
        )

        return result

    except ValueError as error:
        raise HTTPException(400, detail=str(error))



@router.post("/{dataset_id}/analytics/group-by")
def get_group_by_analysis(
    dataset_id: int,
    request: GroupByRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    file_path = Path(dataset.cleaned_file_path or dataset.file_path)

    if not file_path.is_file():
        raise HTTPException(404, detail="Dataset file not found")

    try:
        return group_by_analysis(
            file_path=file_path,
            group_by=request.group_by,
            metric=request.metric,
            operation=request.operation,
            sort_order=request.sort_order,
            limit=request.limit
        )

    except ValueError as error:
        raise HTTPException(400, detail=str(error))




@router.post("/{dataset_id}/analytics/filter")
def filter_dataset_endpoint(
    dataset_id: int,
    request: DataFilterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    file_path = Path(dataset.cleaned_file_path or dataset.file_path)

    if not file_path.is_file():
        raise HTTPException(404, detail="Dataset file not found")

    try:
        filters = [
            condition.model_dump()
            for condition in request.filters
        ]

        return filter_dataset(
            file_path=file_path,
            filters=filters,
            limit=request.limit
        )

    except (ValueError, TypeError) as error:
        raise HTTPException(400, detail=str(error))



@router.post("/{dataset_id}/analytics/chart")
def get_dataset_chart(
    dataset_id: int,
    request: ChartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == current_user.id
        )
        .first()
    )

    if not dataset:
        raise HTTPException(404, detail="Dataset not found")

    file_path = Path(dataset.cleaned_file_path or dataset.file_path)

    if not file_path.is_file():
        raise HTTPException(404, detail="Dataset file not found")

    try:
        return generate_chart(
            file_path=file_path,
            chart_type=request.chart_type,
            group_by=request.group_by,
            metric=request.metric,
            aggregation=request.aggregation,
            limit=request.limit,
            sort_order=request.sort_order
        )

    except ValueError as error:
        raise HTTPException(400, detail=str(error))



@router.get(
    "/{dataset_id}/analytics/dashboard",
    response_model=AnalyticsDashboardResponse
)
def get_analytics_dashboard(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    file_path = Path(
        dataset.cleaned_file_path or dataset.file_path
    )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Dataset file not found"
        )

    try:
        result = get_dashboard_summary(file_path)

        return {
            "dataset_id": dataset.id,
            "filename": dataset.original_filename,
            **result
        }

    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )



@router.get("/{dataset_id}/export/excel")
def download_excel_report(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    file_path = Path(
        dataset.cleaned_file_path or dataset.file_path
    )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Dataset file not found"
        )

    try:
        report_path = export_excel(file_path)

        return FileResponse(
            path=report_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"insightflow_report_{dataset.id}.xlsx"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Excel report generation failed: {str(e)}"
        )


@router.get("/{dataset_id}/export/pdf")
def download_pdf_report(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    file_path = Path(
        dataset.cleaned_file_path or dataset.file_path
    )

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Dataset file not found"
        )

    try:
        report_path = export_pdf(file_path)

        return FileResponse(
            path=report_path,
            media_type="application/pdf",
            filename=f"insightflow_report_{dataset.id}.pdf"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF report generation failed: {str(e)}"
        )