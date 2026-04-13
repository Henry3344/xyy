/**
 * 大字卡 overlay：音标 + 谐音（可折叠）+ 原文 + 中文
 */
(function (global) {
    function injectShowCardDOM() {
        if (document.getElementById('showCardOverlay')) return;
        const d = document.createElement('div');
        d.id = 'showCardOverlay';
        d.className = 'show-card-overlay';
        d.onclick = closeShowCard;
        d.innerHTML =
            '<div class="show-card-inner" onclick="event.stopPropagation()">' +
            '  <div class="show-card-ipa-block">' +
            '    <div class="show-card-ipa-label">（推荐参照）音标</div>' +
            '    <div class="show-card-phonetic" id="showCardIpa"></div>' +
            '  </div>' +
            '  <div class="show-card-text" id="showCardEng"></div>' +
            '  <button type="button" class="show-card-homophone-toggle" id="showCardHomophoneToggle">中文谐音（点击展开）</button>' +
            '  <div class="show-card-homophone-wrap" id="showCardHomophoneWrap">' +
            '    <div class="show-card-homo-label">（辅助参照）</div>' +
            '    <div class="show-card-homophone" id="showCardHomophone"></div>' +
            '  </div>' +
            '  <div class="show-card-sub" id="showCardCn"></div>' +
            '</div>' +
            '<div class="show-card-hint">点击空白处关闭</div>';
        document.body.appendChild(d);
        document.getElementById('showCardHomophoneToggle').onclick = function (ev) {
            ev.stopPropagation();
            const w = document.getElementById('showCardHomophoneWrap');
            const btn = document.getElementById('showCardHomophoneToggle');
            const open = !w.classList.contains('visible');
            w.classList.toggle('visible', open);
            btn.textContent = open ? '收起中文谐音' : '中文谐音（点击展开）';
        };
    }

    function openShowCard(e, c) {
        const meta = global.lookupShowCardMeta(e);
        document.getElementById('showCardIpa').textContent = meta.ipa;
        document.getElementById('showCardHomophone').textContent = meta.homophone;
        document.getElementById('showCardEng').innerText = e;
        document.getElementById('showCardCn').innerText = c;
        const w = document.getElementById('showCardHomophoneWrap');
        const btn = document.getElementById('showCardHomophoneToggle');
        w.classList.remove('visible');
        btn.textContent = '中文谐音（点击展开）';
        document.getElementById('showCardOverlay').style.display = 'flex';
    }

    function closeShowCard() {
        const o = document.getElementById('showCardOverlay');
        if (o) o.style.display = 'none';
        const w = document.getElementById('showCardHomophoneWrap');
        const btn = document.getElementById('showCardHomophoneToggle');
        if (w) w.classList.remove('visible');
        if (btn) btn.textContent = '中文谐音（点击展开）';
    }

    global.injectShowCardDOM = injectShowCardDOM;
    global.openShowCard = openShowCard;
    global.closeShowCard = closeShowCard;
})(typeof window !== 'undefined' ? window : this);
