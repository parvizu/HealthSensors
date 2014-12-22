var data;
var fields = ["airTemp","calories","date","epoch","gsr","heartrate","skinTemp","steps"]

console.log('data');
$(document).ready( function() {
	data = loadData();
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
		'h': 70,
		'l': 50
	}
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
		day: getDateDay(data[0]),
		width: 800,
		height: 60,
		data: setConfigData(data,field),
		interpolate: 'basis',
		xAxisData: '',
		yAxisData: ''
	}
}

function getDateDay(date) {
	console.log(date);
	var weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	d = new Date(date['date_epoch']);
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
		.domain([0,100])
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

	// svg.append("g")
	//   .attr("class", "x axis")
	//   .attr("transform", "translate(0," + height + ")")
	//   .call(xAxis)
	//   .text(config.xAxisName);

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

	console.log(mainParameters.heartrate.h);
	console.log(d3.max(config.data));

	anomalyHigh = [{'x': 1,'y':mainParameters.heartrate.h},{'x': config.data.length,'y':mainParameters.heartrate.h}];
	anomalyLow = [{'x': 1,'y':mainParameters.heartrate.l},{'x': config.data.length,'y':mainParameters.heartrate.l}];
	
	console.log(anomalyHigh);
	svg.append("path")
		.attr("class", "line")
		.attr("d",anomalyLine(anomalyHigh));

	svg.append("path")
		.attr("class", "line")
		.attr("d",anomalyLine(anomalyLow));
}


var configMonday = createConfigFile(oneday,'#heartRate','hr1','heartrate','heartrate');
createLineChart(configMonday);

var configTuesday = createConfigFile(daytwo,'#heartRate','hr2','heartrate','heartrate');
createLineChart(configTuesday);

