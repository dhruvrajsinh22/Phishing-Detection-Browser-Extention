// Content script for real-time monitoring
(function() {
  'use strict';

  // Monitor for suspicious activities
  let suspiciousActivities = [];
  
  // Check for hidden iframes
  function checkHiddenIframes() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const style = window.getComputedStyle(iframe);
      if (style.display === 'none' || style.visibility === 'hidden' || 
          style.opacity === '0' || iframe.style.width === '0px') {
        suspiciousActivities.push('Hidden iframe detected');
      }
    });
  }

  // Check for suspicious form actions
  function checkSuspiciousForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const action = form.action;
      if (action && action.includes('mailto:')) {
        suspiciousActivities.push('Form submitting to email');
      }
      if (action && new URL(action).hostname !== window.location.hostname) {
        suspiciousActivities.push('Form submitting to external domain');
      }
    });
  }

  // Check for suspicious scripts
  function checkSuspiciousScripts() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src && new URL(script.src).hostname !== window.location.hostname) {
        suspiciousActivities.push('External script loaded');
      }
    });
  }

  // Monitor document changes
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        checkHiddenIframes();
        checkSuspiciousForms();
        checkSuspiciousScripts();
      }
    });
  });

  // Start monitoring when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring);
  } else {
    startMonitoring();
  }

  function startMonitoring() {
    checkHiddenIframes();
    checkSuspiciousForms();
    checkSuspiciousScripts();
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Send data to background script
    if (suspiciousActivities.length > 0) {
      chrome.runtime.sendMessage({
        type: 'suspicious_activity',
        activities: suspiciousActivities,
        url: window.location.href
      });
    }
  }
})();
