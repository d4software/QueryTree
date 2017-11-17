using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using QueryTree.Enums;

namespace QueryTree.Models
{
    public class ScheduledReport
    {
        [Key, ForeignKey("Query")]
        public int ScheduleID { get; set; }

        public FrequencyScheduled FrequencyScheduled { get; set; }

        public TimeSpan? Time { get; set; }

        public DayOfWeek? DayOfWeek { get; set; }

        public int? DayOfMonth { get; set; }

        public string Recipients { get; set; }

        public virtual Query Query { get; set; }
    }
}