using System;
using System.Collections.Generic;
using System.Linq;


namespace QueryTree.Models
{

    public class DbJoinStructure
    {
        public DbJoinStructure()
        {
            ChildJoinColumn = null;
            ParentJoinColumn = null;
            Columns = new List<string>();
            ColumnTypes = new List<string>();
            ShowColumns = new List<bool>();
            Parents = new List<DbJoinStructure>();
        }

        public string ChildJoinColumn { get; set; }
        public string ParentJoinColumn { get; set; }

        public string DisplayName { get; set; }

        public List<string> Columns { get; set; }
        public List<bool> ShowColumns { get; set; }
        public List<string> ColumnTypes { get; set; }

        public List<DbJoinStructure> Parents { get; set; }
    }
}