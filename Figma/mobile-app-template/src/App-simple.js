import React from 'react';
import './index.css';

const App = () => {
  return (
    <div className="mobile-container mobile-min-height">
      {/* Header */}
      <header className="mobile-header">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold">اپلیکیشن موبایل</h1>
          <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mobile-content">
        <div className="p-4">
          <div className="mobile-card mb-4">
            <h2 className="text-xl font-bold mb-2">خوش آمدید!</h2>
            <p className="text-gray-600">این یک الگوی اپلیکیشن موبایل مدرن است.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="mobile-card">
              <h3 className="font-semibold">ویژگی ۱</h3>
              <p className="text-sm text-gray-500">توضیحات ویژگی اول</p>
            </div>
            <div className="mobile-card">
              <h3 className="font-semibold">ویژگی ۲</h3>
              <p className="text-sm text-gray-500">توضیحات ویژگی دوم</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button className="mobile-btn-primary w-full">دکمه اصلی</button>
            <button className="mobile-btn-secondary w-full">دکمه ثانویه</button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="mobile-footer">
        <div className="bottom-nav">
          <button className="bottom-nav-item bottom-nav-item-active">
            <div className="w-6 h-6 bg-blue-500 rounded"></div>
            <span className="text-xs mt-1">خانه</span>
          </button>
          <button className="bottom-nav-item bottom-nav-item-inactive">
            <div className="w-6 h-6 bg-gray-400 rounded"></div>
            <span className="text-xs mt-1">جستجو</span>
          </button>
          <button className="bottom-nav-item bottom-nav-item-inactive">
            <div className="w-6 h-6 bg-gray-400 rounded"></div>
            <span className="text-xs mt-1">پروفایل</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
