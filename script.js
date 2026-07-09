let startBtn, cancelBtn, status, pingDisplay, jitterDisplay, downloadDisplay, uploadDisplay, qualityDisplay, progress, progressPercent, timeRemaining, gaugeFill, gaugeValue, darkModeToggle, networkType, ispInfo, speedGraph, historyChart, historyList, packetLoss, wsLatency;

let isTesting = false;
let abortController = null;
let darkMode = localStorage.getItem('darkMode') === 'true';
let speedHistory = JSON.parse(localStorage.getItem('speedHistory')) || [];
let speedDataPoints = [];

document.addEventListener('DOMContentLoaded', () => {
    startBtn = document.getElementById('startBtn');
    cancelBtn = document.getElementById('cancelBtn');
    status = document.getElementById('status');
    pingDisplay = document.getElementById('ping');
    jitterDisplay = document.getElementById('jitter');
    downloadDisplay = document.getElementById('download');
    uploadDisplay = document.getElementById('upload');
    qualityDisplay = document.getElementById('quality');
    progress = document.getElementById('progress');
    progressPercent = document.getElementById('progressPercent');
    timeRemaining = document.getElementById('timeRemaining');
    gaugeFill = document.getElementById('gaugeFill');
    gaugeValue = document.getElementById('gaugeValue');
    darkModeToggle = document.getElementById('darkModeToggle');
    networkType = document.getElementById('networkType');
    ispInfo = document.getElementById('ispInfo');
    speedGraph = document.getElementById('speedGraph');
    historyChart = document.getElementById('historyChart');
    historyList = document.getElementById('historyList');
    packetLoss = document.getElementById('packetLoss');
    wsLatency = document.getElementById('wsLatency');

    startBtn.addEventListener('click', startTest);
    cancelBtn.addEventListener('click', cancelTest);
    darkModeToggle.addEventListener('click', toggleDarkMode);

    if (darkMode) {
        document.body.classList.add('dark-mode');
    }

    detectNetworkInfo();
    renderHistory();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!isTesting) {
            startTest();
        }
    }
    if (e.code === 'Escape' && isTesting) {
        cancelTest();
    }
});
function cancelTest() {
    if (abortController) {
        abortController.abort();
    }
    isTesting = false;
    startBtn.disabled = false;
    cancelBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
    status.textContent = 'Test cancelled';
    status.classList.remove('testing');
    resetDisplays();
}

function endTest(finalStatus) {
    status.textContent = finalStatus;
    isTesting = false;
    startBtn.disabled = false;
    startBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'none';
    status.classList.remove('testing');
    speedDataPoints = [];
}
function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkMode);
}

function detectNetworkInfo() {
    if (navigator.connection) {
        const conn = navigator.connection;
        const type = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'UNKNOWN';
        networkType.textContent = type;
    }

    fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
            ispInfo.textContent = data.org || data.isp || 'Unknown ISP';
        })
        .catch(() => {
            ispInfo.textContent = 'Unknown ISP';
        });
}

function initSpeedGraph() {
    const ctx = speedGraph.getContext('2d');
    speedGraph.width = speedGraph.offsetWidth;
    speedGraph.height = speedGraph.offsetHeight;
    return ctx;
}

function drawSpeedGraph(ctx, dataPoints) {
    ctx.clearRect(0, 0, speedGraph.width, speedGraph.height);
    
    if (dataPoints.length < 2) return;

    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const maxSpeed = Math.max(...dataPoints, 1);
    const stepX = speedGraph.width / (dataPoints.length - 1);

    dataPoints.forEach((speed, index) => {
        const x = index * stepX;
        const y = speedGraph.height - (speed / maxSpeed) * speedGraph.height;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
}

function initHistoryChart() {
    const ctx = historyChart.getContext('2d');
    historyChart.width = historyChart.offsetWidth;
    historyChart.height = historyChart.offsetHeight;
    return ctx;
}

function drawHistoryChart(ctx, history) {
    ctx.clearRect(0, 0, historyChart.width, historyChart.height);
    
    if (history.length < 2) return;

    const downloadSpeeds = history.map(h => h.download);
    const uploadSpeeds = history.map(h => h.upload);
    const maxSpeed = Math.max(...downloadSpeeds, ...uploadSpeeds, 1);
    const stepX = historyChart.width / (history.length - 1);

    // Draw download line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    downloadSpeeds.forEach((speed, index) => {
        const x = index * stepX;
        const y = historyChart.height - (speed / maxSpeed) * historyChart.height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw upload line
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    uploadSpeeds.forEach((speed, index) => {
        const x = index * stepX;
        const y = historyChart.height - (speed / maxSpeed) * historyChart.height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

function renderHistory() {
    const ctx = initHistoryChart();
    drawHistoryChart(ctx, speedHistory);

    historyList.innerHTML = '';
    speedHistory.slice(-10).reverse().forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <span>${new Date(result.timestamp).toLocaleString()}</span>
            <span>↓ ${result.download.toFixed(1)} Mbps</span>
            <span>↑ ${result.upload.toFixed(1)} Mbps</span>
            <span>Ping: ${result.ping.toFixed(0)} ms</span>
        `;
        historyList.appendChild(item);
    });
}

function saveToHistory(ping, download, upload) {
    const result = {
        timestamp: Date.now(),
        ping: ping,
        download: download,
        upload: upload
    };
    
    speedHistory.push(result);
    if (speedHistory.length > 50) speedHistory.shift();
    
    localStorage.setItem('speedHistory', JSON.stringify(speedHistory));
    renderHistory();
}
function resetDisplays() {
    pingDisplay.textContent = '--';
    jitterDisplay.textContent = '--';
    downloadDisplay.textContent = '--';
    uploadDisplay.textContent = '--';
    qualityDisplay.textContent = '--';
    qualityDisplay.className = 'value quality';
    packetLoss.textContent = '--';
    wsLatency.textContent = '--';
    progress.style.width = '0%';
    progressPercent.textContent = '0%';
    timeRemaining.textContent = '--';
    gaugeFill.style.height = '0%';
    gaugeValue.textContent = '0';
}
async function startTest() {
    if (isTesting) return;

    isTesting = true;
    abortController = new AbortController();
    let cancelled = false;

    startBtn.style.display = 'none';
    cancelBtn.style.display = 'inline-block';
    resetDisplays();
    status.classList.add('testing');

    const testStartTime = Date.now();
    speedDataPoints = [];
    const graphCtx = initSpeedGraph();

    try {
        // Warm-up phase
        status.textContent = 'Warming up...';
        await warmUpTest();

        // Test Ping
        status.textContent = 'Testing ping...';
        try {
            const pingResult = await testPing(abortController.signal);
            const { ping, jitter, rawPings } = pingResult;
            animateValue(pingDisplay, 0, ping, 500, 0);
            animateValue(jitterDisplay, 0, jitter, 500, 1);
            packetLoss.textContent = calculatePacketLoss(rawPings).toFixed(1);
            updateProgress(15, testStartTime);
        } catch (e) {
            if (e.name === 'AbortError') { cancelled = true; return; }
            status.textContent = 'Ping test failed';
        }

        // Test WebSocket latency
        status.textContent = 'Testing WebSocket latency...';
        try {
            const wsLat = await Promise.race([
                testWebSocketLatency(abortController.signal),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]);
            animateValue(wsLatency, 0, wsLat, 500, 0);
        } catch (e) {
            if (e.name === 'AbortError') { cancelled = true; return; }
            wsLatency.textContent = 'N/A';
        }
        updateProgress(25, testStartTime);

        // Test Download
        status.textContent = 'Testing download speed...';
        try {
            const downloadSpeed = await testDownloadWithGraph(abortController.signal, graphCtx);
            animateValue(downloadDisplay, 0, downloadSpeed, 1000, 2);
            updateGauge(downloadSpeed);
            updateProgress(65, testStartTime);
        } catch (e) {
            if (e.name === 'AbortError') { cancelled = true; return; }
            status.textContent = 'Download test failed';
        }

        // Test Upload
        status.textContent = 'Testing upload speed...';
        updateProgress(70, testStartTime);
        try {
            const uploadSpeed = await testUpload(abortController.signal, (speed) => {
                uploadDisplay.textContent = speed.toFixed(2);
                updateGauge(speed);
                updateProgress(70 + Math.min(speed / 10, 25), testStartTime);
            });
            animateValue(uploadDisplay, parseFloat(uploadDisplay.textContent) || 0, uploadSpeed, 500, 2);
            updateGauge(uploadSpeed);
        } catch (e) {
            if (e.name === 'AbortError') { cancelled = true; return; }
            uploadDisplay.textContent = '0';
        }

        status.textContent = 'Calculating results...';
        updateProgress(100, testStartTime);

        const quality = calculateQuality(
            parseFloat(pingDisplay.textContent),
            parseFloat(downloadDisplay.textContent),
            parseFloat(uploadDisplay.textContent)
        );
        qualityDisplay.textContent = quality.grade;
        qualityDisplay.className = 'value quality ' + quality.grade.toLowerCase();
        saveToHistory(
            parseFloat(pingDisplay.textContent),
            parseFloat(downloadDisplay.textContent),
            parseFloat(uploadDisplay.textContent)
        );
    } finally {
        if (!cancelled) {
            endTest('Test complete');
        }
    }
}

function updateProgress(percent, startTime) {
    progress.style.width = percent + '%';
    progressPercent.textContent = Math.round(percent) + '%';
    
    const elapsed = (Date.now() - startTime) / 1000;
    const estimatedTotal = elapsed / (percent / 100);
    const remaining = Math.max(0, estimatedTotal - elapsed);
    timeRemaining.textContent = Math.round(remaining) + 's remaining';
}

function updateGauge(speed) {
    const maxSpeed = 1000;
    const percent = Math.min((speed / maxSpeed) * 100, 100);
    gaugeFill.style.height = percent + '%';
    gaugeValue.textContent = Math.round(speed);
}

function calculateQuality(ping, download, upload) {
    let score = 0;
    
    if (ping < 20) score += 30;
    else if (ping < 50) score += 25;
    else if (ping < 100) score += 20;
    else if (ping < 200) score += 15;
    else score += 10;
    
    if (download > 100) score += 35;
    else if (download > 50) score += 30;
    else if (download > 25) score += 25;
    else if (download > 10) score += 20;
    else score += 15;
    
    if (upload > 50) score += 35;
    else if (upload > 25) score += 30;
    else if (upload > 10) score += 25;
    else if (upload > 5) score += 20;
    else score += 15;
    
    if (score >= 90) return { grade: 'A' };
    if (score >= 80) return { grade: 'B' };
    if (score >= 70) return { grade: 'C' };
    if (score >= 60) return { grade: 'D' };
    return { grade: 'F' };
}

async function testPing(signal) {
    const pings = [];
    const iterations = 10;
    const servers = [
        'https://www.google.com/favicon.ico',
        'https://www.cloudflare.com/favicon.ico',
        'https://www.amazon.com/favicon.ico'
    ];

    for (let i = 0; i < iterations; i++) {
        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const server = servers[i % servers.length];
        const start = performance.now();
        try {
            await fetch(server, {
                mode: 'no-cors',
                cache: 'no-store'
            });
            const end = performance.now();
            pings.push(end - start);
        } catch (e) {
            pings.push(0);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Remove outliers (highest and lowest)
    const sortedPings = pings.filter(p => p > 0).sort((a, b) => a - b);
    const trimmedPings = sortedPings.slice(1, -1);
    const avgPing = trimmedPings.length > 0 
        ? trimmedPings.reduce((a, b) => a + b, 0) / trimmedPings.length 
        : sortedPings.reduce((a, b) => a + b, 0) / sortedPings.length;
    
    const jitter = calculateJitter(trimmedPings.length > 0 ? trimmedPings : sortedPings);

    return { ping: avgPing, jitter, rawPings: pings };
}

function calculateJitter(pings) {
    if (pings.length < 2) return 0;

    const avg = pings.reduce((a, b) => a + b, 0) / pings.length;
    const variance = pings.reduce((sum, ping) => sum + Math.pow(ping - avg, 2), 0) / pings.length;
    return Math.sqrt(variance);
}

function calculatePacketLoss(pings) {
    if (pings.length < 2) return 0;
    const failedPings = pings.filter(p => p === 0).length;
    return (failedPings / pings.length) * 100;
}

async function warmUpTest() {
    try {
        await fetch('https://www.google.com/favicon.ico', {
            mode: 'no-cors',
            cache: 'no-store'
        });
    } catch (e) {
        // Ignore warm-up errors
    }
}

async function testWithConcurrentConnections(signal, url, method = 'GET', body = null, connections = 3) {
    const promises = [];
    
    for (let i = 0; i < connections; i++) {
        const startTime = performance.now();
        const promise = fetch(url, {
            method: method,
            body: body,
            mode: 'no-cors',
            signal: signal
        }).then(async (response) => {
            await response;
            const endTime = performance.now();
            return endTime - startTime;
        }).catch(() => 0);
        
        promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    return results.filter(r => r > 0);
}
async function testDownload(signal) {
    const fileSize = 25 * 1024 * 1024; // 25MB
    const iterations = 3;
    const speeds = [];
    const servers = [
        'https://speed.cloudflare.com/__down?bytes=',
        'https://speedtest.net/garbage.php?size=',
        'https://fast.com/'
    ];

    for (let i = 0; i < iterations; i++) {
        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const server = servers[i % servers.length];
        const startTime = performance.now();

        try {
            let response;
            if (server.includes('cloudflare')) {
                response = await fetch(server + fileSize, { signal: signal });
            } else if (server.includes('speedtest')) {
                response = await fetch(server + fileSize, { signal: signal });
            } else {
                response = await fetch(server, { signal: signal });
            }
            
            const blob = await response.blob();
            const endTime = performance.now();
            const durationInSeconds = (endTime - startTime) / 1000;
            const speedInBitsPerSecond = (blob.size * 8) / durationInSeconds;
            speeds.push(speedInBitsPerSecond / 1000000);
        } catch (e) {
            if (e.name === 'AbortError') throw e;
        }
    }

    // Use median for accuracy
    const sortedSpeeds = speeds.sort((a, b) => a - b);
    const medianSpeed = sortedSpeeds.length > 0 
        ? sortedSpeeds[Math.floor(sortedSpeeds.length / 2)] 
        : 0;

    return medianSpeed;
}

async function testUpload(signal, onProgress) {
    const fileSize = 1 * 1024 * 1024; // 1MB
    const data = new Blob([new Uint8Array(fileSize)]);
    const server = 'https://speed.cloudflare.com/__up';

    if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const startTime = performance.now();
        let lastProgressUpdate = startTime;
        let settled = false;

        const settle = (callback) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            callback();
        };

        const resolveSpeed = () => {
            settle(() => {
                const endTime = performance.now();
                const durationInSeconds = (endTime - startTime) / 1000;
                if (durationInSeconds <= 0) {
                    resolve(0);
                    return;
                }
                const speedInBitsPerSecond = (fileSize * 8) / durationInSeconds;
                resolve(speedInBitsPerSecond / 1000000);
            });
        };

        xhr.open('POST', server, true);
        xhr.timeout = 15000;

        xhr.upload.onprogress = (event) => {
            if (!onProgress || !event.lengthComputable) return;
            const currentTime = performance.now();
            if (currentTime - lastProgressUpdate < 100) return;
            lastProgressUpdate = currentTime;

            const elapsed = (currentTime - startTime) / 1000;
            if (elapsed <= 0) return;
            const speed = (event.loaded * 8) / elapsed / 1000000;
            onProgress(speed);
        };

        xhr.onload = resolveSpeed;
        xhr.onerror = () => settle(() => reject(new Error('Upload failed')));
        xhr.ontimeout = () => settle(() => reject(new Error('Upload timeout')));
        xhr.onabort = () => {
            if (signal && signal.aborted) {
                settle(() => reject(new DOMException('Aborted', 'AbortError')));
            } else {
                settle(() => reject(new Error('Upload timeout')));
            }
        };
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status >= 200 && xhr.status < 300) {
                resolveSpeed();
            }
        };

        const timeoutId = setTimeout(() => {
            xhr.abort();
            settle(() => reject(new Error('Upload timeout')));
        }, 15000);

        if (signal) {
            signal.addEventListener('abort', () => {
                xhr.abort();
                settle(() => reject(new DOMException('Aborted', 'AbortError')));
            }, { once: true });
        }

        xhr.send(data);
    });
}
function animateValue(element, start, end, duration, decimals) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (end - start) * progress;
        element.textContent = current.toFixed(decimals);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

async function testDownloadWithGraph(signal, ctx) {
    const fileSize = 25 * 1024 * 1024; // 25MB
    const startTime = performance.now();
    let lastUpdate = startTime;

    try {
        const response = await fetch('https://speed.cloudflare.com/__down?bytes=' + fileSize, {
            signal: signal
        });
        
        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        let receivedLength = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            receivedLength += value.length;
            const currentTime = performance.now();
            
            if (currentTime - lastUpdate > 100) {
                const elapsed = (currentTime - startTime) / 1000;
                const speed = (receivedLength * 8) / elapsed / 1000000;
                speedDataPoints.push(speed);
                drawSpeedGraph(ctx, speedDataPoints);
                lastUpdate = currentTime;
            }
        }

        const endTime = performance.now();
        const durationInSeconds = (endTime - startTime) / 1000;
        const speedInBitsPerSecond = (fileSize * 8) / durationInSeconds;
        return speedInBitsPerSecond / 1000000;
    } catch (e) {
        if (e.name === 'AbortError') throw e;
        return 0;
    }
}

async function testUploadWithGraph(signal, ctx) {
    const fileSize = 5 * 1024 * 1024; // 5MB
    const data = new Blob([new Uint8Array(fileSize)]);
    const startTime = performance.now();
    let lastUpdate = startTime;

    try {
        const response = await fetch('https://speed.cloudflare.com/__up', {
            method: 'POST',
            body: data,
            mode: 'no-cors',
            signal: signal
        });

        await response;

        const endTime = performance.now();
        const durationInSeconds = (endTime - startTime) / 1000;
        const speedInBitsPerSecond = (data.length * 8) / durationInSeconds;
        const speed = speedInBitsPerSecond / 1000000;

        speedDataPoints.push(speed);
        drawSpeedGraph(ctx, speedDataPoints);

        return speed;
    } catch (e) {
        if (e.name === 'AbortError') throw e;
        return 0;
    }
}

async function testWebSocketLatency(signal) {
    const ws = new WebSocket('wss://echo.websocket.org');
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket timeout'));
        }, 3000);

        ws.onopen = () => {
            const start = performance.now();
            ws.send('ping');
        };

        ws.onmessage = () => {
            const end = performance.now();
            clearTimeout(timeout);
            ws.close();
            resolve(end - start);
        };

        ws.onerror = () => {
            clearTimeout(timeout);
            ws.close();
            reject(new Error('WebSocket error'));
        };

        ws.onclose = () => {
            clearTimeout(timeout);
        };

        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                ws.close();
                reject(new DOMException('Aborted', 'AbortError'));
            });
        }
    });
}

async function testWebRTCLatency(signal) {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    const dataChannel = pc.createDataChannel('test');
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pc.close();
            reject(new Error('WebRTC timeout'));
        }, 5000);

        dataChannel.onopen = () => {
            const start = performance.now();
            dataChannel.send('ping');
        };

        dataChannel.onmessage = () => {
            const end = performance.now();
            clearTimeout(timeout);
            pc.close();
            resolve(end - start);
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed') {
                clearTimeout(timeout);
                pc.close();
                reject(new Error('WebRTC ICE failed'));
            }
        };

        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                pc.close();
                reject(new DOMException('Aborted', 'AbortError'));
            });
        }
    });
}
