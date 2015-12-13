d3.csv(
    "data.csv",
    function(d) {
      console.log(d);
      return {
        year: +d.year,
        month: +d.month,
        date: +d.date,
        day: +d.day,
        project: d.project,
        name: d.name,
        start_hh: d.start_hh,
        start_mm: d.start_mm,
        end_hh: d.end_hh,
        end_mm: d.end_mm,
      };
    },
    function(error, rows) {
      console.log(rows);
    });
