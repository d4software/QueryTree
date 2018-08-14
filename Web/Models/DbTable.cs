using System;
using System.Collections.Generic;
using QueryTree.Engine;
using System.Linq;


namespace QueryTree.Models
{
    public class DbTable : ITableInfo
    {
        public DbTable()
        {
            Columns = new List<DbColumn>();
        }

        public string Schema { get; set; }
        public string Name { get; set; }
        public string DisplayName { get; set; }
        public List<DbColumn> Columns { get; set; }

        IList<IColumnInfo> ITableInfo.Columns { get => Columns.Select(c => c as IColumnInfo).ToList(); set { } }
        string ITableInfo.DisplayName { get => DisplayName; set { } }
    }
}