import React from "react";

interface IconProps {
  className?: string;
  title?: string;
}

function Icon({ path, className = "w-4 h-4", title }: IconProps & { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <path d={path} />
    </svg>
  );
}

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p} path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l7.5 4.5-7.5 4.5z" />
);

// Filled check-circle used for "all good" states
export const CheckCircleFilledIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
  />
);

export const CancelIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
  />
);

export const SyncIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
  />
);

export const WarningIcon = (p: IconProps) => <Icon {...p} path="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />;

export const ChatIcon = (p: IconProps) => (
  <Icon {...p} path="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
);

export const ContentCopyIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
  />
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p} path="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
);

export const ReplayIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
  />
);

export const ExpandMoreIcon = (p: IconProps) => (
  <Icon {...p} path="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z" />
);

export const ExpandLessIcon = (p: IconProps) => (
  <Icon {...p} path="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z" />
);

export const RemoveIcon = (p: IconProps) => <Icon {...p} path="M19 13H5v-2h14v2z" />;

export const BlockIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"
  />
);

export const DoneAllIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"
  />
);

export const KeyIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
  />
);

export const InboxIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.11.88 2 1.99 2H19c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z"
  />
);

export const ArrowForwardIcon = (p: IconProps) => (
  <Icon {...p} path="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
);

export const CircleIcon = (p: IconProps) => (
  <Icon {...p} path="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z" />
);

export const AssignmentLateIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M20 3h-4.18C15.4 1.84 14.3 1 13 1h-2c-1.3 0-2.4.84-2.82 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm1 14h-2v-2h2v2zm0-4h-2V7h2v6z"
  />
);

export const ListIcon = (p: IconProps) => (
  <Icon {...p} path="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
);

export const ReplyIcon = (p: IconProps) => (
  <Icon {...p} path="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
);

export const PriorityHighIcon = (p: IconProps) => (
  <Icon
    {...p}
    path="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
  />
);
