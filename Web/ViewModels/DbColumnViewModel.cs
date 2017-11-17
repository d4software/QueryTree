using System;
using System.Collections.Generic;
using System.Linq;
using QueryTree.Models;


namespace QueryTree.ViewModels
{
    public class DbColumnViewModel
    {
        public DbColumnViewModel(DbColumn column)
        {
            Name = column.Name;
            DataType = column.DataType;
            if (column.Parent != null && column.Parent.Table != null)
            {
                ParentTableName = column.Parent.Table.Name;
            }
        }

        public string Name { get; set; }
        public string DataType { get; set; }

        public string ParentTableName { get; set; }
    }
}