# اتصال TaskFlowDesktop به Backend - تکمیل شد

**تاریخ**: ۱۲ مارس ۲۰۲۶

## خلاصه تغییرات

### ۱. اتصال به Backend واقعی
- **api/realBackend.ts**: کلاینت API برای backend پایتون (پورت ۸۰۶۰)
- **api/index.ts**: انتخاب خودکار بین backend واقعی و mock (بر اساس /health)
- **api/config.ts**: تنظیم `VITE_API_BASE_URL`

### ۲. کامپوننت‌های به‌روز شده
- **Dashboard**: استفاده از `backend` و `webSocket` یکپارچه
- **TasksList**: fetch از API، ایجاد تسک، شروع/توقف
- **TaskDetail**: fetch تسک، events، artifacts از API
- **MemoryExplorer**: fetch از `/memory/list`
- **ArtifactsViewer**: fetch از `/artifacts`

### ۳. Backend - تغییرات
- **main.py**: اضافه شدن `computer_router`
- **memory.py**: endpoint جدید `GET /memory/list`
- **artifacts.py**: endpoint جدید `GET /artifacts`

### ۴. نمایش پیشرفت زنده
- **ProgressOverlay**: کامپوننت نمایش درصد و ETA
- **progressStore**: Zustand store برای state پیشرفت
- نمایش هنگام شروع تسک

### ۵. Build
- **Production build**: `npm run build` ✅
- **Tauri build**: `npm run tauri build` برای exe

## نحوه اجرا

### Backend (پایتون)
```bash
cd Agent/Agent/winfsurf-20/taskflow/backend
pip install -r requirements.txt  # یا requirements
uvicorn app.main:app --host 127.0.0.1 --port 8060
```

### TaskFlowDesktop
```bash
cd Agent/Agent/winfsurf-20/taskflow/TaskFlowDesktop
npm install
npm run dev
```

اگر backend در دسترس نباشد، به‌صورت خودکار از mock data استفاده می‌شود.

## متغیرهای محیطی
- `VITE_API_BASE_URL`: آدرس backend (پیش‌فرض: http://127.0.0.1:8060)
