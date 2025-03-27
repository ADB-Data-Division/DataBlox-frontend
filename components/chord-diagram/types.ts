import { MigrationData } from "@/app/services/data-loader/process-migration-data";
import { TooltipData } from "../chord-tooltip/types";

/**
 * Props for the ChordDiagram component
 */
export interface ChordDiagramProps {
  /**
   * Migration data matrix and names
   */
  data: MigrationData;
  
  /**
   * Width of the chord diagram
   * @default 480
   */
  width?: number;
  
  /**
   * Height of the chord diagram
   * @default 320
   */
  height?: number;
  
  /**
   * Dark mode toggle
   * @default false
   */
  darkMode?: boolean;
  
  /**
   * Callback when a chord is clicked
   */
  onChordClick?: (source: string, target: string) => void;
  
  /**
   * Custom color scheme for the chord diagram
   */
  colorScheme?: string[];
}

/**
 * Props for the ChordDiagramContainer component
 */
export interface ChordDiagramContainerProps {
  /**
   * Migration data matrix and names
   */
  migrationData?: MigrationData;
  
  /**
   * Width of the container
   * @default '100%'
   */
  width?: string | number;
  
  /**
   * Height of the container
   * @default '500px'
   */
  height?: string | number;
  
  /**
   * Dark mode toggle
   * @default false
   */
  darkMode?: boolean;
  
  /**
   * Title to display above the chart
   * @default 'Migration Flow Diagram'
   */
  title?: string;
  
  /**
   * Custom color scheme for the chord diagram
   */
  colorScheme?: string[];
  
  /**
   * Optional loading state override
   */
  isLoading?: boolean;
  
  /**
   * Whether the chord diagram is in an empty state (no data)
   */
  isEmpty?: boolean;
} 