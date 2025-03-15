import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Divider, 
  Chip,
  useTheme
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
}) => {
  const theme = useTheme();
  
  // Size configurations
  const sizeConfig = {
    small: {
      padding: 2,
      titleSize: 'body2',
      valueSize: 'h5',
      subtitleSize: 'caption',
      iconSize: 24,
    },
    medium: {
      padding: 3,
      titleSize: 'body1',
      valueSize: 'h4',
      subtitleSize: 'body2',
      iconSize: 32,
    },
    large: {
      padding: 4,
      titleSize: 'h6',
      valueSize: 'h3',
      subtitleSize: 'body1',
      iconSize: 40,
    },
  };
  
  const config = sizeConfig[size];
  
  // Determine trend icon and color
  const getTrendIcon = () => {
    if (!trend) return <Minus size={16} />;
    return trend > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  };
  
  const getTrendColor = () => {
    if (!trend) return 'default';
    return trend > 0 ? 'success' : 'error';
  };
  
  return (
    <Card 
      elevation={1}
      sx={{
        height: '100%',
        borderLeft: 4,
        borderColor: `${color}.main`,
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ padding: config.padding, '&:last-child': { paddingBottom: config.padding } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant={config.titleSize as any} color="text.secondary" gutterBottom>
            {title}
          </Typography>
          {icon && (
            <Box 
              sx={{ 
                color: `${color}.main`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {React.cloneElement(icon as React.ReactElement, { size: config.iconSize })}
            </Box>
          )}
        </Box>
        
        <Typography variant={config.valueSize as any} component="div" fontWeight="bold">
          {valuePrefix}{value}{valueSuffix}
        </Typography>
        
        {subtitle && (
          <Typography variant={config.subtitleSize as any} color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
        
        {(trend !== undefined || trendLabel) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {trend !== undefined && (
                <Chip
                  icon={getTrendIcon()}
                  label={`${Math.abs(trend)}%`}
                  size="small"
                  color={getTrendColor()}
                  sx={{ height: 24 }}
                />
              )}
              {trendLabel && (
                <Typography variant="caption" color="text.secondary">
                  {trendLabel}
                </Typography>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Scorecard;
