var data, cleanData;
var fields = ["airTemp","calories","date","epoch","gsr","heartrate","skinTemp","steps"]

var mainParameters = {
	'heartrate': {
		'h': 90,
		'l': 60,
		'interval' : 10, //in minutes
		'showAnomalies': false
	}
}

$(document).ready( function() {
	data = loadData();
	cleanData = cleanData(data['1'])
	showHeartRateWeek();
});

function loadData() {
	var dataDict = {};
	$.each(mainData, function(i,obj) {
		if (dataDict[obj['id'].trim()] === undefined) {
			dataDict[obj['id'].trim()] = [];
		}

		dataDict[obj['id'].trim()].push({
			"airTemp": obj['airTemp'].trim(),
			"calories": obj['calories'].trim(),
			"date": obj['date_human'].trim(),
			"epoch": obj['date_epoch'].trim(),
			"gsr": obj['gsr'].trim(),
			"heartrate": obj['heartrate'].trim(),
			"skinTemp": obj['skinTemp'].trim(),
			"steps": obj['steps'].trim()
		});
	});
	return dataDict;
}

function cleanData(data) {
	var clean = {};
	for (var i = 0; i<= 1439 ; i++) {
		clean[i] = '';
	}

	var min;
	$.each(data,function(i,d) {
		min = (d.epoch%3600)/60;
		hour = new Date(d.date).getHours()
		minday = (hour*60)+min;
		clean[minday] = d;
	});

	return clean;
}


function buildMainTable() {
	var scan = mainData[0];
	var str = "<td>Mr. John Doe</td><td>"+scan['heartrate']+"</td><td>"+scan['skinTemp']+"</td><td>"+scan['heartrate']+"</td><td></td>"
	$("#mainTableBody").append()
}

function createConfigFile(data,target,id,className,field) {
	var configData = setConfigData(data,field);
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
		date: new Date(data[0].date_human),
		width: 800,
		height: 60,
		data: configData,
		interpolate: 'basis',
		xAxisData: '',
		yAxisData: '',
		anomalies: getDataAnomalies(data)
	}
}

/*
	Function that processes the data for one day and then detects the moments when the heart rate was over or under the defined parameters.

	@returns Object that includes two arrays: One array of pairs of data values (beginning and end) of the moments above the normal range. Another array with the same structure but for moments under the normal range.
*/
function getDataAnomalies(data) {
	var temp = [];
	var high = false;
	var low = false;
	var prev;
	var anomalies = { high:[], low:[]};
	$.each(data, function(i,d) {
		if (d.heartrate > mainParameters.heartrate.h) {
			if (low) {
				prev = data[i-1];
				prev['id'] = (i-1);
				temp.push(prev);
				anomalies.low.push(temp);
				temp = [];
				low = false;
			}

			if (!high) {
				d['id'] =i;
				temp.push(d);
				high = true;
			}
		}
		else {
			if (high) {
				if (temp[0].date_epoch != data[i-1].date_epoch) {
					prev = data[i-1];
					prev['id'] = (i-1);
					temp.push(prev);	
				}
				anomalies.high.push(temp);
				temp = [];
				high = false;
			}
		}
		
		if (d.heartrate < mainParameters.heartrate.l) {
			if (high) {
				prev = data[i-1];
				prev['id'] = (i-1);
				temp.push(prev);
				anomalies.high.push(temp);
				temp = [];
				high = false;
			}

			if (!low) {
				d['id'] =i;
				temp.push(d);
				low = true;
			}
		}
		else {
			if (low) {
				if (temp[0].date_epoch != data[i-1].date_epoch) {
					prev = data[i-1];
					prev['id'] = (i-1);
					temp.push(prev);
				}
				anomalies.low.push(temp);
				temp = [];
				low = false;
			}
		}
	})
	return anomalies;
}

/*
	Simple function that analizes the date and returns the name of the day of the week.
*/
function getDateDay(date) {
	var weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
	var d = new Date(date['date_human']);
	return weekdays[d.getDay()];
}


function setConfigData(data,field) {
	var configData = []
	$.each(data, function(i,d) {
		//selects intervals of minutes (600 = 10 mins, 300 = 5 mins, etc...)
		var time = new Date(d.date_human);
		if (time.getMinutes()%mainParameters.heartrate.interval == 0) {
			if (d[field] === 'None' || d.date_epoch =="") {	
				configData.push("0");
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
	    .range([0, width]);

	var y = d3.scale.linear()
		.domain([0,110])
	    .range([height-5, 0]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");

	var line = d3.svg.line().interpolate(config.interpolate)
	    .x(function(d,i) { return x(i); })
	    .y(function(d) { return y(d); });

	var dayHeader = d3.select(config.target).append('div')
			.attr("id",config.id)
			.attr("class",config.className)
		.append('div')
			.attr("class","chartDayHeader")
		.append('div')
		
	dayHeader.append('h3')
		.text(config.day);
		
	// This would add the month and day underneath the day of the week	
	// dayHeader.append('span')
	// 	.text((config.date.getMonth()+1) +"/"+config.date.getDate());
		
	d3.select(config.target+" #"+config.id)
		.append('div')
			.attr("class","chartDayArea");

	var svg = d3.select("#"+config.id+" .chartDayArea").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Adds the Y-Axis to the chart. Not need for the hear rate.
	// svg.append("g")
	//   .attr("class", "y axis")
	//   .call(yAxis);

	svg.append("text")
	  .attr("transform", "rotate(-90)")
	  .attr("y", 6)
	  .attr("dy", ".71em")
	  .style("text-anchor", "end");

	svg.append("path")
	  .datum(config.data)
	  .attr("class", "line")
	  .attr("d", line);

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

	addAnomalyLine(svg,mainParameters.heartrate.h);
	addAnomalyLine(svg,mainParameters.heartrate.l);

	var addAnomaliesToChart = function(anomalies, type) {
		$.each(anomalies, function(i,d) {
			if (d.length>1) {
				svg.append("rect")
					.attr({
						"x": function() { 
							var ax = x(d[0].id/mainParameters.heartrate.interval); 
							return ax; 
						},
						"y": function() {
							if (type != "h")
								return y(mainParameters.heartrate.l);
							else 
								return 0;
						},
						"width": function() { 
							var w = x(d[1].id - d[0].id);
							return w; 
						},
						"height": function() {
							if (type != "h") 
								return y(mainParameters.heartrate.l);
							else
								return y(mainParameters.heartrate.h);
						},
						"class": "heartAnomaly"
					})
			}
		})
	}

	if (mainParameters.heartrate.showAnomalies) {
		addAnomaliesToChart(config.anomalies.high,"h");
		addAnomaliesToChart(config.anomalies.low,"l");		
	}


}




function getWeekData(field) {
	var week = [];	 
	var start = parseInt('1401951600');
	var end = start + 86400;
	for (var i = 0; i<7; i++) {
		week.push(getDayData(start,end,field));
		start = end;
		end = end +86400;
	}
	return week;
}


function getDayData(start,end, field) {
	
	var clean = {};
	for (var i = 0; i<= 1439 ; i++) {
		clean[i] = {
			field : 0,
			date_human: '',
			date_epoch: ''
		};
	}
	var min;
	var day = [];
	$.each(mainData, function(i,d) {
		if (parseInt(d.date_epoch.trim()) >= start && parseInt(d.date_epoch.trim()) < end) {
			var t = {}
			t[field] = d[field].trim();
			t['date_human'] = d['date_human'].trim();
			t['date_epoch'] = parseInt(d['date_epoch'].trim());
			
			minday = (new Date(t['date_human']).getHours() *60) + ((t['date_epoch']%3600)/60)
			clean[minday] = t;
		}
	});

	$.map(clean, function(obj,k) {
		day.push(obj);
	})
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


function buildTimeScale(data) {
	var x = d3.scale.linear()
		.domain([0,24])
	    .range([5, 800]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .ticks(data.length)
	    .tickSize(10,1)

	var svg = d3.select("#heartRate").append("div")
				.attr("class","scale")
				.append("svg")
					.attr("class", "axis")
					.attr("class", "timeScale")
					.attr("width", 790)
					.attr("height", 65)
	svg.append("g")
		.attr("class","timeAxis")
		.attr("transform", "translate(0,40)")
		.call(xAxis)
		.selectAll("text")
			.attr("class","tickLabel")
			.attr("transform","translate(0,-50)");

	svg.selectAll(".domain")
		.attr("stroke","gray")
		.style('fill','none');

	// Adjusts the size of the vertical ticks from the scale
	svg.selectAll(".tick line")
		.attr("transform","translate(0,-20)")
		.attr("y2",40)

	// Removes the first tick line from the scale (when 0:00 hrs of the day)
	svg.select(".tick line")
		.attr("y2",0)

	//Changing the scale labels
	var scaleLabels =["",1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24];
	$.each($(".tick text"),function(i,d) {
		$(d).html(scaleLabels[i]);
	})

	
}

function showHeartRateWeek() {
	$("#heartRate").html('');
	$("#heartRate").toggle();
	
	buildTimeScale([7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,1,2,3,4,5,6]);
	createWeekHeartRate();
}

