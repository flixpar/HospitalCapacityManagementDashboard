export {makeDataCompareFigure};
import {makeLegend} from "./common.js";

const lineColors = {
	"realdata": "gray",
	"shortterm":  "#006C67",
	"longterm":  "#454E9E",
	"default": "black",
};
const capacityColors = ["gold", "darkorange", "red", "purple", "black", "magenta"];
const axisColor = "#4a4a4a";

const font = "Helvetica, sans-serif";
const fontSizes = {
	axis: 8,
	title: 10,
};

const lineWidth = 1.25;

const figureMargins = {left: 5, right: 5, top: 5, bottom: 5};
const plotMargins   = {left: 0, right: 0, top: 0, bottom: 0, between: 20};
const plotPadding   = {left: 25, right: 0, top: 16, bottom: 30};
const plotSize      = {height: 200, width: 600};


function makeDataCompareFigure(response, datatype) {
	const N = response.hospitals.length;

	const totalWidth = plotSize.width + plotMargins.left + plotMargins.right + figureMargins.left + figureMargins.right;
	const totalHeight = figureMargins.top + figureMargins.bottom + N * (plotSize.height + plotMargins.top + plotMargins.bottom) + (N - 1) * (plotMargins.between);
	const svg = d3.create("svg").attr("viewBox", [0, 0, totalWidth, totalHeight]);

	for (let i = 0; i < N; i++) {
		let container = svg.append("g").attr("transform", `translate(${figureMargins.left + plotMargins.left}, ${figureMargins.top + i * (plotMargins.top + plotSize.height + plotMargins.between + plotMargins.bottom)})`);
		container = plotHospital(response, datatype, i, container, svg);
	}

	makeDataCompareLegend(svg, response, datatype);

	svg.node().dispatchEvent(new Event("buildTooltips"));

	return svg.node();
}

function plotHospital(response, datatype, locIdx, container, svg) {

	const data = extractData(response, datatype, locIdx);

	const plotInnerSize = {width: plotSize.width - plotPadding.left - plotPadding.right, height: plotSize.height - plotPadding.top - plotPadding.bottom};

	const xScale = d3.scaleUtc()
		.domain(d3.extent(data.meta.dates))
		.range([plotPadding.left, plotPadding.left + plotInnerSize.width]);
	const yScale = d3.scaleLinear()
		.domain([0, data.meta.maxY+10]).nice()
		.range([plotSize.height - plotPadding.bottom, plotPadding.top]);

	const xAxis = g => g
		.attr("transform", `translate(${0},${plotSize.height - plotPadding.bottom})`)
		.style("font-family", font)
		.style("font-size", fontSizes.axis)
		.call(d3.axisBottom(xScale)
			.ticks(d3.utcWeek.every(12))
			.tickSizeOuter(4)
			.tickFormat(d3.utcFormat("%Y-%m-%d"))
		)
		.call(g => g.select(".domain").remove())
		.call(g => g.selectAll(".tick line")
			.attr("stroke", axisColor)
			.attr("stroke-width", 0.5)
			.attr("stroke-opacity", 0.75)
		)
		.call(g => g.selectAll(".tick text")
			.attr("fill", axisColor)
			.attr("dy", 10)
		);

	const yAxis = g => g
		.attr("transform", `translate(${plotPadding.left},0)`)
		.call(d3.axisLeft(yScale)
			.ticks(4)
			.tickSize(-plotInnerSize.width)
		)
		.call(g => g.select(".domain").remove())
		.call(g => g.selectAll(".tick line")
			.attr("stroke", axisColor)
			.attr("stroke-width", 0.5)
			.attr("stroke-opacity", 0.5)
			.attr("stroke-dasharray", "4,4")
		)
		.call(g => g.selectAll(".tick text")
			.attr("fill", axisColor)
			.attr("font-family", font)
			.attr("font-size", fontSizes.axis)
		);

	container.append("g")
		.call(xAxis);
	container.append("g")
		.call(yAxis);

	container = plotLine(data.longterm, xScale, yScale, container, lineColors.longterm);
	container = plotLine(data.shortterm, xScale, yScale, container, lineColors.shortterm);
	container = plotLine(data.realdata, xScale, yScale, container, lineColors.realdata);

	data.capacity.forEach((capacity, c) => {
		if (capacity[0].value >= yScale.domain()[1]) {return;}
		container = plotLine(capacity, xScale, yScale, container, capacityColors[c]);
	});

	const yAxisText = (datatype == "occupancy" ? "Occupancy" : "Admissions");
	container.append("text")
		.attr("transform", `translate(4, ${plotSize.height / 2}) rotate(-90)`)
		.attr("text-anchor", "middle")
		.style("font-family", font)
		.style("font-size", fontSizes.axis)
		.text(yAxisText);

	const titleText = (datatype == "occupancy" ? "COVID Occupancy: " : "COVID Patient Admissions: ") + response.hospitals[locIdx];
	container.append("text")
		.attr("x", plotSize.width / 2)
		.attr("y", 5)
		.attr("text-anchor", "middle")
		.style("font-family", font)
		.style("font-size", fontSizes.title)
		.text(titleText);

	const tooltip = new Tooltip(data, xScale, yScale, container, svg);

	return container;
}

function extractData(response, datatype, locIdx) {
	const realdataX = response.realdata.meta.date_range.map(d => new Date(d));
	const realdataY = response.realdata[datatype].map(x => x[locIdx]);
	const realdataData = realdataX.map((x, i) => ({date: x, value: realdataY[i], label: "Historical Data"}));

	let allDates = realdataX;
	let maxY = d3.max(realdataY);

	let longtermData = null;
	if (response.longterm.meta.available) {
		const longtermX = response.longterm.meta.date_range.map(d => new Date(d));
		const longtermY = response.longterm[datatype].map(x => x[locIdx]);
		longtermData = longtermX.map((x, i) => ({date: x, value: longtermY[i], label: "Long-Term Forecast"}));
		allDates = allDates.concat(longtermX);
		maxY = Math.max(maxY, d3.max(longtermY));
	}

	let shorttermData = null;
	if (response.shortterm.meta.available) {
		const shorttermX = response.shortterm.meta.date_range.map(d => new Date(d));
		const shorttermY = response.shortterm[datatype].map(x => x[locIdx]);
		shorttermData = shorttermX.map((x, i) => ({date: x, value: shorttermY[i], label: "Short-Term Forecast"}));
		allDates = allDates.concat(shorttermX);
		maxY = Math.max(maxY, d3.max(shorttermY));
	}

	allDates = [...new Set(allDates)];

	const capacityData = (datatype != "occupancy") ? [] : response.meta.capacity_names.map((cn,c) => {
		return allDates.map(d => {
			return {date: d, value: response.capacity_levels[c][locIdx], label: cn + " Capacity"};
		});
	});

	return {
		realdata: realdataData,
		longterm: longtermData,
		shortterm: shorttermData,
		capacity: capacityData,
		meta: {
			dates: allDates,
			maxY: maxY,
			datatype: datatype,
			locName: response.hospitals[locIdx],
		},
	}
}

function plotLine(data, xScale, yScale, container, lineColor) {

	if (data == null) {return container;}

	const line = d3.line()
		.defined(d => !isNaN(d.value) && d.value != null)
		.x(d => xScale(d.date))
		.y(d => yScale(d.value));

	container.append("path")
		.datum(data)
		.attr("fill", "none")
		.attr("stroke", lineColor)
		.attr("stroke-width", lineWidth)
		.attr("stroke-linejoin", "round")
		.attr("stroke-linecap", "round")
		.attr("d", line);

	return container;
}

class Tooltip {
	constructor(data, xScale, yScale, container, svg) {
		this.data = data;
		this.xScale = xScale;
		this.yScale = yScale;
		this.container = container;
		this.svg = svg;

		this.lines = [data.realdata, data.shortterm, data.longterm];
		data.capacity.forEach(c => {
			if (c[0].value < yScale.domain()[1]) {this.lines.push(c);}
		});

		let tmpSVG = d3.create("svg");
		let tmpNode = tmpSVG.append("g")
			.attr("pointer-events", "none")
			.attr("display", "none")
			.attr("font-family", font)
			.attr("font-size", fontSizes.axis)
			.attr("text-anchor", "middle");

		this.bubble = tmpNode.append("rect")
			.attr("transform", "translate(-50, -65)")
			.attr("width", 100)
			.attr("height", 45)
			.attr("fill", "white")
			.attr("stroke", "gray")
			.attr("stroke-width", 1.5);
		this.topTab = tmpNode.append("rect")
			.attr("transform", "translate(0, -72) rotate(45)")
			.attr("width", 12)
			.attr("height", 12)
			.attr("fill", "white")
			.attr("stroke", "gray")
			.attr("stroke-width", 1.0);
		this.bottomTab = tmpNode.append("rect")
			.attr("transform", "translate(0, -30) rotate(45)")
			.attr("width", 12)
			.attr("height", 12)
			.attr("fill", "white")
			.attr("stroke", "gray")
			.attr("stroke-width", 1.0);
		this.bubbleBackground = tmpNode.append("rect")
			.attr("transform", "translate(-50, -65)")
			.attr("width", 100)
			.attr("height", 45)
			.attr("fill", "white");

		this.line1 = tmpNode.append("text").attr("y", "-55").node();
		this.line2 = tmpNode.append("text").attr("y", "-45").node();
		this.line3 = tmpNode.append("text").attr("y", "-35").node();
		this.line4 = tmpNode.append("text").attr("y", "-25").node();

		this.point = tmpNode.append("circle")
			.attr("stroke", "black")
			.attr("fill", "none")
			.attr("r", 2);

		container.attr("pointer-events", "bounding-box");

		this.bisectDate = d3.bisector(d => d.date).center;
		this.dateFormat = d3.utcFormat("%Y-%m-%d");

		let pt = svg.node().createSVGPoint();
		function cursorLoc(e) {
			pt.x = e.clientX;
			pt.y = e.clientY;
			return pt.matrixTransform(container.node().getScreenCTM().inverse());
		}

		container.on("mousemove", e => {
			const pt = cursorLoc(e);
			const d = this.bisectData(this.xScale.invert(pt.x), this.yScale.invert(pt.y));
			if (d != null) {this.show(d);}
		});
		container.on("mouseleave", () => this.hide());

		this.svg.node().addEventListener("buildTooltips", () => this.build());

		this.node = tmpNode;
	}

	show(d, pt) {
		this.node.attr("display", "");
		this.node.attr("transform", `${this.container.attr("transform")} translate(${this.xScale(d.date)},${this.yScale(d.value)})`);

		if (this.yScale(d.value) < 60) {
			this.node.attr("transform", `${this.node.attr("transform")} translate(0,80)`);
			this.topTab.attr("display", "");
			this.bottomTab.attr("display", "none");
			this.point.attr("transform", "translate(0,-80)");
		} else {
			this.topTab.attr("display", "none");
			this.bottomTab.attr("display", "");
			this.point.attr("transform", "");
		}

		const datatypeStr = (d.label.indexOf("Capacity") >= 0) ? "Beds" : (this.data.meta.datatype == "occupancy") ? "Occupancy" : "Admissions";

		this.line1.textContent = this.data.meta.locName;
		this.line2.textContent = d.label;
		this.line3.textContent = this.dateFormat(d.date);
		this.line4.textContent = datatypeStr + ": " + d.value.toFixed(0);
	}

	hide() {
		this.node.attr("display", "none");
	}

	build() {
		this.svg.append(() => this.node.node());
	}

	bisectData(date, yval) {
		const dists = this.lines.map(l => {
			if (l == null) {return Infinity;}
			const closestDateIdx = this.bisectDate(l, date, 1);
			const closestDate = l[closestDateIdx].date;
			if (this.dateFormat(date) != this.dateFormat(closestDate)) {return Infinity;}

			const v = l[closestDateIdx].value;
			return Math.abs(yval - v);
		});

		const lineIdx = d3.minIndex(dists);
		const dateIdx = this.bisectDate(this.lines[lineIdx], date, 1);

		if (dists[lineIdx] == Infinity) {return null;}
		return this.lines[lineIdx][dateIdx];
	}
}

function makeDataCompareLegend(svg, response, datatype) {

	if (datatype == "occupancy") {
		const row2Labels = response.meta.capacity_names.map(x => x + " Capacity");
		const row2Colors = response.meta.capacity_names.map((_,i) => capacityColors[i]);
		svg = makeLegend(svg, row2Labels, row2Colors, true, "top");
	}

	const row1Labels = ["Short-Term Forecast", "Long-Term Forecast", "Historical Data"];
	const row1Colors = [lineColors.shortterm, lineColors.longterm, lineColors.realdata];
	svg = makeLegend(svg, row1Labels, row1Colors, true, "top");

	return svg;
}
