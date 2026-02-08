#!/usr/bin/env python3
"""
AvatarEngine.py - UCI Chess Engine Wrapper with Opening Book Support
Wraps Stockfish with persona-based configuration, custom name/author, and opening repertoire

Features:
- Loads profile.json and engine.ini for configuration
- Plays from opening repertoire for first 10-15 moves
- Transitions to Stockfish engine after opening phase
- Custom UCI name and author display

Requirements: Python 3.7+, no external dependencies needed
"""

import sys
import os
import json
import subprocess
import threading
import configparser
import random
from pathlib import Path


class AvatarEngine:
    def __init__(self):
        # Determiner le dossier de travail (important pour .exe)
        if getattr(sys, 'frozen', False):
            # Si compile en .exe avec PyInstaller
            self.script_dir = Path(sys.executable).parent
        else:
            # Si execute comme script Python
            self.script_dir = Path(__file__).parent
        
        self.engine_path = self.find_stockfish()
        self.config = self.load_engine_config()
        self.profile = self.load_profile()
        self.engine_process = None
        self.uci_options = []
        self.waiting_for_uciok = False
        
        # Nom et auteur depuis engine.ini ou profile.json
        self.name = self.config.get('name', self.profile.get('name', 'Avatar Engine'))
        self.author = self.config.get('author', self.profile.get('username', 'Chess Avatar'))
        
        # Ligne forcée : forcedLineWhite + forcedLineBlack (intercalés) ou legacy forcedLine
        self.forced_line = self._build_forced_line()
        
        # Répertoire d'ouvertures
        self.opening_repertoire = self.profile.get('openingRepertoire', {})
        self.white_openings = self.opening_repertoire.get('whiteOpenings', [])
        self.black_openings = self.opening_repertoire.get('blackOpenings', [])
        
        # 🆕 État du jeu
        self.current_position = []  # Liste des coups UCI joués
        self.is_white_turn = True
        self.opening_phase = True  # True si encore dans l'ouverture
        self.max_opening_moves = 15  # Nombre max de coups pour l'ouverture
        
        # 🆕 Pour la ligne forcée : next ply = len(current_position) ; abandon si l'adversaire dévie
        self.bot_color = None  # 'white' ou 'black'
        self.forced_line_active = True  # False si l'adversaire a joué autre chose que la ligne
    
    def _normalize_uci(self, uci):
        """Normalise un coup UCI (minuscules) pour comparaisons."""
        if not uci or not isinstance(uci, str):
            return ''
        s = uci.strip().lower()
        return s[:4] + (s[4] if len(s) > 4 else '')
    
    def _build_forced_line(self):
        """Construit la séquence UCI alternée à partir de forcedLineWhite/Black ou forcedLine (legacy).
        Normalise en minuscules pour robustesse (GUI peut envoyer e2e4 ou E2E4)."""
        white = self.profile.get('forcedLineWhite') or []
        black = self.profile.get('forcedLineBlack') or []
        if white or black:
            out = []
            n = max(len(white), len(black))
            for i in range(n):
                if i < len(white):
                    out.append(self._normalize_uci(white[i]))
                if i < len(black):
                    out.append(self._normalize_uci(black[i]))
            return out
        legacy = self.profile.get('forcedLine') or []
        if isinstance(legacy, list):
            return [self._normalize_uci(m) for m in legacy]
        return []
        
    def find_stockfish(self):
        """Find any stockfish*.exe in the current directory"""
        # Chercher n'importe quel fichier qui commence par "stockfish"
        stockfish_files = list(self.script_dir.glob('stockfish*.exe'))
        
        if stockfish_files:
            # Utiliser le premier trouve
            stockfish_path = str(stockfish_files[0])
            print(f"info string Using Stockfish: {stockfish_files[0].name}", file=sys.stderr)
            return stockfish_path
        
        # Fallback: chercher des noms classiques
        possible_names = ['stockfish.exe', 'stockfish', 'stockfish_x64.exe']
        for name in possible_names:
            path = self.script_dir / name
            if path.exists():
                return str(path)
        
        # Dernier recours: essayer dans le PATH systeme
        print("info string Warning: No Stockfish found locally, trying system PATH", file=sys.stderr)
        return 'stockfish'
    
    def load_engine_config(self):
        """Load engine.ini configuration"""
        config_path = self.script_dir / 'engine.ini'
        
        config_dict = {}
        
        if config_path.exists():
            try:
                config = configparser.ConfigParser()
                config.read(config_path, encoding='utf-8')
                
                if 'Engine' in config:
                    config_dict['name'] = config['Engine'].get('Name', '')
                    config_dict['author'] = config['Engine'].get('Author', '')
                    config_dict['stockfish_path'] = config['Engine'].get('StockfishPath', '')
                
                print(f"info string Engine config loaded: {config_dict.get('name', 'N/A')}", file=sys.stderr)
            except Exception as e:
                print(f"info string Error loading engine.ini: {e}", file=sys.stderr)
        else:
            print("info string Warning: engine.ini not found, using defaults", file=sys.stderr)
        
        return config_dict
    
    def load_profile(self):
        """Load profile configuration from any .json file"""
        # Priorite 1: profile.json (nom standard)
        profile_path = self.script_dir / 'profile.json'
        
        # Priorite 2: n'importe quel *.profile.json
        if not profile_path.exists():
            profile_files = list(self.script_dir.glob('*.profile.json'))
            if profile_files:
                profile_path = profile_files[0]
        
        # Priorite 3: n'importe quel .json (sauf engine.ini ou fichiers systeme)
        if not profile_path.exists():
            json_files = [f for f in self.script_dir.glob('*.json') if f.name not in ['engine.json', 'package.json']]
            if json_files:
                profile_path = json_files[0]
        
        if not profile_path.exists():
            print("info string Warning: No JSON profile found, using defaults", file=sys.stderr)
            return {
                'name': 'Avatar Engine',
                'username': 'Chess Avatar',
                'skill': 15,
                'depth': 16,
                'elo': 2000
            }
        
        try:
            with open(profile_path, 'r', encoding='utf-8') as f:
                profile = json.load(f)
                print(f"info string Profile loaded: {profile_path.name}", file=sys.stderr)
                return profile
        except Exception as e:
            print(f"info string Error loading profile: {e}", file=sys.stderr)
            return {
                'name': 'Avatar Engine',
                'username': 'Chess Avatar',
                'skill': 15,
                'depth': 16,
                'elo': 2000
            }
    
    def select_opening_move(self, is_white):
        """Sélectionne un coup d'ouverture selon le répertoire et les poids"""
        openings_list = self.white_openings if is_white else self.black_openings
        
        if not openings_list:
            return None
        
        # Charger la base d'ouvertures depuis profile.json (si présente)
        openings_db = self.profile.get('openingsDatabase', [])
        if not openings_db:
            return None
        
        # Filtrer les ouvertures compatibles avec la position actuelle
        compatible_openings = []
        for opening_ref in openings_list:
            opening_id = opening_ref.get('id')
            weight = opening_ref.get('weight', 50)
            
            # Trouver l'ouverture dans la DB
            opening_data = next((o for o in openings_db if o.get('id') == opening_id), None)
            if not opening_data:
                continue
            
            uci_moves = opening_data.get('uciMoves', [])
            
            # Vérifier si cette ouverture correspond à la position actuelle
            if self.matches_opening(uci_moves):
                # Obtenir le prochain coup de l'ouverture
                next_move_index = len(self.current_position)
                if next_move_index < len(uci_moves):
                    next_move = uci_moves[next_move_index]
                    compatible_openings.append({
                        'move': next_move,
                        'weight': weight,
                        'name': opening_data.get('name', 'Unknown')
                    })
        
        if not compatible_openings:
            return None
        
        # Sélection pondérée
        total_weight = sum(o['weight'] for o in compatible_openings)
        random_value = random.uniform(0, total_weight)
        
        current_sum = 0
        for opening in compatible_openings:
            current_sum += opening['weight']
            if random_value <= current_sum:
                print(f"info string Opening: {opening['name']} -> {opening['move']}", file=sys.stderr)
                return opening['move']
        
        return compatible_openings[0]['move']
    
    def matches_opening(self, opening_moves):
        """Vérifie si les coups joués correspondent au début d'une ouverture"""
        if len(self.current_position) > len(opening_moves):
            return False
        
        for i, move in enumerate(self.current_position):
            if i >= len(opening_moves) or move != opening_moves[i]:
                return False
        
        return True
    
    def start_engine(self):
        """Start Stockfish process"""
        try:
            print(f"info string Starting Stockfish: {self.engine_path}", file=sys.stderr)
            
            self.engine_process = subprocess.Popen(
                [self.engine_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            # Start thread to read engine output
            self.output_thread = threading.Thread(target=self.read_engine_output, daemon=True)
            self.output_thread.start()
            
            print(f"info string Stockfish started successfully", file=sys.stderr)
            
        except Exception as e:
            print(f"info string FATAL: Error starting Stockfish: {e}", file=sys.stderr)
            print(f"info string Engine path tried: {self.engine_path}", file=sys.stderr)
            sys.exit(1)
    
    def read_engine_output(self):
        """Read and forward engine output, with special handling for UCI"""
        if not self.engine_process:
            return
            
        for line in self.engine_process.stdout:
            line = line.strip()
            if not line:
                continue
            
            if self.waiting_for_uciok:
                # Mode UCI: collecter les options et filtrer les identifiants de Stockfish
                if line.startswith('id name') or line.startswith('id author'):
                    # Ignorer les identifiants de Stockfish
                    continue
                elif line.startswith('option'):
                    # Collecter les options
                    self.uci_options.append(line)
                elif line == 'uciok':
                    # Fin de la reponse UCI: envoyer tout dans le bon ordre
                    # 1. Nos identifiants personnalises
                    print(f"id name {self.name}", flush=True)
                    print(f"id author {self.author}", flush=True)
                    
                    # 2. Toutes les options de Stockfish
                    for option in self.uci_options:
                        print(option, flush=True)
                    
                    # 3. uciok
                    print("uciok", flush=True)
                    
                    # Reinitialiser
                    self.waiting_for_uciok = False
                    self.uci_options = []
                else:
                    # Autres lignes pendant UCI (info, etc.)
                    self.uci_options.append(line)
            else:
                # Mode normal: forward tout directement
                print(line, flush=True)
    
    def send_to_engine(self, command):
        """Send command to Stockfish"""
        if self.engine_process and self.engine_process.stdin:
            self.engine_process.stdin.write(command + '\n')
            self.engine_process.stdin.flush()
    
    def handle_uci(self):
        """Handle UCI identification with custom name and author"""
        # Activer le mode UCI pour bufferiser les reponses
        self.waiting_for_uciok = True
        self.uci_options = []
        
        # Envoyer UCI a Stockfish
        # Le thread va collecter les reponses et les renvoyer dans le bon ordre
        self.send_to_engine('uci')
    
    def handle_position(self, line):
        """Gère la commande 'position' pour tracker les coups"""
        # Exemples:
        # position startpos moves e2e4 e7e5
        # position fen ... moves ...
        
        self.current_position = []
        self.is_white_turn = True
        
        if 'startpos' in line:
            # Position initiale
            if 'moves' in line:
                moves_part = line.split('moves')[1].strip()
                if moves_part:
                    self.current_position = moves_part.split()
                    print(f"info string Position: startpos with {len(self.current_position)} moves", file=sys.stderr)
        elif 'fen' in line:
            # Position FEN personnalisée
            if 'moves' in line:
                moves_part = line.split('moves')[1].strip()
                if moves_part:
                    self.current_position = moves_part.split()
            
            # Déterminer à qui le trait depuis le FEN
            fen_parts = line.split('fen')[1].split('moves')[0].strip().split()
            if len(fen_parts) > 1:
                self.is_white_turn = (fen_parts[1] == 'w')
        
        # Déterminer à qui le trait après les coups
        move_count = len(self.current_position)
        self.is_white_turn = (move_count % 2 == 0)
        
        # Abandonner la ligne forcée si l'adversaire a dévié (comparaison UCI normalisée)
        if self.forced_line and move_count <= len(self.forced_line):
            expected_prefix = [self._normalize_uci(m) for m in self.forced_line[:move_count]]
            actual = [self._normalize_uci(m) for m in self.current_position]
            if actual != expected_prefix:
                self.forced_line_active = False
                print("info string Forced line abandoned: opponent deviated from line", file=sys.stderr)
        
        # Sortir de la phase d'ouverture si trop de coups
        if move_count >= self.max_opening_moves:
            self.opening_phase = False
            print(f"info string Exiting opening phase at move {move_count}", file=sys.stderr)
        
        print(f"info string Turn: {'White' if self.is_white_turn else 'Black'}, Opening phase: {self.opening_phase}", file=sys.stderr)
        
        # Forward à Stockfish
        self.send_to_engine(line)
    
    def handle_go(self, line):
        """Gère la commande 'go' - chercher le meilleur coup"""
        
        # Déterminer la couleur du bot au premier appel
        if self.bot_color is None:
            self.bot_color = 'white' if self.is_white_turn else 'black'
            print(f"info string Bot playing as {self.bot_color}", file=sys.stderr)
        
        # PRIORITÉ 1 (ABSOLUE): Ligne forcée — jouée à tout prix si pas de déviation
        if self.forced_line_active and self.forced_line and len(self.current_position) < len(self.forced_line):
            next_index = len(self.current_position)
            forced_move = self.forced_line[next_index]
            print(f"info string Playing forced move {next_index + 1}/{len(self.forced_line)}: {forced_move}", file=sys.stderr)
            print(f"bestmove {forced_move}", flush=True)
            return
        
        # PRIORITÉ 2: Répertoire d'ouvertures
        if self.opening_phase and (self.white_openings or self.black_openings):
            try:
                opening_move = self.select_opening_move(self.is_white_turn)
                if opening_move:
                    print(f"info string Playing opening move: {opening_move}", file=sys.stderr)
                    print(f"bestmove {opening_move}", flush=True)
                    return
                else:
                    print(f"info string No opening move found, using Stockfish", file=sys.stderr)
            except Exception as e:
                print(f"info string Opening selection error: {e}, fallback to Stockfish", file=sys.stderr)
        
        # PRIORITÉ 3: Stockfish
        print(f"info string Forwarding to Stockfish: {line}", file=sys.stderr)
        self.send_to_engine(line)
    
    def handle_setoption(self, line):
        """Handle setoption commands with profile overrides"""
        # Apply profile-based configurations
        if 'name Skill Level' in line:
            skill = self.profile.get('skill', 15)
            self.send_to_engine(f'setoption name Skill Level value {skill}')
        elif 'name UCI_LimitStrength' in line:
            self.send_to_engine('setoption name UCI_LimitStrength value true')
        elif 'name UCI_Elo' in line:
            elo = self.profile.get('elo', 2000)
            self.send_to_engine(f'setoption name UCI_Elo value {elo}')
        else:
            # Forward other options
            self.send_to_engine(line)
    
    def run(self):
        """Main UCI loop"""
        self.start_engine()
        
        print(f"info string AvatarEngine initialized", flush=True)
        print(f"info string Name: {self.name}", flush=True)
        print(f"info string Author: {self.author}", flush=True)
        
        # 🆕 Afficher info sur la ligne forcée
        if self.forced_line:
            print(f"info string Forced line: {len(self.forced_line)} moves configured", flush=True)
            print(f"info string Forced moves: {' '.join(self.forced_line[:5])}{'...' if len(self.forced_line) > 5 else ''}", flush=True)
        
        # 🆕 Afficher info sur les ouvertures
        if self.white_openings:
            print(f"info string White openings: {len(self.white_openings)} loaded", flush=True)
        if self.black_openings:
            print(f"info string Black openings: {len(self.black_openings)} loaded", flush=True)
        
        for line in sys.stdin:
            line = line.strip()
            
            if not line:
                continue
            
            if line == 'uci':
                self.handle_uci()
            elif line == 'quit':
                self.send_to_engine('quit')
                if self.engine_process:
                    self.engine_process.wait()
                sys.exit(0)
            elif line.startswith('position'):
                self.handle_position(line)
            elif line.startswith('go'):
                self.handle_go(line)
            elif line == 'ucinewgame':
                # Nouvelle partie - réinitialiser l'état
                self.current_position = []
                self.is_white_turn = True
                self.opening_phase = True
                self.bot_color = None
                self.forced_line_active = True  # 🆕 Réactiver la ligne forcée
                self.send_to_engine(line)
            elif line.startswith('setoption'):
                self.handle_setoption(line)
            else:
                # Forward all other commands
                self.send_to_engine(line)


if __name__ == '__main__':
    try:
        engine = AvatarEngine()
        engine.run()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(f"info string FATAL ERROR: {e}", file=sys.stderr)
        sys.exit(1)
