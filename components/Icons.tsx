import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

const defaultProps: React.SVGProps<SVGSVGElement> = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// --- Main Navigation Icons ---

export const HomeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
  </svg>
);

export const UserGroupIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const CheckBadgeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M12 2l2.4 2.8 3.7-.4 1 3.5 3.3 1.7-1 3.6 2 3.1-2.7 2.5-.2 3.7-3.6 1-1.8 3.2L12 21.6 8.9 23.7l-1.8-3.2-3.6-1-.2-3.7-2.7-2.5 2-3.1-1-3.6 3.3-1.7 1-3.5 3.7.4L12 2z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export const BookOpenIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const CreditCardIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="10" y2="15" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="8" cy="15" r="1" fill="currentColor" />
    <circle cx="12" cy="15" r="1" fill="currentColor" />
    <circle cx="16" cy="15" r="1" fill="currentColor" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const ApplicationsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 15l2 2 4-4" />
  </svg>
);

// --- Action & UI Utility Icons ---

export const PlusIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const DeleteIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const PDFIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const UpgradeIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="17 11 12 6 7 11" />
    <polyline points="17 18 12 13 7 18" />
  </svg>
);

export const SortAscendingIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <line x1="4" y1="6" x2="11" y2="6" />
    <line x1="4" y1="12" x2="9" y2="12" />
    <line x1="4" y1="18" x2="7" y2="18" />
    <polyline points="15 9 18 6 21 9" />
    <line x1="18" y1="6" x2="18" y2="18" />
  </svg>
);

export const SortDescendingIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <line x1="4" y1="6" x2="11" y2="6" />
    <line x1="4" y1="12" x2="9" y2="12" />
    <line x1="4" y1="18" x2="7" y2="18" />
    <polyline points="15 15 18 18 21 15" />
    <line x1="18" y1="6" x2="18" y2="18" />
  </svg>
);

export const MenuIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const XIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ className = 'w-3.5 h-3.5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// --- Financial & Analytics Icons ---

export const ChartBarIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

export const ReceiptIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="13" y2="15" />
  </svg>
);

export const BanknotesIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

export const TrendingUpIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const TrendingDownIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

export const WalletIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
    <path d="M16 3H4a2 2 0 0 0-2 2v2" />
    <circle cx="17" cy="14" r="1.5" fill="currentColor" />
  </svg>
);

// --- Academic & Progression Icons ---

export const GraduationCapIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

export const ArrowUpCircleIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="16 12 12 8 8 12" />
    <line x1="12" y1="16" x2="12" y2="8" />
  </svg>
);

export const PauseCircleIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="10" y1="15" x2="10" y2="9" />
    <line x1="14" y1="15" x2="14" y2="9" />
  </svg>
);

export const ArrowDownCircleIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="8 12 12 16 16 12" />
    <line x1="12" y1="8" x2="12" y2="16" />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const UserPlusIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const AlertCircleIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const CloudIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

export const CloudSyncIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    <polyline points="13 14 16 11 19 14" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const DocumentTextIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export const GlobeIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const ZapIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg {...defaultProps} className={className} {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
