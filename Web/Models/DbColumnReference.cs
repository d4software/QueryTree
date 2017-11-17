using System;
using System.Collections.Generic;
using System.Linq;


namespace QueryTree.Models
{

    public struct DbColumnReference
    {
        public DbColumnReference(string schema, string name, string column)
        {
            Schema = schema == null ? null : schema.ToLower();
            Name = name.ToLower();
            Column = column.ToLower();
        }

        public string Schema { get; set; }
        public string Name { get; set; }
        public string Column { get; set; }
    }
}