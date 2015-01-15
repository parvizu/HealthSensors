var data, cleanData;
var fields = ["airTemp","calories","date","epoch","gsr","heartrate","skinTemp","steps"]

var userConfiguration = {
	'week':{
		'start': 0,
		'days':[],
		'maxValue':0,
		'data': []
	},
	'mainParameters': {},
	'active':'',
	'startDate': 0
}

var mainParameters = {
	'heartrate': {
		'h': 80,
		'l': 55,
		'showAnomalies': true
	},
	'steps': {},
	'gantt' : {
		'interval': 4 // in hours
	},
	'general': {
		'interval': 5, //in minutes
		'timeScale': function(x) {return 0;}

	}
}

$(document).ready( function() {
	data = loadData();
	getWeekData('1401951600');

	buildGantt();

	// TEMPORARY Uses the change button to update the interval.
	$("#changeInterval").on("click", function() {
		var interval = $("#interval").val();	
		if ($.isNumeric(interval) &&interval >0 && interval <=60 && interval !== '') {
			changeInterval(interval);
		}
		$("#interval").text("");
	})


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

/*
	Function that constructs the main week chart Gantt style based on the information of the week for all the different measurements. 

	The data used is in userConfiguration.week.data
*/
function buildGantt() {

	var weekdayNames = [];
	$.each(userConfiguration.week.data, function(i,day) {
		weekdayNames.push(getDateDay(day[0]));
	})

	$("#gantt .chartContent").html("");
	var svg = d3.select('#gantt .chartContent').append('svg')
				.attr({
					'width': 700,
					'height': 300
				});

	// Adding the day headers
	svg.selectAll('text')
		.data(weekdayNames)
		.enter()
		.append('text')
			.text(function(d) {
				return d;
			})
			.attr({
				'class':'dayHeader',
				'fill': 'black',
				'font-family': 'Helvetica',
				'font-size': '15px',
				'x': function(d,i) {
					return (i*95)+35;
				},
				'y':'20'
			});

	//Adding the vertical lines that divide the days
	for (var i = 0; i<8; i++) {
		svg.append('line')
			.attr({
				'x1': 1+(i*95)+i,
				'x2': 1+(i*95)+i,
				'y1': 10,
				'y2': 280,
				'stroke-width': .5,
				'stroke': 'black'
			})
	}
	//Adding the horizontal line that separates the day name
	svg.append('line')
		.attr({
			'x1': 1,
			'x2': 673,
			'y1': 30,
			'y2': 30,
			'stroke-width': .5,
			'stroke': 'black'
		})

	var weekData = []
	weekData = weekData.concat.apply(weekData,userConfiguration.week.data);

	/*
		Inner function that will create and append to the Gantt Svg the group of block for each measurement
	*/
	function addMeasurementBlocks(field,y) {
		var vals = [];
		$.map(weekData, function(obj,k) {
			if (obj[field] =='None') 
				vals.push(0)
			else
				vals.push(parseInt(obj[field]));
		})

		var color = d3.scale.linear()
			.domain([0,100])
			.range(['white','black']);

		var values =[];
		if (field == 'heartrate') {
			values = getAverageMeasurement(weekData,mainParameters.gantt.interval*60,field);
		} else if (field == 'steps') {
			values = getAggregateMeasurement(weekData,mainParameters.gantt.interval*60,field);
		} else { 
			//temporary just for testing calories and other measurements
			values = getAggregateMeasurement(weekData,mainParameters.gantt.interval*60,field);
		}
		
		var blockWidth = Math.floor(700/(values.length)-1);
		// console.log("Blocks : "+ values.length)
		// console.log('blockWidth: ' + blockWidth);
		if (values.length > 0) {
			// Creating and appending the rectangles that will represent the x-hour blocks of time.
			svg.append('g')
				.attr('class',fields)
			.selectAll('rect')
			.data(values)
			.enter()
			.append('rect')
				.attr({
					'width':blockWidth,
					'height':25,
					'x': function(d,i) {
						return 1+(i*blockWidth)+(i);
					},
					'y': 40+y,
					'fill': function(d) {
						return color(d['value']);
					},
					'value': function(d) {
						return d['value']
					}
				});

			values = [];
		}
		console.log(field + ":" + getMax(vals));
	}

	$.each(Object.keys(userConfiguration.week.data[0][0]), function(i,key) {
		if (key == 'steps' || key == 'heartrate' || key =='calories')
		addMeasurementBlocks(key,i*50);
	});

}

function getAverageMeasurement(data,interval,field) {
	var agg =0;
	var results = []
	var minute;
	var measurements =0;
	var anomalyOver = []; 
	var anomalyUnder = [];

	$.each(data,function(i,d) {
		minute = i+1;
		if (d[field]!='None') {
			var value = parseInt(d[field]);
			agg += value;
			measurements++;
			if (mainParameters[field] != undefined) {
				if (value > mainParameters[field].h) {
					anomalyOver.push(d);
				}
				else if (value < mainParameters[field].l) {
					anomalyUnder.push(d);
				}
			}
		}

		if (minute%interval == 0 ) {
			var avg = 0;
			if (measurements> 0)
				avg = agg/measurements;

			var res = {
				'value': avg,
				'measurements': measurements,
				'average': avg,
				'anomalies': {
					'over': anomalyOver,
					'under': anomalyUnder,
					'total': anomalyOver.length + anomalyUnder.length
				}
			}
			results.push(res);
			
			agg = 0;
			measurements = 0;
			anomalyOver= [];
			anomalyUnder = [];
		}
	})
	return results;
}

	
function getAggregateMeasurement(data,interval,field) {
	var agg =0;
	var results = []
	var minute;
	var measurements =0;
	var anomalyOver = [];
	var anomalyUnder = [];

	$.each(data,function(i,d) {
		minute = i+1;
		if (d[field]!='None') {
			var value = parseInt(d[field]);
			agg += value;
			measurements++;
			if (mainParameters[field] != undefined) {
				if (value > mainParameters[field].h) {
					anomalyOver.push(d);
				}
				else if (value < mainParameters[field].l) {
					anomalyUnder.push(d);
				}
			}
			
		}

		if (minute%interval == 0 ) {
			var res = {
				'value': agg,
				'measurements': measurements,
				'average': agg/measurements,
				'anomalies': {
					'over': anomalyOver,
					'under': anomalyUnder,
					'total': anomalyOver.length + anomalyUnder.length
				}
			}
			results.push(res);
			agg = 0;
			measurements= 0;
			anomalyOver= [];
			anomalyUnder = [];
		}
	})
	return results;
}



/*
	Function that creates the configuration file that is needed to create the different chart for each measurement. 
*/
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
			'left': 0
		},
		day: getDateDay(data[0]),
		date: new Date(data[0].date_human),
		width: 800,
		height: 60,
		data: configData.simple,
		interpolate: 'basis',
		xAxisData: '',
		yAxisData: '',
		anomalies: getDataAnomalies(configData.full, field)
	}
}

/*
	Function that processes the data for one day and then detects the moments when the heart rate was over or under the defined parameters.

	@returns Object that includes two arrays: One array of pairs of data values (beginning and end) of the moments above the normal range. Another array with the same structure but for moments under the normal range.
*/
function getDataAnomalies(data,field) {
	var temp = [];
	var high = false;
	var low = false;
	var prev;
	var anomalies = { high:[], low:[]};
	if ('showAnomalies' in mainParameters[field]) {
		$.each(data, function(i,d) {
			if (d[field] > mainParameters[field].h) {
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
			
			if (d[field] < mainParameters[field].l) {
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
		});
	}
	
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

/*
	This function returns the data used to create the different charts but considering the interval defined as a parameter in the mainParameters.general.interval element.

	It also takes in consideration the type of chart that will be built so it can transform/aggregate the data in the correct way (aggregate for bars, average for lines)
*/
function setConfigData(data,field) {
	var configData = { 
			'simple': [],
			'full': []
		}
	var aggregate = 0;
	if (field == 'steps') {
		$.each(data, function(i,d) {
			var time = new Date(d.date_human);
			var minute = i+1;
			if (d[field] !== 'None' && d.date_epoch !=="") {	
				aggregate+=parseInt(d[field]);
			}	

			if (minute%mainParameters.general.interval == 0) {
				configData.simple.push(aggregate);
				aggregate = 0;
			}	
			
		});
		// return configData;
	}
	else {
		$.each(data, function(i,d) {
			//selects intervals of minutes (600 = 10 mins, 300 = 5 mins, etc...)
			var time = new Date(d.date_human);
			if (time.getMinutes()%mainParameters.general.interval == 0) {
				if (d[field] === 'None' || d.date_epoch =="") {	
					configData.simple.push("0");
				}
				else {
					configData.simple.push(d[field]);	
				}
				configData.full.push(d);
			}
		});
	}
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

	getDayHeadersForWeeklyCharts(config.target,config.id,config.className,config.day);
		
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
	  .attr("d", line)
	  // .attr("transform","translate("+x(1)+")");

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
							// var ax = x(d[0].id/mainParameters.general.interval); 
							return x(d[0].id); 
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


/*
	Function that selects the data of the chosen week and sets it up in the userConfiguration element as well as returning it as an array. 

	This function gets the data of all the fields for the 1440 minutes of everyday.
*/
function getWeekData(start) {
	var week = [];	 
	var start = parseInt(start);
	if (start != userConfiguration.week.start) {
		userConfiguration.week.start = start;
		var end = start + 86400;
		for (var i = 0; i<7; i++) {
			week.push(getDayData(start,end));
			start = end;
			end = end +86400;
		}
		userConfiguration.week.data = week;
	}
	return userConfiguration.week.data;
}


/*
	Function that standardizes the structure of the data for one day based on the number of minutes in the day (1440).

	@Returns an array with the 1440 data points for the day.
*/
function getDayData(start,end) {
	//sets up a fresh object with all the minutes of the day
	var clean = {};
	for (var i = 0; i<= 1439 ; i++) {
		clean[i] = {
			heartrate : 0,
			steps: 0,
			calories: 0,
			gsr: 0,
			skinTemp: 0,
			airTemp: 0,
			date_human: '',
			date_epoch: ''
		};
	}
	var minday; //minute of the day
	var day = [];
	$.each(mainData, function(i,d) {
		if (parseInt(d.date_epoch.trim()) >= start && parseInt(d.date_epoch.trim()) < end) {
			var t = {
				'heartrate' : d['heartrate'].trim(),
				'steps': d['steps'].trim(),
				'calories': d['calories'].trim(),
				'gsr': d['gsr'].trim(),
				'skinTemp': d['skinTemp'].trim(),
				'airTemp': d['airTemp'].trim(),
				'date_human': d['date_human'].trim(),
				'date_epoch': parseInt(d['date_epoch'].trim())
			};
			
			minday = (new Date(t['date_human']).getHours() *60) + ((t['date_epoch']%3600)/60)
			clean[minday] = t;
		}
	});

	$.map(clean, function(obj,k) {
		day.push(obj);
	})
	return day;
}


function buildTimeScale(target,data) {
	var x = d3.scale.linear()
		.domain([0,24])
	    .range([0, 800]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .ticks(data.length)
	    .tickSize(10,1);

	var svg = d3.select("#"+target).append("div")
				.attr("class","scale")
				.append("svg")
					.attr("class", "axis")
					.attr("class", "timeScale")
					.attr("width", 810)
					.attr("height", 65);

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
		// $(d).attr("x","-5");
	});	
}


function showHeartRateWeek() {
	userConfiguration.active = 'heartrate';
	$(".subsection").hide();
	$("#heartRate").html('');
	$("#heartRate").toggle();
	
	buildTimeScale('heartRate',[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);
	createWeekChart('heartRate','1401951600','hr');
}


/*
	This function will create the weekley breakdown on a day by day basis of a particular activity passed as a parameter. 

	asd
*/
function createWeekChart(category,start, shortname) {
	var week = getWeekData(start);
	var max = 0;
	userConfiguration.week.days = [];
	$.each(week, function(i,d) {
		userConfiguration.week.days.push(createConfigFile(d,'#'+category,shortname+i,category.toLowerCase(),category.toLowerCase()));
		max = getWeekMax(userConfiguration.week.days[i].data, max);
	});
	userConfiguration.week.maxValue = max;
	
	$.each(userConfiguration.week.days, function(i,config) {
		if (shortname === 'pa') {
			createBarChart(config);
		}
		else if (shortname === 'hr') {
			createLineChart(config);	
		}
	})
}


function getWeekMax(data, current) {
	var m = Math.max.apply(Math,data);
	if (m> current)
		return m;
	else
		return current;
}

/********* PHYSICAL ACTIVITY ***********/


function showPhysicalActivityWeek() {
	userConfiguration.active = 'steps';
	$(".subsection").hide();
	$("#steps").html('');
	// $("#steps").html('');
	$("#steps").toggle();
	buildTimeScale('steps',[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);
	createWeekChart('steps','1401951600','pa');
}


function getDayHeadersForWeeklyCharts(target,id,className,day) {
	var dayHeader = d3.select(target).append('div')
			.attr("id",id)
			// .attr("class",className)
			.attr("class","dayChart " + className)
		.append('div')
			.attr("class","chartDayHeader")
		.append('div')
		
	dayHeader.append('h3')
		.text(day);
}


function createBarChart(config) {
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
		.domain([0,userConfiguration.week.maxValue])
	    .range([0, height-5]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");

	// var yAxis = d3.svg.axis()
	//     .scale(y)
	//     .orient("left");
	var yAxis = d3.svg.axis().scale(y).ticks(4).orient("left");

	getDayHeadersForWeeklyCharts(config.target,config.id,config.className,config.day);
		
	d3.select(config.target+" #"+config.id)
		.append('div')
			.attr("class","chartDayArea");

	var barWidth = (width / config.data.length);

	var svg = d3.select("#"+config.id+" .chartDayArea").append("svg")
				    .attr("width", width + margin.left + margin.right)
				    .attr("height", height + margin.top + margin.bottom);
	
	// svg.append("g")
	// 	.attr("class", "y axis")
	// 	.attr("transform", "translate(0,0)")
	// 	.call(yAxis);

	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0)
      // .attr("dy", ".71em")		
      // .style("text-anchor", "end")
      // .text("Price ($)");

	svg.selectAll('rect')
		.data(config.data)
		.enter()
		.append("rect")
		.attr({
			'width': (barWidth-.5),
			'height': function(d) {
				return 	y(d);
			},
			'x': function(d,i) {
				// if (d>0)
				// 	console.log("D: " + i+ "  | s: "+d);
				return (i*barWidth)+.5;
			},
			'y': function(d,i) {
				return height - y(d);
			}
		});
}


function getMax(data) {
	// var max = Math.max.apply(Math,data);
	// console.log(max); 
	return Math.max.apply(Math,data);
}

/*** Main operations ***/
function changeInterval(interval) {
	mainParameters.general.interval = interval;
	if (userConfiguration.active == 'steps') {
		showPhysicalActivityWeek();
	}
	else if (userConfiguration.active == 'heartrate') {
		showHeartRateWeek();
	}
}



