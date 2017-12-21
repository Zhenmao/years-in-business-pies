/* jshint esversion: 6 */
const margin = {top: 10, right: 10, bottom: 10, left: 10},
			width = 360 - margin.left - margin.right,
			height = 360 - margin.top - margin.bottom,
			widthAll = 720 - margin.left - margin.right,
			heightAll = 360 - margin.top - margin.bottom,
			radius = 180;

const ids = ["all", "male", "female", "veteran", "non-veteran", "hispanic", "non-hispanic",
			"white", "black", "asian", "native-hawaiian", "american-indian"];

let loadedData; // Store the loaded csv data

// Define the radius of an arc element
const arc = d3.arc()
		.outerRadius(radius * 0.8)
		.innerRadius(radius * 0.4);

const legendLineArc = d3.arc()
		.outerRadius(radius * 0.8)
		.innerRadius(radius * 0.8);

const legendTextArc = d3.arc()
		.outerRadius(radius * 0.9)
		.innerRadius(radius * 0.9);

const color = d3.scaleOrdinal()
		.domain(["311", "318", "319", "321", "322", "323"])
		.range(["#98abc5", "#8a89a6", "#7b6888", "#a05d56", "#d0743c", "#ff8c00"]);

d3.csv("data/business.csv", d => {
	// Shorten years in business lables for display
	switch (d.yearsInBusiness) {
		case "001": d.yearsInBusinessLabel = "All";
			break;
		case "311": d.yearsInBusinessLabel = "Less then 2 years";
			break;
		case "318": d.yearsInBusinessLabel = "2 to 3 years";
			break;
		case "319": d.yearsInBusinessLabel = "4 to 5 years";
			break;
		case "321": d.yearsInBusinessLabel = "6 to 10 years";
			break;
		case "322": d.yearsInBusinessLabel = "11 to 15 years";
			break;
		case "323": d.yearsInBusinessLabel = "More then 16 years";
			break;
	}
	return d;
}, (error, data) => {
	if (error) throw error;

	loadedData = data;

	const pies = d3.selectAll(".chart")
	.data(ids)
	.append("svg")
		.attr("width", d => d === "all" ?
			widthAll + margin.left + margin.right :
			width + margin.left + margin.right)
		.attr("height", d => d === "all" ?
			heightAll + margin.top + margin.bottom :
			height + margin.top + margin.bottom)
	.append("g")
		.attr("transform", d =>
			d === "all" ?
			`translate(${margin.left + widthAll / 2}, ${margin.top + heightAll / 2})` :
			`translate(${margin.left + width / 2}, ${margin.top + height / 2})`);

	// Draw pie chart
	pies.each(pieChart);

	// Click button to toggle showing and hiding the percentages
	d3.select(".btn").on("click", togglePercentages);
});

function pieChart(id) {
	// Filter the data with specific id
	const filtered = loadedData.filter(filterData(id));
	// Calculate the total for percentage calculation
	const total = filtered.reduce((total, curr) => total + (+curr.count), 0);
	// Add percentage to filtered data
	filtered.forEach(datum => {
		datum.percentage = +datum.count / total;
	});

	const pie = d3.pie()
			.sort(null)
			.padAngle(0.02)
			.value(d => +d.count);

	const g = d3.select(this);

	// Draw pie
	g.selectAll(".arc")
		.data(pie(filtered))
		.enter()
		.append("path")
			.attr("class", "arc")
			.attr("fill", d => color(d.data.yearsInBusiness))
		.transition()
			.ease(d3.easeLinear)
			.duration(2000)
			.attrTween("d", tweenArcs);

	// Add title at the center of the pie
	g.append("text")
			.attr("class", "title")
			.attr("dy", "0.35em")
			.style("text-anchor", "middle")
			.text(titleCase(id));

	// Add labels to each pie slices and hide them
	// Show the labels when hover the pie
	g.selectAll(".label")
		.data(pie(filtered))
		.enter()
		.append("text")
			.attr("class", "label")
			.attr("dy", "0.35em")
			.attr("transform", d => `translate(${arc.centroid(d)})`)
			.attr("fill", "#fff")
			.style("text-anchor", "middle")
			.style("pointer-event", "none")
			.style("display", "none")
			.text(d => d3.format(".0%")(d.data.percentage));

	// Draw legend and lines for the "All" pie
	// Start only after the pies have finished rendering
	if (id === "all") {
		setTimeout(drawLegend, 2000, g, pie(filtered));
	}
}

function drawLegend(g, arcs) {
	// Add legend labels
	g.selectAll(".legend-label")
		.data(arcs)
		.enter()
		.append("text")
			.attr("class", "legend-label")
			.attr("dy", "0.35em")
			.attr("fill", d => color(d.data.yearsInBusiness))
			.attr("transform", (d) => {
				const pos = legendTextArc.centroid(d);
				pos[0] = radius * (midAngle(d) < Math.PI ? 1 : -1);
				return `translate(${pos})`;
			})
			.style("text-anchor", d => midAngle(d) < Math.PI ? "start" : "end")
			.text(d => d.data.yearsInBusinessLabel);

	// Add legend lines
	g.selectAll(".legend-line")
		.data(arcs)
		.enter()
		.append("polyline")
			.attr("class", "legend-line")
			.attr("fill", "none")
			.attr("stroke-width", 1)
			.attr("stroke", "#000")
			.attr("points", (d) => {
				const pos = legendTextArc.centroid(d);
				pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
				return [legendLineArc.centroid(d), legendTextArc.centroid(d), pos];
			});

}

function tweenArcs(d) {
	const interpolator = getArcInterpolator(this, d);
	return function(t) {
		return arc(interpolator(t));
	};
}

function getArcInterpolator(el, d) {
	// Keep track of the old value by binding to the element
	const oldVale = el._oldValue;
	const interpolator = d3.interpolate({
		startAngle: oldVale ? oldVale.startAngle : 0,
		endAngle: oldVale ? oldVale.endAngle : 0
	}, d);
	// Get the start value and bind that for using it for the next interpolator
	el._oldValue = interpolator(0);
	return interpolator;
}

function togglePercentages() {
	const button = d3.select(this);
	if (button.text() === "Show Percentages") {
		// Show percentages and change button to "Hide Percentages"
		button.text("Hide Percentages");
		d3.selectAll(".label")
				.style("display", "");
	} else if (button.text() === "Hide Percentages") {
		// Hide percentages and change button to "Show Percentages"
		button.text("Show Percentages");
		d3.selectAll(".label")
				.style("display", "none");
	}
}

function filterData(id) {
	return window[(id + "Filter").replace("-", "")];
}

function allFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "00" &&
		el.yearsInBusiness !== "001";
}

function maleFilter(el) {
	return el.sex === "003" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "00" &&
		el.yearsInBusiness !== "001";
}

function femaleFilter(el) {
	return el.sex === "002" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "00" &&
		el.yearsInBusiness !== "001";
}

function veteranFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "002" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "00" &&
		el.yearsInBusiness !== "001";
}

function nonveteranFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "004" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "00" &&
		el.yearsInBusiness !== "001";
}

function hispanicFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "020" &&
		el.raceGroup === "00" &&
		el.yearsInBusiness !== "001";
}

function nonhispanicFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "029" &&
		el.raceGroup === "00" &&
		el.yearsInBusiness !== "001";
}

function whiteFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "30" &&
		el.yearsInBusiness !== "001";
}

function blackFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "40" &&
		el.yearsInBusiness !== "001";
}

function asianFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "60" &&
		el.yearsInBusiness !== "001";
}

function nativehawaiianFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "70" &&
		el.yearsInBusiness !== "001";
}

function americanindianFilter(el) {
	return el.sex === "001" &&
		el.vetGroup === "001" &&
		el.ethnicGroup === "001" &&
		el.raceGroup === "50" &&
		el.yearsInBusiness !== "001";
}

function midAngle(d) {
		return d.startAngle + (d.endAngle - d.startAngle) / 2;
}

function titleCase(title) {
	return title.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}




