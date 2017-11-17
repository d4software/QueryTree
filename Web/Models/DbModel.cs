using System;
using System.Collections.Generic;
using System.Linq;


namespace QueryTree.Models
{
    public class DbModel
    {
        public DbModel()
        {
            Tables = new List<DbTable>();
        }

        public string Name { get; set; }
        public List<DbTable> Tables { get; set; }
        public List<string> Grants { get; set; }
    }
}