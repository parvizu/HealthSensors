var data;
var fields = ["airTemp","calories","date","epoch","gsr","heartrate","skinTemp","steps"]

$(document).ready( function() {
	data = loadData();


	buildHeartRateScale();
});

function loadData() {
	var dataDict = {}
	$.each(mainData, function(i,obj) {
		if (dataDict[obj['id'].trim()] === undefined) {
			dataDict[obj['id'].trim()] = [];
		}


		dataDict[obj['id'].trim()].push({
			"airTemp": obj['airTemp'].trim(),
			"calories": obj['calories'].trim(),
			"date": obj['date'].trim(),
			"epoch": obj['date_epoch'].trim(),
			"gsr": obj['gsr'].trim(),
			"heartrate": obj['heartrate'].trim(),
			"skinTemp": obj['skinTemp'].trim(),
			"steps": obj['steps'].trim()
		});
	})
	return dataDict;
}

function buildMainTable() {
	var scan = mainData[0];
	var str = "<td>Mr. John Doe</td><td>"+scan['heartrate']+"</td><td>"+scan['skinTemp']+"</td><td>"+scan['heartrate']+"</td><td></td>"
	$("#mainTableBody").append()
}

var mainParameters = {
	'heartrate': {
		'h': 90,
		'l': 60
	}
}

function addTimeScale(data,target) {
	d3.select('#'+target).append('svg')
		.attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)

	var anomalyLine = d3.svg.line()
			.x(function(d) { return x(d.x); })
	    	.y(function(d) { return y(d.y); });

	console.log(mainParameters.heartrate.h);
	console.log(d3.max(config.data));

	// anomalyHigh = [{'x': 0,'y':mainParameters.heartrate.h},{'x': config.data.length,'y':mainParameters.heartrate.h}];
	// anomalyLow = [{'x': 0,'y':mainParameters.heartrate.l},{'x': config.data.length,'y':mainParameters.heartrate.l}];
	
	console.log(anomalyHigh);
	svg.append("path")
		.attr("class", "line")
		.attr("stroke-dasharray","3,3")
		.attr("d",anomalyLine(anomalyHigh));

	svg.append("path")
		.attr("class", "line")
		.attr("stroke-dasharray","3,3")
		.attr("d",anomalyLine(anomalyLow));
}

function createConfigFile(data,target,id,className,field) {
	return {
		target: target,
		id: id,
		className: className,
		margin: {
			'top': 0,
			'right': 0,
			'bottom': 0,
			'left': 5
		},
		day: getDateDay(data[1]),
		width: 800,
		height: 60,
		data: setConfigData(data,field),
		interpolate: 'basis',
		xAxisData: '',
		yAxisData: ''
	}
}

function getDateDay(date) {
	
	var weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	d = new Date(date['date_human']);
	// console.log(date);
	return weekdays[d.getDay()];
}

function setConfigData(data,field) {
	var configData = []
	$.each(data, function(i,d) {
		if (d.date_epoch%200 == 0) {
			if (d[field] === 'None') {	
				configData.push('');
			}
			else {
				configData.push(d[field]);
			}
		}
	});
	return configData;
}	

function createLineChart(config) {
	var margin = {
					top: config.margin.top, 
					right: config.margin.right, 
					bottom: config.margin.bottom, 
					left: config.margin.left},
	    width = config.width - margin.left - margin.right,
	    height = config.height - margin.top - margin.bottom;

	var parseDate = d3.time.format("%Y-%m-%d").parse;

	var x = d3.scale.linear()
		.domain([0,config.data.length])
	    .range([15, width-20]);

	var y = d3.scale.linear()
		.domain([0,110])
	    .range([height-5, 5]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");

	var line = d3.svg.line().interpolate(config.interpolate)
	    .x(function(d,i) { return x(i); })
	    .y(function(d) { return y(d); });

	d3.select(config.target).append('div')
			.attr("id",config.id)
			.attr("class",config.className)
		.append('div')
			.attr("class","chartDayHeader")
		.append('h2')
		.text(config.day);
		
	d3.select(config.target+" #"+config.id)
		.append('div')
			.attr("class","chartDayArea");

	var svg = d3.select("#"+config.id+" .chartDayArea").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("g")
	  .attr("class", "y axis")
	  .call(yAxis)

	.append("text")
	  .attr("transform", "rotate(-90)")
	  .attr("y", 6)
	  .attr("dy", ".71em")
	  .style("text-anchor", "end");

	svg.append("path")
	  .datum(config.data)
	  // .data(config.data)
	  .attr("class", "line")
	  .attr("d", line);

	var anomalyLine = d3.svg.line()
			.x(function(d) { return x(d.x); })
	    	.y(function(d) { return y(d.y); });

	// anomalyHigh = [{'x': 0,'y':mainParameters.heartrate.h},{'x': config.data.length,'y':mainParameters.heartrate.h}];
	// anomalyLow = [{'x': 0,'y':mainParameters.heartrate.l},{'x': config.data.length,'y':mainParameters.heartrate.l}];

	var anomalyLine = d3.svg.line()
			.x(function(d) { return x(d.x); })
	    	.y(function(d) { return y(d.y); });

	var addAnomalyLine = function(svg,value) {
		anomalyData = [{'x': 0,'y':value},{'x': config.data.length,'y':value}];
		svg.append("path")
			.attr("class", "line")
			.attr("stroke-dasharray","1,2")
			.attr("d",anomalyLine(anomalyData));
	}

	// addAnomalyLine(svg,90);
	addAnomalyLine(svg,mainParameters.heartrate.h);
	addAnomalyLine(svg,mainParameters.heartrate.l);
	// addAnomalyLine(svg,30);

	console.log(mainParameters.heartrate.h);
	
	
}

function getWeekData(field) {
	var week = [];	 
	var start = parseInt('1402495200');
	var end = start + 61200;
	for (var i = 0; i<7; i++) {
		week.push(getDayData(start,end,field));
		start = end;
		end = end +61200;
	}
	return week;
}

function getDayData(start,end, field) {
	var day = [];
	// console.log(start);
	// console.log(end);
	$.each(mainData, function(i,d) {
		if (parseInt(d.date_epoch.trim()) >= start && parseInt(d.date_epoch.trim()) < end) {
			var t = {}
			t[field] = d[field].trim();
			t['date_human'] = d['date'].trim();
			t['date_epoch'] = parseInt(d['date_epoch'].trim());
			day.push(t);
		}
	});
	return day;
}


function createWeekHeartRate() {
	var week = getWeekData('heartrate');
	var dayConfig;
	$.each(week, function(i,d) {
		dayConfig = createConfigFile(d,'#heartRate','hr'+i,'heartrate','heartrate');
		createLineChart(dayConfig);
	})
}

function buildHeartRateScale() {

}

function showHeartRateWeek() {
	$("#heartRate").html('');
	$("#heartRate").toggle();
	
	createWeekHeartRate();

}

