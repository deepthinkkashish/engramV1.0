import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface PlotData {
    x: number;
    y: number;
}

interface PlotComponentProps {
    data: PlotData[];
    title: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    forceLightMode?: boolean;
}

export const PlotComponent: React.FC<PlotComponentProps> = ({ data, title, xAxisLabel, yAxisLabel, forceLightMode }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data || data.length === 0) return;
        
        // Sanitize data
        const validData = data
            .map(d => ({ x: Number(d.x), y: Number(d.y) }))
            .filter(d => !isNaN(d.x) && !isNaN(d.y) && isFinite(d.x) && isFinite(d.y));
            
        if (validData.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 400;
        const height = 330;
        const margin = { top: 20, right: 20, bottom: 50, left: 60 }; // slightly larger left margin for big numbers

        const xExtent = d3.extent(validData, d => d.x) as [number, number];
        const yExtent = d3.extent(validData, d => d.y) as [number, number];
        
        let xRange = xExtent[1] - xExtent[0];
        if (xRange === 0) xRange = 1;
        let yRange = yExtent[1] - yExtent[0];
        if (yRange === 0) yRange = 1;

        const xPadding = xRange * 0.1;
        const yPadding = yRange * 0.1;

        const xDomain: [number, number] = [xExtent[0] - xPadding, xExtent[1] + xPadding];
        const yDomain: [number, number] = [yExtent[0] - yPadding, yExtent[1] + yPadding];

        // Include 0 if it's close to the range to show the origin naturally
        if (xDomain[0] > 0 && xDomain[0] < xRange * 0.5) xDomain[0] = 0;
        if (xDomain[1] < 0 && Math.abs(xDomain[1]) < xRange * 0.5) xDomain[1] = 0;
        
        if (yDomain[0] > 0 && yDomain[0] < yRange * 0.5) yDomain[0] = 0;
        if (yDomain[1] < 0 && Math.abs(yDomain[1]) < yRange * 0.5) yDomain[1] = 0;

        const x = d3.scaleLinear()
            .domain(xDomain)
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain(yDomain)
            .range([height - margin.bottom, margin.top]);

        // X-axis
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("~s")))
            .selectAll("text")
            .style("text-anchor", "middle")
            .attr("dy", "1em")
            .attr("fill", "currentColor");
            
        // X-axis Label
        svg.append("text")
            .attr("x", margin.left + (width - margin.left - margin.right) / 2)
            .attr("y", height - 10) // Positioned relative to bottom
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .text(xAxisLabel || "X");

        // Y-axis
        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("~s")))
            .selectAll("text")
            .attr("fill", "currentColor");
            
        // Y-axis Label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 15) // Positioned relative to left edge
            .attr("x", -(margin.top + (height - margin.top - margin.bottom) / 2))
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .text(yAxisLabel || "Y");

        // Origin lines (Zero-crossings)
        if (yDomain[0] <= 0 && yDomain[1] >= 0) {
            svg.append('line')
                .attr('x1', margin.left)
                .attr('x2', width - margin.right)
                .attr('y1', y(0))
                .attr('y2', y(0))
                .attr('stroke', 'currentColor')
                .attr('stroke-opacity', 0.2)
                .attr('stroke-width', 1.5)
                .attr('stroke-dasharray', '4,4');
        }

        if (xDomain[0] <= 0 && xDomain[1] >= 0) {
            svg.append('line')
                .attr('x1', x(0))
                .attr('x2', x(0))
                .attr('y1', margin.top)
                .attr('y2', height - margin.bottom)
                .attr('stroke', 'currentColor')
                .attr('stroke-opacity', 0.2)
                .attr('stroke-width', 1.5)
                .attr('stroke-dasharray', '4,4');
        }

        // Sort data by x for proper line rendering
        const sortedData = [...validData].sort((a, b) => a.x - b.x);

        const line = d3.line<PlotData>()
            .x(d => x(d.x))
            .y(d => y(d.y));

        svg.append('path')
            .datum(sortedData)
            .attr('fill', 'none')
            .attr('stroke', '#3b82f6') // Tailwind blue-500
            .attr('stroke-width', 2.5)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('d', line);
            
    }, [data, xAxisLabel, yAxisLabel]);

    return (
        <div className={`bg-white p-4 rounded-xl shadow-sm my-4 touch-pan-x touch-pan-y border border-gray-100 ${forceLightMode ? '' : 'dark:bg-gray-800 dark:border-gray-700'}`}>
            {title && <h3 className={`text-sm font-bold mb-4 text-center ${forceLightMode ? 'text-gray-800' : 'text-gray-800 dark:text-gray-100'}`}>{title}</h3>}
            <svg ref={svgRef} viewBox="0 0 400 330" className={`w-full h-auto ${forceLightMode ? 'text-gray-600' : 'text-gray-600 dark:text-gray-400'}`} />
        </div>
    );
};
