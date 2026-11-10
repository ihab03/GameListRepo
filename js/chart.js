/**
 * Scores Over Time Chart Controller
 * Lightweight vanilla HTML5 Canvas 2D visualization (zero external dependencies).
 */

(function () {
    'use strict';

    let chartData = [];
    let currentDays = 30;
    let currentMetric = 'highest_score'; // 'highest_score' | 'average_score' | 'total_submissions'
    let currentGame = 'all';
    let hoveredIndex = -1;

    const canvas = document.getElementById('scoreChart');
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext('2d');

    const metricLabels = {
        highest_score: 'Highest Score',
        average_score: 'Average Score',
        total_submissions: 'Total Submissions',
    };

    /**
     * Determines if dark mode is currently active on the root document.
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
     * Formats an ISO date string (YYYY-MM-DD) into a short display format (e.g. Oct 25).
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
     * Adjusts canvas resolution for high-DPI (Retina) screens.
     */
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.max(300, Math.floor(rect.width));
        const displayHeight = 260;

        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
    }

    /**
     * Draws the entire chart onto the canvas.
     */
    function drawChart() {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(300, Math.floor(rect.width));
        const height = 260;

        ctx.clearRect(0, 0, width, height);

        const dark = isDarkMode();
        const textColor = dark ? '#94a3b8' : '#64748b';
        const gridColor = dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
        const accentColor = '#6366f1';
        const accentGlow = 'rgba(99, 102, 241, 0.35)';

        // Empty state check
        if (!chartData || chartData.length === 0) {
            ctx.fillStyle = textColor;
            ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No score activity recorded for this period.', width / 2, height / 2);
            return;
        }

        const padding = {
            top: 25,
            right: 25,
            bottom: 40,
            left: 55,
        };

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Calculate min & max values
        const values = chartData.map((d) => d[currentMetric] || 0);
        let maxVal = Math.max(...values);
        let minVal = 0; // Baseline at zero

        if (maxVal === 0) {
            maxVal = 10;
        } else {
            // Add 12% headroom
            maxVal = Math.ceil(maxVal * 1.12);
        }

        // Draw horizontal grid lines & Y-axis labels
        const gridSteps = 4;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= gridSteps; i++) {
            const yVal = minVal + (maxVal - minVal) * (i / gridSteps);
            const yPos = padding.top + chartHeight - (i / gridSteps) * chartHeight;

            // Grid line
            ctx.beginPath();
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.moveTo(padding.left, yPos);
            ctx.lineTo(width - padding.right, yPos);
            ctx.stroke();

            // Y-axis label
            ctx.fillStyle = textColor;
            ctx.fillText(formatCompactNumber(Math.round(yVal)), padding.left - 10, yPos);
        }

        // Calculate X & Y coordinates for points
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

        // Draw area gradient fill under line
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
            gradient.addColorStop(0, dark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.25)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Draw line connecting points
        ctx.beginPath();
        if (points.length === 1) {
            ctx.arc(points[0].x, points[0].y, 4, 0, Math.PI * 2);
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
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw X-axis date labels
        ctx.fillStyle = textColor;
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Select a sensible number of X labels to avoid overcrowding
        const maxLabels = Math.min(8, n);
        const step = Math.max(1, Math.floor(n / maxLabels));

        for (let i = 0; i < n; i += step) {
            const pt = points[i];
            const dateLabel = formatShortDate(pt.raw.date_point);
            ctx.fillText(dateLabel, pt.x, padding.top + chartHeight + 10);
        }
        // Always draw the last point date if not drawn
        if ((n - 1) % step !== 0 && n > 1) {
            const lastPt = points[n - 1];
            ctx.fillText(formatShortDate(lastPt.raw.date_point), lastPt.x, padding.top + chartHeight + 10);
        }

        // Draw dots at data points
        points.forEach((pt, index) => {
            const isHovered = index === hoveredIndex;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isHovered ? 6 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = isHovered ? '#ffffff' : accentColor;
            ctx.fill();
            ctx.lineWidth = isHovered ? 3 : 1.5;
            ctx.strokeStyle = dark ? '#0b0f19' : '#ffffff';
            ctx.stroke();

            if (isHovered) {
                // Outer glow ring
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
                ctx.strokeStyle = accentGlow;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        // If hovered, draw vertical guide line and tooltip
        if (hoveredIndex >= 0 && hoveredIndex < points.length) {
            const pt = points[hoveredIndex];

            // Vertical indicator
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
            ctx.lineWidth = 1;
            ctx.moveTo(pt.x, padding.top);
            ctx.lineTo(pt.x, padding.top + chartHeight);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw floating tooltip
            drawTooltip(pt, width, height, dark);
        }
    }

    /**
     * Draws a styled tooltip for the hovered data point.
     */
    function drawTooltip(pt, canvasWidth, canvasHeight, dark) {
        const item = pt.raw;
        const dateStr = item.date_point;
        const metricName = metricLabels[currentMetric] || currentMetric;
        const valFormatted = Number(item[currentMetric] || 0).toLocaleString();
        const subsFormatted = (item.total_submissions || 1) + ' submission' + (item.total_submissions === 1 ? '' : 's');

        const line1 = dateStr;
        const line2 = `${metricName}: ${valFormatted}`;
        const line3 = subsFormatted;

        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const w1 = ctx.measureText(line1).width;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const w2 = ctx.measureText(line2).width;
        const w3 = ctx.measureText(line3).width;

        const tipWidth = Math.max(w1, w2, w3) + 24;
        const tipHeight = 68;

        let tipX = pt.x + 12;
        let tipY = pt.y - tipHeight / 2;

        // Flip to left if overflowing right edge
        if (tipX + tipWidth > canvasWidth - 10) {
            tipX = pt.x - tipWidth - 12;
        }
        // Keep within top and bottom bounds
        if (tipY < 10) tipY = 10;
        if (tipY + tipHeight > canvasHeight - 10) tipY = canvasHeight - tipHeight - 10;

        // Tooltip box
        ctx.fillStyle = dark ? 'rgba(21, 29, 48, 0.96)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = dark ? '#27354f' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundRect(ctx, tipX, tipY, tipWidth, tipHeight, 8);
        ctx.fill();
        ctx.stroke();

        // Tooltip text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Line 1: Date
        ctx.fillStyle = dark ? '#f8fafc' : '#0f172a';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(line1, tipX + 12, tipY + 10);

        // Line 2: Metric value (accent color)
        ctx.fillStyle = '#6366f1';
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(line2, tipX + 12, tipY + 28);

        // Line 3: Submissions count
        ctx.fillStyle = dark ? '#94a3b8' : '#64748b';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(line3, tipX + 12, tipY + 46);
    }

    /**
     * Helper to trace rounded rectangles on Canvas.
     */
    function roundRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }

    /**
     * Mouse movement handler for hover detection.
     */
    function handleMouseMove(e) {
        if (!chartData || chartData.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const width = rect.width;
        const padding = { left: 55, right: 25 };
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

        // Only hover if mouse is reasonably close to a data column
        const maxHoverDistance = Math.max(30, (chartWidth / n) * 0.8);
        if (minDistance <= maxHoverDistance) {
            if (hoveredIndex !== closestIndex) {
                hoveredIndex = closestIndex;
                drawChart();
            }
        } else if (hoveredIndex !== -1) {
            hoveredIndex = -1;
            drawChart();
        }
    }

    function handleMouseLeave() {
        if (hoveredIndex !== -1) {
            hoveredIndex = -1;
            drawChart();
        }
    }

    /**
     * Fetches chart data from the REST API endpoint and triggers re-render.
     * @param {string} [game]
     * @param {number} [days]
     * @param {string} [metric]
     * @returns {Promise<void>}
     */
    async function loadScoreChart(game, days, metric) {
        if (game !== undefined) currentGame = game;
        if (days !== undefined) currentDays = days;
        if (metric !== undefined) currentMetric = metric;

        const statusEl = document.getElementById('chartStatus');
        if (statusEl) {
            statusEl.textContent = 'Updating chart...';
        }

        try {
            const params = new URLSearchParams({
                game: currentGame || 'all',
                days: currentDays.toString(),
            });

            const res = await fetch(`api/get-chart-data.php?${params.toString()}`);
            if (!res.ok) {
                throw new Error(`Chart data request failed: HTTP ${res.status}`);
            }

            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
                chartData = json.data;
            } else {
                chartData = [];
            }

            hoveredIndex = -1;
            resizeCanvas();
            drawChart();

            if (statusEl) {
                const totalPoints = chartData.length;
                statusEl.textContent = `${totalPoints} daily snapshot${totalPoints === 1 ? '' : 's'} recorded`;
            }
        } catch (err) {
            console.error('Failed to load score chart:', err);
            chartData = [];
            resizeCanvas();
            drawChart();
            if (statusEl) {
                statusEl.textContent = 'Chart temporarily unavailable';
            }
        }
    }

    // Attach event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    window.addEventListener('resize', () => {
        resizeCanvas();
        drawChart();
    });

    // Timeframe toggle buttons inside chart card
    document.querySelectorAll('.chart-days-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-days-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const days = parseInt(btn.dataset.days, 10) || 30;
            loadScoreChart(currentGame, days, currentMetric);
        });
    });

    // Metric selector dropdown or buttons
    const metricSelect = document.getElementById('chartMetricSelect');
    if (metricSelect) {
        metricSelect.addEventListener('change', () => {
            const metric = metricSelect.value;
            loadScoreChart(currentGame, currentDays, metric);
        });
    }

    // Expose public API
    window.loadScoreChart = loadScoreChart;
    window.refreshScoreChartTheme = function () {
        drawChart();
    };

    // Auto-init on load
    document.addEventListener('DOMContentLoaded', () => {
        resizeCanvas();
        loadScoreChart(currentGame, currentDays, currentMetric);
    });
})();

