"""
یک کلیک برای به‌روزرسانی گزارش GSC و باز کردن شیت.
"""
import subprocess
import sys
import os
import webbrowser

SHEET_URL = "https://docs.google.com/spreadsheets/d/1qFynl6JMLbT55ucqXe2zQ7w710JCpkhlxHYvZDC8oEA/edit"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)


def refresh():
    os.chdir(ROOT)
    r = subprocess.run(
        [sys.executable, os.path.join(SCRIPT_DIR, "gsc_refresh_and_sync.py")],
        capture_output=True,
        text=True,
        timeout=120,
    )
    return r.returncode == 0, r.stdout + r.stderr


def main():
    try:
        import tkinter as tk
        from tkinter import font as tkfont
    except ImportError:
        ok, out = refresh()
        webbrowser.open(SHEET_URL)
        print("Done." if ok else "Error:", out)
        return

    root = tk.Tk()
    root.title("GSC Report")
    root.geometry("320x140")
    root.resizable(False, False)

    msg = tk.StringVar(value="برای به\u200cروزرسانی گزارش کلیک کنید")

    def on_click():
        btn.config(state="disabled", text="در حال به\u200cروزرسانی...")
        root.update()
        ok, out = refresh()
        if ok:
            msg.set("به\u200cروزرسانی انجام شد")
            webbrowser.open(SHEET_URL)
        else:
            msg.set("خطا در به\u200cروزرسانی")
            try:
                from tkinter import messagebox
                messagebox.showerror("خطا", out[:500] if len(out) > 500 else out)
            except Exception:
                print(out)
        btn.config(state="normal", text="به\u200cروزرسانی گزارش")

    f = tkfont.Font(size=12)
    btn = tk.Button(root, text="به\u200cروزرسانی گزارش", command=on_click, font=f, height=2, width=20, cursor="hand2")
    btn.pack(pady=20, padx=20, fill="x")
    lbl = tk.Label(root, textvariable=msg, font=("", 10))
    lbl.pack(pady=5)
    root.mainloop()


if __name__ == "__main__":
    main()
