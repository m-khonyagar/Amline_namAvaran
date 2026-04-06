"""
PDF Generator Service - Main Application
اَملاین - Amline Platform
"""
import os
from contextlib import asynccontextmanager
from datetime import datetime
from io import BytesIO

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Any
import logging

from .services.pdf_generator import PDFGeneratorService
from .services.minio_service import MinIOService
from .templates.filters import register_filters

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Pydantic models for request/response
class LandlordInfo(BaseModel):
    """اطلاعات موجر"""
    full_name: str = Field(..., description="نام کامل موجر")
    national_id: str = Field(..., description="کد ملی")
    phone: str = Field(..., description="شماره تماس")
    address: Optional[str] = Field(None, description="آدرس")
    birth_date: Optional[str] = Field(None, description="تاریخ تولد")


class TenantInfo(BaseModel):
    """اطلاعات مستأجر"""
    full_name: str = Field(..., description="نام کامل مستأجر")
    national_id: str = Field(..., description="کد ملی")
    phone: str = Field(..., description="شماره تماس")
    address: Optional[str] = Field(None, description="آدرس")
    birth_date: Optional[str] = Field(None, description="تاریخ تولد")


class PropertyInfo(BaseModel):
    """اطلاعات ملک"""
    address: str = Field(..., description="آدرس کامل ملک")
    postal_code: str = Field(..., description="کد پستی")
    area: float = Field(..., description="متراژ (متر مربع)")
    unit_number: Optional[str] = Field(None, description="شماره واحد")
    floor: Optional[str] = Field(None, description="طبقه")
    building_name: Optional[str] = Field(None, description="نام ساختمان")
    type: str = Field(..., description="نوع ملک (مسکونی، تجاری، اداری)")


class PaymentInfo(BaseModel):
    """اطلاعات پرداخت"""
    amount: int = Field(..., description="مبلغ به تومان")
    due_date: str = Field(..., description="تاریخ سررسید")
    payment_type: str = Field(..., description="نوع پرداخت (ودیعه، اجاره، شارژ)")
    description: Optional[str] = Field(default=None, description="توضیحات")


class ContractClause(BaseModel):
    """بند قرارداد"""
    title: str = Field(..., description="عنوان بند")
    content: str = Field(..., description="متن بند")
    order: int = Field(..., description="ترتیب")


class PRContractRequest(BaseModel):
    """درخواست تولید قرارداد پیش‌قرارداد"""
    contract_id: str = Field(..., description="شماره قرارداد")
    start_date: str = Field(..., description="تاریخ شروع قرارداد")
    end_date: str = Field(..., description="تاریخ پایان قرارداد")
    landlord: LandlordInfo = Field(..., description="اطلاعات موجر")
    tenant: TenantInfo = Field(..., description="اطلاعات مستأجر")
    property: PropertyInfo = Field(..., description="اطلاعات ملک")
    monthly_rent: int = Field(default=0, description="اجاره ماهانه به تومان")
    deposit: int = Field(default=0, description="ودیعه به تومان")
    contract_kind: str = Field(
        default="PROPERTY_RENT",
        description="PROPERTY_RENT (رهن و اجاره) یا BUYING_AND_SELLING (خرید و فروش)",
    )
    sale_total_price: int = Field(default=0, description="مبلغ توافقی فروش به تومان")
    payments: List[PaymentInfo] = Field(default_factory=list, description="لیست پرداخت‌ها")
    clauses: List[ContractClause] = Field(default_factory=list, description="بنود قرارداد")
    save_to_minio: bool = Field(True, description="آیا فایل در MinIO ذخیره شود؟")


class PDFResponse(BaseModel):
    """پاسخ تولید PDF"""
    success: bool
    message: str
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None


# Application lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start and stop the application's lifespan events."""
    logger.info("Starting PDF Generator Service...")
    register_filters()
    yield
    logger.info("Shutting down PDF Generator Service...")


# Create FastAPI application
app = FastAPI(
    title="اَملاین - PDF Generator Service",
    description="سرویس تولید PDF قراردادها و اسناد",
    version="1.0.0",
    lifespan=lifespan,
)


# Health check endpoint
@app.get("/health")
async def health():
    """بررسی سلامت سرویس"""
    return {
        "status": "ok",
        "service": "pdf-generator",
        "timestamp": datetime.utcnow().isoformat()
    }


# Generate PR Contract PDF
@app.post("/generate/pr-contract", response_model=PDFResponse)
async def generate_pr_contract(request: PRContractRequest):
    """
    تولید PDF قرارداد پیش‌قراردا (PR Contract)
    """
    try:
        logger.info(f"Generating PR Contract PDF for contract: {request.contract_id}")
        
        # Generate PDF
        pdf_service = PDFGeneratorService()
        pdf_bytes, file_name = await pdf_service.generate_pr_contract(request)
        
        file_size = len(pdf_bytes)
        
        # Save to MinIO if requested
        if request.save_to_minio:
            try:
                minio_service = MinIOService()
                file_path = f"contracts/{request.contract_id}/{file_name}"
                file_url = await minio_service.upload_file(
                    file_path=file_path,
                    content=pdf_bytes,
                    content_type="application/pdf"
                )
                logger.info(f"PDF saved to MinIO: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to save to MinIO: {e}")
                file_url = None
        else:
            file_url = None
        
        return PDFResponse(
            success=True,
            message="PDF با موفقیت تولید شد",
            file_name=file_name,
            file_url=file_url,
            file_size=file_size
        )
        
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail=f"خطا در تولید PDF: {str(e)}")


# Generate PDF from HTML
@app.post("/generate/from-html")
async def generate_from_html(
    html_content: str = Field(..., description="محتوای HTML"),
    file_name: str = Field("document.pdf", description="نام فایل خروجی")
):
    """
    تولید PDF از HTML دلخواه
    """
    try:
        logger.info("Generating PDF from HTML")
        
        pdf_service = PDFGeneratorService()
        pdf_bytes = await pdf_service.generate_from_html(html_content)
        
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={file_name}"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating PDF from HTML: {e}")
        raise HTTPException(status_code=500, detail=f"خطا در تولید PDF: {str(e)}")


# Upload template
@app.post("/templates/upload")
async def upload_template(
    template_name: str = Field(..., description="نام قالب"),
    template_file: UploadFile = File(..., description="فایل قالب HTML")
):
    """
    آپلود قالب HTML جدید
    """
    try:
        content = await template_file.read()
        content_str = content.decode("utf-8")
        
        # Save template
        pdf_service = PDFGeneratorService()
        template_path = pdf_service.save_template(template_name, content_str)
        
        return JSONResponse({
            "success": True,
            "message": "قالب با موفقیت ذخیره شد",
            "template_path": template_path
        })
        
    except Exception as e:
        logger.error(f"Error uploading template: {e}")
        raise HTTPException(status_code=500, detail=f"خطا در آپلود قالب: {str(e)}")


# List available templates
@app.get("/templates/list")
async def list_templates():
    """
    لیست قالب‌های موجود
    """
    try:
        pdf_service = PDFGeneratorService()
        templates = pdf_service.list_templates()
        
        return JSONResponse({
            "success": True,
            "templates": templates
        })
        
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        raise HTTPException(status_code=500, detail=f"خطا در دریافت لیست قالب‌ها: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
