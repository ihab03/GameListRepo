/**
 * Hyper Arena - Performance Analytics Chart Engine
 * 
 * Lightweight vanilla HTML5 Canvas 2D engine (zero dependencies).
 * Tabular figures, devicePixelRatio high-DPI scaling, and frosted glass aesthetic.
 */

'use strict';

import { apiGet } from '../core/api-client.js';

let chartData = [];
let currentDays = 30;
let currentMetric = 'highest_score'; // 'highest_score' | 'average_score' | 'total_submissions'
let currentGame = 'all';
let hoveredIndex = -1;

const metricLabels = {
    highest_score: 'Highest Score',
    average_score: 'Average Score',
    total_submissions: 'Total Submissions',
};

/**
 * Determines whether dark mode is active.
 * @returns {boolean}
 */
function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
}

/**
 * Formats large numbers compactly for axis labels (e.g. 10k, 1.5M).
 * @param {number} value
 * @returns {string}
 */
function formatCompactNumber(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return value.toString();
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into short notation (e.g. Oct 25).
 * @param {string} dateStr
 * @returns {string}
 */
function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return (months[monthIdx] || parts[1]) + ' ' + day;
}

/**
 * Resizes canvas buffer to match physical pixels on high-DPI displays.
 */
function resizeCanvas(canvas, ctx) {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(300, Math.floor(rect.width));
    const displayHeight = 240;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
}

/**
 * Renders the glassmorphic chart onto the canvas.
 */
export function drawChart() {
    const canvas = document.getElementById('scoreChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width));
    const height = 240;

    ctx.clearRect(0, 0, width, height);

    const dark = isDarkMode();
    const textColor = dark ? '#9ca3af' : '#64748b';
    const gridColor = dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const accentColor = dark ? '#6366f1' : '#2563eb';
    const accentGlow = dark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(37, 99, 235, 0.3)';

    if (!chartData || chartData.length === 0) {
        ctx.fillStyle = textColor;
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No score activity recorded for this period.', width / 2, height / 2);
        return;
    }

    const padding = {
        top: 20,
        right: 20,
        bottom: 35,
        left: 50,
    };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = chartData.map((d) => d[currentMetric] || 0);
    let maxVal = Math.max(...values);
    let minVal = 0;

    if (maxVal === 0) {
        maxVal = 10;
    } else {
        maxVal = Math.ceil(maxVal * 1.12);
    }

    const gridSteps = 4;
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridSteps; i++) {
        const yVal = minVal + (maxVal - minVal) * (i / gridSteps);
        const yPos = padding.top + chartHeight - (i / gridSteps) * chartHeight;

        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.moveTo(padding.left, yPos);
        ctx.lineTo(width - padding.right, yPos);
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.fillText(formatCompactNumber(Math.round(yVal)), padding.left - 8, yPos);
    }

    const points = [];
    const n = chartData.length;

    for (let i = 0; i < n; i++) {
        const xPos = n === 1
            ? padding.left + chartWidth / 2
            : padding.left + (i / (n - 1)) * chartWidth;
        const val = chartData[i][currentMetric] || 0;
        const yPos = padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;

        points.push({
            x: xPos,
            y: yPos,
            raw: chartData[i],
        });
    }

    if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];
            const cx = (curr.x + next.x) / 2;
            ctx.bezierCurveTo(cx, curr.y, cx, next.y, next.x, next.y);
        }

        ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
        ctx.lineTo(points[0].x, padding.top + chartHeight);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
        gradient.addColorStop(0, dark ? 'rgba(99, 102, 241, 0.28)' : 'rgba(37, 99, 235, 0.18)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    ctx.beginPath();
    if (points.length === 1) {
        ctx.arc(points[0].x, points[0].y, 3.5, 0, Math.PI * 2);
    } else {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];
            const cx = (curr.x + next.x) / 2;
            ctx.bezierCurveTo(cx, curr.y, cx, next.y, next.x, next.y);
        }
    }
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const maxLabels = Math.min(8, n);
    const step = Math.max(1, Math.floor(n / maxLabels));

    for (let i = 0; i < n; i += step) {
        const pt = points[i];
        ctx.fillText(formatShortDate(pt.raw.date_point), pt.x, padding.top + chartHeight + 8);
    }
    if ((n - 1) % step !== 0 && n > 1) {
        const lastPt = points[n - 1];
        ctx.fillText(formatShortDate(lastPt.raw.date_point), lastPt.x, padding.top + chartHeight + 8);
    }

    points.forEach((pt, index) => {
        const isHovered = index === hoveredIndex;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHovered ? 5.5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#ffffff' : accentColor;
        ctx.fill();
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.strokeStyle = dark ? '#0b0f19' : '#ffffff';
        ctx.stroke();

        if (isHovered) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 8.5, 0, Math.PI * 2);
            ctx.strokeStyle = accentGlow;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });

    if (hoveredIndex >= 0 && hoveredIndex < points.length) {
        const pt = points[hoveredIndex];

        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.moveTo(pt.x, padding.top);
        ctx.lineTo(pt.x, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        drawTooltip(ctx, pt, width, height, dark);
    }
}

/**
 * Draws tooltip on Canvas.
 */
function drawTooltip(ctx, pt, canvasWidth, canvasHeight, dark) {
    const item = pt.raw;
    const dateStr = item.date_point;
    const metricName = metricLabels[currentMetric] || currentMetric;
    const valFormatted = Number(item[currentMetric] || 0).toLocaleString();
    const subsFormatted = (item.total_submissions || 1) + ' match' + (item.total_submissions === 1 ? '' : 'es');

    const line1 = dateStr;
    const line2 = `${metricName}: ${valFormatted}`;
    const line3 = subsFormatted;

    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    const w1 = ctx.measureText(line1).width;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    const w2 = ctx.measureText(line2).width;
    const w3 = ctx.measureText(line3).width;

    const tipWidth = Math.max(w1, w2, w3) + 24;
    const tipHeight = 64;

    let tipX = pt.x + 12;
    let tipY = pt.y - tipHeight / 2;

    if (tipX + tipWidth > canvasWidth - 10) {
        tipX = pt.x - tipWidth - 12;
    }
    if (tipY < 8) tipY = 8;
    if (tipY + tipHeight > canvasHeight - 8) tipY = canvasHeight - tipHeight - 8;

    ctx.fillStyle = dark ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, tipX, tipY, tipWidth, tipHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = dark ? '#f9fafb' : '#0f172a';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(line1, tipX + 10, tipY + 8);

    ctx.fillStyle = dark ? '#38bdf8' : '#2563eb';
    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(line2, tipX + 10, tipY + 25);

    ctx.fillStyle = dark ? '#9ca3af' : '#64748b';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText(line3, tipX + 10, tipY + 43);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Fetches chart aggregated data from the REST API.
 * @param {string} [game]
 * @param {number} [days]
 * @param {string} [metric]
 * @returns {Promise<void>}
 */
export async function loadScoreChart(game, days, metric) {
    if (game !== undefined) currentGame = game;
    if (days !== undefined) currentDays = days;
    if (metric !== undefined) currentMetric = metric;

    const statusEl = document.getElementById('chartStatus');
    const canvas = document.getElementById('scoreChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (statusEl) {
        statusEl.textContent = 'Updating analytics...';
    }

    try {
        const params = new URLSearchParams({
            game: currentGame || 'all',
            days: currentDays.toString(),
        });

        const res = await apiGet(`api/get-chart-data.php?${params.toString()}`);
        if (res.ok && res.data?.status === 'success' && Array.isArray(res.data.data)) {
            chartData = res.data.data;
        } else {
            chartData = [];
        }

        hoveredIndex = -1;
        resizeCanvas(canvas, ctx);
        drawChart();

        if (statusEl) {
            const totalPoints = chartData.length;
            statusEl.textContent = `${totalPoints} daily snapshot${totalPoints === 1 ? '' : 's'} recorded`;
        }
    } catch (err) {
        chartData = [];
        resizeCanvas(canvas, ctx);
        drawChart();
        if (statusEl) {
            statusEl.textContent = 'Analytics temporarily unavailable';
        }
    }
}

/**
 * Re-renders chart canvas with current theme palette.
 */
export function refreshScoreChartTheme() {
    drawChart();
}

/**
 * Initializes canvas events, metric selector, and day filter buttons.
 */
export function initChartView() {
    const canvas = document.getElementById('scoreChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.addEventListener('mousemove', (e) => {
        if (!chartData || chartData.length === 0) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const width = rect.width;
        const padding = { left: 50, right: 20 };
        const chartWidth = width - padding.left - padding.right;
        const n = chartData.length;

        let closestIndex = -1;
        let minDistance = 9999;

        for (let i = 0; i < n; i++) {
            const ptX = n === 1
                ? padding.left + chartWidth / 2
                : padding.left + (i / (n - 1)) * chartWidth;
            const dist = Math.abs(mouseX - ptX);
            if (dist < minDistance) {
                minDistance = dist;
                closestIndex = i;
            }
        }

        const maxHoverDistance = Math.max(28, (chartWidth / n) * 0.85);
        if (minDistance <= maxHoverDistance) {
            if (hoveredIndex !== closestIndex) {
                hoveredIndex = closestIndex;
                drawChart();
            }
        } else if (hoveredIndex !== -1) {
            hoveredIndex = -1;
            drawChart();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (hoveredIndex !== -1) {
            hoveredIndex = -1;
            drawChart();
        }
    });

    window.addEventListener('resize', () => {
        resizeCanvas(canvas, ctx);
        drawChart();
    });

    document.querySelectorAll('.chart-days-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-days-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const days = parseInt(btn.dataset.days, 10) || 30;
            loadScoreChart(currentGame, days, currentMetric);
        });
    });

    const metricSelect = document.getElementById('chartMetricSelect');
    if (metricSelect) {
        metricSelect.addEventListener('change', () => {
            const metric = metricSelect.value;
            loadScoreChart(currentGame, currentDays, metric);
        });
    }

    // Attach to window for external/legacy compatibility
    window.loadScoreChart = loadScoreChart;
    window.refreshScoreChartTheme = refreshScoreChartTheme;

    resizeCanvas(canvas, ctx);
    loadScoreChart(currentGame, currentDays, currentMetric);
}

