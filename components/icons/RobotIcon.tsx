import * as React from "react";

type Props = {
  width?: number;
  height?: number;
  color?: string; // primary icon color
  className?: string;
};

const RobotIcon: React.FC<Props> = ({ width = 33, height = 33, color = "#7166f9", className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 33.145 33.145"
    width={width}
    height={height}
    className={className}
    style={{ color }}
    fill="none"
  >
    <g>
      {/* Body */}
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeOpacity={0.87}
        strokeWidth={2}
        d="M25.55 12.429H7.595c-.763 0-1.381.619-1.381 1.381v13.811a1.38 1.38 0 0 0 1.38 1.381H25.55a1.38 1.38 0 0 0 1.381-1.381V13.81c0-.762-.618-1.381-1.38-1.381z"
      />
      {/* Face details (white) */}
      <path
        fill="#fff"
        d="M11.739 19.335a1.382 1.382 0 1 0-.001-2.763 1.382 1.382 0 0 0 0 2.763M21.406 19.335a1.381 1.381 0 1 0 0-2.763 1.381 1.381 0 0 0 0 2.763M13.81 22.097a1.38 1.38 0 1 0 0 2.762zm5.525 2.762a1.38 1.38 0 1 0 0-2.762zm-5.525 0h5.525v-2.762H13.81z"
      />
      {/* Antennas/arms */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.87}
        strokeWidth={2}
        d="M16.573 6.905v5.524M2.762 17.954v5.524M30.383 17.954v5.524"
      />
      <path
        stroke="currentColor"
        strokeOpacity={0.87}
        strokeWidth={2}
        d="M16.573 6.905a1.38 1.38 0 1 0 0-2.762 1.38 1.38 0 0 0 0 2.762z"
      />
    </g>
  </svg>
);

export default RobotIcon;