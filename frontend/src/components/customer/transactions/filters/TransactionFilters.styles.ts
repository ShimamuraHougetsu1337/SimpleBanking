import React from 'react';

export const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '18px 24px',
    marginBottom: 16,
    boxShadow: '0 2px 5px -1px rgba(50,50,93,0.12), 0 1px 3px -1px rgba(0,0,0,0.08)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: '#1e293b',
    letterSpacing: '-0.01em',
  },
  activeTag: {
    background: '#eff6ff',
    color: '#3B82F6',
    border: '1px solid #bfdbfe',
    borderRadius: 20,
    fontSize: 11,
    padding: '1px 8px',
    fontWeight: 500,
  },
  resetButton: {
    color: '#64748b',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    height: 28,
  },
  controlsRow: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 180,
  },
  applyGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#64748b',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
  },
  rangePicker: {
    width: '100%',
    borderRadius: 8,
    minWidth: 240,
  },
  keywordInput: {
    borderRadius: 8,
  },
  applyButton: {
    background: '#3B82F6',
    borderColor: '#3B82F6',
    borderRadius: 8,
    fontWeight: 600,
    height: 32,
    paddingInline: 20,
  },
};

export const filterCss = `
  .ant-picker-range { border-radius: 8px !important; }
  .ant-input-affix-wrapper { border-radius: 8px !important; }
  .ant-btn-text:hover { color: #EF4444 !important; background: #fef2f2 !important; }
`;
