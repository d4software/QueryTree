using System;
using System.Collections.Generic;
using QueryTree.Models;


namespace QueryTree.ViewModels
{
    public class DbTableViewModel
    {
        public DbTableViewModel()
        {
            Columns = new List<DbColumnViewModel>();
        }

        public DbTableViewModel(DbTable table)
            : this()
        {
            Name = table.Name;
            foreach (var dbColumn in table.Columns)
            {
                Columns.Add(new DbColumnViewModel(dbColumn as DbColumn));
            }
        }

        public string Name { get; set; }
        public List<DbColumnViewModel> Columns { get; set; }
        public List<DbTableViewModel> Parents { get; set; }
    }
}