using System;
using System.Collections.Generic;
using System.Linq;
using QueryTree.Enums;
using QueryTree.Models;

namespace QueryTree.ViewModels
{
    public class ScheduledReportViewModel
    {
        public int QueryID { get; set; }

        public FrequencyScheduled FrequencyScheduled { get; set; }

        public string Time { get; set; }

        public DayOfWeek? DayOfWeek { get; set; }

        public int? DayOfMonth { get; set; }

        public string Recipients { get; set; }

        public ScheduledReportViewModel()
        {
            this.FrequencyScheduled = 0;
            this.Recipients = string.Empty;
            this.DayOfWeek = 0;
            this.DayOfMonth = null;
            this.Time = "08:00 AM";
        }

        public ScheduledReportViewModel(ScheduledReport report)
        {
            this.FrequencyScheduled = report.FrequencyScheduled;
            this.Recipients = report.Recipients;
            this.DayOfWeek = report.DayOfWeek;
            this.DayOfMonth = report.DayOfMonth;
            DateTime time = DateTime.Today.Add(report.Time.Value);
            this.Time = time.ToString("hh:mm tt");
        }
    }
}