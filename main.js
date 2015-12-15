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
      var containerSelection = d3.select("#container")
      containerSelection.style({"width": width, "margin": "auto"});
          // .attr("margin", "0 auto")

      // Calendar Scales and Axis
      var calendarHeight = 600,
          calendarXPadding = 50,
          calendarTopPadding = 20,
          calendarBottomPadding = 20,
          calendarHeatmapWidthRatio = 0.75;

      // var calendar = d3.select("body").append("svg")
      var calendar = containerSelection.append("svg")
          .attr("width", width)
          .attr("height", calendarHeight + calendarBottomPadding);

      var calendarXScale = d3.scale.ordinal()
          .domain(d3.range(1, 8))
          .rangeRoundBands([0, width - calendarXPadding]);
      var calendarYScale = d3.scale.linear()
          .domain([0, 24])
          .range([0, calendarHeight - calendarTopPadding]);
      var calendarXAxis = d3.svg.axis()
          .orient("top")
          .scale(calendarXScale);
      var calendarYAxis = d3.svg.axis()
          .orient("left")
          .scale(calendarYScale);

      calendar.append("g")
          .attr("transform", "translate(" + calendarXPadding + ", " + calendarTopPadding + ")")
          .call(calendarXAxis);
      calendar.append("g")
          .attr("transform", "translate(" + calendarXPadding + ", " + calendarTopPadding + ")")
          .call(calendarYAxis);

      // Calendar Grid
      calendar.append("g").selectAll(".vertical").data(d3.range(1, 8)).enter()
          .append("line")
          .attr("stroke", "darkgray")
          .attr("stroke-width", 2)
          .attr("x1", function(d) { return calendarXScale(d) + calendarXPadding + calendarXScale.rangeBand(); })
          .attr("x2", function(d) { return calendarXScale(d) + calendarXPadding + calendarXScale.rangeBand(); })
          .attr("y1", calendarTopPadding)
          .attr("y2", calendarHeight);
      calendar.append("g").selectAll(".horizontal").data(d3.range(0, 25)).enter()
          .append("line")
          .attr("stroke", function(d) { return (d % 2 == 0)? "darkgray" : "lightgray"; })
          .attr("stroke-width", function(d) { return (d % 2 == 0)? 2 : 1; })
          .attr("x1", calendarXPadding)
          .attr("x2", width)
          .attr("y1", function(d) { return calendarYScale(d) + calendarTopPadding; })
          .attr("y2", function(d) { return calendarYScale(d) + calendarTopPadding; });

      // Calendar Heatmap
      var heatmapMinutesPerStep = 10,
          heatmapStepHeight = calendarYScale(heatmapMinutesPerStep / 60) - calendarYScale(0);
      var eventsByDay = d3.nest()
          .key(function(d) { return d.day; })
          .entries(rows);
      var heatmapStepMinutes = nestedDayEventsToStepProjectMinutes(eventsByDay, heatmapMinutesPerStep);

      var calendarHeatMapColorScale = d3.scale.linear()
          .domain([0, d3.max(heatmapStepMinutes, function(d) { return d.minutes; })])
          .range([d3.hsl(360, 1, 1), d3.hsl(360, 1, 0.5)]);

      calendar.append("g").selectAll(".step-bar").data(heatmapStepMinutes).enter()
          .append("rect")
          .attr("fill", function(d) { return calendarHeatMapColorScale(d.minutes); })
          .attr("width", calendarXScale.rangeBand() * calendarHeatmapWidthRatio)
          .attr("height", heatmapStepHeight)
          .attr("x", function(d) { return calendarXScale(+d.day) + calendarXPadding; })
          .attr("y", function(d) { return calendarYScale(d.start / 60) + calendarTopPadding; });

      // Calendar Side-barchart
      var sideMinutesPerStep = 120, // modify grid lines too if changed
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
            .attr("fill", "dimgray")
            .attr("width", sideBarChartXScale.rangeBand())
            .attr("height", function(d) { return sideBarChartYScale(d.weight); })
            .attr("x", function(d, i) {
                return calendarXScale(el.day) + calendarXScale.rangeBand() - sideWidth
                    + sideBarChartXScale(i) + calendarXPadding; })
            .attr("y", function(d, i) {
                return calendarYScale(el.start / 60) + calendarTopPadding + sideStepHeight
                    - sideBarChartYScale(d.weight) + sideStepYPadding; });
      }); // forEach
      
      // Bottom Parameters
      var minDate = new Date(2015, 9 - 1, 4),
          maxDate = new Date(2015, 12 - 1, 9),
          weekAfterMinDate = new Date(2015, 9 - 1, 11),
          dayAfterMinDate = new Date(2015, 9 - 1, 5);

      var bottomBarChartHeight = 150,
          bottomBarChartYPadding = 30,
          bottomBarChartXPadding = 50;

      // Bottom Data
      var weeklyMinutes = d3.nest()
          .key(startOfWeek)
          .rollup(function(d) { return d3.sum(d, getDurationMm); })
          .entries(rows);
      var dailyMinutes = d3.nest()
          .key(dateOfRow)
          .rollup(function(d) { return d3.sum(d, getDurationMm); })
          .entries(rows);

      // Bottom Scale and Axis
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

      var bottomBarChartWeekWidth = bottomBarChartXScale(weekAfterMinDate) - bottomBarChartXScale(minDate);

      // Bottom Bar Charts
      var bottomBarChart = containerSelection.append("svg")
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
          .attr("class", function(d) { return dateClassString(new Date(Date.parse(d.key))); })
          .attr("fill", "steelblue")
          .attr("width", bottomBarChartWeekWidth - 1)
          .attr("height", function(d) { return bottomBarChartHeight - bottomBarChartYPadding - bottomBarChartYScale(d.values / 60)})
          .attr("x", function(d) { return bottomBarChartXScale(Date.parse(d.key)) + bottomBarChartXPadding; })
          .attr("y", function(d) { return bottomBarChartYScale(d.values / 60); });

      // Bottom day bars
      var dailyBars = bottomBarChart.append("g").attr("class", "daily-bars")
          .selectAll(".dayBar")
          .data(dailyMinutes).enter()
          .append("rect")
          .attr("fill", "orange")
          .attr("width", bottomBarChartWeekWidth / 7)
          .attr("height" , function(d) { return bottomBarChartHeight - bottomBarChartYPadding - bottomBarChartYScale(d.values / 60)})
          .attr("x", function(d) { return bottomBarChartXScale(Date.parse(d.key)) + bottomBarChartXPadding; })
          .attr("y", function(d) { return bottomBarChartYScale(d.values / 60); });

      // Bottom Project Lines
      var eventByProject = d3.nest()
          .key(function(d) { return d.project; })
          .entries(rows);
      var numOfProjects = eventByProject.length,
          projectBarHeight = 10,
          projectHeight = 30,
          projectTotalHeight = numOfProjects * projectHeight;
          projectBarYPadding = (projectHeight - projectBarHeight) / 2;

      var projects = eventByProject.map(function(d, i) { return d.key; });
      var bottomProjectYScale = d3.scale.ordinal()
          .domain(projects)
          .rangeRoundBands([0, projectTotalHeight])
      var projectColorScale = d3.scale.category10()
          .domain(projects)

      var bottomProjectColorScale = d3.scale.linear()
          .domain([0, 20])
          .range([d3.hsl(210, 1, 1), d3.hsl(210, 1, 0.5)]);

      var bottomProjects = containerSelection.append("svg")
          .attr("width", width)
          .attr("height", projectHeight * numOfProjects);

      eventByProject.map(function(el, i) {
        // el.key = project name
        var projectEventsByWeek = d3.nest().key(startOfWeek).entries(el.values)
            .map(function(d, i) { d.project = el.key; return d; });
        var bottomProjectGroup = bottomProjects.append("g");
        bottomProjectGroup.append("text")
            .attr("x", 0)
            .attr("y", bottomProjectYScale(el.key) + projectHeight / 2)
            .attr("alignment-baseline", "middle")
            .attr("font-size", projectHeight * 0.5)
            .attr("fill", projectColorScale(el.key))
            .text(el.key);
        bottomProjectGroup.selectAll(".bar").data(projectEventsByWeek).enter()
            .append("rect")
            .attr("class", function(d) { return dateClassString(new Date(Date.parse(d.key))); })
            .attr("x", function(d) { return bottomBarChartXScale(Date.parse(d.key)) + bottomBarChartXPadding; })
            .attr("y", bottomProjectYScale(el.key) + projectBarYPadding)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("width", bottomBarChartXScale(weekAfterMinDate) - bottomBarChartXScale(minDate))
            .attr("height", 10)
            .attr("fill", function(d) { return bottomProjectColorScale(d3.sum(d.values, getDurationMm) / 60); });
      });

      // Bottom linked overlays
      var overlayBarChartGroup = bottomBarChart.append("g");
      var overlayProjectGroup = bottomProjects.append("g");
      var overlayCalendarGroup = calendar.append("g");
      var eventsByWeek = d3.nest()
          .key(startOfWeek)
          .entries(rows);

      var removeOverlay = function() {
        overlayBarChartGroup.selectAll("*").remove();
        overlayProjectGroup.selectAll("*").remove();
        overlayCalendarGroup.selectAll("*").remove();
      }
      var updateOverlay = function(dateKey) {
        var classKey = dateClassString(new Date(Date.parse(dateKey)));
        removeOverlay();
        // update calendar overlay
        eventsByWeek.forEach(function(d, i) {
          if (d.key != dateKey)
            return;
          d.values.forEach(function(entry, i) {
            var start = entry.startHh * 60 + entry.startMm;
            var end = entry.endHh * 60 + entry.endMm;
            var dayOfWeek = +entry.day;
            overlayCalendarGroup.append("rect")
                .attr("fill", projectColorScale(entry.project))
                .attr("stroke", "black")
                .attr("stroke-width", 3)
                .attr("opacity", 0.8)
                .attr("width", calendarXScale.rangeBand() * calendarHeatmapWidthRatio)
                .attr("height", calendarYScale(end / 60) - calendarYScale(start / 60))
                .attr("x", calendarXScale(dayOfWeek) + calendarXPadding)
                .attr("y", calendarYScale(start / 60) + calendarTopPadding)
                .on("mouseenter", function(d, i) {
                    overlayCalendarGroup.selectAll("text").style("visibility", "visible");
                }).on("mouseleave", function(d, i) {
                    overlayCalendarGroup.selectAll("text").style("visibility", "hidden");
                })

            overlayCalendarGroup.append("text")
                .attr("font-size", 25)
                .attr("x", calendarXScale(dayOfWeek) + calendarXPadding)
                .attr("y", calendarYScale(start / 60) + calendarTopPadding)
                .attr("alignment-baseline", "hanging")
                .style("visibility", "hidden")
                .text(entry.project)
          });
        });

        // update bottom bar chart overlay
        var barChartData = bottomBarChart.select("." + classKey).datum();
        overlayBarChartGroup.append("rect")
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("opacity", 0.5)
            .attr("width", bottomBarChartWeekWidth)
            .attr("height", bottomBarChartHeight - bottomBarChartYPadding - bottomBarChartYScale(barChartData.values / 60))
            .attr("x", bottomBarChartXScale(Date.parse(barChartData.key)) + bottomBarChartXPadding)
            .attr("y", bottomBarChartYScale(barChartData.values / 60))
        overlayBarChartGroup.append("text")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("x", bottomBarChartXScale(Date.parse(barChartData.key)) + bottomBarChartWeekWidth / 2 + bottomBarChartXPadding)
            .attr("y", (bottomBarChartHeight - bottomBarChartYPadding) / 2)
            .attr("alignment-baseline", "middle")
            .attr("text-anchor", "middle")
            .attr("font-size", 25)
            .text(durationString(barChartData.values))

        // update bottom project lines overlay
        var projectData = bottomProjects.selectAll("." + classKey).data();
        projectData.forEach(function(d, i) {
          overlayProjectGroup.append("text")
              .attr("stroke", "black")
              .attr("stroke-width", 2)
              .attr("x", bottomBarChartXScale(Date.parse(d.key)) + bottomBarChartWeekWidth / 2 + bottomBarChartXPadding)
              .attr("y", bottomProjectYScale(d.project) + projectBarYPadding + projectHeight / 2)
              .attr("alignment-baseline", "middle")
              .attr("text-anchor", "middle")
              .attr("font-size", 25)
              .text(durationString(d3.sum(d.values, getDurationMm)))
        });

      }

      weekBars.on("mouseenter", function(d, i) { updateOverlay(d.key); })
      d3.select("body").on("click", function(d, i) { removeOverlay(); })

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

var dateClassString = function(d) {
  return "d" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

var durationString = function(minutes) {
  return Math.floor(minutes / 60) + ":" + ((minutes % 60 < 10)? "0" : "") + minutes % 60;
}
