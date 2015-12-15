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
        startHh: +d.start_hh,
        startMm: +d.start_mm,
        endHh: +d.end_hh,
        endMm: +d.end_mm,
      };
    },
    function(error, rows) {
      raw_data = rows;

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
      var heatmapMinutesPerStep = 10,
          heatmapStepHeight = calendarYScale(heatmapMinutesPerStep / 60) - calendarYScale(0);
      var eventsByDay = d3.nest()
          .key(function(d) { return d.day; })
          .entries(rows);
      var heatmapStepMinutes = nestedDayEventsToStepProjectMinutes(eventsByDay, heatmapMinutesPerStep);

      var calendarHeatMapColorScale = d3.scale.linear()
          .domain([0, d3.max(heatmapStepMinutes, function(d) { return d.minutes; })])
          .range(["white", "red"]);

      calendar.append("g").selectAll(".step-bar").data(heatmapStepMinutes).enter()
          .append("rect")
          .attr("fill", function(d) { return calendarHeatMapColorScale(d.minutes); })
          .attr("width", calendarXScale.rangeBand() * calendarHeatmapWidthRatio)
          .attr("height", heatmapStepHeight)
          .attr("x", function(d) { return calendarXScale(+d.day) + calendarXPadding; })
          .attr("y", function(d) { return calendarYScale(d.start / 60) + calendarYPadding; });

      // Calendar Side-barchart
      var sideMinutesPerStep = 120,
          sideStepYPadding = 2;
          sideStepHeight = calendarYScale(sideMinutesPerStep / 60) - calendarYScale(0) - sideStepYPadding,
          sideWidth = calendarXScale.rangeBand() * (1 - calendarHeatmapWidthRatio),
          sideNumBars = 3;

      var sideStepProjectMinutes = nestedDayEventsToStepProjectMinutes(eventsByDay, sideMinutesPerStep);
      
      var sideBarChartXScale = d3.scale.ordinal()
          .domain(d3.range(0, sideNumBars))
          .rangeRoundBands([0, sideWidth]);
      var sideBarChartYScale = d3.scale.linear()
          .domain([0, 1])
          .range([0, sideStepHeight]);

      var sideBarSelection = calendar.append("g");
      sideStepProjectMinutes.forEach(function(el, i) {
        var topProjects = Object.keys(el.project).map(function(d, i) { return {project: d, weight: el.project[d] / el.minutes}; })
            .sort(function(a, b) { return b.weight - a.weight; })
            .slice(0, sideNumBars);
        sideBarSelection.selectAll(".side-bar").data(topProjects).enter()
            .append("rect")
            .attr("fill", "darkgray")
            .attr("width", sideBarChartXScale.rangeBand())
            .attr("height", function(d) { return sideBarChartYScale(d.weight); })
            .attr("x", function(d, i) {
                return calendarXScale(el.day) + calendarXScale.rangeBand() - sideWidth
                    + sideBarChartXScale(i) + calendarXPadding; })
            .attr("y", function(d, i) {
                return calendarYScale(el.start / 60) + calendarYPadding + sideStepHeight
                    - sideBarChartYScale(d.weight) + sideStepYPadding; });
      }); // forEach
      
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

var nestedDayEventsToStepProjectMinutes = function(eventsByDay, minutesPerStep) {
  return d3.merge(eventsByDay.map(function(kv) {
        return dayEventsToStepProjectMinutes(kv.values, minutesPerStep).map(function(d) { d.day = kv.key; return d; });
      }));
}

var dayEventsToStepProjectMinutes = function(events, minutesPerStep) {
  var minuteKeys = d3.range(0, 24 * 60, minutesPerStep);
  var keyAndProjectMinutes = minuteKeys.map(function(k) { return {start: k, minutes: 0, project:{}}; });
  events.forEach(function(e, i) {
    var startMinute = e.startHh * 60 + e.startMm;
    var endMinute = e.endHh * 60 + e.endMm;
    keyAndProjectMinutes.forEach(function(kp, i) {
      if (startMinute <= kp.start + minutesPerStep && kp.start <= endMinute) {
        var overlap = Math.min(endMinute, kp.start + minutesPerStep) - Math.max(startMinute, kp.start);
        kp.minutes += overlap;
        if (overlap > 0) {
          if (e.project in kp.project)
            kp.project[e.project] += overlap;
          else
            kp.project[e.project] = overlap;
        }
      }
    });
  });
  return keyAndProjectMinutes;
}

var dayEventsToHeatmapStepMinutes = function(events, minutesPerStep) {
  var minuteKeys = d3.range(0, 24 * 60, minutesPerStep);
  var keyAndMinutes = minuteKeys.map(function(k) { return {start: k, minutes: 0}; });
  events.forEach(function(e, i) {
    var startMinute = e.startHh * 60 + e.startMm;
    var endMinute = e.endHh * 60 + e.endMm;
    keyAndMinutes.forEach(function(kc, i) {
      if (startMinute <= kc.start + minutesPerStep && kc.start <= endMinute) {
        kc.minutes += Math.min(endMinute, kc.start + minutesPerStep) - Math.max(startMinute, kc.start);
      }
    });
  });
  return keyAndMinutes;
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

