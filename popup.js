console.log('Popup script loaded!');
document.addEventListener('DOMContentLoaded', function() {
  const scanBtn = document.getElementById('scan-btn');
  const urlDisplay = document.getElementById('url-display');
  const resultSection = document.getElementById('result-section');
  const loading = document.getElementById('loading');
  const statusIndicator = document.getElementById('status-indicator');
  const resultMessage = document.getElementById('result-message');
  const confidenceScore = document.getElementById('confidence-score');
  const featuresAnalysis = document.getElementById('features-analysis');

  // Get current tab URL
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    urlDisplay.textContent = currentUrl;
    
    // Auto-scan if it's not a chrome:// URL
    if (!currentUrl.startsWith('chrome://') && !currentUrl.startsWith('chrome-extension://')) {
      scanBtn.addEventListener('click', () => scanURL(currentUrl));
    } else {
      scanBtn.disabled = true;
      scanBtn.textContent = 'Cannot scan system pages';
    }
  });

  async function scanURL(url) {
    try {
      showLoading(true);
      hideResults();
      
      // Extract features from URL
      const features = extractURLFeatures(url);
      
      // Send to backend for ML analysis
      const response = await fetch('http://localhost:3000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url, features: features })
      });
      
      if (!response.ok) {
        throw new Error('Analysis service unavailable');
      }
      
      const result = await response.json();
      displayResults(result);
      
    } catch (error) {
      console.error('Error:', error);
      displayError(error.message);
    } finally {
      showLoading(false);
    }
  }

  function extractURLFeatures(url) {
    const features = {};
    
    try {
      const urlObj = new URL(url);
      
      // Feature extraction based on NoPhish methodology
      features.hasIP = /\d+\.\d+\.\d+\.\d+/.test(urlObj.hostname);
      features.urlLength = url.length;
      features.hasShortening = /bit\.ly|tinyurl|t\.co|goo\.gl|short/.test(url);
      features.hasAtSymbol = url.includes('@');
      features.hasDoubleSlash = url.split('//').length > 2;
      features.hasDash = urlObj.hostname.includes('-');
      features.subdomainCount = urlObj.hostname.split('.').length - 2;
      features.hasHTTPS = urlObj.protocol === 'https:';
      features.domainLength = urlObj.hostname.length;
      features.pathLength = urlObj.pathname.length;
      features.hasPort = urlObj.port !== '';
      features.queryLength = urlObj.search.length;
      
      // Suspicious keywords
      const suspiciousKeywords = ['secure', 'account', 'update', 'verify', 'login', 'bank'];
      features.suspiciousKeywords = suspiciousKeywords.some(keyword => 
        url.toLowerCase().includes(keyword)
      );
      
    } catch (e) {
      console.error('Error extracting features:', e);
    }
    
    return features;
  }

  function displayResults(result) {
    resultSection.classList.remove('hidden', 'safe', 'danger', 'warning');
    
    if (result.prediction === 'safe') {
      resultSection.classList.add('safe');
      statusIndicator.textContent = '✅';
      resultMessage.textContent = 'This website appears to be safe';
    } else if (result.prediction === 'phishing') {
      resultSection.classList.add('danger');
      statusIndicator.textContent = '⚠️';
      resultMessage.textContent = 'WARNING: This website may be malicious!';
    } else if (result.prediction === 'warning') {
      resultSection.classList.add('warning');
      statusIndicator.textContent = '⚠️';
      resultMessage.textContent = 'Caution: Some suspicious features detected';
    }
    
    confidenceScore.textContent = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;
    
    if (result.suspiciousFeatures && result.suspiciousFeatures.length > 0) {
      featuresAnalysis.innerHTML = `
        <strong>Suspicious features detected:</strong><br>
        ${result.suspiciousFeatures.map(feature => `• ${feature}`).join('<br>')}
      `;
    }
  }

  function displayError(message) {
    resultSection.classList.remove('hidden', 'safe', 'warning');
    resultSection.classList.add('danger');
    statusIndicator.textContent = '❌';
    resultMessage.textContent = `Error: ${message}`;
    confidenceScore.textContent = '';
    featuresAnalysis.innerHTML = '';
  }

  function showLoading(show) {
    if (show) {
      loading.classList.remove('hidden');
      scanBtn.disabled = true;
    } else {
      loading.classList.add('hidden');
      scanBtn.disabled = false;
    }
  }

  function hideResults() {
    resultSection.classList.add('hidden');
  }
});
