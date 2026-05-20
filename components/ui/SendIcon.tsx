import React from "react";

interface SendIconProps {
  disabled?: boolean;
  active?: boolean;
  size?: number;
  className?: string;
}

export default function SendIcon({
  disabled,
  active,
  size = 20,
  className = "",
}: SendIconProps) {
  // Blue: #427FFF, Gray: #BDBDBD
  let color = "#BDBDBD";
  if (active) color = "#427FFF";
  if (disabled) color = "#BDBDBD";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false">
      <path
        d="m16.5656 45.5515-11.78364-6.267c-3.67422-1.9541-3.71814-7.2034-.07711-9.2187l49.50775-27.40232c3.8263-2.117817 8.4128 1.10184 7.7186 5.42067l-7.9566 49.50095c-.5709 3.5515-4.466 5.4869-7.6415 3.798l-10.9257-5.8107-3.3381 3.3377c-2.9508 2.9504-7.9992 1.4408-8.8448-2.6459l-1.6068-7.765 17.3823-21.4992z"
        fill={color}
      />
    </svg>
  );
}
