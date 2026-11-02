// ==UserScript==
// @name         BES Portal - Multi Query (Final Masterpiece)
// @namespace    http://tampermonkey.net/
// @version      62.0
// @description  Ultimate combination of Smart FBB toggle and working Orders API - Premium UI + Excel Export
// @match        *://bss.te.eg:12900/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let isSearching = false;
    let stopSearch = false;

    function findSearchContext() {
        let btn = document.querySelector('input[value="Search"], .btn_positive');
        if (btn && btn.offsetParent !== null) return { doc: document, btn: btn };

        const iframes = document.querySelectorAll('iframe');
        for (let iframe of iframes) {
            try {
                let iDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (!iDoc) continue;
                let iBtn = iDoc.querySelector('input[value="Search"], .btn_positive');
                if (!iBtn) {
                    const elements = iDoc.querySelectorAll('button, a, span');
                    for (let el of elements) {
                        if (el.innerText && el.innerText.trim() === 'Search') { iBtn = el; break; }
                    }
                }
                if (iBtn) return { doc: iDoc, btn: iBtn };
            } catch(e) {}
        }
        return null;
    }

    function injectCSS(targetDoc) {
        if (targetDoc.getElementById('multi-query-style')) return;
        const style = targetDoc.createElement('style');
        style.id = 'multi-query-style';
        style.innerHTML = `
            /* ================= OVERLAY ================= */
            #mq-modal-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background:
                    radial-gradient(900px 520px at 50% -25%, rgba(142,68,173,.45), transparent 65%),
                    rgba(15, 23, 42, 0.78);
                -webkit-backdrop-filter: blur(7px);
                backdrop-filter: blur(7px);
                z-index: 999999;
                display: none;
                justify-content: center;
                align-items: center;
                padding: 18px;
                box-sizing: border-box;
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
                animation: mqFadeIn .22s ease both;
            }
            #mq-modal-overlay * { box-sizing: border-box; }

            @keyframes mqFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes mqPopIn  { from { opacity: 0; transform: translateY(16px) scale(.985); } to { opacity: 1; transform: none; } }

            /* ================= BOX ================= */
            #mq-modal-box {
                background: #f8fafc;
                width: 1330px; max-width: 100%;
                max-height: 92vh;
                border-radius: 18px;
                display: flex; flex-direction: column;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,.08);
                box-shadow:
                    0 40px 80px -20px rgba(0,0,0,.55),
                    0 0 0 1px rgba(111,44,145,.15);
                animation: mqPopIn .32s cubic-bezier(.2,.9,.3,1.15) both;
            }

            /* ================= HEADER ================= */
            .mq-header {
                position: relative;
                background: linear-gradient(135deg, #6f2c91 0%, #8e44ad 48%, #4c1d70 100%);
                padding: 16px 22px;
                display: flex; justify-content: space-between; align-items: center;
                overflow: hidden;
                flex: 0 0 auto;
            }
            .mq-header::after {
                content: '';
                position: absolute; inset: 0;
                background:
                    radial-gradient(circle at 88% -30%, rgba(255,255,255,.22), transparent 55%),
                    radial-gradient(circle at 10% 130%, rgba(255,255,255,.12), transparent 50%);
                pointer-events: none;
            }
            .mq-title-group {
                display: flex; flex-direction: column; gap: 3px;
                position: relative; z-index: 2;
            }
            .mq-header h3 {
                margin: 0;
                font-size: 17px; font-weight: 700; letter-spacing: .3px;
                color: #ffffff !important;
                display: flex; align-items: center; gap: 11px;
            }
            .mq-logo {
                display: inline-flex; align-items: center; justify-content: center;
                width: 32px; height: 32px; border-radius: 10px;
                background: rgba(255,255,255,.18);
                border: 1px solid rgba(255,255,255,.28);
                box-shadow: inset 0 1px 0 rgba(255,255,255,.25);
            }
            .mq-logo svg {
                width: 18px; height: 18px;
                stroke: #ffffff;
                stroke-width: 2.5;
                fill: none;
                stroke-linecap: round;
                stroke-linejoin: round;
            }
            .mq-subtitle {
                margin-left: 43px;
                font-size: 11.5px; font-weight: 600; letter-spacing: .55px;
                color: rgba(255,255,255,.72);
                text-transform: uppercase;
            }
            .mq-close-btn {
                position: relative; z-index: 2;
                width: 34px; height: 34px;
                display: inline-flex; align-items: center; justify-content: center;
                background: rgba(255,255,255,.12);
                border: 1px solid rgba(255,255,255,.22);
                border-radius: 10px;
                color: #ffffff !important;
                font-size: 20px; line-height: 1; font-weight: 700;
                cursor: pointer;
                transition: all .2s ease;
            }
            .mq-close-btn:hover {
                background: #ef4444;
                border-color: #ef4444;
                transform: rotate(90deg) scale(1.06);
                box-shadow: 0 8px 18px -8px rgba(239,68,68,.9);
            }

            /* ================= BODY ================= */
            .mq-body {
                flex: 1 1 auto;
                min-height: 0;
                padding: 20px 22px;
                display: flex; flex-direction: column; gap: 16px;
                background: linear-gradient(180deg, #f8fafc 0%, #ffffff 45%);
                overflow-y: auto;
            }

            /* ================= CONTROLS CARD ================= */
            .mq-controls {
                display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
                background: #ffffff;
                border: 1px solid #eee9f7;
                border-radius: 14px;
                padding: 14px 16px;
                box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 12px 26px -22px rgba(111,44,145,.75);
            }

            /* --- Toggle Switch --- */
            .mq-toggle-btn {
                position: relative;
                display: inline-flex; align-items: center;
                padding: 11px 22px 11px 64px;
                min-width: 255px; height: 42px;
                border-radius: 999px;
                font-weight: 700; font-size: 13px; letter-spacing: .25px;
                cursor: pointer; user-select: none;
                color: #ffffff;
                transition: all .28s ease;
                border: 1px solid transparent;
            }
            .mq-toggle-btn::before {
                content: '';
                position: absolute; left: 13px; top: 50%;
                transform: translateY(-50%);
                width: 38px; height: 21px; border-radius: 999px;
                background: rgba(0,0,0,.22);
                box-shadow: inset 0 1px 3px rgba(0,0,0,.28);
                transition: background .28s ease;
            }
            .mq-toggle-btn::after {
                content: '';
                position: absolute; left: 16px; top: 50%;
                transform: translateY(-50%);
                width: 15px; height: 15px; border-radius: 50%;
                background: #ffffff;
                box-shadow: 0 1px 4px rgba(0,0,0,.35);
                transition: left .28s cubic-bezier(.3,1.4,.5,1);
            }
            .mq-toggle-btn.on {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                border-color: #15803d;
                box-shadow: 0 10px 20px -12px rgba(34,197,94,.95);
            }
            .mq-toggle-btn.on::before { background: rgba(255,255,255,.35); }
            .mq-toggle-btn.on::after  { left: 33px; }

            .mq-toggle-btn.off {
                background: linear-gradient(135deg, #f05252, #dc2626);
                border-color: #b91c1c;
                box-shadow: 0 10px 20px -12px rgba(220,38,38,.85);
            }
            .mq-toggle-btn.off::before { background: rgba(0,0,0,.25); }

            .mq-toggle-btn:hover:not(.disabled) { transform: translateY(-1px); filter: brightness(1.05); }
            .mq-toggle-btn.disabled {
                opacity: 0.5; cursor: not-allowed; pointer-events: none;
                filter: grayscale(0.5);
            }

            /* --- Search Type Toggle --- */
            .mq-search-type-toggle {
                display: inline-flex; align-items: center; justify-content: center;
                padding: 11px 22px;
                min-width: 255px; height: 42px;
                border-radius: 999px;
                font-weight: 700; font-size: 13px; letter-spacing: .25px;
                cursor: pointer; user-select: none;
                color: #ffffff;
                transition: all .28s ease;
                border: 1px solid transparent;
            }
            .mq-search-type-toggle.service {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                border-color: #1d4ed8;
                box-shadow: 0 10px 20px -12px rgba(59,130,246,.95);
            }
            .mq-search-type-toggle.serial {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                border-color: #b45309;
                box-shadow: 0 10px 20px -12px rgba(245,158,11,.95);
            }
            .mq-search-type-toggle:hover { transform: translateY(-1px); filter: brightness(1.05); }

            /* ================= TEXTAREA ================= */
            .mq-textarea-wrapper { display: flex; flex-direction: column; gap: 9px; }
            .mq-textarea-wrapper label {
                display: flex; align-items: center; gap: 9px;
                font-weight: 700; color: #4c1d70; font-size: 12.5px;
                letter-spacing: .6px; text-transform: uppercase;
            }
            .mq-textarea-wrapper label::before {
                content: '';
                width: 4px; height: 15px; border-radius: 3px;
                background: linear-gradient(180deg, #a855f7, #6f2c91);
            }
            .mq-textarea {
                width: 100%; min-height: 112px;
                padding: 14px 16px;
                border: 1.5px solid #e6e2f0;
                border-radius: 12px;
                background: #ffffff;
                color: #0f172a;
                font-family: 'Consolas', 'SF Mono', Menlo, monospace;
                font-size: 14px; line-height: 1.65;
                resize: vertical; outline: none;
                box-shadow: inset 0 1px 2px rgba(16,24,40,.04);
                transition: border-color .2s ease, box-shadow .2s ease;
            }
            .mq-textarea::placeholder { color: #c3cbd8; }
            .mq-textarea:focus {
                border-color: #a855f7;
                box-shadow: 0 0 0 4px rgba(168,85,247,.13), inset 0 1px 2px rgba(16,24,40,.04);
            }

            /* ================= ACTIONS ================= */
            .mq-action-area { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

            .mq-btn {
                display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                padding: 11px 24px;
                border: none; border-radius: 10px;
                font-weight: 700; font-size: 13.5px; letter-spacing: .25px;
                color: #fff; cursor: pointer;
                transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
            }
            .mq-btn:active { transform: translateY(1px) scale(.99); }

            .mq-btn-start {
                background: linear-gradient(135deg, #22c55e, #16a34a);
                box-shadow: 0 10px 22px -12px rgba(34,197,94,.95);
            }
            .mq-btn-start:hover {
                transform: translateY(-2px);
                filter: brightness(1.06);
                box-shadow: 0 16px 28px -12px rgba(34,197,94,.95);
            }
            .mq-btn-start:disabled {
                background: #d1fae5; color: #6ee7b7;
                cursor: not-allowed; transform: none; box-shadow: none;
            }

            .mq-btn-stop {
                background: linear-gradient(135deg, #f05252, #dc2626);
                box-shadow: 0 10px 22px -12px rgba(220,38,38,.9);
                display: none;
            }
            .mq-btn-stop:hover {
                transform: translateY(-2px);
                filter: brightness(1.06);
                box-shadow: 0 16px 28px -12px rgba(220,38,38,.9);
            }

            .mq-btn-sec {
                background: #ffffff;
                color: #5b21b6 !important;
                border: 1px solid #e3daf5;
                padding: 8px 16px;
                font-size: 12px;
                box-shadow: 0 1px 2px rgba(16,24,40,.05);
            }
            .mq-btn-sec:hover {
                background: #f6f2fd;
                border-color: #c9b8ea;
                transform: translateY(-1px);
            }

            /* ✅ Export button */
            .mq-btn-export {
                background: linear-gradient(135deg, #10b981, #059669);
                color: #ffffff !important;
                border: 1px solid #047857;
                padding: 8px 18px;
                font-size: 12px;
                box-shadow: 0 4px 14px -6px rgba(16,185,129,.8);
            }
            .mq-btn-export:hover {
                transform: translateY(-1px);
                filter: brightness(1.06);
                box-shadow: 0 10px 20px -8px rgba(16,185,129,.95);
            }

            /* ================= STATUS CHIP ================= */
            .mq-status-box {
                display: inline-flex; align-items: center; gap: 8px;
                padding: 10px 18px;
                border-radius: 999px;
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                color: #334155;
                font-size: 12.5px; font-weight: 700; letter-spacing: .2px;
                min-height: 40px;
            }

            /* ================= TABLE CONTROLS ================= */
            .mq-table-controls {
                display: none; gap: 10px;
                justify-content: flex-end;
                margin-bottom: -4px;
            }

            /* ================= RESULTS TABLE ================= */
            .mq-results-wrapper {
                overflow: auto;
                border: 1px solid #eae4f5;
                border-radius: 14px;
                max-height: 420px;
                background: #ffffff;
                box-shadow: 0 1px 2px rgba(16,24,40,.04);
            }
            .mq-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                font-size: 13px;
                text-align: left;
                white-space: nowrap;
            }
            .mq-table thead th {
                position: sticky; top: 0; z-index: 10;
                background: linear-gradient(135deg, #6f2c91 0%, #8e44ad 100%) !important;
                color: #ffffff !important;
                padding: 13px 12px;
                font-weight: 700; font-size: 11.5px;
                letter-spacing: .6px; text-transform: uppercase;
                border-bottom: 1px solid rgba(255,255,255,.16);
            }
            .mq-table thead th.mq-orders-th {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
            }
            .mq-table tbody td {
                padding: 11px 12px;
                color: #334155;
                border-bottom: 1px solid #f2eef9;
                vertical-align: middle;
            }
            .mq-table tbody tr:last-child td { border-bottom: none; }
            .mq-table tbody tr:nth-child(even) td { background: #fbfaff; }
            .mq-table tbody tr:hover td { background: #f7f2ff; }

            .mq-toggle-cell {
                font-weight: 700; color: #6f2c91;
                white-space: nowrap;
            }
            .mq-toggle-content {
                display: inline-flex; align-items: center; gap: 8px;
            }
            .mq-arrow {
                display: inline-block;
                width: 15px; text-align: center;
                font-size: 10px; color: #a855f7;
                transition: transform .28s cubic-bezier(.3,1.4,.5,1);
            }
            .mq-arrow.expanded { transform: rotate(90deg); }

            .mq-parent-row { cursor: pointer; }
            .mq-child-row td {
                background: #fcfbfe !important;
                border-bottom: 1px dashed #ede6f8;
            }
            .mq-child-arrow-cell {
                color: #b9a5e0; font-style: italic;
                text-align: right; padding-right: 14px;
            }

            .mq-status-error {
                color: #dc2626 !important;
                font-weight: 700; text-align: center;
            }
            .om-loading {
                display: inline-block;
                color: #d97706; font-style: italic; font-size: 11.5px;
                animation: omPulse 1.2s ease-in-out infinite;
            }
            @keyframes omPulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
            .om-success { color: #2563eb !important; font-weight: 700; }

            /* ================= FOOTER ================= */
            .mq-footer {
                flex: 0 0 auto;
                display: flex; align-items: center; justify-content: center; gap: 14px;
                padding: 11px 22px;
                background: linear-gradient(135deg, #faf8ff 0%, #f3edfb 100%);
                border-top: 1px solid #ece5f7;
                font-size: 12px; font-weight: 700;
                letter-spacing: .8px;
                color: #6f2c91;
                text-transform: uppercase;
            }
            .mq-footer .mq-footer-line {
                display: block; height: 1px; width: 60px;
                background: linear-gradient(90deg, transparent, #c9b8ea);
            }
            .mq-footer .mq-footer-line:last-child {
                background: linear-gradient(90deg, #c9b8ea, transparent);
            }

            /* ================= SCROLLBARS ================= */
            #mq-modal-box ::-webkit-scrollbar { width: 10px; height: 10px; }
            #mq-modal-box ::-webkit-scrollbar-track { background: transparent; }
            #mq-modal-box ::-webkit-scrollbar-thumb {
                background: #d6cbe9; border-radius: 10px;
                border: 2px solid transparent; background-clip: padding-box;
            }
            #mq-modal-box ::-webkit-scrollbar-thumb:hover {
                background: #a855f7; background-clip: padding-box;
            }
        `;
        targetDoc.head.appendChild(style);
    }

    function exportToExcel(targetDoc) {
        const resultsBody = targetDoc.getElementById('mq-results-body');
        const table = resultsBody ? resultsBody.closest('.mq-table') : null;
        if (!resultsBody || !table) return;

        const rows = resultsBody.querySelectorAll('tr');
        if (rows.length === 0) {
            alert('No data to export. Please run a search first.');
            return;
        }

        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());

        const esc = (s) => String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        let html = '';
        html += '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        html += '<head><meta charset="utf-8">';
        html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        html += '<x:Name>BES Multi Query</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>';
        html += '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
        html += '<style>td,th{mso-number-format:"\\@";} th{background:#6f2c91;color:#ffffff;font-weight:bold;}</style>';
        html += '</head><body>';
        html += '<table border="1" cellspacing="0" cellpadding="4">';

        html += '<thead><tr>';
        headers.forEach(h => {
            html += '<th style="background:#6f2c91;color:#ffffff;font-weight:bold;padding:8px 10px;text-align:left;border:1px solid #5a2276;">' + esc(h) + '</th>';
        });
        html += '</tr></thead><tbody>';

        rows.forEach(tr => {
            const cells = tr.querySelectorAll('td');
            html += '<tr>';
            let cellCount = 0;
            cells.forEach(td => {
                const colspan = parseInt(td.getAttribute('colspan') || '1', 10);
                let text = td.innerText.trim();
                if (cellCount === 0) {
                    text = text.replace(/^[▶↳]\s*/, '').trim();
                }
                html += '<td style="padding:6px 10px;border:1px solid #e2e8f0;vertical-align:top;mso-number-format:\\@;">' + esc(text) + '</td>';
                cellCount++;
                for (let k = 1; k < colspan; k++) {
                    html += '<td style="border:1px solid #e2e8f0;"></td>';
                    cellCount++;
                }
            });
            while (cellCount < headers.length) {
                html += '<td style="border:1px solid #e2e8f0;"></td>';
                cellCount++;
            }
            html += '</tr>';
        });

        html += '</tbody></table></body></html>';

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const filename = `BES_Multi_Query_${stamp}.xls`;

        const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = targetDoc.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        targetDoc.body.appendChild(link);
        link.click();

        setTimeout(() => {
            try { targetDoc.body.removeChild(link); } catch(e) {}
            URL.revokeObjectURL(url);
        }, 800);
    }

    function createUI(targetDoc, searchBtn) {
        injectCSS(targetDoc);

        const mqBtn = targetDoc.createElement('button');
        mqBtn.id = 'mq-main-trigger-btn';
        mqBtn.innerText = 'Multi Query';
        mqBtn.className = 'mq-btn mq-btn-start';
        mqBtn.style.cssText = [
            'margin-left:10px',
            'background:linear-gradient(135deg,#8e44ad,#6f2c91 60%,#5b2178)',
            'color:#fff',
            'border:none',
            'border-radius:8px',
            'height:32px',
            'padding:0 18px',
            'font-weight:700',
            'font-size:13px',
            'letter-spacing:.3px',
            'cursor:pointer',
            'box-shadow:0 8px 18px -10px rgba(111,44,145,.95)',
            'transition:all .2s ease'
        ].join(';');
        searchBtn.parentNode.insertBefore(mqBtn, searchBtn.nextSibling);

        const modal = targetDoc.createElement('div');
        modal.id = 'mq-modal-overlay';
        modal.innerHTML = `
            <div id="mq-modal-box">

                <div class="mq-header">
                    <div class="mq-title-group">
                        <h3>
                            <span class="mq-logo">
                                <svg viewBox="0 0 24 24">
                                    <circle cx="10.5" cy="10.5" r="7.5"></circle>
                                    <line x1="21" y1="21" x2="15.8" y2="15.8"></line>
                                    <path d="M10.5 7v7M7 10.5h7"></path>
                                </svg>
                            </span>
                            BES Multi Query Portal
                        </h3>
                        <span class="mq-subtitle">Batch Search · FBB Support · Live Order Tracking</span>
                    </div>
                    <button class="mq-close-btn" title="Close">&times;</button>
                </div>

                <div class="mq-body">

                    <div class="mq-controls">
                        <div id="mq-search-type-toggle" class="mq-search-type-toggle service">
                            Searching by: Service Number
                        </div>
                        <div id="mq-fbb-toggle" class="mq-toggle-btn off">
                            Is FBB Subscriber (OFF)
                        </div>
                    </div>

                    <div class="mq-textarea-wrapper">
                        <label>Input Numbers (One per line)</label>
                        <textarea id="mq-input-numbers" class="mq-textarea" placeholder="502381623&#10;FBB502381624"></textarea>
                    </div>

                    <div class="mq-action-area">
                        <button id="mq-start-btn" class="mq-btn mq-btn-start">Start Multi Query</button>
                        <button id="mq-stop-btn" class="mq-btn mq-btn-stop">Stop Search</button>
                        <div id="mq-status-text" class="mq-status-box">Ready...</div>
                    </div>

                    <div class="mq-table-controls" id="mq-table-controls">
                        <button id="mq-export-btn" class="mq-btn mq-btn-export">📊 Export to Excel</button>
                        <button id="mq-expand-all" class="mq-btn mq-btn-sec">Expand All</button>
                        <button id="mq-collapse-all" class="mq-btn mq-btn-sec">Collapse All</button>
                    </div>

                    <div class="mq-results-wrapper" id="mq-results-container" style="display: none;">
                        <table class="mq-table">
                            <thead>
                                <tr>
                                    <th>Input</th><th>Offer Name</th><th>Serial Number</th><th>Service Number</th>
                                    <th class="mq-orders-th">Orders (Last Activity)</th>
                                    <th>Operation</th><th>Operation Time</th><th>Financial Status</th>
                                    <th>Operator Account</th><th>Operator OU</th><th>Customer ID</th>
                                    <th>Convergent FV</th>
                                </tr>
                            </thead>
                            <tbody id="mq-results-body"></tbody>
                        </table>
                    </div>

                </div>

                <div class="mq-footer">
                    <span class="mq-footer-line"></span>
                    Developed By : Anas Wael @2026
                    <span class="mq-footer-line"></span>
                </div>

            </div>
        `;
        targetDoc.body.appendChild(modal);

        const searchTypeToggle = targetDoc.getElementById('mq-search-type-toggle');
        const customToggleBtn = targetDoc.getElementById('mq-fbb-toggle');
        const resultsBody = targetDoc.getElementById('mq-results-body');
        const tableControls = targetDoc.getElementById('mq-table-controls');

        let isFbbState = false;
        let currentSearchType = 'service'; // 'service' or 'serial'

        function updateToggleUI() {
            if (isFbbState) {
                customToggleBtn.className = 'mq-toggle-btn on';
                customToggleBtn.innerText = 'Is FBB Subscriber (ON)';
            } else {
                customToggleBtn.className = 'mq-toggle-btn off';
                customToggleBtn.innerText = 'Is FBB Subscriber (OFF)';
            }
        }

        customToggleBtn.onclick = () => {
            if (currentSearchType === 'serial') return; // Guard
            isFbbState = !isFbbState;
            updateToggleUI();
        };

        searchTypeToggle.onclick = () => {
            if (currentSearchType === 'service') {
                currentSearchType = 'serial';
                searchTypeToggle.className = 'mq-search-type-toggle serial';
                searchTypeToggle.innerText = 'Searching by: Serial Number';

                // Force FBB OFF and disable
                isFbbState = false;
                updateToggleUI();
                customToggleBtn.classList.add('disabled');

            } else {
                currentSearchType = 'service';
                searchTypeToggle.className = 'mq-search-type-toggle service';
                searchTypeToggle.innerText = 'Searching by: Service Number';

                // Enable FBB
                customToggleBtn.classList.remove('disabled');
            }
        };

        mqBtn.onclick = () => {
            modal.style.display = 'flex';
            targetDoc.getElementById('mq-results-container').style.display = 'none';
            tableControls.style.display = 'none';
            targetDoc.getElementById('mq-status-text').innerText = 'Ready...';
        };

        modal.querySelector('.mq-close-btn').onclick = () => {
            if(isSearching && !confirm("Search is running. Are you sure you want to close?")) return;
            if(isSearching) stopSearch = true;
            modal.style.display = 'none';
        };

        resultsBody.addEventListener('click', function(e) {
            const parentRow = e.target.closest('.mq-parent-row');
            if (!parentRow) return;
            const num = parentRow.getAttribute('data-num');
            const childRows = resultsBody.querySelectorAll(`.mq-child-row[data-parent="${num}"]`);
            if (childRows.length === 0) return;
            const arrow = parentRow.querySelector('.mq-arrow');
            const isHidden = childRows[0].style.display === 'none' || childRows[0].style.display === '';
            childRows.forEach(r => r.style.display = isHidden ? 'table-row' : 'none');
            if(isHidden) arrow.classList.add('expanded'); else arrow.classList.remove('expanded');
        });

        targetDoc.getElementById('mq-expand-all').onclick = () => {
            resultsBody.querySelectorAll('.mq-child-row').forEach(r => r.style.display = 'table-row');
            resultsBody.querySelectorAll('.mq-arrow').forEach(a => a.classList.add('expanded'));
        };

        targetDoc.getElementById('mq-collapse-all').onclick = () => {
            resultsBody.querySelectorAll('.mq-child-row').forEach(r => r.style.display = 'none');
            resultsBody.querySelectorAll('.mq-arrow').forEach(a => a.classList.remove('expanded'));
        };

        targetDoc.getElementById('mq-export-btn').onclick = () => exportToExcel(targetDoc);

        targetDoc.getElementById('mq-start-btn').onclick = () => startMultiQuery(targetDoc, searchBtn, tableControls, () => isFbbState, () => currentSearchType);
        targetDoc.getElementById('mq-stop-btn').onclick = () => {
            stopSearch = true;
            targetDoc.getElementById('mq-status-text').innerHTML = '<span style="color: #dc3545;">Stopping...</span>';
        };
    }

    async function startMultiQuery(targetDoc, originalSearchBtn, tableControls, getFbbState, getSearchType) {
        if (isSearching) return;

        const inputArea = targetDoc.getElementById('mq-input-numbers').value;
        const isFbb = getFbbState();
        const currentSearchType = getSearchType();
        const startBtn = targetDoc.getElementById('mq-start-btn');
        const stopBtn = targetDoc.getElementById('mq-stop-btn');
        const statusText = targetDoc.getElementById('mq-status-text');
        const resultsBody = targetDoc.getElementById('mq-results-body');
        const resultsContainer = targetDoc.getElementById('mq-results-container');

        const numbers = inputArea.split('\n').map(n => n.replace(/-/g, '').trim()).filter(n => n !== '');
        if (numbers.length === 0) return alert('Please enter valid numbers.');

        isSearching = true; stopSearch = false;
        startBtn.style.display = 'none'; stopBtn.style.display = 'inline-block';
        resultsBody.innerHTML = ''; resultsContainer.style.display = 'block'; tableControls.style.display = 'none';

        // جلب خانات الإدخال بدقة
        const getInputFields = () => {
            let serialInput = null, serviceInput = null;
            const elements = Array.from(targetDoc.querySelectorAll('label, span, td, div, th'));
            for (let el of elements) {
                if (el.children.length === 0 && el.innerText) {
                    let txt = el.innerText.trim();
                    if (txt === 'Serial Number') {
                        let next = el.nextElementSibling;
                        if (next && next.tagName === 'INPUT' && next.type === 'text') serialInput = next;
                        else if (el.parentElement) serialInput = el.parentElement.querySelector('input[type="text"]');
                    }
                    if (txt === 'Service Number') {
                        let next = el.nextElementSibling;
                        if (next && next.tagName === 'INPUT' && next.type === 'text') serviceInput = next;
                        else if (el.parentElement) serviceInput = el.parentElement.querySelector('input[type="text"]');
                    }
                }
            }
            // خطة بديلة لو ملقاش الـ Labels
            if (!serialInput || !serviceInput) {
                const pageInputs = Array.from(targetDoc.querySelectorAll('input[type="text"]')).filter(i => i.offsetParent !== null && !i.closest('#mq-modal-overlay'));
                if (pageInputs.length >= 2) {
                    if (!serialInput) serialInput = pageInputs[0];
                    if (!serviceInput) serviceInput = pageInputs[1];
                } else if (pageInputs.length === 1) {
                    if (!serialInput) serialInput = pageInputs[0];
                    if (!serviceInput) serviceInput = pageInputs[0];
                }
            }
            return { serialInput, serviceInput };
        };

        const { serialInput, serviceInput } = getInputFields();
        let inputField = currentSearchType === 'serial' ? serialInput : serviceInput;

        if (!inputField) {
            alert('Input field not found!'); isSearching = false; startBtn.style.display = 'inline-block'; stopBtn.style.display = 'none'; return;
        }

        const checkboxes = Array.from(targetDoc.querySelectorAll('input[type="checkbox"]'));
        let pageFbbCheckbox = checkboxes.find(cb => cb.offsetParent !== null && (cb.parentElement.innerText.includes('FBB') || (cb.nextElementSibling && cb.nextElementSibling.innerText.includes('FBB')))) || checkboxes.find(cb => cb.offsetParent !== null);

        if (currentSearchType === 'service' && pageFbbCheckbox && pageFbbCheckbox.checked !== isFbb) {
            pageFbbCheckbox.click();
            await new Promise(r => setTimeout(r, 300));
        }

        for (let i = 0; i < numbers.length; i++) {
            if (stopSearch) break;

            let rawNum = numbers[i];
            let finalSearchNum = rawNum;

            if (currentSearchType === 'service') {
                if (isFbb) {
                    if (!finalSearchNum.toUpperCase().startsWith('FBB')) {
                        finalSearchNum = 'FBB' + finalSearchNum;
                    }
                } else {
                    if (finalSearchNum.toUpperCase().startsWith('FBB')) {
                        finalSearchNum = finalSearchNum.substring(3);
                    }
                }
            } else {
                if (finalSearchNum.toUpperCase().startsWith('FBB')) {
                    finalSearchNum = finalSearchNum.substring(3);
                }
            }

            statusText.innerHTML = `Searching (${i + 1}/${numbers.length}): <span style="color:#6f2c91;">${finalSearchNum}</span>`;

            let loadingRow = targetDoc.createElement('tr');
            loadingRow.innerHTML = `<td style="font-weight:bold; color:#6f2c91;">${finalSearchNum}</td><td colspan="11" style="color: #d97706; font-weight: bold;">Fetching data...</td>`;
            resultsBody.appendChild(loadingRow);
            loadingRow.scrollIntoView({ behavior: 'smooth', block: 'end' });

            try {
                // تفريغ الخانتين لضمان عدم تداخل البيانات
                if (serialInput) serialInput.value = '';
                if (serviceInput) serviceInput.value = '';

                inputField.focus();
                inputField.value = finalSearchNum;

                const win = targetDoc.defaultView || window;
                const eventInput = win.document.createEvent('HTMLEvents');
                eventInput.initEvent('input', true, true);
                inputField.dispatchEvent(eventInput);

                const eventChange = win.document.createEvent('HTMLEvents');
                eventChange.initEvent('change', true, true);
                inputField.dispatchEvent(eventChange);

                await new Promise(r => setTimeout(r, 300));
                if (stopSearch) break;

                originalSearchBtn.click();

                let foundData = false; let waitTime = 0; let extractedItems = [];

                while (waitTime < 8000) {
                    if (stopSearch) break;
                    await new Promise(resolve => setTimeout(resolve, 500));
                    waitTime += 500;
                    if (targetDoc.body.innerText.includes('No record is found')) break;

                    const dataRows = Array.from(targetDoc.querySelectorAll('.ngRow, table tbody tr'))
                        .filter(tr => !tr.closest('.mq-table') && !tr.closest('#mq-modal-box'));

                    if (dataRows.length === 0) continue;

                    await new Promise(resolve => setTimeout(resolve, 1000));

                    let tempExtracted = [];
                    dataRows.forEach(tr => {
                        const text = tr.innerText.trim();
                        if (text === '' || (text.includes('Serial Number') && text.includes('Service Number')) || text.includes('No record')) return;
                        const cells = tr.querySelectorAll('td, .ngCell');
                        if (cells.length >= 9) {
                            const getVal = (idx) => cells[idx] ? cells[idx].innerText.trim() : '-';
                            const serial = getVal(0); const service = getVal(2);
                            if (serial === '-' && service === '-') return;
                            const opTime = getVal(4);
                            let timeVal = 0;
                            try { const parts = opTime.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/); if (parts) timeVal = new Date(parts[3], parts[2]-1, parts[1], parts[4], parts[5], parts[6]).getTime(); } catch(e) {}
                            tempExtracted.push({ num: finalSearchNum, serial, op: getVal(1), service, conv: getVal(3), timeStr: opTime, timeVal, fin: getVal(5), offer: getVal(6), acc: getVal(7), ou: getVal(8), cust: getVal(9) });
                        }
                    });

                    if (tempExtracted.length > 0) {
                        const seen = new Set();
                        tempExtracted.forEach(item => {
                            const key = `${item.serial}|${item.service}|${item.timeStr}|${item.offer}`;
                            if (!seen.has(key)) { seen.add(key); extractedItems.push(item); }
                        });
                        foundData = true; break;
                    }
                }

                if (stopSearch) break;

                if (foundData && extractedItems.length > 0) {
                    const grouped = {};
                    extractedItems.forEach(r => { if (!grouped[r.num]) grouped[r.num] = []; grouped[r.num].push(r); });
                    let finalHTML = '';
                    for (const key in grouped) {
                        const devices = grouped[key];
                        devices.sort((a, b) => b.timeVal - a.timeVal);
                        const latestDevice = devices[0]; const olderDevices = devices.slice(1);
                        const hasOlder = olderDevices.length > 0;
                        const rowClass = hasOlder ? 'mq-parent-row' : ''; const arrowHtml = hasOlder ? '<span class="mq-arrow">▶</span>' : '';

                        finalHTML += `<tr class="${rowClass}" data-num="${key}"><td class="mq-toggle-cell"><div class="mq-toggle-content">${arrowHtml} ${latestDevice.num}</div></td><td style="font-weight:bold; color:#1e293b;">${latestDevice.offer}</td><td>${latestDevice.serial}</td><td>${latestDevice.service}</td><td class="orders-cell" data-service="${key}"><span class="om-loading">Fetching Order...</span></td><td>${latestDevice.op}</td><td>${latestDevice.timeStr}</td><td>${latestDevice.fin}</td><td>${latestDevice.acc}</td><td>${latestDevice.ou}</td><td>${latestDevice.cust}</td><td>${latestDevice.conv}</td></tr>`;

                        olderDevices.forEach(d => {
                            finalHTML += `<tr class="mq-child-row" data-parent="${key}" style="display: none;"><td class="mq-child-arrow-cell">↳</td><td style="color:#64748b;">${d.offer}</td><td style="color:#64748b;">${d.serial}</td><td style="color:#64748b;">${d.service}</td><td style="color:#64748b;">-</td><td style="color:#64748b;">${d.op}</td><td style="color:#64748b;">${d.timeStr}</td><td style="color:#64748b;">${d.fin}</td><td style="color:#64748b;">${d.acc}</td><td style="color:#64748b;">${d.ou}</td><td style="color:#64748b;">${d.cust}</td><td style="color:#64748b;">${d.conv}</td></tr>`;
                        });
                    }
                    loadingRow.insertAdjacentHTML('afterend', finalHTML);
                    loadingRow.remove();

                    const orderCells = resultsBody.querySelectorAll('.orders-cell');
                    orderCells.forEach(cell => {
                        if (cell.innerHTML.includes('Fetching Order...')) {
                            const serviceKey = cell.getAttribute('data-service');
                            queryBESOrderSystem(serviceKey, cell);
                        }
                    });

                } else {
                    loadingRow.innerHTML = `<td style="font-weight:bold; color:#6f2c91;">${finalSearchNum}</td><td colspan="11" class="mq-status-error">No Record Found in BES</td>`;
                }
            } catch (err) {
                loadingRow.innerHTML = `<td style="font-weight:bold; color:#6f2c91;">${finalSearchNum}</td><td colspan="11" class="mq-status-error">Error: ${err.message}</td>`;
            }
        }

        isSearching = false; startBtn.style.display = 'inline-block'; stopBtn.style.display = 'none';
        if (!stopSearch) {
            statusText.innerHTML = '<span style="color: #16a34a;">✔ All queries completed!</span>';
        } else {
            statusText.innerHTML = '<span style="color: #dc2626;">Search Stopped by User.</span>';
        }
        if (resultsBody.querySelectorAll('tr').length > 0) {
            tableControls.style.display = 'flex';
        }
    }

    function queryBESOrderSystem(serviceNum, cellElement) {
        let uToken = "";
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let c = cookies[i].trim();
            if (c.startsWith("u-token=")) {
                uToken = c.substring(8);
                break;
            }
        }

        if (!uToken) {
            cellElement.innerHTML = `<span style="color:#dc3545; font-size:11px;">No Token</span>`;
            return;
        }

        const endTime = Date.now();
        const beginTime = endTime - (365 * 24 * 60 * 60 * 1000);

        const queryOrderPayload = JSON.stringify({
            model: null,
            params: {
                req: {
                    isShowHis: "N",
                    orderType: "",
                    partyRoleType: "C",
                    serviceNumer: serviceNum,
                    orderId: "",
                    orderStatus: "",
                    channel: "",
                    beginTime: beginTime,
                    endTime: endTime,
                    totalRowNum: 0,
                    beginRowNum: 0,
                    fetchRowNum: 10,
                    businessCode: "",
                    idType: "",
                    idNumber: ""
                }
            }
        });

        GM_xmlhttpRequest({
            method: "POST",
            url: "https://bss.te.eg:12900/oc/u-route/cancelorderoperservice/queryOrderCtz",
            headers: {
                "Content-Type": "application/ueefire",
                "u-token": uToken,
                "X-Requested-With": "XMLHttpRequest"
            },
            data: queryOrderPayload,
            onload: function(res1) {
                try {
                    let json1 = JSON.parse(res1.responseText);
                    if (!json1.orders || json1.orders.length === 0) {
                        cellElement.innerHTML = `<span style="color:#64748b;">No Orders</span>`;
                        return;
                    }

                    let latestOrder = json1.orders[0];
                    let orderId = latestOrder.orderId;

                    if (!latestOrder.orderLineList || latestOrder.orderLineList.length === 0) {
                        cellElement.innerHTML = `<span style="color:#2563eb;">${latestOrder.orderStatusName}</span>`;
                        return;
                    }

                    let orderLineId = latestOrder.orderLineList[0].orderLineId;

                    const ossPayload = JSON.stringify({
                        model: null,
                        params: {
                            req: {
                                orderId: orderId,
                                orderLineList: [orderLineId]
                            }
                        }
                    });

                    GM_xmlhttpRequest({
                        method: "POST",
                        url: "https://bss.te.eg:12900/oc/u-route/queryomsorder/ossqueryorder",
                        headers: {
                            "Content-Type": "application/ueefire",
                            "u-token": uToken,
                            "X-Requested-With": "XMLHttpRequest"
                        },
                        data: ossPayload,
                        onload: function(res2) {
                            try {
                                let json2 = JSON.parse(res2.responseText);
                                if (json2.ossQueryOrderList && json2.ossQueryOrderList.length > 0) {
                                    let orderInfo = json2.ossQueryOrderList[0];
                                    if (orderInfo.activityInfoList && orderInfo.activityInfoList.length > 0) {
                                        let activities = orderInfo.activityInfoList;
                                        let lastActivity = activities[activities.length - 1].activityName;

                                        if (activities[activities.length - 1].status === "Executing") {
                                            cellElement.innerHTML = `<span style="color:#d97706; font-weight:bold;">${lastActivity} (Executing)</span>`;
                                        } else {
                                            cellElement.innerHTML = `<span class="om-success">${lastActivity}</span>`;
                                        }
                                    } else {
                                        cellElement.innerHTML = `<span style="color:#2563eb;">${orderInfo.orderStatus}</span>`;
                                    }
                                } else {
                                    cellElement.innerHTML = `<span style="color:#2563eb;">${latestOrder.orderStatusName}</span>`;
                                }
                            } catch(e) {
                                cellElement.innerHTML = `<span style="color:#dc3545; font-size:11px;">Parse Err 2</span>`;
                            }
                        },
                        onerror: function() {
                            cellElement.innerHTML = `<span style="color:#dc3545; font-size:11px;">API Err 2</span>`;
                        }
                    });

                } catch(e) {
                    cellElement.innerHTML = `<span style="color:#dc3545; font-size:11px;">Parse Err 1</span>`;
                }
            },
            onerror: function() {
                cellElement.innerHTML = `<span style="color:#dc3545; font-size:11px;">API Err 1</span>`;
            }
        });
    }

    function init() {
        const context = findSearchContext();
        if (context && !context.doc.getElementById('mq-modal-overlay')) {
            createUI(context.doc, context.btn);
        }
    }

    window.addEventListener('load', () => setTimeout(init, 1000));
    setInterval(init, 3000);
})();
