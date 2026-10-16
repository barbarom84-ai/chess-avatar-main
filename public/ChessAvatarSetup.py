#!/usr/bin/env python3
"""
Chess Avatar — one-click UCI installer for Fritz / ChessBase (Windows).
No console scripts: GUI + single UAC elevation when needed.
"""

from __future__ import annotations

import ctypes
import json
import os
import shutil
import sys
import tempfile
import threading
import traceback
import urllib.request
import zipfile
from pathlib import Path

STOCKFISH_URL = (
    "https://github.com/official-stockfish/Stockfish/releases/download/"
    "sf_17/stockfish-windows-x86-64-avx2.zip"
)

FRITZ_PATHS = [
    Path(r"C:\Program Files\ChessBase\ChessProgram20\ChessProgram20.exe"),
    Path(r"C:\Program Files\ChessBase\Fritz 20\Fritz 20.exe"),
]


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def is_admin() -> bool:
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def elevate_and_exit() -> None:
    """Relaunch elevated and terminate this process (no leftover console)."""
    params = " ".join(f'"{a}"' for a in sys.argv[1:])
    exe = sys.executable
    # When frozen, sys.executable is ChessAvatarSetup.exe
    rc = ctypes.windll.shell32.ShellExecuteW(
        None, "runas", exe, params, str(app_dir()), 1
    )
    if rc <= 32:
        raise RuntimeError(f"UAC elevation failed (ShellExecute code {rc})")
    sys.exit(0)


def sanitize_name(raw: str, fallback: str = "ChessAvatar") -> str:
    cleaned = "".join(c if c.isalnum() or c in "_-" else "_" for c in (raw or ""))
    cleaned = cleaned.strip("_")[:64]
    return cleaned or fallback


def find_profile(base: Path) -> Path | None:
    preferred = sorted(base.glob("Bot_*.profile.json"))
    if preferred:
        return preferred[0]
    jsons = sorted(base.glob("*.json"))
    return jsons[0] if jsons else None


def find_avatar_image(base: Path) -> Path | None:
    for name in (
        "avatar.webp",
        "avatar.png",
        "avatar.jpg",
        "avatar.jpeg",
        "avatar.bmp",
        "portrait.webp",
        "portrait.png",
    ):
        p = base / name
        if p.is_file():
            return p
    for pat in ("*.webp", "*.png", "*.jpg", "*.jpeg", "*.bmp"):
        for p in sorted(base.glob(pat)):
            if p.name.lower().startswith("avatar") or p.name.lower().startswith(
                "portrait"
            ):
                return p
    return None


def load_profile(path: Path) -> dict:
    text = path.read_text(encoding="utf-8-sig")
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("Profile JSON must be an object")
    return data


def engine_display_name(profile: dict, profile_path: Path) -> str:
    raw = profile.get("username") or profile.get("name")
    if isinstance(raw, str) and raw.strip():
        return f"{sanitize_name(raw.strip())}_Avatar"
    stem = profile_path.stem
    if stem.startswith("Bot_"):
        return f"{sanitize_name(stem[4:])}_Avatar"
    return "ChessAvatar_Avatar"


def ensure_stockfish(work: Path, log) -> Path:
    existing = list(work.glob("stockfish*.exe"))
    if existing:
        log(f"Stockfish found: {existing[0].name}")
        return existing[0]

    dest = work / "stockfish.exe"
    if dest.is_file():
        return dest

    log("Downloading Stockfish (~30 MB)…")
    zip_path = work / "stockfish.zip"
    tmp = work / "stockfish_tmp"
    if tmp.exists():
        shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True, exist_ok=True)

    urllib.request.urlretrieve(STOCKFISH_URL, zip_path)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(tmp)
    found = list(tmp.rglob("stockfish*.exe"))
    if not found:
        raise FileNotFoundError("Stockfish executable not found in download archive")
    shutil.copy2(found[0], dest)
    zip_path.unlink(missing_ok=True)
    shutil.rmtree(tmp, ignore_errors=True)
    log("Stockfish ready.")
    return dest


def write_engine_ini(
    path: Path, engine_name: str, stockfish_name: str, profile_name: str
) -> None:
    content = (
        "[Engine]\n"
        f"Name={engine_name}\n"
        "Author=Chess Avatar\n"
        "Protocol=UCI\n"
        f"StockfishPath={stockfish_name}\n"
        "\n"
        "[Options]\n"
        "Hash=128\n"
        "Threads=2\n"
        "Depth=14\n"
        "Contempt=0\n"
        "\n"
        "[Personality]\n"
        f"Profile={profile_name}\n"
    )
    path.write_text(content, encoding="ascii", newline="\r\n")


def make_fritz_bmp(src: Path | None, dest: Path, initials: str, log) -> bool:
    """Fritz: BMP ≤100×50, same basename as engine exe."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        log("Pillow missing — skipping Fritz logo.")
        return False

    w, h = 100, 50
    if src and src.is_file():
        try:
            im = Image.open(src).convert("RGBA")
            im.thumbnail((w, h), Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (w, h), (15, 23, 42))
            x = (w - im.width) // 2
            y = (h - im.height) // 2
            canvas.paste(im, (x, y), im if im.mode == "RGBA" else None)
            canvas.save(dest, format="BMP")
            log(f"Fritz logo written: {dest.name}")
            return True
        except Exception as e:
            log(f"Avatar image convert failed ({e}); using initials.")

    canvas = Image.new("RGB", (w, h), (8, 51, 68))
    draw = ImageDraw.Draw(canvas)
    label = (initials or "CA")[:3].upper()
    try:
        font = ImageFont.truetype("segoeui.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((w - tw) / 2, (h - th) / 2 - 2), label, fill=(103, 232, 249), font=font)
    canvas.save(dest, format="BMP")
    log(f"Fritz logo (initials) written: {dest.name}")
    return True


def write_uci_registration(engine_name: str, engine_exe: Path, log) -> Path:
    uci_dir = Path(os.environ.get("APPDATA", "")) / "ChessBase" / "Engines.uci"
    uci_dir.mkdir(parents=True, exist_ok=True)
    uci_path = uci_dir / f"{engine_name}.uci"
    content = (
        "[ENGINE]\n"
        f"Name={engine_name}\n"
        "Author=Chess Avatar\n"
        f"Filename={engine_exe}\n"
        "Priority=below normal\n"
        "[OPTIONS]\n"
        "UCI_Chess960=true\n"
        "Threads=1\n"
    )
    uci_path.write_text(content, encoding="ascii", newline="\r\n")
    log(f"UCI registration: {uci_path}")
    return uci_path


def run_install(base: Path, log) -> dict:
    engine_exe = base / "AvatarEngine.exe"
    if not engine_exe.is_file():
        raise FileNotFoundError(
            "AvatarEngine.exe not found next to ChessAvatarSetup.exe.\n"
            "Extract the full ZIP pack first."
        )

    profile_path = find_profile(base)
    if not profile_path:
        raise FileNotFoundError("No Bot_*.profile.json (or .json) found in the pack folder.")

    profile = load_profile(profile_path)
    engine_name = engine_display_name(profile, profile_path)
    log(f"Profile: {profile_path.name}")
    log(f"Engine name: {engine_name}")

    stockfish = ensure_stockfish(base, log)
    ini_path = base / "engine.ini"
    write_engine_ini(ini_path, engine_name, stockfish.name, profile_path.name)

    motor_dir = (
        Path(os.environ["USERPROFILE"])
        / "Documents"
        / "ChessBase"
        / "Engines"
        / engine_name
    )
    motor_dir.mkdir(parents=True, exist_ok=True)
    log(f"Install folder: {motor_dir}")

    for src in (engine_exe, stockfish, profile_path, ini_path):
        shutil.copy2(src, motor_dir / src.name)
        log(f"Copied {src.name}")

    swap = base / "swap_profile.bat"
    if swap.is_file():
        shutil.copy2(swap, motor_dir / swap.name)

    avatar_img = find_avatar_image(base)
    initials = sanitize_name(
        str(profile.get("username") or profile.get("name") or "CA")
    )[:2]
    make_fritz_bmp(avatar_img, motor_dir / "AvatarEngine.bmp", initials, log)

    installed_exe = motor_dir / "AvatarEngine.exe"
    uci_path = write_uci_registration(engine_name, installed_exe, log)

    return {
        "engine_name": engine_name,
        "motor_dir": str(motor_dir),
        "uci_path": str(uci_path),
        "elo": profile.get("elo"),
        "style": profile.get("playStyle") or profile.get("style"),
        "openings": profile.get("favoriteOpenings")
        or profile.get("openings")
        or profile.get("openingRepertoire"),
    }


def find_fritz() -> Path | None:
    for p in FRITZ_PATHS:
        if p.is_file():
            return p
    return None


def logo_image_path() -> Path | None:
    """Bundled Chess Avatar knight logo (PyInstaller datas or public/)."""
    names = ("knight-logo.png", "chessavatar.ico")
    candidates: list[Path] = []
    if getattr(sys, "frozen", False):
        meipass = Path(getattr(sys, "_MEIPASS", ""))
        exe_dir = Path(sys.executable).resolve().parent
        for name in names:
            candidates.append(meipass / name)
            candidates.append(exe_dir / name)
    else:
        here = Path(__file__).resolve().parent
        for name in names:
            candidates.append(here / name)
    for p in candidates:
        if p.is_file():
            return p
    return None


def apply_window_icon(root) -> None:
    """Title-bar / taskbar icon — Chess Avatar knight (not the default Tk feather)."""
    import tkinter as tk

    logo = logo_image_path()
    if not logo:
        return
    try:
        if logo.suffix.lower() == ".ico":
            root.iconbitmap(default=str(logo))
            return
        img = tk.PhotoImage(file=str(logo))
        root.iconphoto(True, img)
        # Keep a reference so Tk does not garbage-collect the image.
        root._chessavatar_icon = img  # type: ignore[attr-defined]
    except Exception:
        ico = logo.with_suffix(".ico")
        if ico.is_file():
            try:
                root.iconbitmap(default=str(ico))
            except Exception:
                pass


def launch_gui() -> None:
    import tkinter as tk
    from tkinter import messagebox, scrolledtext

    if not is_admin():
        root = tk.Tk()
        root.withdraw()
        apply_window_icon(root)
        ok = messagebox.askokcancel(
            "Chess Avatar Setup",
            "Windows may ask for administrator permission once "
            "(Stockfish download + ChessBase Engines folder).\n\n"
            "Click OK to continue.",
        )
        root.destroy()
        if not ok:
            sys.exit(0)
        try:
            elevate_and_exit()
        except Exception as e:
            root = tk.Tk()
            root.withdraw()
            apply_window_icon(root)
            messagebox.showerror("Chess Avatar Setup", str(e))
            root.destroy()
            sys.exit(1)

    base = app_dir()
    root = tk.Tk()
    root.title("Chess Avatar Setup")
    root.geometry("520x420")
    root.configure(bg="#0f172a")
    root.resizable(False, False)
    apply_window_icon(root)

    title = tk.Label(
        root,
        text="Install your UCI engine",
        font=("Segoe UI", 14, "bold"),
        fg="#67e8f9",
        bg="#0f172a",
    )
    title.pack(pady=(16, 4))

    subtitle = tk.Label(
        root,
        text="Fritz 20 / ChessBase — one click, no scripts",
        font=("Segoe UI", 9),
        fg="#94a3b8",
        bg="#0f172a",
    )
    subtitle.pack(pady=(0, 8))

    log_box = scrolledtext.ScrolledText(
        root,
        height=14,
        width=62,
        bg="#020617",
        fg="#cbd5e1",
        insertbackground="#cbd5e1",
        font=("Consolas", 9),
        relief="flat",
    )
    log_box.pack(padx=16, pady=8, fill="both", expand=True)

    status = tk.Label(root, text="Ready", fg="#64748b", bg="#0f172a", font=("Segoe UI", 9))
    status.pack(pady=(0, 4))

    btn_row = tk.Frame(root, bg="#0f172a")
    btn_row.pack(pady=8)

    result_holder: dict = {}

    def log(msg: str) -> None:
        log_box.insert("end", msg + "\n")
        log_box.see("end")
        root.update_idletasks()

    def set_busy(busy: bool) -> None:
        install_btn.configure(state="disabled" if busy else "normal")
        status.configure(text="Installing…" if busy else "Ready")

    def do_install() -> None:
        set_busy(True)
        log_box.delete("1.0", "end")

        def worker() -> None:
            try:
                info = run_install(base, lambda m: root.after(0, log, m))
                result_holder.clear()
                result_holder.update(info)

                def done() -> None:
                    set_busy(False)
                    status.configure(text="Installed", fg="#34d399")
                    open_btn.configure(state="normal")
                    extras = []
                    if info.get("elo") is not None:
                        extras.append(f"Elo ~{info['elo']}")
                    if info.get("style"):
                        extras.append(f"style: {info['style']}")
                    extra_line = ("\n" + " · ".join(str(x) for x in extras)) if extras else ""
                    messagebox.showinfo(
                        "Chess Avatar Setup",
                        f"Engine “{info['engine_name']}” is ready.{extra_line}\n\n"
                        f"Folder:\n{info['motor_dir']}\n\n"
                        "Open Fritz 20 — the engine should appear in the module list "
                        "(logo shown when Fritz displays engine pictures).",
                    )

                root.after(0, done)
            except Exception as e:
                err = f"{e}\n\n{traceback.format_exc()}"

                def fail() -> None:
                    set_busy(False)
                    status.configure(text="Failed", fg="#f87171")
                    log(str(e))
                    messagebox.showerror("Chess Avatar Setup", str(e))

                root.after(0, fail)
                print(err, file=sys.stderr)

        threading.Thread(target=worker, daemon=True).start()

    def open_fritz() -> None:
        fritz = find_fritz()
        if not fritz:
            messagebox.showwarning(
                "Chess Avatar Setup",
                "Fritz 20 was not found in the default install path.\n"
                "Start Fritz manually and pick the engine from the module list.",
            )
            return
        os.startfile(str(fritz))  # noqa: S606

    install_btn = tk.Button(
        btn_row,
        text="Install engine",
        command=do_install,
        bg="#0e7490",
        fg="white",
        activebackground="#0891b2",
        activeforeground="white",
        font=("Segoe UI", 10, "bold"),
        relief="flat",
        padx=16,
        pady=6,
    )
    install_btn.pack(side="left", padx=6)

    open_btn = tk.Button(
        btn_row,
        text="Open Fritz 20",
        command=open_fritz,
        state="disabled",
        bg="#1e293b",
        fg="#e2e8f0",
        activebackground="#334155",
        activeforeground="white",
        font=("Segoe UI", 10),
        relief="flat",
        padx=12,
        pady=6,
    )
    open_btn.pack(side="left", padx=6)

    close_btn = tk.Button(
        btn_row,
        text="Close",
        command=root.destroy,
        bg="#1e293b",
        fg="#94a3b8",
        relief="flat",
        padx=12,
        pady=6,
        font=("Segoe UI", 10),
    )
    close_btn.pack(side="left", padx=6)

    log(f"Pack folder: {base}")
    root.mainloop()


def main() -> None:
    if sys.platform != "win32":
        print("ChessAvatarSetup is for Windows only.", file=sys.stderr)
        sys.exit(1)
    # Headless mode for automation: ChessAvatarSetup.exe --silent
    if "--silent" in sys.argv:
        if not is_admin():
            elevate_and_exit()
        logs: list[str] = []
        info = run_install(app_dir(), logs.append)
        print(json.dumps({"ok": True, **info, "log": logs}, indent=2))
        return
    launch_gui()


if __name__ == "__main__":
    main()
