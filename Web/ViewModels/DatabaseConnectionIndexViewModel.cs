using System;
using QueryTree.Models;


namespace QueryTree.ViewModels
{
    public class DatabaseConnectionIndexViewModel
    {
        public UserDatabaseTypes type { get; set; }
        public DatabaseConnection myConnection { get; set; }
        public string DbOwner { get; set; }
        public int ReportsCount { get; set; }
        public int ScheduledReportsCount { get; set; }
    }
}