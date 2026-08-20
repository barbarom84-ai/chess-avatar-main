/// <reference lib="webworker" />
import init, { WasmEngine } from './chessavatar_wasm.js';
let engine = null;
let nnueLoaded = false;
let chain = Promise.resolve();
function enqueue(task) {
    chain = chain
        .then(async () => {
        await task();
    })
        .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        self.postMessage(`error ${msg}`);
    });
}
async function ensureEngine() {
    if (!engine) {
        await init();
        engine = new WasmEngine();
    }
    return engine;
}
async function loadNnueIntoEngine(eng, bytes) {
    if (nnueLoaded) {
        self.postMessage('nnue-ready');
        return;
    }
    self.postMessage('nnue-loading');
    try {
        eng.load_nnue_bytes(bytes);
        nnueLoaded = true;
        self.postMessage('nnue-ready');
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        self.postMessage(`error ${msg}`);
        self.postMessage('nnue-failed');
    }
}
self.onmessage = (ev) => {
    const data = ev.data;
    if (typeof data === 'object' && data !== null && data.type === 'load-nnue') {
        enqueue(async () => {
            const eng = await ensureEngine();
            await loadNnueIntoEngine(eng, new Uint8Array(data.buffer));
        });
        return;
    }
    if (typeof data !== 'string')
        return;
    const line = data.trim();
    if (!line)
        return;
    enqueue(async () => {
        if (line === 'uci') {
            const eng = await ensureEngine();
            self.postMessage(eng.uci());
            return;
        }
        const eng = await ensureEngine();
        if (line === 'isready') {
            self.postMessage(eng.is_ready());
            return;
        }
        if (line.startsWith('load-nnue ')) {
            const url = line.slice('load-nnue '.length).trim();
            if (url && !nnueLoaded) {
                const resp = await fetch(url);
                if (!resp.ok) {
                    self.postMessage(`error NNUE fetch failed: ${resp.status}`);
                    self.postMessage('nnue-failed');
                    return;
                }
                await loadNnueIntoEngine(eng, new Uint8Array(await resp.arrayBuffer()));
            }
            else if (nnueLoaded) {
                self.postMessage('nnue-ready');
            }
            return;
        }
        if (line.startsWith('position ')) {
            handlePosition(eng, line);
            return;
        }
        if (line.startsWith('go ')) {
            handleGo(eng, line);
            return;
        }
        if (line === 'stop') {
            eng.stop();
            return;
        }
        if (line.startsWith('setoption name Skill Level value ')) {
            const level = Number(line.split(' ').pop());
            eng.set_skill_level(level);
            return;
        }
        if (line.startsWith('setoption name Hash value ')) {
            const mb = Number(line.split(' ').pop());
            eng.set_hash_mb(mb);
            return;
        }
        if (line.startsWith('setoption name MultiPV value ')) {
            const n = Number(line.split(' ').pop());
            eng.set_multipv(n);
            return;
        }
    });
};
function handlePosition(eng, line) {
    const rest = line.slice('position '.length);
    let fen = 'startpos';
    let moves = [];
    if (rest.startsWith('startpos')) {
        const idx = rest.indexOf(' moves ');
        if (idx >= 0)
            moves = rest.slice(idx + 7).split(/\s+/).filter(Boolean);
    }
    else if (rest.startsWith('fen ')) {
        const idx = rest.indexOf(' moves ');
        if (idx >= 0) {
            fen = rest.slice(4, idx);
            moves = rest.slice(idx + 7).split(/\s+/).filter(Boolean);
        }
        else {
            fen = rest.slice(4);
        }
    }
    const movesJson = JSON.stringify(moves);
    try {
        eng.position(fen === 'startpos' ? '' : fen, movesJson);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        self.postMessage(`error ${msg}`);
    }
}
function handleGo(eng, line) {
    const parts = line.split(/\s+/);
    let maxDepth = 16;
    let movetime = 1000;
    for (let i = 1; i < parts.length; i++) {
        if (parts[i] === 'depth') {
            maxDepth = Number(parts[++i]);
        }
        else if (parts[i] === 'movetime') {
            movetime = Number(parts[++i]);
        }
    }
    maxDepth = Math.min(22, Math.max(4, maxDepth));
    movetime = Math.min(30_000, Math.max(200, movetime));
    const result = eng.go_search(maxDepth, movetime);
    for (const part of result.split('\n')) {
        const trimmed = part.trim();
        if (trimmed)
            self.postMessage(trimmed);
    }
}
