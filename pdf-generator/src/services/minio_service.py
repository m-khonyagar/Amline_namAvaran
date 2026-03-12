"""
MinIO Service for PDF Generator
اَملاین - Amline Platform
"""
import os
from io import BytesIO
from datetime import timedelta
from typing import Optional

from minio import Minio
from minio.error import S3Error
import logging

logger = logging.getLogger(__name__)


class MinIOService:
    """سرویس ذخیره‌سازی فایل در MinIO"""
    
    def __init__(self):
        """Initialize MinIO service"""
        self.endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "amline")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "amline_minio_secret")
        self.bucket = os.getenv("MINIO_BUCKET", "contracts")
        
        # Create MinIO client
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=False  # Set True for HTTPS in production
        )
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
        
        logger.info(f"MinIO service initialized with endpoint: {self.endpoint}")
    
    def _ensure_bucket_exists(self):
        """Ensure the bucket exists, create if not"""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info(f"Bucket '{self.bucket}' created")
            else:
                logger.info(f"Bucket '{self.bucket}' already exists")
        except S3Error as e:
            logger.error(f"Error ensuring bucket exists: {e}")
            raise
    
    async def upload_file(
        self,
        file_path: str,
        content: bytes,
        content_type: str = "application/pdf",
        expires: int = 3600  # URL expiration in seconds
    ) -> str:
        """
        آپلود فایل به MinIO
        
        Args:
            file_path: مسیر فایل در MinIO
            content: محتوای فایل
            content_type: نوع محتوا
            expires: زمان انقضای لینک (ثانیه)
            
        Returns:
            str: لینک عمومی فایل
        """
        try:
            # Convert bytes to BytesIO
            data = BytesIO(content)
            data_length = len(content)
            
            # Upload file
            self.client.put_object(
                bucket_name=self.bucket,
                object_name=file_path,
                data=data,
                length=data_length,
                content_type=content_type
            )
            
            logger.info(f"File uploaded to MinIO: {file_path}")
            
            # Generate presigned URL
            url = self.client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=file_path,
                expires=timedelta(seconds=expires)
            )
            
            return url
            
        except S3Error as e:
            logger.error(f"Error uploading file to MinIO: {e}")
            raise
    
    async def get_file(self, file_path: str) -> bytes:
        """
        دریافت فایل از MinIO
        
        Args:
            file_path: مسیر فایل
            
        Returns:
            bytes: محتوای فایل
        """
        try:
            response = self.client.get_object(
                bucket_name=self.bucket,
                object_name=file_path
            )
            
            data = response.read()
            response.close()
            response.release_conn()
            
            return data
            
        except S3Error as e:
            logger.error(f"Error getting file from MinIO: {e}")
            raise
    
    async def delete_file(self, file_path: str):
        """
        حذف فایل از MinIO
        
        Args:
            file_path: مسیر فایل
        """
        try:
            self.client.remove_object(
                bucket_name=self.bucket,
                object_name=file_path
            )
            
            logger.info(f"File deleted from MinIO: {file_path}")
            
        except S3Error as e:
            logger.error(f"Error deleting file from MinIO: {e}")
            raise
    
    def generate_presigned_url(self, file_path: str, expires: int = 3600) -> str:
        """
        تولید لینک موقت برای فایل
        
        Args:
            file_path: مسیر فایل
            expires: زمان انقضا (ثانیه)
            
        Returns:
            str: لینک موقت
        """
        try:
            url = self.client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=file_path,
                expires=timedelta(seconds=expires)
            )
            
            return url
            
        except S3Error as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise
    
    async def file_exists(self, file_path: str) -> bool:
        """
        بررسی وجود فایل
        
        Args:
            file_path: مسیر فایل
            
        Returns:
            bool: آیا فایل وجود دارد
        """
        try:
            self.client.stat_object(
                bucket_name=self.bucket,
                object_name=file_path
            )
            return True
        except S3Error:
            return False
