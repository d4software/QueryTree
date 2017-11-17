using System;
using System.Collections.Generic;
using System.Linq;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace QueryTree.Models
{
    public class Query
    {
        [Key]
        public int QueryID { get; set; }
        public int DatabaseConnectionID { get; set; }
        public virtual DatabaseConnection DatabaseConnection { get; set; }
        public string Name { get; set; }
        public string QueryDefinition { get; set; }
        public virtual ApplicationUser CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public virtual ApplicationUser LastEditedBy { get; set; }
        public DateTime? LastEditedOn { get; set; }
        [DataType(DataType.MultilineText)]
        public string Description { get; set; }

        public bool IsSimpleQuery { get; set; }

        public virtual ScheduledReport ScheduledReport { get; set; }
    }
}
