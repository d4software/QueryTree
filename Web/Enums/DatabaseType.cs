using System;
using System.ComponentModel.DataAnnotations;

namespace QueryTree.Enums
{
    public enum DatabaseType 
    { 
        MySQL = 0, 
        [Display(Name = "SQL Server")]
        SQLServer = 1,
        PostgreSQL = 3
    }
}