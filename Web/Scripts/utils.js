// 'utils' Module
//
// Depends on: nothing

utils = {};

utils.CreateGuid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};

utils.FormatDateTime = function(date, time) {
    if (date != undefined && time != undefined) {
        return moment(date).format("YYYY-MM-DD") + " " + time;
    }
    return null;
};

utils.GetParameterByName = function (name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

utils.GetHiddenValByName = function (name) {
    return $("input[name='"+name+ "']").val()
}

//xAxisType = self.selectedNode().ColumnTypes()[xAxis])
utils.RenderChart = function (resultsContainer, data, graphType, xIndex, xAxisType, yIndex, yAxisType) {
    if (data && data.length > 0) {

        var svgWidth = $(resultsContainer).innerWidth();
        var svgHeight = 460;

        var margin = { top: 20, right: 20, bottom: 40, left: 50 };

        if (svgWidth - margin.left - margin.right > 600) {
            var extraMargin = Math.floor((svgWidth - margin.left - margin.right - 600) / 2);
            margin.left += extraMargin;
            margin.right += extraMargin;
        }

        var width = svgWidth - margin.left - margin.right;
        var height = 400;


        switch (graphType) {
            case "Line Chart":
                var theData = data.slice();
                theData.sort(function (a, b) {
                    if (a[xIndex] < b[xIndex]) {
                        return -1;
                    }
                    if (a[xIndex] > b[xIndex]) {
                        return 1;
                    }
                    // a must be equal to b
                    return 0;
                });

                var xScale, xAxis, xSelector;
                if (tools.IsDatetimeType(xAxisType)) {
                    xSelector = function (d) { return new Date(d[xIndex]); };

                    xScale = d3.time.scale()
                        .domain(d3.extent(theData, xSelector))
                        .range([0, width]);

                    xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .ticks(5);
                } else {
                    xSelector = function (d) { return d[xIndex]; };

                    xScale = d3.scale.linear()
                        .domain(d3.extent(theData, xSelector))
                        .range([0, width]);

                    xAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .ticks(5);
                }


                var ySelector = function (d) { return d[yIndex]; };

                var min = 0;
                var max = Math.max.apply(null, theData.map(ySelector));

                var yScale = d3.scale.linear()
                    .domain([min, max])
                    .range([height, 0]);

                var yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .ticks(5);

                var parent = $(resultsContainer).empty();

                // create svg
                var svg = d3.select('#' + parent.attr('id'))
                    .append('svg')
                    .attr("width", svgWidth)
                    .attr("height", svgHeight);

                var inner = svg.append("g")
                   .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                // x axis
                var xAxisGroup = inner.append("g")
                        .attr("transform", "translate(0," + height + ")");

                xAxisGroup.call(xAxis)

                xAxisGroup.selectAll("line,path")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("shape-rendering", "crispEdges");

                xAxisGroup.selectAll("text")
                    .attr("font-family", "sans-serif")
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px");

                // y axis
                var yAxisGroup = inner.append("g");

                yAxisGroup.call(yAxis);

                yAxisGroup.selectAll("text")
                    .attr("font-family", "sans-serif")
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px");

                yAxisGroup.selectAll("line,path")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("shape-rendering", "crispEdges");

                var line = d3.svg.line()
                .x(function (d) {
                    return xScale(xSelector(d));
                })
                .y(function (d) {
                    return yScale(ySelector(d));
                });

                // create lines
                inner.append("path")
                    .datum(theData)
                    .attr("fill", "none")
                    .attr("d", line)
                    .attr("stroke", "rgb(100, 100, 255)")
                    .attr("stroke-width", "1px");
                break;
            case "Bar Chart":
                var xSelector = function (d) { return d[xIndex]; };
                var ySelector = function (d) { return d[yIndex]; };

                var theData = data.slice(0, 25);

                var xScale = d3.scale.ordinal()
                    .domain(d3.range(theData.length))
                    .rangeRoundPoints([0, width], 1)

                var xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .ticks(theData.length)
                    .tickFormat(function (d) {
                        return xSelector(theData[d])
                    });

                var min = 0; //Math.min.apply(null, theData.map(function (row) { return Math.min.apply(null, row.slice(1)) }));;
                var max = Math.max.apply(null, theData.map(ySelector));


                var yScale = d3.scale.linear()
                    .domain([min, max])
                    .range([height, 0]);

                var yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .ticks(5);

                var parent = $(resultsContainer).empty();

                // create svg
                var svg = d3.select('#' + parent.attr('id'))
                    .append('svg')
                    .attr("width", svgWidth)
                    .attr("height", svgHeight);

                var inner = svg.append("g")
                   .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                // x axis
                var xAxisGroup = inner.append("g")
                        .attr("transform", "translate(0," + height + ")");

                xAxisGroup.call(xAxis);

                xAxisGroup.selectAll("line,path")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("shape-rendering", "crispEdges");

                xAxisGroup.selectAll(".domain")
                    .attr("stroke", "none");

                xAxisGroup.selectAll("text")
                    .style("text-anchor", "end")
                    .attr("dx", "-.8em")
                    .attr("dy", ".15em")
                    .attr("transform", "rotate(-65)")
                    .attr("font-family", "sans-serif")
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px");


                // y axis
                var yAxisGroup = inner.append("g");

                yAxisGroup.call(yAxis);

                yAxisGroup.selectAll("text")
                    .attr("font-family", "sans-serif")
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px");

                yAxisGroup.selectAll("line,path")
                    .attr("fill", "none")
                    .attr("stroke", "#333333")
                    .attr("shape-rendering", "crispEdges");

                var xOffset = 0;
                var xSpace = width / theData.length;
                if (theData.length > 1) {
                    var range = xScale.range();
                    xSpace = range[1] - range[0];
                    for (var i = 1; i + 1 < theData.length; i++) {
                        var diff = range[i + 1] - range[i]
                        if (diff < xSpace) {
                            xSpace = diff;
                        }
                    }
                    xOffset = range[0] - (xSpace / 2);
                }

                var bars = inner.append("g")
                    .selectAll("g")
                    .data(theData)
                    .enter().append("g")
                    .attr("transform", function (d, j) { return "translate(" + (xOffset + (j * xSpace)) + ",0)"; });

                var barMargin = 6;
                var barWidth = xSpace - (2 * barMargin);

                bars.append("rect")
                    .attr("x", barMargin)
                    .attr("y", function (d) { return yScale(ySelector(d)); })
                    .attr("height", function (d) { return height - yScale(ySelector(d)); })
                    .attr("width", barWidth - 1)
                    .on('mouseover', function (d) {
                        d3.select(this.parentNode).selectAll("rect").attr("opacity", 0.8);
                        d3.select(this.parentNode).selectAll("text").attr("fill", "black");
                    }).on('mouseout', function (d) {
                        d3.select(this.parentNode).selectAll("rect").attr("opacity", 1);
                        d3.select(this.parentNode).selectAll("text").attr("fill", "none");
                    })
                    .attr("fill", "rgb(255, 100, 100)");

                bars.append("text")
                    .attr("text-anchor", "middle")
                    .attr("fill", "none")
                    .attr("x", barMargin + (.5 * barWidth))
                    .attr("y", function (d) { return yScale(ySelector(d)) - 3; })
                    .text(function (d) { return ySelector(d); });

                svg.attr("height", $('svg > g').get(0).getBBox().height + 6);

                $(".bar").css("background-color", "Red");
                break;
            case "Pie Chart":
                var radius = Math.min(width, height) / 2;

                var unfilteredData = data.slice(0, 25);
                var total = unfilteredData.reduce(function (curr, row) { return curr + row[yIndex]; }, 0);

                var other = 0;
                var theData = [];

                $.each(unfilteredData, function (i, row) {
                    if (total != 0) {
                        var percentage = 100 * row[yIndex] / total;
                        if (percentage >= 1) {
                            theData.push([row[xIndex], row[yIndex], percentage, false]);
                        } else {
                            other += row[yIndex];
                        }
                    } else {
                        theData.push([row[xIndex], row[yIndex], null, false]);
                    }
                });

                if (other > 0) {
                    theData.push(["Other", other, total != 0 ? other / total : null, true]);
                }


                theData.sort(function (a, b) {
                    if (a[1] < b[1]) {
                        return -1;
                    }
                    if (a[1] > b[1]) {
                        return 1;
                    }
                    // a must be equal to b
                    return 0;
                });


                var xSelector = function (d) { return d[xIndex]; };
                var ySelector = function (d) { return d[yIndex]; };

                var pie = d3.layout.pie()
                    .sort(null)
                    .startAngle(-0.25 * Math.PI)
                    .endAngle(1.75 * Math.PI)
                    .value(function (d) {
                        return d[1];
                    });

                var arc = d3.svg.arc()
                    .outerRadius(radius * 0.8)
                    .innerRadius(radius * 0.4);

                var outerArc = d3.svg.arc()
                    .outerRadius(radius * 0.9)
                    .innerRadius(radius * 0.9);

                var parent = $(resultsContainer).empty();

                // create svg
                var svg = d3.select('#' + parent.attr('id'))
                    .append('svg')
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom);

                var g = svg.append("g")
                   .attr("transform", "translate(" + (margin.left + (width / 2)) + "," + (margin.top + (height / 2)) + ")");

                var lineFunction = d3.svg.line()
                    .x(function (d) { return d[0]; })
                    .y(function (d) { return d[1]; })
                    .interpolate("linear");

                var getLabel = function (segment) {
                    var result = segment.data[0]

                    //if (instance.LabelType() == "Name and Value") {
                    result += " (" + segment.data[1] + ")";
                    //} else if (instance.LabelType() == "Name and Percentage") {
                    //    if (segment.data[2] != null) {
                    //        result += " (" + parseFloat(segment.data[2].toPrecision(3)) + "%)";
                    //    } else {
                    //        result += " (" + segment.data[1] + ")";
                    //    }
                    //}
                    return result;
                }


                var colours = ['#98abc5', '#8a89a6', '#7b6888', '#6b486b', '#a05d56', '#d0743c', '#ff8c00', '#7283a2'];

                var otherColour = '#BBB';

                $.each(pie(theData), function (i, segment) {
                    var segmentGrp = g.append("g"),
                        innerPoint = arc.centroid(segment),
                        outerPoint = outerArc.centroid(segment),
                        onLeftSide = outerPoint[0] < 0,
                        textPoint = [onLeftSide ? -radius : radius, outerPoint[1]];

                    var slice = segmentGrp.append("path")
                        .attr("fill", (segment.data[3] ? otherColour : colours[i % colours.length]))
                        .attr("d", arc(segment));

                    var lineGraph = segmentGrp.append("path")
                        .attr("d", lineFunction([innerPoint, outerPoint, textPoint]))
                        .attr("stroke", "black")
                        .attr("stroke-width", 1)
                        .attr("fill", "none");

                    var text = segmentGrp.append("text")
                        .text(getLabel(segment))
                        .attr('x', textPoint[0])
                        .attr('y', textPoint[1])
                        .attr('text-anchor', onLeftSide ? 'end' : 'start')
                        .attr('alignment-baseline', 'middle');

                })

                break;
            default:
                $(resultsContainer).empty();
        }

    } else {
        $(resultsContainer).empty();
    }
}