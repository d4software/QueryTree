using System;
using System.Collections.Generic;
using System.Linq;
using QueryTree.Engine;

namespace QueryTree.Models
{
    public class DbColumn : IColumnInfo
    {
        public DbTable Table { get; set; }
        public string Name { get; set; }
        public string DataType { get; set; }
        public bool IsPrimaryKey { get; set; }
        public DbColumn Parent { get; set; }
    }
}