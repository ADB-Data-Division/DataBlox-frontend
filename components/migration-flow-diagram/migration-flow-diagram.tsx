import React from 'react';

interface MigrationFlowDiagramProps {
  fromLocation: string;
  toLocation: string;
  flowCount: number;
  returnFlowCount?: number;
  units?: string;
  width?: number;
  height?: number;
  isSelfLoop?: boolean; // New prop for self-loops
}

export default function MigrationFlowDiagram({
  fromLocation,
  toLocation,
  flowCount,
  returnFlowCount,
  units = 'thousands',
  width = 450,
  height = 90,
  isSelfLoop = false
}: MigrationFlowDiagramProps) {
  // Format numbers (convert to thousands if needed)
  const formatNumber = (num: number) => {
    if (units === 'thousands') {
      return (num / 1000).toFixed(2);
    }
    return num.toLocaleString();
  };

  // Arrow marker
  const arrowMarkerId = `arrow-${Math.random().toString(36).substr(2, 9)}`;

  if (isSelfLoop) {
    // Self-loop design (Bangkok → Bangkok)
    const centerX = width / 2;
    const centerY = height / 2;
    const boxWidth = 140;
    const boxHeight = 32;
    const boxX = centerX - boxWidth / 2;
    const boxY = centerY - boxHeight / 2;
    
    return (
      <svg 
        width={width} 
        height={height} 
        style={{ 
          display: 'block', 
          margin: '8px 0',
          maxWidth: '100%',
          height: 'auto'
        }}
      >
        {/* Arrow marker definition */}
        <defs>
          <marker
            id={arrowMarkerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#2563eb" />
          </marker>
        </defs>

        {/* Location box */}
        <rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          rx="8"
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth="2"
        />

        {/* Location name */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="500"
          fill="#1f2937"
        >
          {fromLocation.length > 18 ? `${fromLocation.substring(0, 16)}...` : fromLocation}
        </text>

        {/* Circular arrow */}
        <path
          d={`M ${centerX + 40} ${centerY - 10} 
              A 25 25 0 1 1 ${centerX + 40} ${centerY + 10}`}
          stroke="#2563eb"
          strokeWidth="2"
          fill="none"
          markerEnd={`url(#${arrowMarkerId})`}
        />
        
        {/* Flow count label */}
        <text
          x={centerX + 70}
          y={centerY}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#2563eb"
        >
          {formatNumber(flowCount)}
        </text>

        {/* Units label */}
        <text
          x={centerX}
          y={height - 4}
          textAnchor="middle"
          fontSize="10"
          fill="#6b7280"
          fontStyle="italic"
        >
          * {units === 'thousands' ? 'thousands people/month' : 'people/month'}
        </text>
      </svg>
    );
  }

  // Regular bidirectional flow design
  const padding = 20;
  const boxWidth = 120;
  const boxHeight = 32;
  const leftBoxX = padding;
  const rightBoxX = width - boxWidth - padding;
  const boxY = (height - boxHeight) / 2;
  const arrowY = height / 2;

  // Arrow path for curved arrows
  const createArrowPath = (startX: number, endX: number, y: number, curve: number = 0) => {
    const midX = (startX + endX) / 2;
    const controlY = y + curve;
    return `M ${startX} ${y} Q ${midX} ${controlY} ${endX} ${y}`;
  };

  return (
    <svg 
      width={width} 
      height={height} 
      style={{ 
        display: 'block', 
        margin: '8px 0',
        maxWidth: '100%',
        height: 'auto'
      }}
    >
      {/* Arrow marker definition */}
      <defs>
        <marker
          id={arrowMarkerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#2563eb" />
        </marker>
        <marker
          id={`${arrowMarkerId}-return`}
          viewBox="0 0 10 10"
          refX="9"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#6b7280" />
        </marker>
      </defs>

      {/* Location boxes */}
      <rect
        x={leftBoxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx="8"
        fill="#f8fafc"
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      <rect
        x={rightBoxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx="8"
        fill="#f8fafc"
        stroke="#e2e8f0"
        strokeWidth="2"
      />

      {/* Location names */}
      <text
        x={leftBoxX + boxWidth / 2}
        y={boxY + boxHeight / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="500"
        fill="#1f2937"
      >
        {fromLocation.length > 15 ? `${fromLocation.substring(0, 13)}...` : fromLocation}
      </text>
      <text
        x={rightBoxX + boxWidth / 2}
        y={boxY + boxHeight / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="500"
        fill="#1f2937"
      >
        {toLocation.length > 15 ? `${toLocation.substring(0, 13)}...` : toLocation}
      </text>

      {/* Flow arrows */}
      {flowCount > 0 && (
        <>
          {/* Forward flow arrow */}
          <path
            d={createArrowPath(
              leftBoxX + boxWidth + 5,
              rightBoxX - 5,
              returnFlowCount ? arrowY - 10 : arrowY,
              returnFlowCount ? -12 : 0
            )}
            stroke="#2563eb"
            strokeWidth="2"
            fill="none"
            markerEnd={`url(#${arrowMarkerId})`}
          />
          
          {/* Forward flow label */}
          <text
            x={width / 2}
            y={returnFlowCount ? arrowY - 18 : arrowY - 8}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="#2563eb"
          >
            {formatNumber(flowCount)}
          </text>
        </>
      )}

      {/* Return flow arrow */}
      {returnFlowCount && returnFlowCount > 0 && (
        <>
          <path
            d={createArrowPath(
              rightBoxX - 5,
              leftBoxX + boxWidth + 5,
              arrowY + 10,
              12
            )}
            stroke="#6b7280"
            strokeWidth="2"
            fill="none"
            markerEnd={`url(#${arrowMarkerId}-return)`}
          />
          
          {/* Return flow label */}
          <text
            x={width / 2}
            y={arrowY + 12}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="#6b7280"
          >
            {formatNumber(returnFlowCount)}
          </text>
        </>
      )}

      {/* Units label */}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        fontSize="10"
        fill="#6b7280"
        fontStyle="italic"
      >
        * {units === 'thousands' ? 'thousands people/month' : 'people/month'}
      </text>
    </svg>
  );
}