import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react/dist/ssr';

export interface ScorecardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  valuePrefix?: string;
  valueSuffix?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'elevated' | 'outlined';
}

const Scorecard: React.FC<ScorecardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  color = 'primary',
  valuePrefix = '',
  valueSuffix = '',
  size = 'medium',
  variant = 'default',
}) => {
  const theme = useTheme();
  
  // Size configurations
  const sizeConfig = {
    small: {
      padding: 2.5,
      titleSize: 'body2',
      valueSize: 'h5',
      subtitleSize: 'caption',
      iconSize: 20,
      height: 130,
    },
    medium: {
      padding: 3,
      titleSize: 'body1',
      valueSize: 'h4',
      subtitleSize: 'body2',
      iconSize: 24,
      height: 220,
    },
    large: {
      padding: 4,
      titleSize: 'h6',
      valueSize: 'h3',
      subtitleSize: 'body1',
      iconSize: 28,
      height: 200,
    },
  };
  
  const config = sizeConfig[size];
  
  // Get theme color
  const getThemeColor = (colorName: string) => {
    // @ts-ignore
    return theme.palette[colorName]?.main || theme.palette.primary.main;
  };
  
  // Determine trend icon and color
  const getTrendIcon = () => {
    if (!trend) return <Minus size={14} weight="bold" />;
    return trend > 0 ? <ArrowUp size={14} weight="bold" /> : <ArrowDown size={14} weight="bold" />;
  };
  
  const getTrendColor = () => {
    if (!trend) return 'default';
    return trend > 0 ? 'success' : 'error';
  };

  // Card style variants
  const getCardStyles = () => {
    const baseStyles = {
      height: config.height,
      borderRadius: 3,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      background: theme.palette.background.paper,
      border: `1px solid ${alpha(getThemeColor(color), 0.12)}`,
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 24px -4px ${alpha(getThemeColor(color), 0.2)}`,
        borderColor: alpha(getThemeColor(color), 0.3),
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: `linear-gradient(90deg, ${getThemeColor(color)}, ${alpha(getThemeColor(color), 0.7)})`,
        borderRadius: '12px 12px 0 0',
      },
    };

    if (variant === 'elevated') {
      return {
        ...baseStyles,
        boxShadow: `0 4px 12px ${alpha(getThemeColor(color), 0.15)}`,
        '&:hover': {
          ...baseStyles['&:hover'],
          boxShadow: `0 16px 32px -4px ${alpha(getThemeColor(color), 0.25)}`,
        },
      };
    }

    if (variant === 'outlined') {
      return {
        ...baseStyles,
        border: `2px solid ${alpha(getThemeColor(color), 0.2)}`,
        background: alpha(getThemeColor(color), 0.02),
      };
    }

    return baseStyles;
  };
  
  return (
    <Card elevation={0} sx={getCardStyles()}>
      <CardContent 
        sx={{ 
          padding: config.padding,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:last-child': { paddingBottom: config.padding }
        }}
      >
        {/* Header with title and icon */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          mb: 2,
          minHeight: 28
        }}>
          <Typography 
            variant={config.titleSize as any} 
            color="text.secondary" 
            sx={{ 
              fontWeight: 500,
              lineHeight: 1.2,
              maxWidth: icon ? '75%' : '100%',
            }}
          >
            {title}
          </Typography>
          {icon && (
            <Box 
              sx={{ 
                color: getThemeColor(color),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alpha(getThemeColor(color), 0.08),
                borderRadius: 2,
                p: 0.75,
                minWidth: 36,
                minHeight: 36,
              }}
            >
              {React.cloneElement(icon as React.ReactElement, { 
                size: config.iconSize,
                weight: 'duotone'
              })}
            </Box>
          )}
        </Box>
        
        {/* Main value */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography 
            variant={config.valueSize as any} 
            component="div" 
            sx={{ 
              fontWeight: 700,
              color: theme.palette.text.primary,
              lineHeight: 1.1,
              mb: 1,
              background: `linear-gradient(135deg, ${theme.palette.text.primary}, ${alpha(getThemeColor(color), 0.8)})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {valuePrefix}{value}{valueSuffix}
          </Typography>
          
          {subtitle && (
            <Typography 
              variant={config.subtitleSize as any} 
              color="text.secondary" 
              sx={{ 
                fontWeight: 400,
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {/* Trend indicator */}
        {(trend !== undefined || trendLabel) && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            mt: 2,
            pt: 2,
            borderTop: `1px solid ${alpha(theme.palette.text.secondary, 0.1)}`,
          }}>
            {trend !== undefined && (
              <Chip
                icon={getTrendIcon()}
                label={`${Math.abs(trend)}%`}
                size="small"
                color={getTrendColor()}
                sx={{ 
                  height: 28,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  '& .MuiChip-icon': {
                    fontSize: '0.875rem',
                  },
                  boxShadow: `0 2px 4px ${alpha(
                    getTrendColor() === 'default' 
                      ? theme.palette.grey[500] 
                      : (theme.palette[getTrendColor() as 'success' | 'error']?.main || theme.palette.grey[500]), 
                    0.2
                  )}`,
                }}
              />
            )}
            {trendLabel && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontWeight: 500,
                  fontSize: '0.75rem',
                }}
              >
                {trendLabel}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default Scorecard;
