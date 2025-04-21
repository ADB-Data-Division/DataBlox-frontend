import { VisualizationFilters } from "@/components/visualization-toolbar/state/types";
import { Filter, ProvinceFilter, DateTimeFilter, SubactionFilter } from "../data-loader/data-loader-interface";

export function transformFilter(visualizationFilter: VisualizationFilters): Filter[] {
    const filters: Filter[] = [];

    if (visualizationFilter.provinces && visualizationFilter.provinces.length > 0) {
        const provinceFilter: ProvinceFilter = {
            type: 'province',
            filter_id: 'province-filter',
            province_ids: visualizationFilter.provinces.map(province => province.id)
        };
        filters.push(provinceFilter);
    }

    if (visualizationFilter.startDate && visualizationFilter.endDate) {
        const dateTimeFilter: DateTimeFilter = {
            type: 'datetime',
            filter_id: 'datetime-filter',
            label: visualizationFilter.timePeriod || 'custom',
            time_period: visualizationFilter.timePeriod || 'custom',
            start_date: visualizationFilter.startDate,
            end_date: visualizationFilter.endDate
        };
        filters.push(dateTimeFilter);
    }

    if (visualizationFilter.subaction && visualizationFilter.subaction !== null) {
        const subactionFilter: SubactionFilter = {
            type: 'subaction',
            filter_id: 'subaction-filter',
            label: visualizationFilter.subaction,
            subaction: visualizationFilter.subaction
        };
        filters.push(subactionFilter);
    }

    return filters;
}