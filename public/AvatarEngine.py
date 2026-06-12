#!/usr/bin/env python3
"""
AvatarEngine.py - UCI wrapper for Chess Avatar profiles (Fritz / ChessBase / Arena).

- Opening book, forced lines, Fritz black fallback (unchanged)
- Middlegame: Stockfish by default (ChessAvatar.exe optional via engine.ini UseChessAvatar=true)
- Fallback: ChessAvatar only when Stockfish missing and UseChessAvatar enabled
- Persona variance + periodic human blunders via MultiPV (aligned with the web app)
"""

import sys
import os
import json
import subprocess
import threading
import configparser
import random
import re
from pathlib import Path


class UciBackend:
    """One UCI subprocess (Stockfish or ChessAvatar)."""

    def __init__(self, owner, path, key, label):
        self.owner = owner
        self.path = path
        self.key = key
        self.label = label
        self.process = None
        self.thread = None

    def start(self):
        if not self.path or not Path(self.path).exists():
            if self.path and self.path not in ("stockfish", "stockfish.exe"):
                print(
                    f"info string {self.label} not found: {self.path}",
                    file=sys.stderr,
                )
            return False
        try:
            popen_kw = dict(
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                bufsize=1,
                cwd=str(self.owner.script_dir),
            )
            if sys.platform == "win32":
                cnw = getattr(subprocess, "CREATE_NO_WINDOW", 0)
                if cnw:
                    popen_kw["creationflags"] = cnw
            self.process = subprocess.Popen([self.path], **popen_kw)
            self.thread = threading.Thread(target=self._read_loop, daemon=True)
            self.thread.start()
            print(f"info string {self.label} started: {self.path}", file=sys.stderr)
            return True
        except OSError as e:
            print(f"info string Failed to start {self.label}: {e}", file=sys.stderr)
            self.process = None
            return False

    def send(self, command):
        if self.process and self.process.stdin:
            self.process.stdin.write(command + "\n")
            self.process.stdin.flush()

    def _read_loop(self):
        if not self.process:
            return
        for line in self.process.stdout:
            line = line.strip()
            if line:
                self.owner.on_backend_line(self.key, line)


class AvatarEngine:
    def __init__(self):
        if getattr(sys, "frozen", False):
            self.script_dir = Path(sys.executable).parent
        else:
            self.script_dir = Path(__file__).parent

        self.config = self.load_engine_config()
        self.profile = self.load_profile()
        self.use_chessavatar = self._read_use_chessavatar()

        self.stockfish_path = self.config.get("stockfish_path") or self.find_stockfish()
        self.chessavatar_path = self.find_chessavatar() if self.use_chessavatar else None
        self.has_chessavatar = False
        self.has_stockfish = False
        self._chessavatar_nnue_configured = False
        self._backend_ready_count = 0
        self._backend_ready_target = 0
        self._backend_ready_event = threading.Event()

        self.backends = {}
        self.forward_backend = "stockfish"
        self.uci_source = "stockfish"

        self.name = self._resolve_engine_identity(
            "name",
            ("name", "username"),
            "Avatar Engine",
        )
        self.author = self._resolve_engine_identity(
            "author",
            ("author", "username"),
            "Chess Avatar",
        )

        self.forced_white, self.forced_black = self._load_forced_lines_by_color()
        self.forced_line = self._interleave_forced(self.forced_white, self.forced_black)

        self.opening_repertoire = self.profile.get("openingRepertoire", {})
        self.white_openings = self.opening_repertoire.get("whiteOpenings", [])
        self.black_openings = self.opening_repertoire.get("blackOpenings", [])
        self.fritz_black_fallback = self.profile.get("fritzBlackOpeningFallback") or []

        self.current_position = []
        self.is_white_turn = True
        self.opening_phase = True
        self.max_opening_moves = 15

        self.bot_color = None
        self.forced_line_active = True

        self._search_lock = threading.Lock()
        self._multipv_active = False
        self._multipv_blunder = False
        self._line_moves = {}
        self._go_epoch = 0
        self._awaiting_go_epoch = None
        self._analysis_go = False
        self._initial_side_white = True
        self._go_sent = False
        self._bestmove_sent_epoch = None
        self._pending_stop_bestmove = False
        self._uci_move_re = re.compile(r"^[a-h][1-8][a-h][1-8][qrbn]?$")

        _hb = self.profile.get("humanBlunderInterval")
        if _hb is None:
            self.human_blunder_interval = 10
        else:
            try:
                self.human_blunder_interval = int(_hb)
            except (TypeError, ValueError):
                self.human_blunder_interval = 10

    # --- helpers (unchanged logic) ---

    @staticmethod
    def _clean_identity(value):
        if not isinstance(value, str):
            return ""
        return value.strip()

    def _resolve_engine_identity(self, config_key, profile_keys, default):
        configured = self._clean_identity(self.config.get(config_key, ""))
        if configured:
            return configured
        for key in profile_keys:
            candidate = self._clean_identity(self.profile.get(key, ""))
            if candidate:
                return candidate
        return default

    def _read_use_chessavatar(self):
        raw = self.config.get("use_chessavatar", "")
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, str):
            return raw.strip().lower() in ("1", "true", "yes", "on")
        return False

    def _normalize_uci(self, uci):
        if not uci or not isinstance(uci, str):
            return ""
        s = uci.strip().lower()
        if len(s) >= 5 and s[4] in "qrbn":
            return s[:5]
        return s[:4]

    def _is_valid_uci_move(self, uci):
        normalized = self._normalize_uci(uci)
        return bool(normalized and self._uci_move_re.match(normalized))

    def _white_to_move_at_ply(self, ply):
        return self._initial_side_white if ply % 2 == 0 else not self._initial_side_white

    def _is_bot_turn(self):
        if self.bot_color is None:
            return True
        white_to_move = self._white_to_move_at_ply(len(self.current_position))
        if self.bot_color == "white":
            return white_to_move
        return not white_to_move

    def _count_bot_moves_played(self):
        if self.bot_color is None:
            return 0
        n = 0
        for i, _ in enumerate(self.current_position):
            is_white_move = self._white_to_move_at_ply(i)
            is_bot = is_white_move == (self.bot_color == "white")
            if is_bot:
                n += 1
        return n

    def _should_play_human_blunder_move(self):
        iv = self.human_blunder_interval
        if not iv or iv < 1:
            return False
        return (self._count_bot_moves_played() + 1) % iv == 0

    @staticmethod
    def _pick_forced_human_blunder(best, line_moves):
        if not best or not line_moves:
            return best
        candidates = []
        for rank in (2, 3, 4):
            m = line_moves.get(rank)
            if m and m != best:
                candidates.append(m)
        return random.choice(candidates) if candidates else best

    def _multi_pv_count_for_difficulty(self):
        d = int(self.profile.get("difficulty", 3) or 3)
        if d <= 1:
            return 4
        if d == 2:
            return 3
        if d == 3:
            return 2
        return 1

    def _pick_persona_biased_move(self, best, line_moves):
        n = len(line_moves)
        if n < 2 or not best:
            return best
        difficulty = int(self.profile.get("difficulty", 3) or 3)
        style = self.profile.get("style") or {}
        agg = min(100, max(0, int(style.get("aggression", style.get("aggressiveness", 0)) or 0))) / 100
        bump = agg * 0.2
        r = random.random()
        pick_rank = 1
        if difficulty <= 1:
            if r < 0.12 + bump:
                pick_rank = 4
            elif r < 0.28 + bump * 0.7:
                pick_rank = 3
            elif r < 0.48 + bump * 0.5:
                pick_rank = 2
        elif difficulty == 2:
            if r < 0.1 + bump:
                pick_rank = 3
            elif r < 0.3 + bump * 0.6:
                pick_rank = 2
        elif difficulty == 3:
            if r < 0.14 + bump * 0.8:
                pick_rank = 2
        if pick_rank == 1:
            return best
        for rank in range(pick_rank, 1, -1):
            alt = line_moves.get(rank)
            if alt and alt != best:
                return alt
        return best

    def _load_forced_lines_by_color(self):
        white = self.profile.get("forcedLineWhite") or []
        black = self.profile.get("forcedLineBlack") or []
        w = [self._normalize_uci(m) for m in white if m]
        b = [self._normalize_uci(m) for m in black if m]
        if w or b:
            return w, b
        legacy = self.profile.get("forcedLine") or []
        if not isinstance(legacy, list) or not legacy:
            return [], []
        w2, b2 = [], []
        for i, m in enumerate(legacy):
            u = self._normalize_uci(m)
            if u:
                (w2 if i % 2 == 0 else b2).append(u)
        return w2, b2

    def _interleave_forced(self, white, black):
        out = []
        n = max(len(white), len(black))
        for i in range(n):
            if i < len(white):
                out.append(white[i])
            if i < len(black):
                out.append(black[i])
        return out

    def _expected_forced_at_ply(self, ply):
        idx = ply // 2
        if ply % 2 == 0:
            raw = self.forced_white[idx] if idx < len(self.forced_white) else None
        else:
            raw = self.forced_black[idx] if idx < len(self.forced_black) else None
        return raw

    def _forced_prefix_matches_bot_only(self, history_uci):
        if self.bot_color is None:
            return True
        bot_plays_white = self.bot_color == "white"
        for i, mv in enumerate(history_uci):
            white_to_move = self._white_to_move_at_ply(i)
            move_is_bot = white_to_move if bot_plays_white else not white_to_move
            if not move_is_bot:
                continue
            exp = self._expected_forced_at_ply(i)
            if exp is None:
                continue
            if self._normalize_uci(mv) != exp:
                return False
        return True

    def _next_forced_move_for_bot(self, next_ply):
        if self.bot_color is None:
            return None
        bot_plays_white = self.bot_color == "white"
        white_to_move = self._white_to_move_at_ply(next_ply)
        if bot_plays_white != white_to_move:
            return None
        return self._expected_forced_at_ply(next_ply)

    def _sync_forced_line_state(self, context):
        if not (self.forced_white or self.forced_black):
            return
        if self.bot_color is None:
            return
        if not self._forced_prefix_matches_bot_only(self.current_position):
            self.forced_line_active = False
            print(
                f"info string Forced line abandoned ({context}): engine move deviated from line",
                file=sys.stderr,
            )

    def find_stockfish(self):
        stockfish_files = list(self.script_dir.glob("stockfish*.exe"))
        if stockfish_files:
            print(f"info string Using Stockfish: {stockfish_files[0].name}", file=sys.stderr)
            return str(stockfish_files[0])
        for name in ("stockfish.exe", "stockfish", "stockfish_x64.exe"):
            path = self.script_dir / name
            if path.exists():
                return str(path)
        print("info string No Stockfish in engine folder (optional if ChessAvatar.exe is present)", file=sys.stderr)
        return None

    def find_chessavatar(self):
        for name in ("ChessAvatar.exe", "chessavatar.exe"):
            path = self.script_dir / name
            if path.exists():
                print(f"info string ChessAvatar native engine found: {name}", file=sys.stderr)
                return str(path)
        print("info string ChessAvatar.exe not found — Stockfish only for search", file=sys.stderr)
        return None

    def find_nnue(self):
        path = self.script_dir / "nn-default.nnue"
        if path.exists():
            return str(path.resolve())
        nnue_files = list(self.script_dir.glob("*.nnue"))
        if nnue_files:
            return str(nnue_files[0].resolve())
        return None

    def load_engine_config(self):
        config_path = self.script_dir / "engine.ini"
        config_dict = {}
        if config_path.exists():
            try:
                config = configparser.ConfigParser()
                config.read(config_path, encoding="utf-8-sig")
                if "Engine" in config:
                    config_dict["name"] = config["Engine"].get("Name", "")
                    config_dict["author"] = config["Engine"].get("Author", "")
                    config_dict["stockfish_path"] = config["Engine"].get("StockfishPath", "")
                    config_dict["use_chessavatar"] = config["Engine"].get("UseChessAvatar", "")
                if "Options" in config:
                    config_dict["hash"] = config["Options"].get("Hash", "128")
                    config_dict["threads"] = config["Options"].get("Threads", "4")
            except Exception as e:
                print(f"info string Error loading engine.ini: {e}", file=sys.stderr)
        return config_dict

    def load_profile(self):
        profile_path = self.script_dir / "profile.json"
        if not profile_path.exists():
            profile_files = list(self.script_dir.glob("*.profile.json"))
            if profile_files:
                profile_path = profile_files[0]
        if not profile_path.exists():
            skip_names = {
                "engine.json",
                "package.json",
                "engine-native-manifest.json",
                "manifest.json",
            }
            json_files = [
                f
                for f in self.script_dir.glob("*.json")
                if f.name not in skip_names and "manifest" not in f.name.lower()
            ]
            if json_files:
                profile_path = json_files[0]
        if not profile_path.exists():
            return {"name": "Avatar Engine", "username": "Chess Avatar", "skill": 15, "depth": 16, "elo": 2000, "difficulty": 3}
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                profile = json.load(f)
                print(f"info string Profile loaded: {profile_path.name}", file=sys.stderr)
                return profile
        except Exception as e:
            print(f"info string Error loading profile: {e}", file=sys.stderr)
            return {"name": "Avatar Engine", "username": "Chess Avatar", "skill": 15, "depth": 16, "elo": 2000, "difficulty": 3}

    # --- opening selection (unchanged) ---

    def select_opening_move(self, is_white):
        openings_list = self.white_openings if is_white else self.black_openings
        if not openings_list:
            return None
        openings_db = self.profile.get("openingsDatabase", [])
        if not openings_db:
            return None
        compatible_openings = []
        for opening_ref in openings_list:
            opening_id = opening_ref.get("id")
            weight = opening_ref.get("weight", 50)
            opening_data = next((o for o in openings_db if o.get("id") == opening_id), None)
            if not opening_data:
                continue
            uci_moves = opening_data.get("uciMoves", [])
            if self.matches_opening(uci_moves):
                next_move_index = len(self.current_position)
                if next_move_index < len(uci_moves):
                    compatible_openings.append(
                        {"move": uci_moves[next_move_index], "weight": weight, "name": opening_data.get("name", "?")}
                    )
        if not compatible_openings:
            return None
        total_weight = sum(o["weight"] for o in compatible_openings)
        random_value = random.uniform(0, total_weight)
        current_sum = 0
        for opening in compatible_openings:
            current_sum += opening["weight"]
            if random_value <= current_sum:
                print(f"info string Opening: {opening['name']} -> {opening['move']}", file=sys.stderr)
                return opening["move"]
        return compatible_openings[0]["move"]

    def _pick_fritz_black_fallback_move(self):
        if not self.fritz_black_fallback or not self.opening_phase:
            return None
        if self.bot_color != "black":
            return None
        n = len(self.current_position)
        if n % 2 == 0:
            return None
        white_played = [self._normalize_uci(self.current_position[i]) for i in range(0, n, 2)]
        for entry in self.fritz_black_fallback:
            wprefix = entry.get("whiteUci") or []
            norm_p = [self._normalize_uci(m) for m in wprefix]
            if norm_p != white_played:
                continue
            choices = entry.get("choices") or []
            if not choices:
                return None
            total_weight = sum(max(1, c.get("weight", 50)) for c in choices)
            r = random.uniform(0, total_weight)
            s = 0
            for c in choices:
                s += max(1, c.get("weight", 50))
                if r <= s:
                    u = self._normalize_uci(c.get("uci", ""))
                    return u or None
            return self._normalize_uci(choices[-1].get("uci", "")) or None
        return None

    def matches_opening(self, opening_moves):
        if len(self.current_position) > len(opening_moves):
            return False
        for i, move in enumerate(self.current_position):
            if i >= len(opening_moves) or move != opening_moves[i]:
                return False
        return True

    # --- engine lifecycle ---

    def start_engines(self):
        if self.stockfish_path:
            backend = UciBackend(self, self.stockfish_path, "stockfish", "Stockfish")
            if backend.start():
                self.backends["stockfish"] = backend
                self.has_stockfish = True
        if self.chessavatar_path:
            backend = UciBackend(self, self.chessavatar_path, "chessavatar", "ChessAvatar")
            if backend.start():
                self.backends["chessavatar"] = backend
                self.has_chessavatar = True
        elif self.use_chessavatar:
            print(
                "info string UseChessAvatar=true but ChessAvatar.exe not found — Stockfish only",
                file=sys.stderr,
            )

        if not self.backends:
            print(
                "info string FATAL: No engine backend started. "
                "Need ChessAvatar.exe or stockfish.exe in this folder.",
                file=sys.stderr,
            )
            return

        if self.has_chessavatar and not self.has_stockfish:
            print(
                "info string Stockfish not installed — ChessAvatar only (run install_engine.bat for fallback)",
                file=sys.stderr,
            )
        elif self.has_stockfish and not self.use_chessavatar:
            print("info string Search backend: Stockfish (ChessAvatar disabled in engine.ini)", file=sys.stderr)
        elif self.has_stockfish and self.has_chessavatar:
            print(
                "info string Search backend: Stockfish default (set UseChessAvatar=true in engine.ini for ChessAvatar)",
                file=sys.stderr,
            )

    def _ensure_chessavatar_nnue(self):
        if self._chessavatar_nnue_configured or "chessavatar" not in self.backends:
            return
        nnue = self.find_nnue()
        if nnue:
            self.send_to("chessavatar", f"setoption name EvalFile value {nnue}")
        else:
            print(
                "info string Warning: nn-default.nnue missing — ChessAvatar uses classical eval",
                file=sys.stderr,
            )
        self._chessavatar_nnue_configured = True

    def _wait_for_backend_ready(self, backend_keys, timeout=30):
        if not backend_keys:
            return True
        self._backend_ready_count = 0
        self._backend_ready_target = len(backend_keys)
        self._backend_ready_event.clear()
        for key in backend_keys:
            self.send_to(key, "isready")
        return self._backend_ready_event.wait(timeout)

    def _note_backend_ready(self):
        self._backend_ready_count += 1
        if self._backend_ready_count >= self._backend_ready_target > 0:
            self._backend_ready_event.set()

    def send_to(self, key, command):
        backend = self.backends.get(key)
        if backend:
            backend.send(command)

    def broadcast(self, command):
        for backend in self.backends.values():
            backend.send(command)

    def _is_analysis_go(self, line):
        """Fritz analysis pane uses go infinite / go depth without clock — not a game move."""
        tokens = line.lower().split()
        if "infinite" in tokens:
            return True
        has_clock = any(
            t in tokens
            for t in ("movetime", "wtime", "btime", "movestogo", "winc", "binc")
        )
        return "depth" in tokens and not has_clock

    def _should_forward_info_line(self, line):
        """Fritz mis-reads MultiPV 2+ scores as the main evaluation (shows +6, +12, etc.)."""
        if not line.startswith("info "):
            return True
        mp = re.search(r"\bmultipv\s+(\d+)", line, re.I)
        if mp and int(mp.group(1)) > 1:
            return False
        return True

    def _normalize_info_for_gui(self, line):
        """Single-PV info lines read cleaner in ChessBase/Fritz without a multipv tag."""
        if re.search(r"\bmultipv\s+1\b", line, re.I):
            line = re.sub(r"\s*multipv\s+1\b", "", line, flags=re.I)
        return line

    def _emit_engine_info(self, line):
        if self._should_forward_info_line(line):
            print(self._normalize_info_for_gui(line), flush=True)

    def _invalidate_pending_search(self):
        """Abort in-flight search; ignore late bestmove (Fritz sends stop/position while thinking)."""
        self._go_epoch += 1
        self._awaiting_go_epoch = None
        self._go_sent = False
        self._bestmove_sent_epoch = None
        with self._search_lock:
            self._multipv_active = False
            self._line_moves.clear()
        self.broadcast("stop")

    def _begin_engine_search(self):
        self.broadcast("stop")
        self._pending_stop_bestmove = True
        self._go_epoch += 1
        self._awaiting_go_epoch = None
        self._go_sent = False
        self._bestmove_sent_epoch = None
        return self._go_epoch

    def _mark_go_sent(self):
        self._awaiting_go_epoch = self._go_epoch
        self._go_sent = True

    def _is_stale_engine_output(self):
        if not self._go_sent:
            return True
        if self._awaiting_go_epoch is None:
            return True
        if self._awaiting_go_epoch != self._go_epoch:
            return True
        return False

    def _accept_engine_bestmove(self):
        self._awaiting_go_epoch = None
        self._go_sent = False

    def _emit_game_bestmove(self, move, source="engine"):
        move = self._normalize_uci(move)
        if not self._is_valid_uci_move(move):
            print(f"info string Rejected invalid bestmove from {source}: {move!r}", file=sys.stderr)
            return False
        if self._bestmove_sent_epoch == self._go_epoch:
            print(
                f"info string Ignoring duplicate bestmove for go epoch {self._go_epoch}: {move}",
                file=sys.stderr,
            )
            return False
        self._bestmove_sent_epoch = self._go_epoch
        self._accept_engine_bestmove()
        self._pending_stop_bestmove = False
        print(f"bestmove {move}", flush=True)
        return True

    def on_backend_line(self, backend_key, line):
        if line == "readyok":
            self._note_backend_ready()
            return

        if backend_key != self.forward_backend:
            return

        if self._is_stale_engine_output():
            if line.startswith("bestmove"):
                print(
                    f"info string Ignoring stale bestmove (Fritz already moved on): {line}",
                    file=sys.stderr,
                )
            return

        if line.startswith("info ") and self._go_sent:
            self._pending_stop_bestmove = False

        if line.startswith("bestmove"):
            if self._analysis_go:
                return
            if self._pending_stop_bestmove:
                print(
                    f"info string Ignoring post-stop bestmove before search info: {line}",
                    file=sys.stderr,
                )
                return

        with self._search_lock:
            multipv = self._multipv_active

        if multipv and line.startswith("info ") and " pv " in line and "multipv" in line.lower():
            mp = re.search(r"\bmultipv\s+(\d+)", line, re.I)
            pv_m = re.search(r"\bpv\s+(\S+)", line)
            if mp and pv_m:
                idx = int(mp.group(1))
                first = self._normalize_uci(pv_m.group(1))
                if self._is_valid_uci_move(first):
                    with self._search_lock:
                        self._line_moves[idx] = first
            self._emit_engine_info(line)
            return

        if line.startswith("info "):
            self._emit_engine_info(line)
            return

        if line.startswith("bestmove"):
            parts = line.split()
            raw = parts[1] if len(parts) > 1 else ""
            best = self._normalize_uci(raw) if raw and raw != "(none)" else ""
            if multipv:
                with self._search_lock:
                    lm = dict(self._line_moves)
                    blunder = self._multipv_blunder
                    self._multipv_active = False
                    self._line_moves.clear()
                if best:
                    picked = (
                        self._pick_forced_human_blunder(best, lm)
                        if blunder
                        else self._pick_persona_biased_move(best, lm)
                    )
                    if not self._emit_game_bestmove(picked, "persona"):
                        self._emit_game_bestmove(best, "engine-fallback")
                else:
                    self._accept_engine_bestmove()
                    print("bestmove (none)", flush=True)
                self.send_to(self.forward_backend, "setoption name MultiPV value 1")
            elif best:
                if not self._emit_game_bestmove(best, "engine"):
                    print(
                        f"info string Engine bestmove rejected by wrapper: {best}",
                        file=sys.stderr,
                    )
                    self._accept_engine_bestmove()
                    print("bestmove (none)", flush=True)
            else:
                self._accept_engine_bestmove()
                print("bestmove (none)", flush=True)
            return

    def _configure_analysis_backend(self, backend_key):
        """Analysis in Fritz: single PV, no persona noise."""
        skill = int(self.profile.get("skill", 15) or 15)
        hash_mb = min(int(self.config.get("hash", 128) or 128), 512)
        threads = max(1, int(self.config.get("threads", 4) or 4))
        self.send_to(backend_key, "setoption name MultiPV value 1")
        if backend_key == "chessavatar":
            self.send_to("chessavatar", f"setoption name Skill Level value {skill}")
            self.send_to("chessavatar", f"setoption name Hash value {hash_mb}")
            self.send_to("chessavatar", f"setoption name Threads value {threads}")
            nnue = self.find_nnue()
            if nnue:
                self.send_to("chessavatar", f"setoption name EvalFile value {nnue}")
        else:
            self.send_to("stockfish", f"setoption name Skill Level value {skill}")
            self.send_to("stockfish", "setoption name UCI_LimitStrength value true")
            elo = int(self.profile.get("elo", 2000) or 2000)
            self.send_to("stockfish", f"setoption name UCI_Elo value {elo}")
            self.send_to("stockfish", "setoption name MultiPV value 1")
        with self._search_lock:
            self._line_moves.clear()
            self._multipv_active = False
            self._multipv_blunder = False

    def _configure_search_backend(self, backend_key, do_blunder):
        skill = int(self.profile.get("skill", 15) or 15)
        hash_mb = min(int(self.config.get("hash", 128) or 128), 512)
        threads = max(1, int(self.config.get("threads", 4) or 4))

        if backend_key == "chessavatar":
            self.send_to("chessavatar", f"setoption name Skill Level value {skill}")
            self.send_to("chessavatar", f"setoption name Hash value {hash_mb}")
            self.send_to("chessavatar", f"setoption name Threads value {threads}")
            nnue = self.find_nnue()
            if nnue:
                self.send_to("chessavatar", f"setoption name EvalFile value {nnue}")
        else:
            self.send_to("stockfish", f"setoption name Skill Level value {skill}")
            self.send_to("stockfish", "setoption name UCI_LimitStrength value true")
            elo = int(self.profile.get("elo", 2000) or 2000)
            self.send_to("stockfish", f"setoption name UCI_Elo value {elo}")

        with self._search_lock:
            self._line_moves.clear()
            self._multipv_blunder = do_blunder
            if do_blunder:
                self._multipv_active = True
                mp = 4
            else:
                mp = self._multi_pv_count_for_difficulty()
                self._multipv_active = mp > 1
            if self._multipv_active:
                self.send_to(backend_key, f"setoption name MultiPV value {mp}")
            else:
                self.send_to(backend_key, "setoption name MultiPV value 1")

    def _print_uci_identity(self):
        print(f"id name {self.name}", flush=True)
        print(f"id author {self.author}", flush=True)
        skill = int(self.profile.get("skill", 15) or 15)
        print(f"option name Skill Level type spin default {skill} min 0 max 20", flush=True)

    def handle_uci(self):
        self._print_uci_identity()
        print("uciok", flush=True)
        for key in self.backends:
            self.send_to(key, "uci")

    def handle_position(self, line):
        self._invalidate_pending_search()
        self.current_position = []
        fen_side_white = True
        if "startpos" in line:
            self._initial_side_white = True
            if "moves" in line:
                moves_part = line.split("moves")[1].strip()
                if moves_part:
                    self.current_position = moves_part.split()
        elif "fen" in line:
            if "moves" in line:
                moves_part = line.split("moves")[1].strip()
                if moves_part:
                    self.current_position = moves_part.split()
            fen_parts = line.split("fen")[1].split("moves")[0].strip().split()
            if len(fen_parts) > 1:
                fen_side_white = fen_parts[1] == "w"
            self._initial_side_white = fen_side_white
        move_count = len(self.current_position)
        if move_count == 0 and "fen" in line:
            self.is_white_turn = fen_side_white
        else:
            base_white = self._initial_side_white
            self.is_white_turn = base_white if move_count % 2 == 0 else not base_white
        self._sync_forced_line_state("position")
        if move_count >= self.max_opening_moves:
            self.opening_phase = False
        self.broadcast(line)

    def handle_go(self, line):
        self._analysis_go = self._is_analysis_go(line)

        if not self._analysis_go:
            if self.bot_color is None:
                self.bot_color = "white" if self.is_white_turn else "black"
                print(f"info string Bot playing as {self.bot_color}", file=sys.stderr)

            self._sync_forced_line_state("go")

            if self.forced_line_active and (self.forced_white or self.forced_black):
                next_ply = len(self.current_position)
                forced_move = self._next_forced_move_for_bot(next_ply)
                if forced_move:
                    print(f"info string Playing forced move ply {next_ply}: {forced_move}", file=sys.stderr)
                    self._invalidate_pending_search()
                    self._begin_engine_search()
                    if self._emit_game_bestmove(forced_move, "forced-line"):
                        return
                    print(
                        "info string Forced move rejected, falling back to engine search",
                        file=sys.stderr,
                    )

            if self.opening_phase:
                fb_move = self._pick_fritz_black_fallback_move()
                if fb_move:
                    self._invalidate_pending_search()
                    self._begin_engine_search()
                    if self._emit_game_bestmove(fb_move, "fritz-fallback"):
                        return
                    print(
                        "info string Fritz fallback move rejected, falling back to engine search",
                        file=sys.stderr,
                    )

            if self.opening_phase and (self.white_openings or self.black_openings):
                try:
                    opening_move = self.select_opening_move(self.is_white_turn)
                    if opening_move:
                        print(f"info string Playing opening move: {opening_move}", file=sys.stderr)
                        self._invalidate_pending_search()
                        self._begin_engine_search()
                        if self._emit_game_bestmove(opening_move, "opening"):
                            return
                        print(
                            "info string Opening move rejected, falling back to engine search",
                            file=sys.stderr,
                        )
                except Exception as e:
                    print(f"info string Opening error: {e}", file=sys.stderr)

        do_blunder = False if self._analysis_go else self._should_play_human_blunder_move()
        self._begin_engine_search()

        if self.has_stockfish and "stockfish" in self.backends:
            self.forward_backend = "stockfish"
            if self._analysis_go:
                print("info string Search: Stockfish analysis (MultiPV 1)", file=sys.stderr)
                self._configure_analysis_backend("stockfish")
            else:
                print("info string Search: Stockfish", file=sys.stderr)
                self._configure_search_backend("stockfish", do_blunder)
            self.send_to("stockfish", line)
            self._mark_go_sent()
            return

        if self.use_chessavatar and self.has_chessavatar and "chessavatar" in self.backends:
            self.forward_backend = "chessavatar"
            if self._analysis_go:
                self._ensure_chessavatar_nnue()
                print("info string Search: ChessAvatar analysis (MultiPV 1)", file=sys.stderr)
                self._configure_analysis_backend("chessavatar")
            else:
                self._ensure_chessavatar_nnue()
                print("info string Search: ChessAvatar (Stockfish unavailable)", file=sys.stderr)
                self._configure_search_backend("chessavatar", do_blunder)
            self.send_to("chessavatar", line)
            self._mark_go_sent()
            return

        if not self._analysis_go:
            print("bestmove 0000", flush=True)

    def handle_isready(self):
        if self.use_chessavatar and self.has_chessavatar:
            self._ensure_chessavatar_nnue()
        elif self.backends:
            if not self._wait_for_backend_ready(list(self.backends.keys()), timeout=30):
                print(
                    "info string Warning: backend isready timeout — replying readyok to Fritz anyway",
                    file=sys.stderr,
                )
        print("readyok", flush=True)

    def handle_setoption(self, line):
        if "name Skill Level" in line:
            skill = self.profile.get("skill", 15)
            self.broadcast(f"setoption name Skill Level value {skill}")
        elif "name UCI_LimitStrength" in line:
            self.send_to("stockfish", "setoption name UCI_LimitStrength value true")
        elif "name UCI_Elo" in line:
            elo = self.profile.get("elo", 2000)
            self.send_to("stockfish", f"setoption name UCI_Elo value {elo}")
        else:
            self.broadcast(line)

    def run(self):
        if getattr(sys, "frozen", False) and hasattr(sys.stdout, "reconfigure"):
            try:
                sys.stdout.reconfigure(line_buffering=True, encoding="utf-8", errors="replace")
            except Exception:
                pass

        self.start_engines()

        print("info string AvatarEngine initialized", flush=True)
        print(f"info string Name: {self.name}", flush=True)
        print(f"info string Author: {self.author}", flush=True)
        if self.has_chessavatar and self.has_stockfish:
            if self.use_chessavatar:
                print("info string Backend: Stockfish + ChessAvatar (UseChessAvatar=true)", flush=True)
            else:
                print("info string Backend: Stockfish (ChessAvatar present but disabled)", flush=True)
        elif self.has_chessavatar:
            print("info string Backend: ChessAvatar only", flush=True)
        elif self.has_stockfish:
            print("info string Backend: Stockfish only", flush=True)
        else:
            print("info string Backend: NONE — add ChessAvatar.exe or stockfish.exe", flush=True)

        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            if line == "uci":
                self.handle_uci()
            elif line == "quit":
                self.broadcast("quit")
                sys.exit(0)
            elif line.startswith("position"):
                self.handle_position(line)
            elif line.startswith("go"):
                self.handle_go(line)
            elif line == "ucinewgame":
                self._invalidate_pending_search()
                self.current_position = []
                self.is_white_turn = True
                self._initial_side_white = True
                self.opening_phase = True
                self.bot_color = None
                self.forced_line_active = True
                self.broadcast(line)
            elif line.startswith("setoption"):
                self.handle_setoption(line)
            elif line == "isready":
                self.handle_isready()
            elif line == "stop":
                self._invalidate_pending_search()
            else:
                self.broadcast(line)


if __name__ == "__main__":
    try:
        AvatarEngine().run()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(f"info string FATAL ERROR: {e}", file=sys.stderr)
        sys.exit(1)
