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

from fastapi.responses import Response

from app.services.storage_service import download_bytes
from app.services.storage_service import delete_file

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

    # 2. Run cleaning engine and upload cleaned CSV to R2
    result = clean_dataset(dataset, config)

    # Keep the R2 object key as a string
    cleaned_object_key = result["cleaned_file_path"]

    try:
        # 3. Update dataset with R2 object key
        dataset.cleaned_file_path = cleaned_object_key
        dataset.status = "cleaned"

        # 4. Save cleaning report
        cleaning_report = CleaningReport(
            dataset_id=dataset.id,
            cleaned_file_path=cleaned_object_key,
            configuration=config.model_dump(),
            report=result["report"]
        )

        db.add(cleaning_report)

        # 5. Commit database changes
        db.commit()
        db.refresh(cleaning_report)

        return {
            "report_id": cleaning_report.id,
            "dataset_id": dataset.id,
            "filename": dataset.original_filename,
            "cleaned_filename": cleaned_object_key.split("/")[-1],
            "cleaning_report": result["report"],
            "created_at": cleaning_report.created_at
        }

    except Exception:
        db.rollback()

        # Remove uploaded R2 object if database transaction fails
        try:
            delete_file(cleaned_object_key)
        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail="Failed to save cleaning report"
        )



import logging

logger = logging.getLogger(__name__)


@router.get("/{dataset_id}/download")
def download_cleaned_dataset(
    dataset_id: int,
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

    # 2. Check cleaned dataset availability
    if not dataset.cleaned_file_path:
        raise HTTPException(
            status_code=404,
            detail="No cleaned dataset available"
        )

    try:
        # 3. Download cleaned CSV from R2
        file_content = download_bytes(
            dataset.cleaned_file_path
        )

        # 4. Return CSV as downloadable response
        filename = f"cleaned_{dataset.original_filename}"

        return Response(
            content=file_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{filename}"'
                )
            }
        )

    # except Exception:
    #     raise HTTPException(
    #         status_code=500,
    #         detail="Unable to download cleaned dataset"
    #     )
    except Exception as exc:
        logger.exception(
            "Failed to download cleaned dataset. Dataset ID: %s",
            dataset_id
    )

        raise HTTPException(
            status_code=500,
            detail=str(exc)
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

    file_path = (
        dataset.cleaned_file_path or dataset.file_path
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

    file_path = dataset.cleaned_file_path or dataset.file_path



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

    file_path = dataset.cleaned_file_path or dataset.file_path

    # if not file_path.is_file():
    #     raise HTTPException(404, detail="Dataset file not found")

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

    file_path = dataset.cleaned_file_path or dataset.file_path

    

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

    file_path = dataset.cleaned_file_path or dataset.file_path



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

    # Keep the R2 object key as a string
    file_path = (
        dataset.cleaned_file_path or dataset.file_path
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