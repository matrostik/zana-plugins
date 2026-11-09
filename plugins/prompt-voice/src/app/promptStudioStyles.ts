export const PROMPT_STUDIO_STYLES = `
/* ==========================================================================
   Prompt Studio - Inline Document Canvas (Option 3)
   ========================================================================== */

.ps-root {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 100vh !important;
  background: #090D16 !important;
  color: #F8FAFC !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  overflow: hidden !important;
  position: relative !important;
  box-sizing: border-box !important;
}

.ps-root *, .ps-root *::before, .ps-root *::after {
  box-sizing: border-box !important;
}

/* Header */
.ps-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  height: 52px !important;
  padding: 0 24px !important;
  background: #0D111D !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  flex-shrink: 0 !important;
  z-index: 20 !important;
}

.ps-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}

.ps-logo-badge {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 7px !important;
  background: linear-gradient(135deg, #6366F1, #8B5CF6) !important;
  color: #FFFFFF !important;
  font-size: 14px !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35) !important;
}

.ps-title {
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #F8FAFC !important;
  letter-spacing: -0.01em !important;
}

.ps-badge {
  font-size: 11px !important;
  font-weight: 500 !important;
  padding: 2px 8px !important;
  border-radius: 999px !important;
  background: rgba(99, 102, 241, 0.12) !important;
  color: #A5B4FC !important;
  border: 1px solid rgba(99, 102, 241, 0.25) !important;
}

.ps-header-right {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.ps-telemetry-tag {
  font-size: 12px !important;
  color: #94A3B8 !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
}

.ps-btn-ghost {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #CBD5E1 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.ps-btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #FFFFFF !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.ps-btn-ghost:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

.ps-btn-primary {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, #6366F1, #8B5CF6) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35) !important;
}

.ps-btn-primary:hover:not(:disabled) {
  filter: brightness(1.1) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.45) !important;
}

.ps-btn-primary:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Document Canvas Container */
.ps-canvas-scroll {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 40px 24px 160px 24px !important;
  display: flex !important;
  justify-content: center !important;
  background: #090D16 !important;
}

.ps-canvas {
  width: 100% !important;
  max-width: 800px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 20px !important;
}

/* Canvas Title Field */
.ps-doc-title {
  width: 100% !important;
  background: transparent !important;
  border: none !important;
  font-size: 26px !important;
  font-weight: 700 !important;
  color: #F8FAFC !important;
  outline: none !important;
  padding: 0 !important;
  margin: 0 !important;
  letter-spacing: -0.02em !important;
}

.ps-doc-title::placeholder {
  color: #475569 !important;
}

.ps-doc-divider {
  width: 100% !important;
  height: 1px !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

/* Text Editor & Diff Presentation */
.ps-doc-editor {
  width: 100% !important;
  min-height: 280px !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: #E2E8F0 !important;
  font-size: 15px !important;
  line-height: 1.7 !important;
  resize: vertical !important;
  font-family: inherit !important;
  padding: 0 !important;
}

.ps-doc-editor::placeholder {
  color: #475569 !important;
}

.ps-diff-container {
  width: 100% !important;
  min-height: 240px !important;
  font-size: 15px !important;
  line-height: 1.75 !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}

.ps-diff-added {
  background: rgba(16, 185, 129, 0.16) !important;
  color: #6EE7B7 !important;
  border-bottom: 2px solid #10B981 !important;
  border-radius: 2px !important;
  padding: 1px 2px !important;
  font-weight: 500 !important;
}

.ps-diff-removed {
  background: rgba(239, 68, 68, 0.15) !important;
  color: #FCA5A5 !important;
  text-decoration: line-through !important;
  opacity: 0.75 !important;
  border-radius: 2px !important;
  padding: 1px 2px !important;
}

.ps-diff-unchanged {
  color: #E2E8F0 !important;
}

/* Floating AI Refinement Bar */
.ps-floating-bar {
  position: absolute !important;
  bottom: 24px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: calc(100% - 48px) !important;
  max-width: 800px !important;
  background: rgba(13, 17, 29, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(99, 102, 241, 0.35) !important;
  border-radius: 14px !important;
  box-shadow: 0 16px 40px -4px rgba(0, 0, 0, 0.8), 0 0 20px -2px rgba(99, 102, 241, 0.25) !important;
  padding: 12px 16px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  z-index: 50 !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}

.ps-floating-bar:focus-within {
  border-color: rgba(99, 102, 241, 0.6) !important;
  box-shadow: 0 16px 44px -4px rgba(0, 0, 0, 0.9), 0 0 24px -2px rgba(99, 102, 241, 0.35) !important;
}

/* Preset Pills Row */
.ps-pills-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  overflow-x: auto !important;
  padding-bottom: 2px !important;
}

.ps-pills-label {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #64748B !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  margin-right: 4px !important;
  flex-shrink: 0 !important;
}

.ps-preset-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #CBD5E1 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  padding: 4px 11px !important;
  border-radius: 999px !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  transition: all 0.15s ease !important;
}

.ps-preset-pill:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.16) !important;
  border-color: rgba(99, 102, 241, 0.35) !important;
  color: #FFFFFF !important;
}

.ps-preset-pill.active {
  background: rgba(99, 102, 241, 0.28) !important;
  border-color: #6366F1 !important;
  color: #A5B4FC !important;
  font-weight: 600 !important;
}

.ps-preset-pill:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

/* Action Controls Input Row */
.ps-action-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  width: 100% !important;
}

.ps-input-field {
  flex: 1 !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
  color: #F8FAFC !important;
  font-size: 13px !important;
  padding: 8px 12px !important;
  outline: none !important;
  transition: border-color 0.15s ease, background 0.15s ease !important;
}

.ps-input-field:focus {
  border-color: rgba(99, 102, 241, 0.5) !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.ps-input-field::placeholder {
  color: #64748B !important;
}

/* Mic Action Button */
.ps-mic-toggle {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  background: rgba(239, 68, 68, 0.14) !important;
  border: 1px solid rgba(239, 68, 68, 0.35) !important;
  color: #FCA5A5 !important;
  padding: 8px 14px !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  flex-shrink: 0 !important;
}

.ps-mic-toggle:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.24) !important;
  border-color: rgba(239, 68, 68, 0.6) !important;
  color: #FFFFFF !important;
}

.ps-mic-toggle.recording {
  background: rgba(239, 68, 68, 0.35) !important;
  border-color: #EF4444 !important;
  color: #FFFFFF !important;
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.5) !important;
  animation: ps-pulse-red 1.2s infinite ease-in-out !important;
}

@keyframes ps-pulse-red {
  0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 18px rgba(239, 68, 68, 0.65); }
}

/* In-Place Review Banner & Controls */
.ps-review-banner {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: rgba(16, 185, 129, 0.1) !important;
  border: 1px solid rgba(16, 185, 129, 0.25) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  width: 100% !important;
}

.ps-review-info {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #6EE7B7 !important;
}

.ps-review-actions {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.ps-btn-accept {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, #10B981, #059669) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #FFFFFF !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3) !important;
}

.ps-btn-accept:hover {
  filter: brightness(1.1) !important;
  transform: translateY(-1px) !important;
}

.ps-btn-discard {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1px solid rgba(239, 68, 68, 0.25) !important;
  color: #FCA5A5 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.ps-btn-discard:hover {
  background: rgba(239, 68, 68, 0.22) !important;
  color: #FFFFFF !important;
}

.ps-status-notice {
  font-size: 12px !important;
  color: #F87171 !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1px solid rgba(239, 68, 68, 0.25) !important;
  margin-top: 4px !important;
}
`;
