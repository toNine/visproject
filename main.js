var raw_data = null;
// Assumes data entries are ordered
d3.csv(
    "data.csv",
    function(d) {
      return {
        year: +d.year,
        month: +d.month,
        date: +d.date,
        day: +d.day,
        project: d.project,
        name: d.name,
        startHh: d.start_hh,
        startMm: d.start_mm,
        endHh: d.end_hh,
        endMm: d.end_mm,
      };
    },
    function(error, rows) {
      raw_data = rows;
      console.log(rows);

      // Globals
      var width = 1500;

      // Calendar Scales and Axis
      var daysInWeek = 7,
          hoursInDay = 24,
          calendarHeight = 720,
          calendarXPadding = 40,
          calendarYPadding = 20,
          calendarHeatmapWidthRatio = 2 / 3;

      var calendar = d3.select("body").append("svg")
          .attr("width", width)
          .attr("height", calendarHeight);

      var calendarXScale = d3.scale.ordinal()
          .domain(d3.range(1, 8))
          .rangeRoundBands([0, width - calendarXPadding]);
      var calendarYScale = d3.scale.linear()
          .domain([0, 24])
          .range([0, calendarHeight - calendarYPadding]);
      var calendarXAxis = d3.svg.axis()
          .orient("top")
          .scale(calendarXScale);
      var calendarYAxis = d3.svg.axis()
          .orient("left")
          .scale(calendarYScale);

      calendar.append("g")
          .attr("transform", "translate(" + calendarXPadding + ", " + calendarYPadding + ")")
          .call(calendarXAxis);
      calendar.append("g")
          .attr("transform", "translate(" + calendarXPadding + ", " + calendarYPadding + ")")
          .call(calendarYAxis);

      // Calendar Heatmap
      var minutesPerStep = 60,
          stepHeight = calendarYScale(minutesPerStep / 60) - calendarYScale(0);
      var eventsByDay = d3.nest()
          .key(function(d) { return d.day; })
          .entries(rows);
      var stepCounts = d3.merge(eventsByDay.map(function(kv) {
          return dayEventsToStepCount(kv.values, minutesPerStep).map(function(d) { d.day = kv.key; return d; });
      }));

      console.log(stepCounts);
      var calendarHeatMapColorScale = d3.scale.linear()
          .domain([0, d3.max(stepCounts, function(d) { return d.count; })])
          .range(["white", "red"]);

      calendar.append("g").selectAll(".step-bar").data(stepCounts).enter()
          .append("rect")
          .attr("fill", function(d) { return calendarHeatMapColorScale(d.count); })
          .attr("width", calendarXScale.rangeBand() * calendarHeatmapWidthRatio)
          .attr("height", stepHeight)
          .attr("x", function(d) { return calendarXScale(+d.day) + calendarXPadding; })
          .attr("y", function(d) { return calendarYScale(d.minute / 60) + calendarYPadding; });


      /* calendar.append("rect").datum(20.33)
        .attr("fill", "steelblue")
        .attr("width", calendarXScale.rangeBand() / 2)
        .attr("height", calendarCellHeight)
        .attr("x", calendarXScale(2) + calendarXPadding)
        .attr("y", function(d) { return calendarYScale(d) + calendarYPadding; }); */

      // Calendar Side-barchart
      // Bottom Parameters
      var minDate = new Date(2015, 9 - 1, 4),
          maxDate = new Date(2015, 12 - 1, 9),
          weekAfterMinDate = new Date(2015, 9 - 1, 11),
          dayAfterMinDate = new Date(2015, 9 - 1, 5);

      var weeklyMinutes = d3.nest()
          .key(startOfWeek)
          .rollup(function(d) { return d3.sum(d, getDurationMm); })
          .entries(rows);
      var dailyMinutes = d3.nest()
          .key(dateOfRow)
          .rollup(function(d) { return d3.sum(d, getDurationMm); })
          .entries(rows);

      var bottomBarChartHeight = 250,
          bottomBarChartYPadding = 30,
          bottomBarChartXPadding = 50;

      var bottomBarChartXScale = d3.time.scale()
          .domain([minDate, maxDate])
          .range([0, width - bottomBarChartXPadding]);
      var bottomBarChartYScale = d3.scale.linear()
          .domain([0, d3.max(weeklyMinutes, function(d) { return d.values; }) / 60])
          .range([bottomBarChartHeight - bottomBarChartYPadding, 0]);
      var bottomBarChartXAxis = d3.svg.axis()
          .orient("bottom")
          .scale(bottomBarChartXScale);
      var bottomBarChartYAxis = d3.svg.axis()
          .orient("left")
          .scale(bottomBarChartYScale);

      // Bottom Bar Charts
      var bottomBarChart = d3.select("body").append("svg")
          .attr("width", width)
          .attr("height", bottomBarChartHeight);
          
      bottomBarChart.append("g")
          .attr("transform", "translate(" + bottomBarChartXPadding + ", " + (bottomBarChartHeight - bottomBarChartYPadding) + ")")
          .call(bottomBarChartXAxis);
      bottomBarChart.append("g")
          .attr("transform", "translate(" + bottomBarChartXPadding + ", 0)")
          .call(bottomBarChartYAxis);

      // Bottom week bars
      var weekBars = bottomBarChart.append("g").attr("class", "weekly-bars")
          .selectAll(".weekBar")
          .data(weeklyMinutes).enter()
          .append("rect")
          .attr("fill", "steelblue")
          .attr("width", bottomBarChartXScale(weekAfterMinDate) - bottomBarChartXScale(minDate) - 1)
          .attr("height", function(d) { return bottomBarChartHeight - bottomBarChartYPadding - bottomBarChartYScale(d.values / 60)})
          .attr("x", function(d) { return bottomBarChartXScale(Date.parse(d.key)) + bottomBarChartXPadding; })
          .attr("y", function(d) { return bottomBarChartYScale(d.values / 60); });

      // Bottom day bars
      var dailyBars = bottomBarChart.append("g").attr("class", "daily-bars")
          .selectAll(".dayBar")
          .data(dailyMinutes).enter()
          .append("rect")
          .attr("fill", "orange")
          .attr("width", bottomBarChartXScale(dayAfterMinDate) - bottomBarChartXScale(minDate) - 1)
          .attr("height" , function(d) { return bottomBarChartHeight - bottomBarChartYPadding - bottomBarChartYScale(d.values / 60)})
          .attr("x", function(d) { return bottomBarChartXScale(Date.parse(d.key)) + bottomBarChartXPadding; })
          .attr("y", function(d) { return bottomBarChartYScale(d.values / 60); });

      
      // Bottom Project Lines
    });

/*
 * Helper Functions
 */

var dayEventsToStepCount = function(events, minutesPerStep) {
  var minuteKeys = d3.range(0, 24 * 60, minutesPerStep);
  var keyAndCounts = minuteKeys.map(function(k) { return {minute: k, count: 0}; });
  events.forEach(function(e, i) {
    var startMinute = e.startHh * 60 + e.startMm;
    var endMinute = e.endHh * 60 + e.endMm;
    keyAndCounts.forEach(function(kc, i) {
      if (startMinute <= kc.minute && kc.minute <= endMinute)
        kc.count++
    });
  });
  return keyAndCounts;
}

var getDurationMm = function(row) {
  return (row.endHh - row.startHh) * 60 + (row.endMm - row.startMm);
}

var dateOfRow = function(row) {
  return new Date(row.year, row.month - 1, row.date);
}

var startOfWeek = function(row) {
  var date = new Date(row.year, row.month - 1, row.date),
      diff = row.day - 1;
  date.setDate(date.getDate() - diff);
  return date.toString();
}

var dateString = function(row) {
  return row.year + "/" + row.month + "/" + row.date;
}

var durationString = function(minutes) {
  return Math.floor(minutes / 60) + ":" + minutes % 60;
}

