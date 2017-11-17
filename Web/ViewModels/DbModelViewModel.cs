using QueryTree.Models;
using System;
using System.Collections.Generic;
using System.Linq;


namespace QueryTree.ViewModels
{
    public class DbModelViewModel
    {
        public DbModelViewModel()
        {
            Tables = new List<DbTableViewModel>();
            SelectedTable = null;
        }

        public DbModelViewModel(DbModel model)
            : this()
        {
            Name = model.Name;
            foreach(var dbTable in model.Tables)
            {
                Tables.Add(new DbTableViewModel(dbTable));
            }
        }

        public string Name { get; set; }
        public List<DbTableViewModel> Tables { get; set; }
        public DbTableViewModel SelectedTable { get; set; }
    }
}