import uuid
from pathlib import Path

import pandas as pd

from app.services.quality_service import read_dataset
from app.services.analytics_service import get_dataset_overview


from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    LongTable,
)


REPORT_DIR = Path("reports")
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def export_excel(file_path: Path) -> Path:
    """
    Export dataset analysis and data into an Excel workbook.
    """

    df = read_dataset(file_path)
    overview = get_dataset_overview(file_path)

    filename = f"{uuid.uuid4().hex}_report.xlsx"
    output_path = REPORT_DIR / filename

    # Dataset summary
    summary_data = [
        ["Metric", "Value"],
        ["Total Rows", overview["total_rows"]],
        ["Total Columns", overview["total_columns"]],
        ["Missing Values", overview["total_missing_values"]],
        ["Numeric Columns", len(overview["numeric_columns"])],
        ["Categorical Columns", len(overview["categorical_columns"])],
        ["Datetime Columns", len(overview["datetime_columns"])],
    ]

    # Column profile
    column_data = []

    for column in overview["columns"]:
        column_data.append({
            "Column": column["name"],
            "Data Type": column.get("dtype", column.get("data_type", "Unknown")),
            "Missing Values": column.get("missing_values", 0),
            "Unique Values": column.get("unique_values", 0),
        })

    columns_df = pd.DataFrame(column_data)

    # Numeric statistics
    statistics_data = []

    for column, stats in overview["numeric_statistics"].items():
        statistics_data.append({
            "Column": column,
            "Mean": stats.get("mean"),
            "Median": stats.get("median"),
            "Minimum": stats.get("min"),
            "Maximum": stats.get("max"),
            "Sum": stats.get("sum"),
        })

    statistics_df = pd.DataFrame(statistics_data)

    # Create Excel workbook
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:

        pd.DataFrame(
            summary_data[1:],
            columns=summary_data[0]
        ).to_excel(
            writer,
            sheet_name="Dataset Summary",
            index=False
        )

        columns_df.to_excel(
            writer,
            sheet_name="Column Profile",
            index=False
        )

        statistics_df.to_excel(
            writer,
            sheet_name="Numeric Statistics",
            index=False
        )

        df.to_excel(
            writer,
            sheet_name="Dataset",
            index=False
        )

        # Adjust column widths
        for worksheet in writer.book.worksheets:
            for column_cells in worksheet.columns:
                max_length = max(
                    len(str(cell.value)) if cell.value is not None else 0
                    for cell in column_cells
                )

                column_letter = column_cells[0].column_letter

                worksheet.column_dimensions[column_letter].width = min(
                    max_length + 3, 40
                )

    return output_path


def export_pdf(file_path: Path) -> Path:
    """
    Generate a professional PDF analytics report.
    """

    overview = get_dataset_overview(file_path)

    filename = f"{uuid.uuid4().hex}_report.pdf"
    output_path = REPORT_DIR / filename

    # Create PDF document
    document = SimpleDocTemplate(
        str(output_path),
        pagesize=landscape(A4),
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=colors.HexColor("#1E293B"),
        alignment=TA_CENTER,
        spaceAfter=15,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#2563EB"),
        spaceBefore=12,
        spaceAfter=8,
    )

    normal_style = styles["Normal"]

    elements = []

    # ------------------------------------------------
    # 1. Report Header
    # ------------------------------------------------

    elements.append(
        Paragraph("InsightFlow Analytics Report", title_style)
    )

    elements.append(
        Paragraph(
            f"<b>Dataset:</b> {file_path.name}",
            normal_style
        )
    )

    elements.append(Spacer(1, 15))

    # ------------------------------------------------
    # 2. Dataset Summary
    # ------------------------------------------------

    elements.append(
        Paragraph("Dataset Overview", heading_style)
    )

    summary_data = [
        ["Metric", "Value"],
        ["Total Rows", str(overview["total_rows"])],
        ["Total Columns", str(overview["total_columns"])],
        ["Missing Values", str(overview["total_missing_values"])],
        ["Numeric Columns", str(len(overview["numeric_columns"]))],
        ["Categorical Columns", str(len(overview["categorical_columns"]))],
        ["Datetime Columns", str(len(overview["datetime_columns"]))],
    ]

    summary_table = Table(
        summary_data,
        colWidths=[65 * mm, 65 * mm]
    )

    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elements.append(summary_table)
    elements.append(Spacer(1, 15))

    # ------------------------------------------------
    # 3. Column Profile
    # ------------------------------------------------

    elements.append(
        Paragraph("Column Profile", heading_style)
    )

    column_data = [
        ["Column", "Data Type", "Missing Values", "Unique Values"]
    ]

    for column in overview["columns"]:
        column_data.append([
            str(column["name"]),
            str(column.get("dtype", column.get("data_type", "Unknown"))),
            str(column.get("missing_values", 0)),
            str(column.get("unique_values", 0)),
        ])

    column_table = LongTable(
        column_data,
        repeatRows=1,
        colWidths=[65 * mm, 55 * mm, 55 * mm, 55 * mm]
    )

    column_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elements.append(column_table)
    elements.append(Spacer(1, 15))

    # ------------------------------------------------
    # 4. Numeric Statistics
    # ------------------------------------------------

    elements.append(
        Paragraph("Numeric Statistics", heading_style)
    )

    statistics_data = [
        ["Column", "Mean", "Median", "Minimum", "Maximum", "Sum"]
    ]

    for column, stats in overview["numeric_statistics"].items():
        statistics_data.append([
            str(column),
            str(stats.get("mean", "N/A")),
            str(stats.get("median", "N/A")),
            str(stats.get("min", "N/A")),
            str(stats.get("max", "N/A")),
            str(stats.get("sum", "N/A")),
        ])

    if len(statistics_data) == 1:
        statistics_data.append([
            "No numeric columns", "-", "-", "-", "-", "-"
        ])

    statistics_table = LongTable(
        statistics_data,
        repeatRows=1
    )

    statistics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F766E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elements.append(statistics_table)

    # ------------------------------------------------
    # 5. Footer with Page Numbers
    # ------------------------------------------------

    def add_footer(canvas, doc):
        canvas.saveState()

        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.grey)

        canvas.drawString(
            15 * mm,
            10 * mm,
            "Generated by InsightFlow"
        )

        canvas.drawRightString(
            landscape(A4)[0] - 15 * mm,
            10 * mm,
            f"Page {doc.page}"
        )

        canvas.restoreState()

    # Generate PDF
    document.build(
        elements,
        onFirstPage=add_footer,
        onLaterPages=add_footer
    )

    return output_path