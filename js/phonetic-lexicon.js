/**
 * Build IPA + 中文谐音 from window.SHOWCARD_WORDS, with optional
 * window.SHOW_CARD_LINE_META overrides for exact combo lines.
 */
(function (global) {
    function normalizeShowCardKey(text) {
        if (!text) return '';
        let s = String(text).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        s = s.replace(/^["'「『]|["'」』]$/g, '').trim();
        return s.toLowerCase().replace(/[""''`]/g, "'").replace(/\s*,\s*/g, ', ');
    }

    function normalizeApostrophe(s) {
        return String(s).replace(/\u2019/g, "'");
    }

    /**
     * @returns {{type:'w', raw:string, key:string}|{type:'p', raw:string}[]}
     */
    function tokenizeShowCard(t) {
        const text = normalizeApostrophe(t);
        const tokens = [];
        let i = 0;
        const n = text.length;
        while (i < n) {
            if (/\s/.test(text[i])) {
                i++;
                continue;
            }
            if (text[i] === '[') {
                const j = text.indexOf(']', i);
                if (j === -1) {
                    tokens.push({ type: 'p', raw: text[i] });
                    i++;
                    continue;
                }
                const raw = text.slice(i, j + 1);
                tokens.push({ type: 'w', raw: raw, key: raw.toLowerCase() });
                i = j + 1;
                continue;
            }
            const rest = text.slice(i);
            const dm = rest.match(/^([0-9]+)/);
            if (dm) {
                tokens.push({ type: 'w', raw: dm[1], key: dm[1] });
                i += dm[1].length;
                continue;
            }
            const wm = rest.match(/^([A-Za-z]+(?:['-][A-Za-z]+)*)/);
            if (wm) {
                const raw = wm[1];
                tokens.push({ type: 'w', raw: raw, key: raw.toLowerCase() });
                i += raw.length;
                continue;
            }
            tokens.push({ type: 'p', raw: text[i] });
            i++;
        }
        return tokens;
    }

    /** Prefer first variant when lexicon uses "a / b" (multiple readings). */
    function primaryIpa(s) {
        const t = String(s).trim();
        const i = t.indexOf(' / ');
        return i === -1 ? t : t.slice(0, i).trim();
    }
    function primaryHomophone(s) {
        const t = String(s).trim();
        if (t.indexOf('/') === -1) return t;
        return t.split(/\s*\/\s*/)[0].trim();
    }

    function buildShowCardPhoneticsFromTokens(eng) {
        const W = global.SHOWCARD_WORDS || {};
        const tokens = tokenizeShowCard(eng);
        const ipaParts = [];
        let homoOut = '';
        let prevWasWord = false;
        for (let k = 0; k < tokens.length; k++) {
            const tk = tokens[k];
            if (tk.type === 'p') {
                homoOut += tk.raw;
                prevWasWord = false;
                continue;
            }
            const ent = W[tk.key];
            if (!ent) {
                if (prevWasWord) homoOut += ' ';
                homoOut += tk.raw;
                ipaParts.push(tk.raw);
                prevWasWord = true;
                continue;
            }
            if (prevWasWord) homoOut += ' ';
            homoOut += primaryHomophone(ent.homophone);
            ipaParts.push(primaryIpa(ent.ipa));
            prevWasWord = true;
        }
        const ipa = '/' + ipaParts.join(' ').replace(/\s+/g, ' ').trim() + '/';
        return { ipa: ipa, homophone: homoOut.trim() };
    }

    function lookupShowCardMeta(eng) {
        const k = normalizeShowCardKey(eng);
        const meta = global.SHOW_CARD_LINE_META;
        if (meta && meta[k]) return meta[k];
        const noDot = k.replace(/\.$/, '');
        if (meta && meta[noDot]) return meta[noDot];
        return buildShowCardPhoneticsFromTokens(eng);
    }

    global.normalizeShowCardKey = normalizeShowCardKey;
    global.lookupShowCardMeta = lookupShowCardMeta;
    global.buildShowCardPhoneticsFromTokens = buildShowCardPhoneticsFromTokens;
})(typeof window !== 'undefined' ? window : this);
